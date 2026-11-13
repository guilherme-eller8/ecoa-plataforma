-- 20261120120000_qr_amostra.sql
-- Prompt 10, sem as telas do autor (P55): family_messages vazia, QR permanente e o limite do
-- player público. Design: docs/designs/qr-pagina-amostra.md (v2, depois dos revisores).
--
-- Regras deste arquivo:
-- * family_messages nasce vazia e fechada: nenhum grant para anon, authenticated ou porta_autor,
--   e uma política restritiva que nega os dois papéis sem login mesmo se o prompt 12 abrir algo.
-- * qr_codes nunca é apagado, nem pela chave secreta. Só o recorte de áudio e o desativado_em
--   mudam. O código vai impresso no livro: é público por natureza (exceção a T6, decisão T44).
-- * O código é sorteado aqui dentro (gen_random_uuid): nenhum cliente escolhe o código.
-- * O player não tem porta para anon: o servidor consulta por servico_ouvir_qr, que separa
--   erros (teto baixo, por rede e global) de acertos, e falha fechado se o recorte está velho.
-- * O recorte fica num bucket próprio (qr), nunca no bucket dos originais.
-- * porta_autor não recebe nenhum grant novo.

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.qr_erros_por_chave() returns integer
language sql immutable set search_path = '' as $$ select 10 $$;   -- QR_ERROS_POR_CHAVE (em 10 min)
create function privado.qr_erros_global() returns integer
language sql immutable set search_path = '' as $$ select 3000 $$; -- QR_ERROS_GLOBAL (em 10 min)
create function privado.qr_acertos_por_minuto() returns integer
language sql immutable set search_path = '' as $$ select 60 $$;   -- QR_ACERTOS_POR_MINUTO
create function privado.qr_audio_espera_s() returns integer
language sql immutable set search_path = '' as $$ select 600 $$;  -- QR_AUDIO_ESPERA_MIN = 10
create function privado.qr_folga_recorte_s() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;   -- QR_FOLGA_RECORTE_S

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
-- Restritiva: soma (com AND) a qualquer política futura. O autor e a família sem login nunca leem.
create policy "sem login nunca lê" on public.family_messages as restrictive
  for all to anon, porta_autor using (false) with check (false);

-- ── 2. Bucket do recorte (privado, sem políticas em storage.objects) ──────
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('qr', 'qr', false, 52428800, array['audio/mp4']);
  end if;
end $$;

-- ── 3. qr_codes (nunca apagados) ───────────────────────────────────────────
-- Código: 8 símbolos de 23456789ABCDEFGHJKMNPQRSTUVWXYZ (sem 0, 1, I, L, O), ~40 bits.
-- Só histórias por enquanto; mensagens (prompt 12) ganham a coluna delas no desenho de lá.
-- audio_fonte: sha256 das gravações e trechos que geraram o recorte (bucket qr).
create table public.qr_codes (
  codigo text primary key check (codigo ~ '^[2-9A-HJKMNP-Z]{8}$'),
  book_id uuid not null references public.books (id) on delete restrict,
  story_id uuid not null unique,
  audio_caminho text,
  audio_fonte text check (audio_fonte is null or audio_fonte ~ '^[0-9a-f]{64}$'),
  audio_duracao_s numeric(7, 2) check (audio_duracao_s is null or audio_duracao_s > 0),
  audio_pedido_em timestamptz,
  audio_pronto_em timestamptz,
  desativado_em timestamptz,
  desativado_por uuid references auth.users (id) on delete set null,
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint qr_codes_audio_do_livro check (audio_caminho is null
    or audio_caminho ~ ('^livros/' || book_id::text || '/' || codigo || '-[0-9a-f]{12}\.m4a$')),
  constraint qr_codes_audio_completo check (
    (audio_caminho is null) = (audio_pronto_em is null)
    and (audio_caminho is null) = (audio_fonte is null)
    and (audio_caminho is null) = (audio_duracao_s is null)),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict
);
create index qr_codes_livro on public.qr_codes (book_id);

-- Nada apaga; código, livro, história e criado_em nunca mudam. Vale também para a chave secreta.
-- A exclusão por pedido formal (LGPD, prompt 15) terá uma função própria do admin.
create function privado.qr_imutavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE'
     and new.codigo = old.codigo and new.book_id = old.book_id and new.story_id = old.story_id
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
grant select (codigo, book_id, story_id, audio_pronto_em, desativado_em, criado_em)
  on public.qr_codes to authenticated;
create policy "membro lê" on public.qr_codes for select to authenticated
  using (privado.eh_membro(book_id));

