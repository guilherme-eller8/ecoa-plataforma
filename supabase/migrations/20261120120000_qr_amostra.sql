-- 20261120120000_qr_amostra.sql
-- Prompt 10, sem as telas do autor (P55): family_messages vazia, QR permanente e o limite do
-- player público. Design: docs/designs/qr-pagina-amostra.md.
--
-- Regras deste arquivo:
-- * family_messages nasce vazia e fechada: nenhum grant para anon, authenticated ou porta_autor.
--   O prompt 12 acrescenta as colunas e as políticas dos membros.
-- * qr_codes nunca é apagado, nem pela chave secreta. Só o recorte de áudio e o desativado_em
--   mudam. O código vai impresso no livro: é público por natureza (exceção a T6, decisão T44).
-- * O player não tem porta para anon: o servidor consulta por servico_ouvir_qr, que aplica o
--   limite por chave de rede (hash, nunca o IP) antes de procurar o código.
-- * porta_autor não recebe nenhum grant novo.

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.qr_consultas_por_minuto() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;  -- QR_CONSULTAS_POR_MINUTO
create function privado.qr_audio_espera_s() returns integer
language sql immutable set search_path = '' as $$ select 600 $$; -- QR_AUDIO_ESPERA_MIN = 10

-- ── 1. family_messages (vazia até o prompt 12) ─────────────────────────────
create table public.family_messages (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  criado_em timestamptz not null default now(),
  unique (book_id, id)
);
create index family_messages_livro on public.family_messages (book_id);
alter table public.family_messages enable row level security;
revoke all on public.family_messages from public, anon, authenticated, porta_autor, service_role;
grant all on public.family_messages to service_role;
-- authenticated, anon e porta_autor: nenhum grant. RLS ligada e sem política.

-- ── 2. qr_codes (nunca apagados) ───────────────────────────────────────────
-- Código: 8 símbolos de 23456789ABCDEFGHJKMNPQRSTUVWXYZ (sem 0, 1, I, L, O), ~40 bits.
-- audio_fonte: sha256 das gravações e trechos que geraram o recorte (muda se a história muda).
create table public.qr_codes (
  codigo text primary key check (codigo ~ '^[2-9A-HJKMNP-Z]{8}$'),
  book_id uuid not null references public.books (id) on delete restrict,
  story_id uuid,
  message_id uuid,
  audio_caminho text,
  audio_fonte text check (audio_fonte is null or audio_fonte ~ '^[0-9a-f]{64}$'),
  audio_pedido_em timestamptz,
  audio_pronto_em timestamptz,
  desativado_em timestamptz,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint qr_codes_um_destino check (num_nonnulls(story_id, message_id) = 1),
  constraint qr_codes_audio_do_livro check (audio_caminho is null
    or audio_caminho ~ ('^livros/' || book_id::text || '/qr/' || codigo || '-[0-9a-f]{12}\.m4a$')),
  constraint qr_codes_audio_completo check ((audio_caminho is null) = (audio_pronto_em is null)
    and (audio_caminho is null or audio_fonte is not null)),
  unique (story_id),
  unique (message_id),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict,
  foreign key (book_id, message_id) references public.family_messages (book_id, id) on delete restrict
);
create index qr_codes_livro on public.qr_codes (book_id);

-- Nada apaga; código, livro e destino nunca mudam. Vale também para a chave secreta.
create function privado.qr_imutavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE'
     and new.codigo = old.codigo and new.book_id = old.book_id
     and new.story_id is not distinct from old.story_id
     and new.message_id is not distinct from old.message_id
     and new.criado_em = old.criado_em
     and (new.criado_por is not distinct from old.criado_por or new.criado_por is null) then
    return new;
  end if;
  raise exception 'qr_imutavel';
end $$;
create function privado.qr_sem_truncate() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'qr_imutavel';
end $$;
create trigger qr_codes_imutavel before update or delete on public.qr_codes
  for each row execute function privado.qr_imutavel();
create trigger qr_codes_sem_truncate before truncate on public.qr_codes
  for each statement execute function privado.qr_sem_truncate();

alter table public.qr_codes enable row level security;
revoke all on public.qr_codes from public, anon, authenticated, porta_autor, service_role;
grant select, insert, update on public.qr_codes to service_role;
grant select (codigo, book_id, story_id, message_id, audio_pronto_em, desativado_em, criado_em)
  on public.qr_codes to authenticated;
create policy "membro lê" on public.qr_codes for select to authenticated
  using (privado.eh_membro(book_id));

-- ── 3. Limite do player (por minuto e por chave de rede) ──────────────────
-- chave = HMAC do IP com o segredo dos links e a data, calculado no servidor. O IP nunca chega aqui.
create table public.qr_consultas (
  chave text not null check (chave ~ '^[0-9a-f]{64}$'),
  minuto timestamptz not null,
  n integer not null default 1 check (n >= 1),
  primary key (chave, minuto)
);
create index qr_consultas_minuto on public.qr_consultas (minuto);
alter table public.qr_consultas enable row level security;
revoke all on public.qr_consultas from public, anon, authenticated, porta_autor, service_role;
grant all on public.qr_consultas to service_role;

-- ── 4. Fonte do recorte: quais gravações e trechos a história usa hoje ──────
create function privado.fonte_audio_da_historia(p_story uuid) returns text
language sql stable security definer set search_path = '' as $$
  select encode(sha256(convert_to(coalesce(string_agg(
           sr.recording_id::text || ':' || coalesce(array_to_string(sr.segmentos, ','), '*'),
           '|' order by sr.ordem), ''), 'utf8')), 'hex')
  from public.story_recordings sr where sr.story_id = p_story
