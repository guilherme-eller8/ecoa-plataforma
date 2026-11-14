-- 20261121120000_cofacilitadores.sql
-- Prompt 11: co-facilitadores, compartilhar no grupo, lembrar com carinho e resumo semanal.
-- Design: docs/designs/cofacilitadores-compartilhar.md (v2, depois dos revisores).
--
-- Regras deste arquivo:
-- * Só do responsável: convidar, cancelar convite, remover, trocar um link do autor ou da família
--   que já existe, consentir IA (P41) e desligar QR (P58); publicar, imprimir e pagar (prompts 13
--   e 14) usarão privado.eh_responsavel. O co-facilitador faz o resto, pelas portas de membro.
--   As funções servico_* conferem o papel à mão: com a chave secreta não há auth.uid().
-- * Convite preso ao e-mail (P59): só a conta com aquele e-mail, confirmado, aceita. O link
--   (/convite/{token}) só apresenta o convite. O convite cai se quem convidou deixa de ser o
--   responsável. Tetos conferidos com o livro travado, antes de o servidor criar qualquer conta.
-- * story_shares e book_invites não têm porta para anon: o servidor lê por funções servico_*.
-- * Entrar, sair e remover gravam o evento aqui dentro (a métrica não depende da tela).
-- * porta_autor não recebe nenhum grant novo.

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.max_cofacilitadores() returns integer
language sql immutable set search_path = '' as $$ select 3 $$;  -- MAX_COFACILITADORES
create function privado.max_convites_dia() returns integer
language sql immutable set search_path = '' as $$ select 10 $$; -- MAX_CONVITES_DIA (por livro e por responsável)
create function privado.max_convites_por_email_dia() returns integer
language sql immutable set search_path = '' as $$ select 3 $$;  -- MAX_CONVITES_POR_EMAIL_DIA (todos os livros)
create function privado.convite_validade_dias() returns integer
language sql immutable set search_path = '' as $$ select 7 $$;  -- CONVITE_VALIDADE_DIAS

create function privado.eh_responsavel(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.book_members m
    where m.book_id = p_book and m.user_id = (select auth.uid()) and m.papel = 'responsavel'
  )
$$;

