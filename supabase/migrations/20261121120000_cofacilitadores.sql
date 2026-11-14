-- 20261121120000_cofacilitadores.sql
-- Prompt 11: co-facilitadores, compartilhar no grupo, lembrar com carinho e resumo semanal.
-- Design: docs/designs/cofacilitadores-compartilhar.md.
--
-- Regras deste arquivo:
-- * O que é só do responsável passa por privado.eh_responsavel. Hoje: convidar, cancelar convite,
--   remover membro, consentir IA (P41) e desligar QR (P58). Publicar, imprimir e pagar (prompts
--   13 e 14) usam a mesma função. O co-facilitador faz o resto, pelas mesmas portas de membro.
-- * Convite preso ao e-mail (P59): só a conta com aquele e-mail aceita. O link (/convite/{token})
--   só apresenta o convite; aceitar não usa o token. Token só como hash (T6), derivado por HMAC (T25).
-- * Convites pendentes contam no teto de 3 co-facilitadores; o teto é conferido com o livro travado.
-- * story_shares e book_invites não têm porta para anon: o servidor lê por funções servico_*.
-- * porta_autor não recebe nenhum grant novo.

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.max_cofacilitadores() returns integer
language sql immutable set search_path = '' as $$ select 3 $$;  -- MAX_COFACILITADORES
create function privado.max_convites_dia() returns integer
language sql immutable set search_path = '' as $$ select 10 $$; -- MAX_CONVITES_DIA (por livro, 24 h)
create function privado.convite_validade_dias() returns integer
language sql immutable set search_path = '' as $$ select 7 $$;  -- CONVITE_VALIDADE_DIAS

create function privado.palavras_por_pagina() returns integer
language sql immutable set search_path = '' as $$ select 320 $$; -- PALAVRAS_POR_PAGINA_ESTIMADA

-- Palavras dos parágrafos de stories.texto ({titulo, ano?, paragrafos: [{texto, ...}]}).
create function privado.palavras_do_texto(p_texto jsonb) returns integer
language sql immutable set search_path = '' as $$
  select count(*)::integer
  from jsonb_array_elements(coalesce(p_texto -> 'paragrafos', '[]'::jsonb)) p,
       regexp_split_to_table(btrim(coalesce(p ->> 'texto', '')), '[[:space:]]+') w
  where w <> ''
$$;

create function privado.eh_responsavel(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.book_members m
    where m.book_id = p_book and m.user_id = (select auth.uid()) and m.papel = 'responsavel'
  )
$$;
revoke all on function privado.eh_responsavel(uuid) from public;
grant execute on function privado.eh_responsavel(uuid) to authenticated, service_role;

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
create index book_invites_email on public.book_invites (email) where aceito_em is null and revogado_em is null;
create index book_invites_livro_data on public.book_invites (book_id, criado_em desc);

alter table public.book_invites enable row level security;
revoke all on public.book_invites from anon, authenticated;
grant select (id, book_id, email, chave_versao, criado_em, expira_em, aceito_em, revogado_em)
  on public.book_invites to authenticated;
grant all on public.book_invites to service_role;
create policy "responsável lê os convites do livro" on public.book_invites
  for select to authenticated using (privado.eh_responsavel(book_id));