$$;

-- ── 5. Criar o QR de uma história (membro, plano ativo, história marcada como pronta) ──
-- p_codigo vem do servidor (crypto.randomInt). Já existe um QR para a história: devolve o mesmo.
-- precisa_audio = true reserva o pedido do recorte por QR_AUDIO_ESPERA_MIN (um job por vez).
create function public.criar_qr(p_story uuid, p_codigo text)
returns table (codigo text, precisa_audio boolean)
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  q record;
  v_fonte text;
begin
  select st.id, st.book_id, st.estado, st.revisada_em into s from public.stories st where st.id = p_story;
  if s.id is null or not privado.eh_membro(s.book_id) then raise exception 'sem_permissao'; end if;
  if not privado.livro_editavel(s.book_id) then raise exception 'sem_permissao'; end if;
  if s.estado <> 'pronta' or s.revisada_em is null then raise exception 'historia_nao_pronta'; end if;
  if not exists (select 1 from public.story_recordings sr where sr.story_id = p_story) then
    raise exception 'historia_sem_audio';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('qr:' || p_story::text, 0));
  select * into q from public.qr_codes x where x.story_id = p_story;
  if q.codigo is null then
    if p_codigo is null or p_codigo !~ '^[2-9A-HJKMNP-Z]{8}$' then raise exception 'qr_codigo_invalido'; end if;
    begin
      insert into public.qr_codes (codigo, book_id, story_id, criado_por)
        values (p_codigo, s.book_id, p_story, (select auth.uid()));
    exception when unique_violation then
      raise exception 'qr_colisao';  -- o servidor sorteia outro e tenta de novo
    end;
    select * into q from public.qr_codes x where x.codigo = p_codigo;
  end if;

  v_fonte := privado.fonte_audio_da_historia(p_story);
  if q.desativado_em is null and q.audio_fonte is distinct from v_fonte
     and (q.audio_pedido_em is null or q.audio_pedido_em < now() - make_interval(secs => privado.qr_audio_espera_s())) then
    update public.qr_codes set audio_pedido_em = now() where qr_codes.codigo = q.codigo;
    return query select q.codigo, true;
  else
    return query select q.codigo, false;
  end if;
end $$;

-- ── 6. Recorte pronto (só o servidor, ao fim do job) ───────────────────────
-- Só aceita se a fonte ainda é a de agora: um recorte velho que termina depois não sobrescreve.
create function public.servico_qr_audio_pronto(p_codigo text, p_caminho text, p_fonte text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  q record;
begin
  select * into q from public.qr_codes x where x.codigo = p_codigo for update;
  if q.codigo is null or q.story_id is null then raise exception 'qr_nao_encontrado'; end if;
  if p_fonte is distinct from privado.fonte_audio_da_historia(q.story_id) then return false; end if;
  update public.qr_codes set audio_caminho = p_caminho, audio_fonte = p_fonte,
    audio_pronto_em = now(), audio_pedido_em = null
  where codigo = p_codigo;
  return true;
end $$;

-- ── 7. O player: limite, depois o código. Funciona com o plano vencido (P4) ──
-- estado: ok | preparando | desativado | nao_encontrado | limite. Nunca devolve texto da história.
create function public.servico_ouvir_qr(p_codigo text, p_chave text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_min timestamptz := date_trunc('minute', now());
  v_n integer;
  q record;
  s record;
begin
  if p_chave is null or p_chave !~ '^[0-9a-f]{64}$' then raise exception 'chave_invalida'; end if;
  delete from public.qr_consultas where minuto < v_min - interval '10 minutes';
  insert into public.qr_consultas as c (chave, minuto) values (p_chave, v_min)
    on conflict (chave, minuto) do update set n = c.n + 1
    returning c.n into v_n;
  if v_n > privado.qr_consultas_por_minuto() then
    return jsonb_build_object('estado', 'limite');
  end if;

  if p_codigo is null or p_codigo !~ '^[2-9A-HJKMNP-Z]{8}$' then
    return jsonb_build_object('estado', 'nao_encontrado');
  end if;
  select * into q from public.qr_codes x where x.codigo = p_codigo;
  if q.codigo is null then return jsonb_build_object('estado', 'nao_encontrado'); end if;
  if q.desativado_em is not null then return jsonb_build_object('estado', 'desativado'); end if;

  insert into public.events (book_id, ator_tipo, acao, detalhes)
    values (q.book_id, 'familia', 'qr_aberto', jsonb_build_object('story_id', q.story_id));
  if q.audio_caminho is null then return jsonb_build_object('estado', 'preparando'); end if;

  select st.titulo, st.ano into s from public.stories st where st.id = q.story_id;
  return jsonb_build_object('estado', 'ok', 'titulo', s.titulo, 'ano', s.ano,
    'audio_caminho', q.audio_caminho);
end $$;

revoke all on function public.criar_qr(uuid, text), public.servico_qr_audio_pronto(text, text, text),
  public.servico_ouvir_qr(text, text)
  from public, anon, authenticated, porta_autor, service_role;
grant execute on function public.criar_qr(uuid, text) to authenticated;
grant execute on function public.servico_qr_audio_pronto(text, text, text),
  public.servico_ouvir_qr(text, text) to service_role;
revoke all on function privado.qr_consultas_por_minuto(), privado.qr_audio_espera_s(),
  privado.qr_imutavel(), privado.qr_sem_truncate(), privado.fonte_audio_da_historia(uuid)
  from public;
grant execute on function privado.fonte_audio_da_historia(uuid) to service_role;
