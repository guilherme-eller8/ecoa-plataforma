-- 20261110120000_perguntas_causos_enquete.sql
-- Fotos, perguntas, causos, link da família e enquete, com RLS.
--
-- Regras deste arquivo:
-- * A família (sem login) só entra por 3 funções familia_*, que recebem o token do link,
--   calculam o hash aqui dentro e alcançam um livro só. Nenhuma tabela tem grant para anon.
-- * Toda tabela filha guarda book_id e aponta para o pai pelo par (book_id, id): uma linha
--   nunca liga duas famílias, mesmo que o código erre.
-- * Enquete e link da família só mudam por funções que conferem membro e plano ativo;
--   quem está logado só lê essas tabelas.
-- * Caminhos de arquivo são validados por regex ancorada (nada de "..", "%2e" etc.).

create type public.parentesco as enum ('pai', 'mae', 'avo', 'avoa', 'tio', 'tia', 'outro');
create type public.prompt_tipo as enum ('pergunta', 'causo');
create type public.prompt_origem as enum ('banco', 'propria', 'causo', 'enquete');
create type public.prompt_estado as enum ('para_enviar', 'enviada', 'respondida', 'pulada');
create type public.causo_estado as enum ('novo', 'virou_pergunta', 'na_enquete', 'arquivado');
create type public.enquete_estado as enum ('aberta', 'encerrada');

-- Papel sem login que será o dono das funções autor_* (prompt 5). Não recebe grant em
-- nenhuma tabela da família: o isolamento do autor vem de privilégio, não de convenção.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'porta_autor') then
    create role porta_autor nologin noinherit;
  end if;
end $$;

-- ── Números de negócio que o banco também confere ──────────────────────────
-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts garante que batem.
create function privado.votos_por_pessoa() returns integer
language sql immutable set search_path = '' as $$ select 5 $$;
create function privado.max_itens_enquete() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;
create function privado.max_votantes_por_enquete() returns integer
language sql immutable set search_path = '' as $$ select 150 $$;
create function privado.max_trocas_voto_por_hora() returns integer
language sql immutable set search_path = '' as $$ select 300 $$;
create function privado.max_causos_por_hora() returns integer
language sql immutable set search_path = '' as $$ select 20 $$;
create function privado.max_causos_por_dia() returns integer
language sql immutable set search_path = '' as $$ select 40 $$;
create function privado.max_fotos_por_livro() returns integer
language sql immutable set search_path = '' as $$ select 200 $$;

-- ── Fotos (acervo) ─────────────────────────────────────────────────────────
-- Comprimidas no navegador para JPEG de até 3000 px antes de subir.
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  caminho text not null unique,
  largura integer check (largura between 1 and 10000),
  altura integer check (altura between 1 and 10000),
  legenda text check (legenda is null or char_length(legenda) <= 300),
  criado_por uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (book_id, id),
  constraint photos_caminho_do_livro check (
    -- regex literal: um CHECK roda com o usuário corrente, que não executa funções de privado
    caminho ~ ('^livros/' || book_id::text || '/acervo/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
  )
);
create index photos_livro_data on public.photos (book_id, criado_em desc);

create function privado.cota_de_fotos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.photos where book_id = new.book_id) >= privado.max_fotos_por_livro() then
    raise exception 'cota_fotos';
  end if;
  return new;
end $$;
create trigger photos_cota before insert on public.photos
  for each row execute function privado.cota_de_fotos();

-- ── Autor: apelido, parentesco, foto e estado da configuração inicial ──────
alter table public.books
  add column autor_apelido text
    check (autor_apelido is null or char_length(btrim(autor_apelido)) between 1 and 60),
  add column autor_parentesco public.parentesco,
  add column autor_foto_id uuid,
  -- {"quem": "feito"|"pulado"|"depois", "perguntas": ..., "fotos": ...}
  add column configuracao jsonb not null default '{}'::jsonb
    check (jsonb_typeof(configuracao) = 'object' and pg_column_size(configuracao) < 500),
  add constraint books_autor_foto_do_livro foreign key (id, autor_foto_id)
    references public.photos (book_id, id) on delete set null (autor_foto_id);