-- ── 4. Contadores do player (erros, acertos e "tocou"), por janela ─────────
-- chave = HMAC do IP (prefixo /64 no IPv6) com QR_REDE_SEGREDO e a data, calculado no servidor.
-- O IP nunca chega aqui. A chave '000…0' é o balde global de erros.
create table public.qr_consultas (
  chave text not null check (chave ~ '^[0-9a-f]{64}$'),
  tipo text not null check (tipo in ('erro', 'acerto', 'tocou')),
  janela timestamptz not null,
  n integer not null default 1 check (n >= 1),
  primary key (chave, tipo, janela)
);
create index qr_consultas_janela on public.qr_consultas (janela);
alter table public.qr_consultas enable row level security;
revoke all on public.qr_consultas from public, anon, authenticated, porta_autor, service_role;
grant all on public.qr_consultas to service_role;

create function privado.qr_contar(p_chave text, p_tipo text, p_janela timestamptz) returns integer
language sql volatile security definer set search_path = '' as $$
  insert into public.qr_consultas as c (chave, tipo, janela) values (p_chave, p_tipo, p_janela)
    on conflict (chave, tipo, janela) do update set n = c.n + 1
    returning c.n
$$;

-- ── 5. Sorteio do código (rejeição: nenhum símbolo mais provável que outro) ──
create function privado.qr_sortear_codigo() returns text
language plpgsql volatile set search_path = '' as $$
declare
  a constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  b bytea;
  v integer;
  c text := '';
begin
  loop
    b := uuid_send(gen_random_uuid());
    for i in 0..15 loop
      continue when i in (6, 8);  -- bits fixos de versão e variante do uuid v4
      v := get_byte(b, i);
      continue when v >= 248;     -- 248 = 8 × 31
      c := c || substr(a, (v % 31) + 1, 1);
      if length(c) = 8 then return c; end if;
    end loop;
  end loop;
end $$;

-- ── 6. Fonte do recorte: gravações e trechos que a história usa no texto de hoje ──
-- Áudio acrescentado que ainda não entrou no texto (proposta não aplicada) fica de fora.
create function privado.fonte_audio_da_historia(p_story uuid) returns text
language sql stable security definer set search_path = '' as $$
  select encode(sha256(convert_to(coalesce(string_agg(
           sr.recording_id::text || ':' || coalesce(array_to_string(sr.segmentos, ','), '*'),
           '|' order by sr.ordem), ''), 'utf8')), 'hex')
  from public.story_recordings sr
  where sr.story_id = p_story and not (sr.recording_id = any (privado.audios_fora_do_texto(p_story)))
$$;