-- Cria o convite. Só o servidor (a conta do convidado é criada antes, pela chave secreta).
-- Revoga o pendente do mesmo e-mail e confere o teto com o livro travado.
create function public.servico_criar_convite(
  p_livro uuid, p_usuario uuid, p_id uuid, p_email text, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
begin
  perform 1 from public.books b where b.id = p_livro for update;
  if not exists (select 1 from public.book_members m
                 where m.book_id = p_livro and m.user_id = p_usuario and m.papel = 'responsavel') then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then raise exception 'livro_fechado'; end if;
  if exists (select 1 from public.book_members m join auth.users u on u.id = m.user_id
             where m.book_id = p_livro and lower(u.email) = v_email) then
    raise exception 'ja_membro';
  end if;
  if (select count(*) from public.book_invites i
      where i.book_id = p_livro and i.criado_em > now() - interval '24 hours') >= privado.max_convites_dia() then
    raise exception 'limite_convites';
  end if;
  update public.book_invites set revogado_em = now()
  where book_id = p_livro and email = v_email and aceito_em is null and revogado_em is null;
  if (select count(*) from public.book_members m where m.book_id = p_livro and m.papel = 'cofacilitador')
     + (select count(*) from public.book_invites i where i.book_id = p_livro
          and i.aceito_em is null and i.revogado_em is null and i.expira_em > now())
     >= privado.max_cofacilitadores() then
    raise exception 'limite_cofacilitadores';
  end if;
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
              when i.revogado_em is not null then 'cancelado'
              when i.expira_em <= now() then 'vencido'
              else 'pendente' end
  from public.book_invites i join public.books b on b.id = i.book_id
  where p_token_hash ~ '^[0-9a-f]{64}$' and i.token_hash = p_token_hash
$$;

-- Convites pendentes para o e-mail de quem está logado (a lista de livros mostra "Aceitar").
create function public.meus_convites()
returns table (convite_id uuid, book_id uuid, autor text, expira_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.book_id, coalesce(nullif(btrim(b.autor_apelido), ''), b.autor_nome), i.expira_em
  from public.book_invites i
  join public.books b on b.id = i.book_id
  join auth.users u on u.id = (select auth.uid())
  where i.email = lower(u.email) and u.email_confirmed_at is not null
    and i.aceito_em is null and i.revogado_em is null and i.expira_em > now()
    and not exists (select 1 from public.book_members m
                    where m.book_id = i.book_id and m.user_id = u.id)
$$;

-- Aceitar: só a conta com o e-mail do convite, com o e-mail confirmado. Idempotente para quem aceitou.
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
  if i.aceito_em is not null or i.revogado_em is not null or i.expira_em <= now() then
    raise exception 'convite_invalido';
  end if;
  if not exists (select 1 from public.book_members m
                 where m.book_id = i.book_id and m.user_id = (select auth.uid())) then
    if (select count(*) from public.book_members m
        where m.book_id = i.book_id and m.papel = 'cofacilitador') >= privado.max_cofacilitadores() then
      raise exception 'limite_cofacilitadores';
    end if;
    insert into public.book_members (book_id, user_id, papel)
    values (i.book_id, (select auth.uid()), 'cofacilitador');
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

-- Remover vale com o plano vencido (é ação de segurança, como P58). Só co-facilitador sai.
create function public.remover_membro(p_livro uuid, p_usuario uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if not privado.eh_responsavel(p_livro) then raise exception 'sem_permissao'; end if;
  delete from public.edit_locks where book_id = p_livro and user_id = p_usuario
    and exists (select 1 from public.book_members m where m.book_id = p_livro
                and m.user_id = p_usuario and m.papel = 'cofacilitador');
  delete from public.book_members
  where book_id = p_livro and user_id = p_usuario and papel = 'cofacilitador';
  return found;
end $$;

create function public.sair_do_livro(p_livro uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.edit_locks where book_id = p_livro and user_id = (select auth.uid())
    and exists (select 1 from public.book_members m where m.book_id = p_livro
                and m.user_id = (select auth.uid()) and m.papel = 'cofacilitador');
  delete from public.book_members
  where book_id = p_livro and user_id = (select auth.uid()) and papel = 'cofacilitador';
  return found;
end $$;

-- Resumo semanal: cada membro liga ou desliga o próprio.
alter table public.book_members add column resumo_semanal boolean not null default true;

create function public.definir_resumo_semanal(p_livro uuid, p_ligado boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_ligado is null then raise exception 'dados_invalidos'; end if;
  update public.book_members set resumo_semanal = p_ligado
  where book_id = p_livro and user_id = (select auth.uid());
  return found;
end $$;

-- ── 3. Compartilhar no grupo (/o/{token}) ──────────────────────────────────
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
create index story_shares_livro on public.story_shares (book_id);

alter table public.story_shares enable row level security;
revoke all on public.story_shares from anon, authenticated;
grant select (id, book_id, story_id, chave_versao, criado_em, criado_por, revogado_em)
  on public.story_shares to authenticated;
grant all on public.story_shares to service_role;
create policy "membro lê os compartilhamentos do livro" on public.story_shares
  for select to authenticated using (privado.eh_membro(book_id));

-- Devolve o link ativo da história (o servidor deriva o token de id e chave_versao) ou cria um.
create function public.servico_compartilhar_historia(
  p_story uuid, p_usuario uuid, p_id uuid, p_token_hash text, p_chave_versao smallint
) returns table (id uuid, chave_versao smallint)
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
  return query select x.id, x.chave_versao from public.story_shares x
               where x.story_id = p_story and x.revogado_em is null;
  if found then return; end if;
  insert into public.story_shares (id, book_id, story_id, token_hash, chave_versao, criado_por)
  values (p_id, s.book_id, p_story, p_token_hash, p_chave_versao, p_usuario);
  return query select p_id, p_chave_versao;
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

-- O que /o/{token} mostra: só história pronta, link ativo. A voz vem do recorte do QR, se o QR
-- estiver ligado e o recorte for da fonte de agora (a mesma regra do player).
create function public.servico_ler_compartilhada(p_token_hash text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  c record;
  s record;
  q record;
begin
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then return null; end if;
  select x.* into c from public.story_shares x where x.token_hash = p_token_hash and x.revogado_em is null;
  if c.id is null then return null; end if;
  select st.id, st.titulo, st.ano, st.texto, st.estado, st.revisada_em into s
  from public.stories st where st.id = c.story_id;
  if s.estado <> 'pronta' or s.revisada_em is null then
    return jsonb_build_object('estado', 'em_revisao');
  end if;
  select x.codigo, x.audio_caminho, x.audio_duracao_s into q from public.qr_codes x
  where x.story_id = c.story_id and x.desativado_em is null and x.audio_caminho is not null
    and x.audio_fonte is not distinct from privado.fonte_audio_da_historia(c.story_id);
  return jsonb_build_object('estado', 'ok', 'book_id', c.book_id, 'story_id', c.story_id,
    'titulo', s.titulo, 'ano', s.ano,
    -- Só o texto dos parágrafos: fontes, travas e lacunas não saem.
    'paragrafos', (select coalesce(jsonb_agg(p ->> 'texto' order by n), '[]'::jsonb)
                   from jsonb_array_elements(coalesce(s.texto -> 'paragrafos', '[]'::jsonb))
                        with ordinality e(p, n)),
    'autor', (select coalesce(nullif(btrim(b.autor_apelido), ''), b.autor_nome)
              from public.books b where b.id = c.book_id),
    'audio_caminho', q.audio_caminho, 'audio_duracao_s', q.audio_duracao_s);
end $$;

-- ── 4. Lembrar com carinho ─────────────────────────────────────────────────
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

-- ── 5. Resumo semanal (só números; nenhum texto sai do banco, T36 e P42) ───
create function public.servico_livros_para_resumo() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select b.id from public.books b
  where privado.livro_editavel(b.id)
    and exists (select 1 from public.book_members m where m.book_id = b.id and m.resumo_semanal)
$$;

create function public.servico_resumo_semanal(p_livro uuid)
returns table (historias_novas integer, perguntas_esperando integer, paginas_estimadas integer)
language sql stable security definer set search_path = '' as $$
  select
    (select count(*)::integer from public.stories s
     where s.book_id = p_livro and s.texto is not null and s.criado_em > now() - interval '7 days'),
    (select count(*)::integer from public.prompts p where p.book_id = p_livro and p.estado = 'enviada'),
    (select ceil(coalesce(sum(privado.palavras_do_texto(s.texto)), 0)::numeric
                 / privado.palavras_por_pagina())::integer
     from public.stories s where s.book_id = p_livro and s.texto is not null)
$$;

-- ── Privilégios das funções ────────────────────────────────────────────────
revoke all on function
  public.servico_criar_convite(uuid, uuid, uuid, text, text, smallint), public.servico_ler_convite(text),
  public.meus_convites(), public.aceitar_convite(uuid), public.cancelar_convite(uuid),
  public.membros_do_livro(uuid), public.remover_membro(uuid, uuid), public.sair_do_livro(uuid),
  public.definir_resumo_semanal(uuid, boolean),
  public.servico_compartilhar_historia(uuid, uuid, uuid, text, smallint),
  public.revogar_compartilhamento(uuid), public.servico_ler_compartilhada(text),
  public.lembrar_pergunta(uuid), public.servico_livros_para_resumo(), public.servico_resumo_semanal(uuid)
from public, anon, authenticated;
grant execute on function
  public.meus_convites(), public.aceitar_convite(uuid), public.cancelar_convite(uuid),
  public.membros_do_livro(uuid), public.remover_membro(uuid, uuid), public.sair_do_livro(uuid),
  public.definir_resumo_semanal(uuid, boolean), public.revogar_compartilhamento(uuid),
  public.lembrar_pergunta(uuid)
to authenticated;
grant execute on function
  public.servico_criar_convite(uuid, uuid, uuid, text, text, smallint), public.servico_ler_convite(text),
  public.servico_compartilhar_historia(uuid, uuid, uuid, text, smallint),
  public.servico_ler_compartilhada(text), public.servico_livros_para_resumo(),
  public.servico_resumo_semanal(uuid)
to service_role;