-- ── Causos sugeridos pela família: guardados exatamente como chegaram ──────
-- Com áudio, o causo nasce antes do arquivo: o caminho é fixado aqui, o servidor assina
-- o upload só para ele e confirma o recebimento. Sem confirmação, ninguém vê o causo.
create table public.causos (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  texto text check (texto is null or char_length(btrim(texto)) between 1 and 2000),
  audio_caminho text unique,
  audio_recebido_em timestamptz,
  duracao_s integer check (duracao_s is null or duracao_s between 1 and 190),
  consentimento_em timestamptz not null,
  consentimento_versao smallint not null check (consentimento_versao between 1 and 99),
  estado public.causo_estado not null default 'novo',
  criado_em timestamptz not null default now(),
  unique (book_id, id),
  constraint causos_texto_ou_audio check (texto is not null or audio_caminho is not null),
  constraint causos_recebido_tem_audio check (
    audio_recebido_em is null or (audio_caminho is not null and duracao_s is not null)
  ),
  constraint causos_audio_do_livro check (
    audio_caminho is null
    or audio_caminho ~ ('^livros/' || book_id::text || '/causos/' || id::text || '\.(webm|m4a|ogg)$')
  )
);
create index causos_livro_data on public.causos (book_id, criado_em desc);

-- ── Perguntas e causos a enviar ao autor ───────────────────────────────────
create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  tipo public.prompt_tipo not null default 'pergunta',
  texto text not null check (char_length(btrim(texto)) between 3 and 500),
  origem public.prompt_origem not null,
  banco_id text check (banco_id is null or banco_id ~ '^[a-z]+-[0-9]{2,3}$'),
  causo_id uuid,
  photo_id uuid,
  estado public.prompt_estado not null default 'para_enviar',
  enviada_em timestamptz,
  ordem integer not null default 0,
  criado_por uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (book_id, id),
  foreign key (book_id, causo_id) references public.causos (book_id, id) on delete set null (causo_id),
  foreign key (book_id, photo_id) references public.photos (book_id, id) on delete set null (photo_id),
  constraint prompts_banco_tem_id check (origem <> 'banco' or banco_id is not null),
  constraint prompts_causo_tem_id check (origem <> 'causo' or causo_id is not null)
);
create unique index prompts_banco_uma_vez on public.prompts (book_id, banco_id) where banco_id is not null;
create index prompts_livro_estado on public.prompts (book_id, estado, ordem);
create trigger prompts_atualizado_em before update on public.prompts
  for each row execute function privado.tocar_atualizado_em();

-- Quem está logado só faz as transições da tela; "respondida" vem do fluxo do autor
-- (servidor). enviada_em é sempre o banco que preenche.
create function privado.transicao_da_pergunta() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.estado is distinct from old.estado then
    if current_user = 'authenticated' and not (
      (old.estado, new.estado) in (
        ('para_enviar', 'pulada'), ('pulada', 'para_enviar'),
        ('para_enviar', 'enviada'), ('enviada', 'para_enviar'))
    ) then
      raise exception 'transicao_invalida';
    end if;
    new.enviada_em := case when new.estado = 'enviada' then now()
                           when new.estado = 'para_enviar' then null
                           else old.enviada_em end;
  end if;
  return new;
end $$;
create trigger prompts_transicao before update on public.prompts
  for each row execute function privado.transicao_da_pergunta();

-- ── Link da família (fixado no grupo de WhatsApp) ──────────────────────────
-- Só o hash do token. O servidor deriva o token de id e chave_versao com um segredo
-- (HMAC) para mostrar o link de novo; o banco sozinho nunca permite reconstruí-lo.
create table public.family_access (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  chave_versao smallint not null default 1 check (chave_versao between 1 and 99),
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null,
  revogado_em timestamptz
);
create unique index family_access_um_ativo on public.family_access (book_id) where revogado_em is null;