-- Reserva o pedido do recorte se ele está velho e ninguém pediu nos últimos 10 min.
create function privado.qr_reservar_audio(p_codigo text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  q record;
begin
  select * into q from public.qr_codes x where x.codigo = p_codigo for update;
  if q.codigo is null or q.desativado_em is not null then return false; end if;
  if q.audio_fonte is not distinct from privado.fonte_audio_da_historia(q.story_id) then return false; end if;
  if q.audio_pedido_em is not null
     and q.audio_pedido_em > now() - make_interval(secs => privado.qr_audio_espera_s()) then
    return false;
  end if;
  update public.qr_codes set audio_pedido_em = now() where codigo = p_codigo;
  return true;
end $$;

-- ── 7. Criar o QR de uma história (membro, plano ativo, história marcada como pronta) ──
-- Já existe: devolve o mesmo (o evento qr_criado é registrado pelo servidor). audio_pronto diz se o PDF já pode sair (o player tocaria agora).
create function public.criar_qr(p_story uuid)
returns table (codigo text, audio_pronto boolean, pedir_audio boolean)
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  q record;
  v_codigo text;
begin
  perform pg_advisory_xact_lock(hashtextextended('qr:' || p_story::text, 0));
  select st.id, st.book_id, st.estado, st.revisada_em into s from public.stories st where st.id = p_story;
  if s.id is null or not privado.eh_membro(s.book_id) then raise exception 'sem_permissao'; end if;
  if not privado.livro_editavel(s.book_id) then raise exception 'sem_permissao'; end if;
  if s.estado <> 'pronta' or s.revisada_em is null then raise exception 'historia_nao_pronta'; end if;
  if not exists (select 1 from public.story_recordings sr where sr.story_id = p_story
                   and not (sr.recording_id = any (privado.audios_fora_do_texto(p_story)))) then
    raise exception 'historia_sem_audio';
  end if;
  -- Gravação usada inteira (segmentos nulo) que também alimenta outra história: o recorte
  -- levaria a outra junto. Não acontece pelos fluxos de hoje; o banco garante.
  if exists (select 1 from public.story_recordings sr
             where sr.story_id = p_story and sr.segmentos is null
               and exists (select 1 from public.story_recordings o
                           where o.recording_id = sr.recording_id and o.story_id <> p_story)) then
    raise exception 'historia_audio_compartilhado';
  end if;

  select * into q from public.qr_codes x where x.story_id = p_story;
  if q.codigo is null then
    for i in 1..5 loop
      v_codigo := privado.qr_sortear_codigo();
      begin
        insert into public.qr_codes (codigo, book_id, story_id, criado_por)
          values (v_codigo, s.book_id, p_story, (select auth.uid()));
        exit;
      exception when unique_violation then
        if i = 5 then raise exception 'qr_colisao'; end if;
      end;
    end loop;
    select * into q from public.qr_codes x where x.codigo = v_codigo;
  end if;
  if q.desativado_em is not null then raise exception 'qr_desativado'; end if;

  return query select q.codigo,
    q.audio_fonte is not distinct from privado.fonte_audio_da_historia(p_story) and q.audio_caminho is not null,
    privado.qr_reservar_audio(q.codigo);
end $$;

-- ── 8. Desligar ou religar um QR (só o responsável; vale com o plano vencido) ──
create function public.desativar_qr(p_codigo text, p_desligar boolean)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  q record;
begin
  select * into q from public.qr_codes x where x.codigo = p_codigo for update;
  if q.codigo is null or not exists (
       select 1 from public.book_members m
       where m.book_id = q.book_id and m.user_id = (select auth.uid()) and m.papel = 'responsavel') then
    raise exception 'sem_permissao';
  end if;
  update public.qr_codes set
    desativado_em = case when p_desligar then coalesce(desativado_em, now()) end,
    desativado_por = case when p_desligar then coalesce(desativado_por, (select auth.uid())) end
  where codigo = p_codigo;
  return p_desligar;  -- o evento (qr_desligado, qr_religado) é registrado pelo servidor
end $$;

-- ── 9. Recorte pronto (só o servidor, ao fim do job) ───────────────────────
-- Mesmo lock de criar_qr. Só aceita a fonte de agora e uma duração que caiba na fala da história.
-- Devolve o caminho anterior, para o servidor apagar o arquivo velho do bucket qr.
create function public.servico_qr_audio_pronto(p_codigo text, p_caminho text, p_fonte text,
                                               p_duracao_s numeric)
returns table (gravado boolean, anterior text)
language plpgsql security definer set search_path = '' as $$
declare
  q record;
begin
  select * into q from public.qr_codes x where x.codigo = p_codigo;
  if q.codigo is null then raise exception 'qr_nao_encontrado'; end if;
  perform pg_advisory_xact_lock(hashtextextended('qr:' || q.story_id::text, 0));
  select * into q from public.qr_codes x where x.codigo = p_codigo for update;
  if p_fonte is distinct from privado.fonte_audio_da_historia(q.story_id) then
    return query select false, null::text;
    return;
  end if;
  if p_duracao_s is null or p_duracao_s <= 0
     or p_duracao_s > privado.fala_da_historia_s(q.story_id) + privado.qr_folga_recorte_s() then
    raise exception 'qr_recorte_longo';
  end if;
  update public.qr_codes set audio_caminho = p_caminho, audio_fonte = p_fonte,
    audio_duracao_s = p_duracao_s, audio_pronto_em = now(), audio_pedido_em = null
  where codigo = p_codigo;
  return query select true, case when q.audio_caminho is distinct from p_caminho then q.audio_caminho end;
end $$;

-- ── 10. O player. Funciona com o plano vencido (P4) ───────────────────────
-- estado: ok | preparando | desativado | nao_encontrado | limite. Nunca devolve texto da história.
-- Recorte velho (a história mudou depois dele): preparando, nunca o áudio velho. pedir_audio = true
-- quando esta consulta reservou o pedido do recorte novo.
create function public.servico_ouvir_qr(p_codigo text, p_chave text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_10min timestamptz := date_bin('10 minutes', now(), timestamptz '2026-01-01');
  v_min timestamptz := date_trunc('minute', now());
  v_global constant text := repeat('0', 64);
  v_achou boolean := false;
  q record;
  s record;
begin
  if p_chave is null or p_chave !~ '^[0-9a-f]{64}$' or p_chave = v_global then
    raise exception 'chave_invalida';
  end if;
  -- Quem já errou demais não consulta mais nada nesta janela.
  if coalesce((select n from public.qr_consultas
               where chave = p_chave and tipo = 'erro' and janela = v_10min), 0) >= privado.qr_erros_por_chave()
     or coalesce((select n from public.qr_consultas
                  where chave = v_global and tipo = 'erro' and janela = v_10min), 0) >= privado.qr_erros_global() then
    return jsonb_build_object('estado', 'limite');
  end if;

  if p_codigo is not null and p_codigo ~ '^[2-9A-HJKMNP-Z]{8}$' then
    select * into q from public.qr_codes x where x.codigo = p_codigo;
    v_achou := found;
  end if;
  if not v_achou then
    perform privado.qr_contar(p_chave, 'erro', v_10min);
    perform privado.qr_contar(v_global, 'erro', v_10min);
    return jsonb_build_object('estado', 'nao_encontrado');
  end if;

  if privado.qr_contar(p_chave, 'acerto', v_min) > privado.qr_acertos_por_minuto() then
    return jsonb_build_object('estado', 'limite');
  end if;
  if q.desativado_em is not null then return jsonb_build_object('estado', 'desativado'); end if;
  if q.audio_caminho is null
     or q.audio_fonte is distinct from privado.fonte_audio_da_historia(q.story_id) then
    return jsonb_build_object('estado', 'preparando', 'pedir_audio', privado.qr_reservar_audio(q.codigo));
  end if;

  select st.titulo, st.ano into s from public.stories st where st.id = q.story_id;
  return jsonb_build_object('estado', 'ok', 'titulo', s.titulo, 'ano', s.ano,
    'audio_caminho', q.audio_caminho);
end $$;

-- ── 11. "Ouvir" tocado: 1 evento por código, rede e hora (a métrica do prompt) ──
create function public.servico_qr_tocou(p_codigo text, p_chave text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  q record;
begin
  if p_chave is null or p_chave !~ '^[0-9a-f]{64}$' then raise exception 'chave_invalida'; end if;
  select * into q from public.qr_codes x where x.codigo = p_codigo and x.desativado_em is null;
  if q.codigo is null then return false; end if;
  if privado.qr_contar(encode(sha256(convert_to(p_chave || ':' || q.codigo, 'utf8')), 'hex'), 'tocou',
                       date_trunc('hour', now())) > 1 then
    return false;
  end if;
  insert into public.events (book_id, ator_tipo, acao, detalhes)
    values (q.book_id, 'familia', 'qr_tocou', jsonb_build_object('story_id', q.story_id));
  return true;
end $$;

-- ── 12. O que o recorte usa (só o servidor, no job): a fonte e as gravações, na ordem ──
-- segmentos nulo = a gravação inteira. Nenhum texto sai daqui (T36); os tempos vêm de transcripts.
create function public.servico_qr_trechos(p_codigo text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  q record;
begin
  select * into q from public.qr_codes x where x.codigo = p_codigo;
  if q.codigo is null then raise exception 'qr_nao_encontrado'; end if;
  return jsonb_build_object(
    'book_id', q.book_id,
    'fonte', privado.fonte_audio_da_historia(q.story_id),
    'desativado', q.desativado_em is not null,
    'gravacoes', coalesce((
      select jsonb_agg(jsonb_build_object('recording_id', r.id, 'caminho', r.caminho,
               'content_type', r.content_type, 'duracao_s', r.duracao_s, 'segmentos', sr.segmentos)
             order by sr.ordem)
      from public.story_recordings sr join public.recordings r on r.id = sr.recording_id
      where sr.story_id = q.story_id
        and not (sr.recording_id = any (privado.audios_fora_do_texto(q.story_id)))), '[]'::jsonb));
end $$;

-- ── 13. Limpeza dos contadores (cron do Inngest, varredura) ────────────────
create function public.servico_qr_limpar_consultas() returns integer
language sql volatile security definer set search_path = '' as $$
  with apagadas as (delete from public.qr_consultas where janela < now() - interval '2 hours' returning 1)
  select count(*)::integer from apagadas
$$;

revoke all on function public.criar_qr(uuid), public.desativar_qr(text, boolean),
  public.servico_qr_audio_pronto(text, text, text, numeric), public.servico_ouvir_qr(text, text),
  public.servico_qr_tocou(text, text), public.servico_qr_limpar_consultas(),
  public.servico_qr_trechos(text)
  from public, anon, authenticated, porta_autor, service_role;
grant execute on function public.criar_qr(uuid), public.desativar_qr(text, boolean) to authenticated;
grant execute on function public.servico_qr_audio_pronto(text, text, text, numeric),
  public.servico_ouvir_qr(text, text), public.servico_qr_tocou(text, text),
  public.servico_qr_limpar_consultas(), public.servico_qr_trechos(text) to service_role;
revoke all on function privado.qr_erros_por_chave(), privado.qr_erros_global(),
  privado.qr_acertos_por_minuto(), privado.qr_audio_espera_s(), privado.qr_folga_recorte_s(),
  privado.qr_imutavel(), privado.qr_sem_truncate(), privado.qr_contar(text, text, timestamptz),
  privado.qr_sortear_codigo(), privado.fonte_audio_da_historia(uuid), privado.qr_reservar_audio(text)
  from public;
grant execute on function privado.fonte_audio_da_historia(uuid) to service_role;