-- ── 1. Convites ────────────────────────────────────────────────────────────
create table public.book_invites (
  id uuid primary key,
  book_id uuid not null references public.books (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and char_length(email) between 6 and 254
                             and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  chave_versao smallint not null check (chave_versao between 1 and 99),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  expira_em timestamptz not null,
  aceito_em timestamptz,
  aceito_por uuid references auth.users (id) on delete set null,
  revogado_em timestamptz,
  constraint book_invites_aceito check (aceito_por is null or aceito_em is not null),
  constraint book_invites_um_fim check (aceito_em is null or revogado_em is null),
  constraint book_invites_prazo check (expira_em > criado_em)
);
create unique index book_invites_um_pendente on public.book_invites (book_id, email)
  where aceito_em is null and revogado_em is null;
create index book_invites_email_data on public.book_invites (email, criado_em desc);
create index book_invites_livro_data on public.book_invites (book_id, criado_em desc);
create index book_invites_autor_data on public.book_invites (criado_por, criado_em desc);

alter table public.book_invites enable row level security;
revoke all on public.book_invites from anon, authenticated;
grant select (id, book_id, email, chave_versao, criado_em, expira_em, aceito_em, revogado_em)
  on public.book_invites to authenticated;
grant all on public.book_invites to service_role;
create policy "responsável lê os convites do livro" on public.book_invites
  for select to authenticated using (privado.eh_responsavel(book_id));

-- Pendente e válido: não aceito, não cancelado, no prazo, e quem convidou ainda é o responsável.
create function privado.convite_valido(p_convite uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.book_invites i
    join public.book_members m on m.book_id = i.book_id and m.user_id = i.criado_por and m.papel = 'responsavel'
    where i.id = p_convite and i.aceito_em is null and i.revogado_em is null and i.expira_em > now()
  )
$$;

-- As regras de convidar, sem efeito. O servidor chama antes de criar a conta do convidado e de
-- novo (dentro de servico_criar_convite) com o livro travado.
create function privado.conferir_convite(p_livro uuid, p_usuario uuid, p_email text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.book_members m
                 where m.book_id = p_livro and m.user_id = p_usuario and m.papel = 'responsavel') then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then raise exception 'livro_fechado'; end if;
  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or char_length(p_email) not between 6 and 254 then
    raise exception 'dados_invalidos';
  end if;
  if (select count(*) from public.book_invites i
      where i.book_id = p_livro and i.criado_em > now() - interval '24 hours') >= privado.max_convites_dia()
     or (select count(*) from public.book_invites i
         where i.criado_por = p_usuario and i.criado_em > now() - interval '24 hours') >= privado.max_convites_dia()
     or (select count(*) from public.book_invites i
         where i.email = p_email and i.criado_em > now() - interval '24 hours') >= privado.max_convites_por_email_dia() then
    raise exception 'limite_convites';
  end if;
  if exists (select 1 from public.book_members m join auth.users u on u.id = m.user_id
             where m.book_id = p_livro and lower(u.email) = p_email) then
    raise exception 'ja_membro';
  end if;
  -- O pendente do mesmo e-mail vai ser trocado: não conta no teto.
  if (select count(*) from public.book_members m where m.book_id = p_livro and m.papel = 'cofacilitador')
     + (select count(*) from public.book_invites i where i.book_id = p_livro and i.email <> p_email
          and i.aceito_em is null and i.revogado_em is null and i.expira_em > now())
     >= privado.max_cofacilitadores() then
    raise exception 'limite_cofacilitadores';
  end if;
end $$;

create function public.servico_pode_convidar(p_livro uuid, p_usuario uuid, p_email text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  perform privado.conferir_convite(p_livro, p_usuario, lower(btrim(p_email)));
end $$;

-- Cria o convite. Só o servidor, depois de servico_pode_convidar e da conta do convidado.
create function public.servico_criar_convite(
  p_livro uuid, p_usuario uuid, p_id uuid, p_email text, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
begin
  perform 1 from public.books b where b.id = p_livro for update;
  perform privado.conferir_convite(p_livro, p_usuario, v_email);
  update public.book_invites set revogado_em = now()
  where book_id = p_livro and email = v_email and aceito_em is null and revogado_em is null;
  insert into public.book_invites (id, book_id, email, token_hash, chave_versao, criado_por, expira_em)
  values (p_id, p_livro, v_email, p_token_hash, p_chave_versao, p_usuario,
          now() + make_interval(days => privado.convite_validade_dias()));
end $$;

-- O que a página /convite/{token} mostra. Nenhuma linha = link que não existe.
create function public.servico_ler_convite(p_token_hash text)
returns table (convite_id uuid, book_id uuid, email text, autor text, criado_por uuid, estado text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.book_id, i.email, coalesce(nullif(btrim(b.autor_apelido), ''), b.autor_nome),
         i.criado_por,
         case when i.aceito_em is not null then 'aceito'
              when privado.convite_valido(i.id) then 'pendente'
              else 'vencido' end
  from public.book_invites i join public.books b on b.id = i.book_id
  where p_token_hash ~ '^[0-9a-f]{64}$' and i.token_hash = p_token_hash
$$;

-- Convites válidos para o e-mail confirmado de quem está logado (a lista de livros mostra "Aceitar").
create function public.meus_convites()
returns table (convite_id uuid, book_id uuid, autor text, criado_por uuid, expira_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.book_id, coalesce(nullif(btrim(b.autor_apelido), ''), b.autor_nome), i.criado_por, i.expira_em
  from public.book_invites i
  join public.books b on b.id = i.book_id
  join auth.users u on u.id = (select auth.uid())
  where i.email = lower(u.email) and u.email_confirmed_at is not null
    and privado.convite_valido(i.id)
    and not exists (select 1 from public.book_members m
                    where m.book_id = i.book_id and m.user_id = u.id)
$$;

-- Aceitar: só a conta com o e-mail do convite, confirmado, e com o plano ativo.
-- Idempotente para quem já aceitou.
create function public.aceitar_convite(p_convite uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  i record;
  v_email text;
begin
  select lower(u.email) into v_email from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
  if v_email is null then raise exception 'sem_permissao'; end if;
  select * into i from public.book_invites x where x.id = p_convite;
  if i.id is null or i.email <> v_email then raise exception 'convite_invalido'; end if;
  perform 1 from public.books b where b.id = i.book_id for update;
  select * into i from public.book_invites x where x.id = p_convite for update;
  if i.aceito_em is not null and i.aceito_por = (select auth.uid()) then return i.book_id; end if;
  if not privado.convite_valido(i.id) then raise exception 'convite_invalido'; end if;
  if not privado.livro_editavel(i.book_id) then raise exception 'livro_fechado'; end if;
  if not exists (select 1 from public.book_members m
                 where m.book_id = i.book_id and m.user_id = (select auth.uid())) then
    if (select count(*) from public.book_members m
        where m.book_id = i.book_id and m.papel = 'cofacilitador') >= privado.max_cofacilitadores() then
      raise exception 'limite_cofacilitadores';
    end if;
    insert into public.book_members (book_id, user_id, papel)
    values (i.book_id, (select auth.uid()), 'cofacilitador');
    insert into public.events (book_id, ator_tipo, ator_id, acao, detalhes)
    values (i.book_id, 'cofacilitador', (select auth.uid()), 'convite_aceito',
            jsonb_build_object('convite_id', i.id));
  end if;
  update public.book_invites set aceito_em = now(), aceito_por = (select auth.uid()) where id = i.id;
  return i.book_id;
end $$;

create function public.cancelar_convite(p_convite uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
begin
  select x.book_id into v_livro from public.book_invites x where x.id = p_convite;
  if v_livro is null or not privado.eh_responsavel(v_livro) then raise exception 'sem_permissao'; end if;
  update public.book_invites set revogado_em = now()
  where id = p_convite and aceito_em is null and revogado_em is null;
  return found;
end $$;

-- ── 2. Membros ─────────────────────────────────────────────────────────────
-- Nome e e-mail de quem está no livro, para a tela Quem ajuda. Só para membros do livro.
create function public.membros_do_livro(p_livro uuid)
returns table (user_id uuid, papel public.papel_membro, email text, nome text, criado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select m.user_id, m.papel, u.email::text,
         nullif(btrim(coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', '')), ''),
         m.criado_em
  from public.book_members m join auth.users u on u.id = m.user_id
  where m.book_id = p_livro and privado.eh_membro(p_livro)
  order by m.papel, m.criado_em
$$;

-- Tira o co-facilitador: a trava de edição dele some e os links /o/ que ele criou são desligados.
-- Os links do autor e da família ele pode ter visto: a tela oferece trocar (só o responsável troca).
create function privado.tirar_cofacilitador(p_livro uuid, p_usuario uuid, p_por uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.book_members
  where book_id = p_livro and user_id = p_usuario and papel = 'cofacilitador';
  if not found then return false; end if;
  delete from public.edit_locks where book_id = p_livro and user_id = p_usuario;
  update public.story_shares set revogado_em = now(), revogado_por = p_por
  where book_id = p_livro and criado_por = p_usuario and revogado_em is null;
  insert into public.events (book_id, ator_tipo, ator_id, acao, detalhes)
  values (p_livro, case when p_por = p_usuario then 'cofacilitador' else 'responsavel' end::public.ator_tipo,
          p_por, case when p_por = p_usuario then 'saiu_do_livro' else 'removeu_membro' end,
          jsonb_build_object('user_id', p_usuario));
  return true;
end $$;

-- Remover e sair valem com o plano vencido (ação de segurança, como P58).
create function public.remover_membro(p_livro uuid, p_usuario uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.eh_responsavel(p_livro) then raise exception 'sem_permissao'; end if;
  return privado.tirar_cofacilitador(p_livro, p_usuario, (select auth.uid()));
end $$;

create function public.sair_do_livro(p_livro uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  return privado.tirar_cofacilitador(p_livro, (select auth.uid()), (select auth.uid()));
end $$;

-- ── 3. Trocar um link que já existe: só o responsável (P60). Gerar o primeiro: qualquer membro ──
create or replace function public.servico_trocar_link_familia(
  p_livro uuid, p_usuario uuid, p_id uuid, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.book_members m where m.book_id = p_livro and m.user_id = p_usuario) then
    raise exception 'sem_permissao';
  end if;
  if exists (select 1 from public.family_access a where a.book_id = p_livro and a.revogado_em is null)
     and not exists (select 1 from public.book_members m
                     where m.book_id = p_livro and m.user_id = p_usuario and m.papel = 'responsavel') then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then
    raise exception 'livro_fechado';
  end if;
  update public.family_access set revogado_em = now()
  where book_id = p_livro and revogado_em is null;
  insert into public.family_access (id, book_id, token_hash, chave_versao, criado_por)
  values (p_id, p_livro, p_token_hash, p_chave_versao, p_usuario);
end $$;

create or replace function public.servico_trocar_link_autor(
  p_livro uuid, p_usuario uuid, p_id uuid, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.book_members m where m.book_id = p_livro and m.user_id = p_usuario) then
    raise exception 'sem_permissao';
  end if;
  if exists (select 1 from public.author_access a where a.book_id = p_livro and a.revogado_em is null)
     and not exists (select 1 from public.book_members m
                     where m.book_id = p_livro and m.user_id = p_usuario and m.papel = 'responsavel') then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then raise exception 'livro_fechado'; end if;
  update public.author_access set revogado_em = now() where book_id = p_livro and revogado_em is null;
  insert into public.author_access (id, book_id, token_hash, chave_versao, criado_por)
  values (p_id, p_livro, p_token_hash, p_chave_versao, p_usuario);
end $$;

-- ── 4. Compartilhar no grupo (/o/{token}) ──────────────────────────────────
create table public.story_shares (
  id uuid primary key,
  book_id uuid not null references public.books (id) on delete cascade,
  story_id uuid not null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  chave_versao smallint not null check (chave_versao between 1 and 99),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  revogado_em timestamptz,
  revogado_por uuid references auth.users (id) on delete set null,
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete cascade
);
create unique index story_shares_um_ativo on public.story_shares (story_id) where revogado_em is null;
create index story_shares_livro on public.story_shares (book_id, criado_por);

alter table public.story_shares enable row level security;
revoke all on public.story_shares from anon, authenticated;
grant select (id, book_id, story_id, chave_versao, criado_em, criado_por, revogado_em)
  on public.story_shares to authenticated;
grant all on public.story_shares to service_role;
create policy "membro lê os compartilhamentos do livro" on public.story_shares
  for select to authenticated using (privado.eh_membro(book_id));

-- Devolve o link ativo da história (o servidor deriva o token de id e chave_versao) ou cria um.
-- "Marcada como pronta" = estado 'pronta' (a IA terminou) e revisada_em (a família marcou, P48).
create function public.servico_compartilhar_historia(
  p_story uuid, p_usuario uuid, p_id uuid, p_token_hash text, p_chave_versao smallint
) returns table (id uuid, chave_versao smallint, criado boolean)
language plpgsql security definer set search_path = '' as $$
declare
  s record;
begin
  perform pg_advisory_xact_lock(hashtextextended('compartilhar:' || p_story::text, 0));
  select st.id, st.book_id, st.estado, st.revisada_em into s from public.stories st where st.id = p_story;
  if s.id is null or not exists (select 1 from public.book_members m
                                 where m.book_id = s.book_id and m.user_id = p_usuario) then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(s.book_id) then raise exception 'livro_fechado'; end if;
  if s.estado <> 'pronta' or s.revisada_em is null then raise exception 'compartilhar_nao_pronta'; end if;
  return query select x.id, x.chave_versao, false from public.story_shares x
               where x.story_id = p_story and x.revogado_em is null;
  if found then return; end if;
  insert into public.story_shares (id, book_id, story_id, token_hash, chave_versao, criado_por)
  values (p_id, s.book_id, p_story, p_token_hash, p_chave_versao, p_usuario);
  return query select p_id, p_chave_versao, true;
end $$;

-- Desligar vale com o plano vencido (ação de segurança). Qualquer membro.
create function public.revogar_compartilhamento(p_story uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
begin
  select st.book_id into v_livro from public.stories st where st.id = p_story;
  if v_livro is null or not privado.eh_membro(v_livro) then raise exception 'sem_permissao'; end if;
  update public.story_shares set revogado_em = now(), revogado_por = (select auth.uid())
  where story_id = p_story and revogado_em is null;
  return found;
end $$;

-- O que /o/{token} mostra: só história marcada como pronta, link ativo. Vale com o plano vencido.
-- A voz é o recorte do QR (T45), com a regra do player: QR desligado = sem voz; recorte velho =
-- "preparando" e pede o recorte novo (pedir_audio). Só os parágrafos saem: nada de fontes.
create function public.servico_ler_compartilhada(p_token_hash text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  c record;
  s record;
  q record;
  v_voz text := 'sem_voz';
  v_pedir boolean := false;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return null; end if;
  select x.* into c from public.story_shares x where x.token_hash = p_token_hash and x.revogado_em is null;
  if c.id is null then return null; end if;
  select st.id, st.titulo, st.ano, st.texto, st.estado, st.revisada_em into s
  from public.stories st where st.id = c.story_id;
  if s.estado <> 'pronta' or s.revisada_em is null then
    return jsonb_build_object('estado', 'em_revisao');
  end if;
  select x.* into q from public.qr_codes x where x.story_id = c.story_id and x.desativado_em is null;
  if q.codigo is not null then
    if q.audio_caminho is not null
       and q.audio_fonte is not distinct from privado.fonte_audio_da_historia(c.story_id) then
      v_voz := 'ok';
    else
      v_voz := 'preparando';
      v_pedir := privado.qr_reservar_audio(q.codigo);
    end if;
  end if;
  return jsonb_build_object('estado', 'ok', 'share_id', c.id, 'book_id', c.book_id,
    'story_id', c.story_id, 'titulo', s.titulo, 'ano', s.ano,
    'paragrafos', (select coalesce(jsonb_agg(p ->> 'texto' order by n), '[]'::jsonb)
                   from jsonb_array_elements(coalesce(s.texto -> 'paragrafos', '[]'::jsonb))
                        with ordinality e(p, n)),
    'autor', (select coalesce(nullif(btrim(b.autor_apelido), ''), b.autor_nome)
              from public.books b where b.id = c.book_id),
    'voz', v_voz, 'codigo', q.codigo, 'pedir_audio', v_pedir,
    'audio_caminho', case when v_voz = 'ok' then q.audio_caminho end);
end $$;

-- "Ouvir" tocado no /o/: 1 evento por link, rede e hora (a métrica da hipótese 2). Contador
-- próprio, separado do QR (qr_tocou mede o papel impresso).
create function public.servico_compartilhada_tocou(p_token_hash text, p_chave text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  c record;
begin
  if p_chave is null or p_chave !~ '^[0-9a-f]{64}$' then raise exception 'chave_invalida'; end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  select x.* into c from public.story_shares x where x.token_hash = p_token_hash and x.revogado_em is null;
  if c.id is null then return false; end if;
  if privado.qr_contar(encode(sha256(convert_to(p_chave || ':o:' || c.id::text, 'utf8')), 'hex'), 'tocou',
                       date_trunc('hour', now())) > 1 then
    return false;
  end if;
  insert into public.events (book_id, ator_tipo, acao, detalhes)
    values (c.book_id, 'familia', 'compartilhada_tocada', jsonb_build_object('story_id', c.story_id));
  return true;
end $$;

-- ── 5. Lembrar com carinho ─────────────────────────────────────────────────
alter table public.prompts add column lembrada_em timestamptz;

create function public.lembrar_pergunta(p_prompt uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
begin
  select p.book_id into v_livro from public.prompts p where p.id = p_prompt;
  perform privado.membro_editando(v_livro);
  update public.prompts set lembrada_em = now() where id = p_prompt and estado = 'enviada';
  return found;
end $$;

-- ── 6. Resumo semanal (só ids e números saem daqui; T36 e P42) ─────────────
alter table public.book_members add column resumo_semanal boolean not null default true;

create function public.definir_resumo_semanal(p_livro uuid, p_ligado boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_ligado is null then raise exception 'dados_invalidos'; end if;
  update public.book_members set resumo_semanal = p_ligado
  where book_id = p_livro and user_id = (select auth.uid());
  return found;
end $$;

-- Descadastro de 1 clique (List-Unsubscribe): o servidor confere o HMAC de "resumo:{membro}" e chama.
create function public.servico_desligar_resumo(p_membro uuid) returns boolean
language sql security definer set search_path = '' as $$
  update public.book_members set resumo_semanal = false where id = p_membro returning true
$$;

create function public.servico_livros_para_resumo() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select b.id from public.books b
  where privado.livro_editavel(b.id)
    and exists (select 1 from public.book_members m where m.book_id = b.id and m.resumo_semanal)
$$;

create function public.servico_membros_para_resumo(p_livro uuid)
returns table (membro_id uuid, user_id uuid)
language sql stable security definer set search_path = '' as $$
  select m.id, m.user_id from public.book_members m
  where m.book_id = p_livro and m.resumo_semanal and privado.livro_editavel(p_livro)
$$;

-- Histórias novas = ficaram prontas (a IA terminou) nos últimos 7 dias. Páginas = palavras ÷ 320,
-- a mesma conta de lib/livro/paginas.ts (teste de paridade).
create function privado.palavras_por_pagina() returns integer
language sql immutable set search_path = '' as $$ select 320 $$; -- PALAVRAS_POR_PAGINA_ESTIMADA

create function privado.palavras_do_texto(p_texto jsonb) returns integer
language sql immutable set search_path = '' as $$
  select count(*)::integer
  from jsonb_array_elements(coalesce(p_texto -> 'paragrafos', '[]'::jsonb)) p,
       regexp_split_to_table(btrim(coalesce(p ->> 'texto', '')), '[[:space:]]+') w
  where w <> ''
$$;

create function public.servico_resumo_semanal(p_livro uuid)
returns table (historias_novas integer, perguntas_esperando integer, paginas_estimadas integer)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::integer from public.stories s
     where s.book_id = p_livro and s.estado = 'pronta' and s.pronta_em > now() - interval '7 days'),
    (select count(*)::integer from public.prompts p where p.book_id = p_livro and p.estado = 'enviada'),
    (select ceil(coalesce(sum(privado.palavras_do_texto(s.texto)), 0)::numeric
                 / privado.palavras_por_pagina())::integer
     from public.stories s where s.book_id = p_livro and s.texto is not null)
$$;

-- ── Privilégios das funções ────────────────────────────────────────────────
revoke all on function
  privado.max_cofacilitadores(), privado.max_convites_dia(), privado.max_convites_por_email_dia(),
  privado.convite_validade_dias(), privado.eh_responsavel(uuid), privado.convite_valido(uuid),
  privado.conferir_convite(uuid, uuid, text), privado.tirar_cofacilitador(uuid, uuid, uuid),
  privado.palavras_por_pagina(), privado.palavras_do_texto(jsonb)
from public;
revoke all on function
  public.servico_pode_convidar(uuid, uuid, text),
  public.servico_criar_convite(uuid, uuid, uuid, text, text, smallint), public.servico_ler_convite(text),
  public.meus_convites(), public.aceitar_convite(uuid), public.cancelar_convite(uuid),
  public.membros_do_livro(uuid), public.remover_membro(uuid, uuid), public.sair_do_livro(uuid),
  public.servico_compartilhar_historia(uuid, uuid, uuid, text, smallint),
  public.revogar_compartilhamento(uuid), public.servico_ler_compartilhada(text),
  public.servico_compartilhada_tocou(text, text), public.lembrar_pergunta(uuid),
  public.definir_resumo_semanal(uuid, boolean), public.servico_desligar_resumo(uuid),
  public.servico_livros_para_resumo(), public.servico_membros_para_resumo(uuid),
  public.servico_resumo_semanal(uuid)
from public, anon, authenticated;
-- create or replace mantém os privilégios; repetido para ficar explícito.
revoke all on function public.servico_trocar_link_familia(uuid, uuid, uuid, text, smallint),
  public.servico_trocar_link_autor(uuid, uuid, uuid, text, smallint)
from public, anon, authenticated;

grant execute on function privado.eh_responsavel(uuid) to authenticated;
grant execute on function
  public.meus_convites(), public.aceitar_convite(uuid), public.cancelar_convite(uuid),
  public.membros_do_livro(uuid), public.remover_membro(uuid, uuid), public.sair_do_livro(uuid),
  public.revogar_compartilhamento(uuid), public.lembrar_pergunta(uuid),
  public.definir_resumo_semanal(uuid, boolean)
to authenticated;
grant execute on function
  public.servico_pode_convidar(uuid, uuid, text),
  public.servico_criar_convite(uuid, uuid, uuid, text, text, smallint), public.servico_ler_convite(text),
  public.servico_compartilhar_historia(uuid, uuid, uuid, text, smallint),
  public.servico_ler_compartilhada(text), public.servico_compartilhada_tocou(text, text),
  public.servico_desligar_resumo(uuid), public.servico_livros_para_resumo(),
  public.servico_membros_para_resumo(uuid), public.servico_resumo_semanal(uuid),
  public.servico_trocar_link_familia(uuid, uuid, uuid, text, smallint),
  public.servico_trocar_link_autor(uuid, uuid, uuid, text, smallint)
to service_role;