create function privado.revogacao_definitiva() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.revogado_em is not null and new.revogado_em is distinct from old.revogado_em then
    raise exception 'link_ja_revogado';
  end if;
  return new;
end $$;
create trigger family_access_revogacao before update on public.family_access
  for each row execute function privado.revogacao_definitiva();

-- ── Enquete ────────────────────────────────────────────────────────────────
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  estado public.enquete_estado not null default 'aberta',
  aberta_em timestamptz not null default now(),
  encerrada_em timestamptz,
  -- janela de 1 hora para o teto de trocas de voto (só as funções mexem)
  trocas_desde timestamptz not null default now(),
  trocas integer not null default 0,
  unique (book_id, id),
  constraint polls_encerrada_tem_data check ((estado = 'encerrada') = (encerrada_em is not null))
);
create unique index polls_uma_aberta on public.polls (book_id) where estado = 'aberta';

create table public.poll_items (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null,
  poll_id uuid not null,
  tipo public.prompt_tipo not null default 'pergunta',
  texto text not null check (char_length(btrim(texto)) between 3 and 500),
  banco_id text check (banco_id is null or banco_id ~ '^[a-z]+-[0-9]{2,3}$'),
  causo_id uuid,
  ordem integer not null default 0,
  prompt_id uuid, -- preenchido quando o item é salvo em Para enviar
  unique (poll_id, id),
  foreign key (book_id, poll_id) references public.polls (book_id, id) on delete cascade,
  foreign key (book_id, causo_id) references public.causos (book_id, id) on delete set null (causo_id),
  foreign key (book_id, prompt_id) references public.prompts (book_id, id) on delete set null (prompt_id)
);
create index poll_items_enquete on public.poll_items (poll_id, ordem);

-- Um voto = um item escolhido por um aparelho. "votante" agrupa o conjunto de um aparelho
-- (é o que o responsável remove); aparelho_hash nunca é lido por quem está logado.
create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null,
  poll_id uuid not null,
  poll_item_id uuid not null,
  votante uuid not null,
  aparelho_hash text not null check (aparelho_hash ~ '^[0-9a-f]{64}$'),
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  criado_em timestamptz not null default now(),
  unique (poll_item_id, votante),
  foreign key (book_id, poll_id) references public.polls (book_id, id) on delete cascade,
  foreign key (poll_id, poll_item_id) references public.poll_items (poll_id, id) on delete cascade
);
create index poll_votes_enquete_aparelho on public.poll_votes (poll_id, aparelho_hash);

-- ── RLS e grants ───────────────────────────────────────────────────────────
alter table public.photos enable row level security;
alter table public.causos enable row level security;
alter table public.prompts enable row level security;
alter table public.family_access enable row level security;
alter table public.polls enable row level security;
alter table public.poll_items enable row level security;
alter table public.poll_votes enable row level security;

revoke all on public.photos, public.causos, public.prompts, public.family_access,
  public.polls, public.poll_items, public.poll_votes from anon, authenticated, porta_autor;
grant all on public.photos, public.causos, public.prompts, public.family_access,
  public.polls, public.poll_items, public.poll_votes to service_role;

grant update (autor_apelido, autor_parentesco, autor_foto_id, configuracao) on public.books to authenticated;

grant select, insert (book_id, caminho, largura, altura, legenda), update (legenda)
  on public.photos to authenticated;
grant select (id, book_id, nome, texto, audio_caminho, audio_recebido_em, duracao_s,
  consentimento_em, consentimento_versao, estado, criado_em), update (estado)
  on public.causos to authenticated;
grant select, delete, insert (book_id, tipo, texto, origem, banco_id, causo_id, photo_id, ordem),
  update (tipo, texto, photo_id, estado, ordem) on public.prompts to authenticated;
grant select (id, book_id, chave_versao, criado_em, criado_por, revogado_em)
  on public.family_access to authenticated;
grant select (id, book_id, estado, aberta_em, encerrada_em) on public.polls to authenticated;
grant select on public.poll_items to authenticated;
grant select (id, book_id, poll_id, poll_item_id, votante, nome, criado_em)
  on public.poll_votes to authenticated;

-- Membro lê o próprio livro; causo com áudio só aparece depois que o áudio chegou.
create policy "membro lê" on public.photos for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê" on public.prompts for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê" on public.family_access for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê" on public.polls for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê" on public.poll_items for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê" on public.poll_votes for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê causo completo" on public.causos for select to authenticated
  using (privado.eh_membro(book_id) and (texto is not null or audio_recebido_em is not null));

-- Escrever exige plano ativo e no prazo.
create policy "membro cria com plano ativo" on public.photos for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
create policy "membro altera com plano ativo" on public.photos for update to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id))
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
create policy "membro cria com plano ativo" on public.prompts for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
create policy "membro altera com plano ativo" on public.prompts for update to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id))
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
create policy "membro apaga pergunta ainda não enviada" on public.prompts for delete to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id) and estado = 'para_enviar');
create policy "membro altera estado com plano ativo" on public.causos for update to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id))
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));

-- ── Auxiliares das portas da família ───────────────────────────────────────
create function privado.livro_da_familia(p_token text) returns uuid
language sql stable security definer set search_path = '' as $$
  select f.book_id from public.family_access f
  where p_token is not null and octet_length(p_token) between 16 and 128
    and f.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and f.revogado_em is null
$$;

-- O mesmo aparelho tem um hash diferente em cada livro: não dá para cruzar famílias.
create function privado.hash_aparelho(p_livro uuid, p_aparelho text) returns text
language sql immutable set search_path = '' as $$
  select case when p_livro is not null and p_aparelho is not null
                   and octet_length(p_aparelho) between 32 and 64
    then encode(sha256(convert_to('aparelho:' || p_livro::text || ':' || p_aparelho, 'UTF8')), 'hex') end
$$;

-- Erro com nome de código, sem detalhe do esquema.
create function privado.membro_editando(p_livro uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_livro is null or not privado.eh_membro(p_livro) then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then
    raise exception 'livro_fechado';
  end if;
end $$;

-- ── Portas da família (anon, com o token do link) ──────────────────────────
-- O que a página /f/[token] mostra. null = link inválido ou revogado.
create function public.familia_pagina(p_token text, p_aparelho text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_livro uuid := privado.livro_da_familia(p_token);
  v_hash text;
  v_enquete jsonb;
begin
  if v_livro is null then
    return null;
  end if;
  v_hash := privado.hash_aparelho(v_livro, p_aparelho);
  select jsonb_build_object(
    'id', p.id,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'texto', i.texto, 'tipo', i.tipo) order by i.ordem, i.id)
      from public.poll_items i where i.poll_id = p.id), '[]'::jsonb),
    'meus_votos', coalesce((
      select jsonb_agg(v.poll_item_id) from public.poll_votes v
      where v.poll_id = p.id and v.aparelho_hash = v_hash), '[]'::jsonb),
    'meu_nome', (
      select v.nome from public.poll_votes v
      where v.poll_id = p.id and v.aparelho_hash = v_hash limit 1)
  ) into v_enquete
  from public.polls p
  where p.book_id = v_livro and p.estado = 'aberta';

  return jsonb_build_object(
    'autor', (select coalesce(b.autor_apelido, b.autor_nome) from public.books b where b.id = v_livro),
    'aberto', privado.livro_editavel(v_livro),
    'votos_por_pessoa', privado.votos_por_pessoa(),
    'enquete', v_enquete
  );
end $$;

-- Grava (ou troca) o conjunto de votos de um aparelho na enquete aberta do livro do token.
-- Devolve {votos, livro, votante} para o servidor registrar o evento.
create function public.familia_votar(p_token text, p_aparelho text, p_nome text, p_itens uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
  v_hash text;
  v_itens uuid[];
  v_enquete public.polls;
  v_votante uuid;
begin
  -- Tamanho da entrada antes de qualquer outra coisa.
  if p_itens is null or cardinality(p_itens) > privado.max_itens_enquete()
     or p_nome is null or octet_length(p_nome) > 320 then
    raise exception 'dados_invalidos';
  end if;
  v_livro := privado.livro_da_familia(p_token);
  if v_livro is null then
    raise exception 'link_invalido';
  end if;
  if not privado.livro_editavel(v_livro) then
    raise exception 'livro_fechado';
  end if;
  v_hash := privado.hash_aparelho(v_livro, p_aparelho);
  if v_hash is null or char_length(btrim(p_nome)) not between 1 and 80 then
    raise exception 'dados_invalidos';
  end if;
  v_itens := array(select distinct x from unnest(p_itens) x where x is not null);
  if cardinality(v_itens) not between 1 and privado.votos_por_pessoa() then
    raise exception 'quantidade_invalida';
  end if;

  -- Trava a enquete: votos, trocas e encerramento ficam em fila.
  select * into v_enquete from public.polls p
  where p.book_id = v_livro and p.estado = 'aberta'
  for update;
  if v_enquete.id is null then
    raise exception 'sem_enquete';
  end if;
  if exists (
    select 1 from unnest(v_itens) x
    where not exists (select 1 from public.poll_items i where i.id = x and i.poll_id = v_enquete.id)
  ) then
    raise exception 'item_invalido';
  end if;

  select v.votante into v_votante from public.poll_votes v
  where v.poll_id = v_enquete.id and v.aparelho_hash = v_hash limit 1;
  if v_votante is null and (
    select count(distinct v.votante) from public.poll_votes v where v.poll_id = v_enquete.id
  ) >= privado.max_votantes_por_enquete() then
    raise exception 'limite_votantes';
  end if;

  if v_enquete.trocas_desde < now() - interval '1 hour' then
    update public.polls set trocas_desde = now(), trocas = 1 where id = v_enquete.id;
  elsif v_enquete.trocas >= privado.max_trocas_voto_por_hora() then
    raise exception 'limite_por_hora';
  else
    update public.polls set trocas = trocas + 1 where id = v_enquete.id;
  end if;

  v_votante := coalesce(v_votante, gen_random_uuid());
  delete from public.poll_votes where poll_id = v_enquete.id and aparelho_hash = v_hash;
  insert into public.poll_votes (book_id, poll_id, poll_item_id, votante, aparelho_hash, nome)
  select v_livro, v_enquete.id, x, v_votante, v_hash, btrim(p_nome) from unnest(v_itens) x;
  return jsonb_build_object('votos', cardinality(v_itens), 'livro', v_livro, 'votante', v_votante);
end $$;

-- Recebe um causo exatamente como a pessoa enviou. Com áudio (p_audio_tipo), devolve o
-- caminho fixo onde o servidor vai autorizar o upload; o causo só aparece depois da
-- confirmação (servico_confirmar_audio_causo).
create function public.familia_enviar_causo(
  p_token text, p_nome text, p_texto text, p_audio_tipo text,
  p_consentimento boolean, p_consentimento_versao smallint
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
  v_id uuid := gen_random_uuid();
  v_caminho text;
begin
  if p_nome is null or octet_length(p_nome) > 320
     or (p_texto is not null and octet_length(p_texto) > 8000)
     or (p_audio_tipo is not null and p_audio_tipo not in ('webm', 'm4a', 'ogg'))
     or ((nullif(btrim(coalesce(p_texto, '')), '') is null) = (p_audio_tipo is null)) -- um ou outro
     or char_length(btrim(p_nome)) not between 1 and 80
     or (p_texto is not null and char_length(btrim(p_texto)) > 2000)
     or p_consentimento_versao is null or p_consentimento_versao not between 1 and 99 then
    raise exception 'dados_invalidos';
  end if;
  if p_consentimento is not true then
    raise exception 'sem_consentimento';
  end if;
  v_livro := privado.livro_da_familia(p_token);
  if v_livro is null then
    raise exception 'link_invalido';
  end if;
  if not privado.livro_editavel(v_livro) then
    raise exception 'livro_fechado';
  end if;

  -- Uma fila por livro: a contagem e o insert não correm em paralelo.
  perform pg_advisory_xact_lock(hashtextextended('causos:' || v_livro::text, 0));
  if (select count(*) from public.causos c
      where c.book_id = v_livro and c.criado_em > now() - interval '1 hour') >= privado.max_causos_por_hora()
     or (select count(*) from public.causos c
      where c.book_id = v_livro and c.criado_em > now() - interval '1 day') >= privado.max_causos_por_dia() then
    raise exception 'limite_causos';
  end if;

  if p_audio_tipo is not null then
    v_caminho := 'livros/' || v_livro::text || '/causos/' || v_id::text || '.' || p_audio_tipo;
  end if;
  insert into public.causos (id, book_id, nome, texto, audio_caminho, consentimento_em, consentimento_versao)
  values (v_id, v_livro, btrim(p_nome), nullif(btrim(p_texto), ''), v_caminho, now(), p_consentimento_versao);
  return jsonb_build_object('id', v_id, 'livro', v_livro, 'audio_caminho', v_caminho);
end $$;

-- ── Funções do servidor (chave secreta), que ainda conferem o token ou o membro ──
-- Caminho para assinar o upload: só causo do livro do token, aguardando áudio, de até 30 min.
create function public.servico_caminho_audio_causo(p_token text, p_causo uuid)
returns text language sql stable security definer set search_path = '' as $$
  select c.audio_caminho from public.causos c
  where c.id = p_causo
    and c.book_id = privado.livro_da_familia(p_token)
    and c.audio_caminho is not null and c.audio_recebido_em is null
    and c.criado_em > now() - interval '30 minutes'
$$;

-- O servidor chama depois de conferir que o arquivo existe no Storage.
create function public.servico_confirmar_audio_causo(p_token text, p_causo uuid, p_duracao_s integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_duracao_s is null or p_duracao_s not between 1 and 190 then
    raise exception 'dados_invalidos';
  end if;
  update public.causos c
  set audio_recebido_em = now(), duracao_s = p_duracao_s
  where c.id = p_causo
    and c.book_id = privado.livro_da_familia(p_token)
    and c.audio_caminho is not null and c.audio_recebido_em is null
    and c.criado_em > now() - interval '30 minutes';
  return found;
end $$;

-- Gera ou troca o link da família. Revoga o ativo e cria o novo na mesma transação.
create function public.servico_trocar_link_familia(
  p_livro uuid, p_usuario uuid, p_id uuid, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.book_members m where m.book_id = p_livro and m.user_id = p_usuario) then
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

-- ── Ações do responsável na enquete (conferem membro e plano ativo) ────────
-- Candidato da enquete. O causo, quando há, precisa ser do mesmo livro.
create function privado.item_valido(p_livro uuid, p_item jsonb) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if jsonb_typeof(p_item) is distinct from 'object'
     or jsonb_typeof(p_item -> 'texto') is distinct from 'string'
     or octet_length(p_item ->> 'texto') > 2000
     or char_length(btrim(p_item ->> 'texto')) not between 3 and 500
     or coalesce(p_item ->> 'tipo', 'pergunta') not in ('pergunta', 'causo')
     or (p_item ? 'banco_id' and jsonb_typeof(p_item -> 'banco_id') <> 'null'
         and coalesce(p_item ->> 'banco_id', '') !~ '^[a-z]+-[0-9]{2,3}$')
     or (p_item ? 'causo_id' and jsonb_typeof(p_item -> 'causo_id') <> 'null'
         and coalesce(p_item ->> 'causo_id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return false;
  end if;
  if p_item ->> 'causo_id' is not null and not exists (
    select 1 from public.causos c where c.id = (p_item ->> 'causo_id')::uuid and c.book_id = p_livro
  ) then
    return false;
  end if;
  return true;
end $$;

-- Abre a enquete com os candidatos: [{"texto", "tipo", "banco_id", "causo_id"}].
create function public.enquete_abrir(p_livro uuid, p_itens jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_enquete uuid;
begin
  perform privado.membro_editando(p_livro);
  if p_itens is null or jsonb_typeof(p_itens) is distinct from 'array'
     or jsonb_array_length(p_itens) not between 2 and privado.max_itens_enquete() then
    raise exception 'dados_invalidos';
  end if;
  if exists (select 1 from jsonb_array_elements(p_itens) i where not privado.item_valido(p_livro, i)) then
    raise exception 'item_invalido';
  end if;
  if exists (select 1 from public.polls where book_id = p_livro and estado = 'aberta') then
    raise exception 'enquete_aberta';
  end if;
  insert into public.polls (book_id) values (p_livro) returning id into v_enquete;
  insert into public.poll_items (book_id, poll_id, tipo, texto, banco_id, causo_id, ordem)
  select p_livro, v_enquete, coalesce(i ->> 'tipo', 'pergunta')::public.prompt_tipo,
         btrim(i ->> 'texto'), i ->> 'banco_id', (i ->> 'causo_id')::uuid, (n - 1)::integer
  from jsonb_array_elements(p_itens) with ordinality as e (i, n);
  update public.causos set estado = 'na_enquete'
  where book_id = p_livro and estado = 'novo'
    and id in (select (i ->> 'causo_id')::uuid from jsonb_array_elements(p_itens) i);
  return v_enquete;
end $$;

-- Acrescenta um candidato à enquete aberta (ex.: "Pôr na enquete" num causo).
create function public.enquete_adicionar_item(p_enquete uuid, p_item jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_enquete public.polls;
  v_id uuid;
begin
  select * into v_enquete from public.polls where id = p_enquete for update;
  perform privado.membro_editando(v_enquete.book_id);
  if v_enquete.estado <> 'aberta' then
    raise exception 'enquete_encerrada';
  end if;
  if not privado.item_valido(v_enquete.book_id, p_item) then
    raise exception 'item_invalido';
  end if;
  if (select count(*) from public.poll_items where poll_id = p_enquete) >= privado.max_itens_enquete() then
    raise exception 'limite_itens';
  end if;
  insert into public.poll_items (book_id, poll_id, tipo, texto, banco_id, causo_id, ordem)
  values (v_enquete.book_id, p_enquete, coalesce(p_item ->> 'tipo', 'pergunta')::public.prompt_tipo,
          btrim(p_item ->> 'texto'), p_item ->> 'banco_id', (p_item ->> 'causo_id')::uuid,
          (select coalesce(max(ordem), -1) + 1 from public.poll_items where poll_id = p_enquete))
  returning id into v_id;
  update public.causos set estado = 'na_enquete'
  where book_id = v_enquete.book_id and estado = 'novo' and id = (p_item ->> 'causo_id')::uuid;
  return v_id;
end $$;

create function public.enquete_encerrar(p_enquete uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
begin
  select book_id into v_livro from public.polls where id = p_enquete for update;
  perform privado.membro_editando(v_livro);
  update public.polls set estado = 'encerrada', encerrada_em = now()
  where id = p_enquete and estado = 'aberta';
end $$;

-- Remove o conjunto de votos de uma pessoa (votante).
create function public.enquete_remover_votos(p_enquete uuid, p_votante uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
  v_total integer;
begin
  select book_id into v_livro from public.polls where id = p_enquete for update;
  perform privado.membro_editando(v_livro);
  delete from public.poll_votes where poll_id = p_enquete and votante = p_votante;
  get diagnostics v_total = row_count;
  return v_total;
end $$;

-- Salva itens em Para enviar. Item já salvo, ou pergunta do banco já na lista, não duplica,
-- nem com toque duplo: os itens ficam travados até o fim. Devolve quantos itens foram ligados.
create function public.enquete_salvar(p_enquete uuid, p_itens uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
  r record;
  v_prompt uuid;
  v_total integer := 0;
begin
  select book_id into v_livro from public.polls where id = p_enquete;
  perform privado.membro_editando(v_livro);
  if p_itens is null or cardinality(p_itens) > privado.max_itens_enquete() then
    raise exception 'dados_invalidos';
  end if;
  for r in
    select i.id, i.tipo, i.texto, i.banco_id, i.causo_id from public.poll_items i
    where i.poll_id = p_enquete and i.id = any (p_itens) and i.prompt_id is null
    order by i.ordem
    for update
  loop
    v_prompt := null;
    insert into public.prompts (book_id, tipo, texto, origem, banco_id, causo_id)
    values (v_livro, r.tipo, r.texto, 'enquete', r.banco_id, r.causo_id)
    on conflict (book_id, banco_id) where banco_id is not null do nothing
    returning id into v_prompt;
    if v_prompt is null then
      select p.id into v_prompt from public.prompts p where p.book_id = v_livro and p.banco_id = r.banco_id;
    end if;
    update public.poll_items set prompt_id = v_prompt where id = r.id and prompt_id is null;
    if found then
      v_total := v_total + 1;
      update public.causos set estado = 'virou_pergunta'
      where id = r.causo_id and book_id = v_livro and estado in ('novo', 'na_enquete');
    end if;
  end loop;
  return v_total;
end $$;

-- ── Quem executa o quê ─────────────────────────────────────────────────────
revoke all on function
  public.familia_pagina(text, text),
  public.familia_votar(text, text, text, uuid[]),
  public.familia_enviar_causo(text, text, text, text, boolean, smallint),
  public.servico_caminho_audio_causo(text, uuid),
  public.servico_confirmar_audio_causo(text, uuid, integer),
  public.servico_trocar_link_familia(uuid, uuid, uuid, text, smallint),
  public.enquete_abrir(uuid, jsonb),
  public.enquete_adicionar_item(uuid, jsonb),
  public.enquete_encerrar(uuid),
  public.enquete_remover_votos(uuid, uuid),
  public.enquete_salvar(uuid, uuid[])
  from public, anon, authenticated;
grant execute on function
  public.familia_pagina(text, text),
  public.familia_votar(text, text, text, uuid[]),
  public.familia_enviar_causo(text, text, text, text, boolean, smallint)
  to anon, service_role;
grant execute on function
  public.servico_caminho_audio_causo(text, uuid),
  public.servico_confirmar_audio_causo(text, uuid, integer),
  public.servico_trocar_link_familia(uuid, uuid, uuid, text, smallint)
  to service_role;
grant execute on function
  public.enquete_abrir(uuid, jsonb),
  public.enquete_adicionar_item(uuid, jsonb),
  public.enquete_encerrar(uuid),
  public.enquete_remover_votos(uuid, uuid),
  public.enquete_salvar(uuid, uuid[])
  to authenticated, service_role;
revoke all on function
  privado.votos_por_pessoa(), privado.max_itens_enquete(), privado.max_votantes_por_enquete(),
  privado.max_trocas_voto_por_hora(), privado.max_causos_por_hora(), privado.max_causos_por_dia(),
  privado.max_fotos_por_livro(), privado.cota_de_fotos(),
  privado.transicao_da_pergunta(), privado.revogacao_definitiva(),
  privado.livro_da_familia(text), privado.hash_aparelho(uuid, text),
  privado.membro_editando(uuid), privado.item_valido(uuid, jsonb)
  from public, anon, authenticated;

-- ── Storage (pulado nos testes com PGlite) ─────────────────────────────────
-- Buckets privados, sem políticas em storage.objects: só URLs assinadas pelo servidor.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('acervo', 'acervo', false, 5242880, array['image/jpeg']),
      ('causos', 'causos', false, 2097152, array['audio/webm', 'audio/mp4', 'audio/ogg'])
    on conflict (id) do nothing;
  end if;
end $$;
