-- Prompt 13: montar e publicar o livro (docs/designs/montar-publicar-livro.md).
-- 1. QR de mensagem (T49): qr_codes ganha message_id; o player, o recorte e o "tocou" passam a
--    servir história ou mensagem. Uma mensagem com QR ou numa versão publicada não é apagada.
-- 2. book_layouts: a montagem em andamento (1 por livro), escrita só por montagem_salvar.
-- 3. book_exports: cada publicação, congelada e nunca apagada (T22). Conteúdo montado pelo banco
--    numa transação; os PDFs são feitos pelo servidor (Inngest) e gravados por servico_export_pronto.
-- 4. Bucket privado 'exportacoes' (PDFs e prévias das páginas).
-- Nenhuma tabela nova tem porta para anon ou porta_autor: o conteúdo publicado leva as mensagens (T5).

-- ── 0. Números espelhados em lib/config.ts (config-banco.test.ts confere) ──
create function privado.max_itens_livro() returns integer
language sql immutable set search_path = '' as $$ select 150 $$;   -- MAX_ITENS_LIVRO (por lista)
create function privado.max_publicacoes_dia() returns integer
language sql immutable set search_path = '' as $$ select 10 $$;    -- MAX_PUBLICACOES_DIA (por livro)
create function privado.publicacao_expira_s() returns integer
language sql immutable set search_path = '' as $$ select 900 $$;   -- PUBLICACAO_EXPIRA_MIN × 60
create function privado.capa_cores() returns text[]
language sql immutable set search_path = '' as $$
  select array['terracota', 'oliva', 'azul', 'areia', 'grafite']    -- chaves de CAPA_CORES
$$;
-- A5 a 11 pt (antes 320, no 21 × 21). Recalibrado com o Typst em histórias reais na construção.
create or replace function privado.palavras_por_pagina() returns integer
language sql immutable set search_path = '' as $$ select 220 $$; -- PALAVRAS_POR_PAGINA_ESTIMADA

-- ── 1. QR de mensagem ──────────────────────────────────────────────────────
alter table public.qr_codes
  alter column story_id drop not null,
  add column message_id uuid unique,
  add constraint qr_codes_um_dono check ((story_id is null) <> (message_id is null)),
  add constraint qr_codes_mensagem_fk foreign key (book_id, message_id)
    references public.family_messages (book_id, id) on delete restrict;
grant select (message_id) on public.qr_codes to authenticated;

-- Imutável como antes, agora com message_id; story_id pode ser nulo (is not distinct from).
create or replace function privado.qr_imutavel() returns trigger
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

-- Fonte do áudio de uma mensagem: o arquivo e a duração real (nunca mudam depois de enviada).
create function privado.fonte_audio_da_mensagem(p_message uuid) returns text
language sql stable security definer set search_path = '' as $$
  select encode(sha256(convert_to(coalesce(f.audio_caminho, '') || ':' || coalesce(f.duracao_s::text, ''),
                                  'utf8')), 'hex')
  from public.family_messages f where f.id = p_message
$$;

create function privado.fonte_audio_do_qr(p_story uuid, p_message uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case when p_story is not null then privado.fonte_audio_da_historia(p_story)
              else privado.fonte_audio_da_mensagem(p_message) end
$$;

-- Teto da duração do recorte: a fala da história ou a duração da mensagem, mais a folga.
create function privado.qr_duracao_max_s(p_story uuid, p_message uuid) returns numeric
language sql stable security definer set search_path = '' as $$
  select case when p_story is not null then privado.fala_da_historia_s(p_story)
              else (select f.duracao_s from public.family_messages f where f.id = p_message) end
         + privado.qr_folga_recorte_s()
$$;

create or replace function privado.qr_reservar_audio(p_codigo text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  q record;
begin
  select * into q from public.qr_codes x where x.codigo = p_codigo for update;
  if q.codigo is null or q.desativado_em is not null then return false; end if;
  if q.audio_fonte is not distinct from privado.fonte_audio_do_qr(q.story_id, q.message_id) then
    return false;
  end if;
  if q.audio_pedido_em is not null
     and q.audio_pedido_em > now() - make_interval(secs => privado.qr_audio_espera_s()) then
    return false;
  end if;
  update public.qr_codes set audio_pedido_em = now() where codigo = p_codigo;
  return true;
end $$;

-- Sorteia e grava um código novo (5 tentativas). Quem chama já conferiu permissão e dono.
create function privado.qr_inserir(p_book uuid, p_story uuid, p_message uuid) returns text
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_codigo text;
begin
  for i in 1..5 loop
    v_codigo := privado.qr_sortear_codigo();
    begin
      insert into public.qr_codes (codigo, book_id, story_id, message_id, criado_por)
        values (v_codigo, p_book, p_story, p_message, (select auth.uid()));
      return v_codigo;
    exception when unique_violation then
      if i = 5 then raise exception 'qr_colisao'; end if;
    end;
  end loop;
end $$;

-- A história pode ganhar QR? (tem áudio no texto e nenhuma gravação inteira dividida com outra)
create function privado.historia_aceita_qr(p_story uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.story_recordings sr where sr.story_id = p_story
                   and not (sr.recording_id = any (privado.audios_fora_do_texto(p_story))))
     and not exists (select 1 from public.story_recordings sr
                     where sr.story_id = p_story and sr.segmentos is null
                       and exists (select 1 from public.story_recordings o
                                   where o.recording_id = sr.recording_id and o.story_id <> p_story))
$$;

-- criar_qr (página de amostra) igual ao do prompt 10, agora com qr_inserir e qr_reservar_audio novos.
create or replace function public.criar_qr(p_story uuid)
returns table (codigo text, audio_pronto boolean, pedir_audio boolean)
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  q record;
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
  if not privado.historia_aceita_qr(p_story) then raise exception 'historia_audio_compartilhado'; end if;

  select * into q from public.qr_codes x where x.story_id = p_story;
  if q.codigo is null then
    perform privado.qr_inserir(s.book_id, p_story, null);
    select * into q from public.qr_codes x where x.story_id = p_story;
  end if;
  if q.desativado_em is not null then raise exception 'qr_desativado'; end if;

  return query select q.codigo,
    q.audio_fonte is not distinct from privado.fonte_audio_da_historia(p_story) and q.audio_caminho is not null,
    privado.qr_reservar_audio(q.codigo);
end $$;

create or replace function public.servico_qr_audio_pronto(p_codigo text, p_caminho text, p_fonte text,
                                                          p_duracao_s numeric)
returns table (gravado boolean, anterior text)
language plpgsql security definer set search_path = '' as $$
declare
  q record;
begin
  select * into q from public.qr_codes x where x.codigo = p_codigo;
  if q.codigo is null then raise exception 'qr_nao_encontrado'; end if;
  perform pg_advisory_xact_lock(hashtextextended('qr:' || coalesce(q.story_id, q.message_id)::text, 0));
  select * into q from public.qr_codes x where x.codigo = p_codigo for update;
  if p_fonte is distinct from privado.fonte_audio_do_qr(q.story_id, q.message_id) then
    return query select false, null::text;
    return;
  end if;
  if p_duracao_s is null or p_duracao_s <= 0
     or p_duracao_s > privado.qr_duracao_max_s(q.story_id, q.message_id) then
    raise exception 'qr_recorte_longo';
  end if;
  update public.qr_codes set audio_caminho = p_caminho, audio_fonte = p_fonte,
    audio_duracao_s = p_duracao_s, audio_pronto_em = now(), audio_pedido_em = null
  where codigo = p_codigo;
  return query select true, case when q.audio_caminho is distinct from p_caminho then q.audio_caminho end;
end $$;

-- O player: igual ao do prompt 10; para mensagem devolve tipo, nome e relação (o que o livro
-- imprime na página dela). Nunca devolve o texto.
create or replace function public.servico_ouvir_qr(p_codigo text, p_chave text)
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
     or q.audio_fonte is distinct from privado.fonte_audio_do_qr(q.story_id, q.message_id) then
    return jsonb_build_object('estado', 'preparando', 'pedir_audio', privado.qr_reservar_audio(q.codigo));
  end if;

  if q.message_id is not null then
    select f.nome, f.relacao into s from public.family_messages f where f.id = q.message_id;
    return jsonb_build_object('estado', 'ok', 'tipo', 'mensagem', 'nome', s.nome, 'relacao', s.relacao,
      'audio_caminho', q.audio_caminho);
  end if;
  select st.titulo, st.ano into s from public.stories st where st.id = q.story_id;
  return jsonb_build_object('estado', 'ok', 'tipo', 'historia', 'titulo', s.titulo, 'ano', s.ano,
    'audio_caminho', q.audio_caminho);
end $$;

create or replace function public.servico_qr_tocou(p_codigo text, p_chave text)
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
    values (q.book_id, 'familia', 'qr_tocou',
            case when q.story_id is not null then jsonb_build_object('story_id', q.story_id)
                 else jsonb_build_object('message_id', q.message_id) end);
  return true;
end $$;

-- O que o recorte usa. Mensagem: o arquivo inteiro do bucket 'mensagens' (sem segmentos).
create or replace function public.servico_qr_trechos(p_codigo text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  q record;
  m record;
begin
  select * into q from public.qr_codes x where x.codigo = p_codigo;
  if q.codigo is null then raise exception 'qr_nao_encontrado'; end if;
  if q.message_id is not null then
    select f.audio_caminho, f.duracao_s into m from public.family_messages f where f.id = q.message_id;
    return jsonb_build_object(
      'book_id', q.book_id,
      'bucket', 'mensagens',
      'fonte', privado.fonte_audio_da_mensagem(q.message_id),
      'desativado', q.desativado_em is not null,
      'gravacoes', case when m.audio_caminho is null then '[]'::jsonb else jsonb_build_array(jsonb_build_object(
        'recording_id', null, 'caminho', m.audio_caminho,
        'content_type', case substring(m.audio_caminho from '\.([a-z0-9]+)$')
                          when 'webm' then 'audio/webm' when 'm4a' then 'audio/mp4' else 'audio/ogg' end,
        'duracao_s', m.duracao_s, 'segmentos', null)) end);
  end if;
  return jsonb_build_object(
    'book_id', q.book_id,
    'bucket', 'audios',
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

-- ── 2. A montagem em andamento ─────────────────────────────────────────────
-- Histórias e mensagens em listas separadas (as mensagens são sempre o capítulo final).
-- Mensagem no livro = family_messages.no_livro (P65); aqui fica só a ordem delas.
create table public.book_layouts (
  book_id uuid primary key references public.books (id) on delete cascade,
  titulo text check (titulo is null or char_length(titulo) between 1 and 90),
  subtitulo text check (subtitulo is null or char_length(subtitulo) between 1 and 120),
  dedicatoria text check (dedicatoria is null or char_length(dedicatoria) between 1 and 600),
  capa_foto_id uuid,
  capa_cor text not null default 'terracota' check (capa_cor ~ '^[a-z]{3,20}$'),
  ordem_historias uuid[] not null default '{}' check (cardinality(ordem_historias) <= 150),
  ordem_mensagens uuid[] not null default '{}' check (cardinality(ordem_mensagens) <= 150),
  fora uuid[] not null default '{}' check (cardinality(fora) <= 150),        -- histórias riscadas
  rev integer not null default 1 check (rev >= 1),
  atualizado_em timestamptz not null default now(),
  atualizado_por uuid references auth.users (id) on delete set null,
  foreign key (book_id, capa_foto_id) references public.photos (book_id, id) on delete set null (capa_foto_id)
);
create index book_layouts_capa_foto on public.book_layouts (capa_foto_id) where capa_foto_id is not null;

alter table public.book_layouts enable row level security;
revoke all on public.book_layouts from public, anon, authenticated, porta_autor, service_role;
grant select on public.book_layouts to authenticated, service_role;
create policy "membro lê" on public.book_layouts for select to authenticated
  using (privado.eh_membro(book_id));
create policy "sem login nunca lê" on public.book_layouts as restrictive
  for all to anon, porta_autor using (false) with check (false);

-- O livro como vai para o papel. p_so_incluidas = true: o que a publicação congela (só o que entra).
-- false: a tela de montagem (tudo o que pode entrar, com incluida). Histórias: só as prontas (a IA
-- terminou); ordem da montagem, depois as novas por data. Mensagens: só as enviadas.
create function privado.conteudo_do_livro(p_book uuid, p_so_incluidas boolean) returns jsonb
language sql stable security definer set search_path = '' as $$
  with l as (
    select b.id, coalesce(b.autor_nome, b.autor_apelido) as autor, lo.titulo, lo.subtitulo,
           lo.dedicatoria, coalesce(lo.capa_cor, 'terracota') as capa_cor, lo.capa_foto_id,
           coalesce(lo.ordem_historias, '{}') as oh, coalesce(lo.ordem_mensagens, '{}') as om,
           coalesce(lo.fora, '{}') as fora, coalesce(lo.rev, 0) as rev
    from public.books b left join public.book_layouts lo on lo.book_id = b.id
    where b.id = p_book
  ),
  h as (
    select st.id, st.titulo, st.ano, st.revisada_em is not null as revisada,
           not (st.id = any (l.fora)) as incluida,
           privado.palavras_do_texto(st.texto) as palavras,
           coalesce((select jsonb_agg(p ->> 'texto' order by o)
                     from jsonb_array_elements(coalesce(st.texto -> 'paragrafos', '[]')) with ordinality as t(p, o)
                     where btrim(coalesce(p ->> 'texto', '')) <> ''), '[]') as paragrafos,
           coalesce((select jsonb_agg(jsonb_build_object('caminho', ph.caminho, 'largura', ph.largura,
                                                         'altura', ph.altura) order by sp.ordem)
                     from public.story_photos sp join public.photos ph on ph.id = sp.photo_id
                     where sp.story_id = st.id), '[]') as fotos,
           (select jsonb_build_object('codigo', q.codigo, 'ligado', q.desativado_em is null)
            from public.qr_codes q where q.story_id = st.id) as qr,
           array_position(l.oh, st.id) as pos, st.criado_em
    from public.stories st, l
    where st.book_id = p_book and st.estado = 'pronta' and st.texto is not null
  ),
  m as (
    select f.id, f.nome, f.relacao, f.no_livro as incluida, f.texto,
           case when f.foto_recebida_em is not null then f.foto_caminho end as foto_caminho,
           f.audio_caminho is not null and f.audio_recebido_em is not null and not f.audio_recusado as com_audio,
           (select jsonb_build_object('codigo', q.codigo, 'ligado', q.desativado_em is null)
            from public.qr_codes q where q.message_id = f.id) as qr,
           array_position(l.om, f.id) as pos, f.enviada_em
    from public.family_messages f, l
    where f.book_id = p_book and f.estado = 'enviada'
  )
  select jsonb_build_object(
    'livro', jsonb_build_object(
      'titulo', l.titulo, 'subtitulo', l.subtitulo, 'dedicatoria', l.dedicatoria, 'autor', l.autor,
      'capa_cor', l.capa_cor, 'rev', l.rev,
      'capa_foto', (select jsonb_build_object('caminho', ph.caminho, 'largura', ph.largura, 'altura', ph.altura)
                    from public.photos ph where ph.id = l.capa_foto_id and ph.book_id = p_book)),
    'historias', coalesce((select jsonb_agg(jsonb_build_object(
        'id', h.id, 'titulo', h.titulo, 'ano', h.ano, 'revisada', h.revisada, 'incluida', h.incluida,
        'palavras', h.palavras, 'paragrafos', h.paragrafos, 'fotos', h.fotos, 'qr', h.qr)
        order by h.pos nulls last, h.criado_em, h.id)
      from h where h.incluida or not p_so_incluidas), '[]'),
    'mensagens', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'nome', m.nome, 'relacao', m.relacao, 'incluida', m.incluida, 'texto', m.texto,
        'foto', m.foto_caminho, 'com_audio', m.com_audio, 'qr', m.qr)
        order by m.pos nulls last, m.enviada_em, m.id)
      from m where m.incluida or not p_so_incluidas), '[]'))
  from l
$$;

-- A tela de montagem lê por aqui (membro; vale com o plano vencido, só leitura).
create function public.montagem_conteudo(p_book uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_book is null or not privado.eh_membro(p_book) then raise exception 'sem_permissao'; end if;
  return privado.conteudo_do_livro(p_book, false);
end $$;

-- Salva a montagem inteira. p_rev = a revisão que a tela leu (0 = ainda não existe). Outra pessoa
-- salvou antes: montagem_mudou, e a tela recarrega. Devolve a revisão nova.
create function public.montagem_salvar(
  p_book uuid, p_rev integer, p_titulo text, p_subtitulo text, p_dedicatoria text,
  p_capa_foto uuid, p_capa_cor text, p_ordem_historias uuid[], p_ordem_mensagens uuid[], p_fora uuid[])
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_rev integer;
  v_max integer := privado.max_itens_livro();
begin
  perform privado.membro_editando(p_book);
  if p_rev is null or p_ordem_historias is null or p_ordem_mensagens is null or p_fora is null
     or not (coalesce(p_capa_cor, '') = any (privado.capa_cores()))
     or cardinality(p_ordem_historias) > v_max or cardinality(p_ordem_mensagens) > v_max
     or cardinality(p_fora) > v_max
     or char_length(btrim(coalesce(p_titulo, ''))) > 90
     or char_length(btrim(coalesce(p_subtitulo, ''))) > 120
     or char_length(btrim(coalesce(p_dedicatoria, ''))) > 600
     or exists (select 1 from unnest(p_ordem_historias || p_fora) i
                where not exists (select 1 from public.stories s where s.id = i and s.book_id = p_book))
     or exists (select 1 from unnest(p_ordem_mensagens) i
                where not exists (select 1 from public.family_messages f
                                  where f.id = i and f.book_id = p_book and f.estado <> 'rascunho'))
     or (p_capa_foto is not null
         and not exists (select 1 from public.photos ph where ph.id = p_capa_foto and ph.book_id = p_book)) then
    raise exception 'dados_invalidos';
  end if;

  if p_rev = 0 then
    insert into public.book_layouts as lo (book_id, titulo, subtitulo, dedicatoria, capa_foto_id, capa_cor,
                                     ordem_historias, ordem_mensagens, fora, atualizado_por)
    values (p_book, nullif(btrim(p_titulo), ''), nullif(btrim(p_subtitulo), ''),
            nullif(btrim(p_dedicatoria), ''), p_capa_foto, p_capa_cor,
            p_ordem_historias, p_ordem_mensagens, p_fora, (select auth.uid()))
    on conflict (book_id) do nothing
    returning lo.rev into v_rev;
  else
    update public.book_layouts lo set
      titulo = nullif(btrim(p_titulo), ''), subtitulo = nullif(btrim(p_subtitulo), ''),
      dedicatoria = nullif(btrim(p_dedicatoria), ''), capa_foto_id = p_capa_foto, capa_cor = p_capa_cor,
      ordem_historias = p_ordem_historias, ordem_mensagens = p_ordem_mensagens, fora = p_fora,
      rev = lo.rev + 1, atualizado_em = now(), atualizado_por = (select auth.uid())
    where lo.book_id = p_book and lo.rev = p_rev
    returning lo.rev into v_rev;
  end if;
  if v_rev is null then raise exception 'montagem_mudou'; end if;
  return v_rev;
end $$;

-- ── 3. As versões publicadas ───────────────────────────────────────────────
create type public.export_estado as enum ('gerando', 'pronta', 'falhou');

create table public.book_exports (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  versao integer not null check (versao between 1 and 9999),
  estado public.export_estado not null default 'gerando',
  conteudo jsonb not null check (jsonb_typeof(conteudo) = 'object' and pg_column_size(conteudo) < 4000000),
  qr_esperados integer not null check (qr_esperados >= 0),
  -- Preenchidos pelo servidor quando os PDFs ficam prontos:
  espec jsonb check (espec is null or (jsonb_typeof(espec) = 'object' and pg_column_size(espec) < 8000)),
  paginas integer check (paginas is null or paginas between 4 and 2000),
  lombada_mm numeric(5, 2) check (lombada_mm is null or lombada_mm > 0),
  pasta text,
  miolo_bytes bigint check (miolo_bytes is null or miolo_bytes > 0),
  capa_bytes bigint check (capa_bytes is null or capa_bytes > 0),
  erro text check (erro is null or erro ~ '^[a-z_]{2,40}$'),
  publicado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  terminado_em timestamptz,
  unique (book_id, versao),
  constraint book_exports_pasta check (pasta is null
    or pasta ~ ('^livros/' || book_id::text || '/v' || versao::text || '-[0-9a-f]{12}$')),
  constraint book_exports_pronta check ((estado = 'pronta') = (pasta is not null and espec is not null
    and paginas is not null and lombada_mm is not null and miolo_bytes is not null and capa_bytes is not null)),
  constraint book_exports_falhou check ((estado = 'falhou') = (erro is not null)),
  constraint book_exports_terminado check ((estado = 'gerando') = (terminado_em is null))
);
create index book_exports_livro on public.book_exports (book_id, criado_em desc);

-- Nada apaga; o conteúdo congelado nunca muda. Só sai de 'gerando' uma vez, para pronta ou falhou.
-- Vale também para a chave secreta. A exclusão por pedido formal (LGPD, prompt 15) terá função própria.
create function privado.export_imutavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE'
     and new.id = old.id and new.book_id = old.book_id and new.versao = old.versao
     and new.conteudo = old.conteudo and new.qr_esperados = old.qr_esperados and new.criado_em = old.criado_em
     and (new.publicado_por is not distinct from old.publicado_por or new.publicado_por is null) then
    if old.estado = 'gerando' then return new; end if;
    -- Pronta ou falhou: só o publicado_por pode virar nulo (usuário apagado).
    if row(new.estado, new.espec, new.paginas, new.lombada_mm, new.pasta, new.miolo_bytes, new.capa_bytes,
           new.erro, new.terminado_em)
       is not distinct from
       row(old.estado, old.espec, old.paginas, old.lombada_mm, old.pasta, old.miolo_bytes, old.capa_bytes,
           old.erro, old.terminado_em) then
      return new;
    end if;
  end if;
  raise exception 'export_imutavel';
end $$;
create function privado.export_sem_truncate() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'export_imutavel';
end $$;
create trigger book_exports_imutavel before update or delete on public.book_exports
  for each row execute function privado.export_imutavel();
create trigger book_exports_sem_truncate before truncate on public.book_exports
  for each statement execute function privado.export_sem_truncate();

alter table public.book_exports enable row level security;
revoke all on public.book_exports from public, anon, authenticated, porta_autor, service_role;
grant select on public.book_exports to service_role;
-- O membro vê a lista e o estado; o conteúdo congelado só o servidor lê (vai para o PDF).
grant select (id, book_id, versao, estado, qr_esperados, espec, paginas, lombada_mm, pasta,
              miolo_bytes, capa_bytes, erro, publicado_por, criado_em, terminado_em)
  on public.book_exports to authenticated;
create policy "membro lê" on public.book_exports for select to authenticated
  using (privado.eh_membro(book_id));
create policy "sem login nunca lê" on public.book_exports as restrictive
  for all to anon, porta_autor using (false) with check (false);

-- Publicar (só o responsável, plano ativo). p_rev = a revisão da montagem que a pessoa conferiu.
-- Bloqueia: livro vazio, livro sem título, história sem título ou não marcada como pronta.
-- Cria os QR que faltam (histórias com áudio; mensagens com áudio) e congela o conteúdo.
-- pedir_audio = códigos cujo recorte esta chamada reservou (o servidor envia qr/recortar).
create function public.publicar_livro(p_book uuid, p_rev integer)
returns table (export_id uuid, versao integer, pedir_audio text[])
language plpgsql security definer set search_path = '' as $$
declare
  v_conteudo jsonb;
  v_rev integer;
  v_id uuid;
  v_versao integer;
  v_pedir text[] := '{}';
  v_qr integer;
  r record;
begin
  perform pg_advisory_xact_lock(hashtextextended('publicar:' || p_book::text, 0));
  if p_book is null or not privado.eh_responsavel(p_book) then raise exception 'sem_permissao'; end if;
  if not privado.livro_editavel(p_book) then raise exception 'livro_fechado'; end if;
  select lo.rev into v_rev from public.book_layouts lo where lo.book_id = p_book;
  if v_rev is null or v_rev is distinct from p_rev then raise exception 'montagem_mudou'; end if;

  -- Uma publicação por vez; a que ficou presa passa a falhou.
  update public.book_exports e set estado = 'falhou', erro = 'expirou', terminado_em = now()
  where e.book_id = p_book and e.estado = 'gerando'
    and e.criado_em < now() - make_interval(secs => privado.publicacao_expira_s());
  if exists (select 1 from public.book_exports e where e.book_id = p_book and e.estado = 'gerando') then
    raise exception 'publicacao_em_andamento';
  end if;
  if (select count(*) from public.book_exports e
      where e.book_id = p_book and e.criado_em > now() - interval '24 hours') >= privado.max_publicacoes_dia() then
    raise exception 'limite_publicacoes';
  end if;

  v_conteudo := privado.conteudo_do_livro(p_book, true);
  if jsonb_array_length(v_conteudo -> 'historias') = 0 and jsonb_array_length(v_conteudo -> 'mensagens') = 0 then
    raise exception 'livro_vazio';
  end if;
  if v_conteudo -> 'livro' ->> 'titulo' is null then raise exception 'livro_sem_titulo'; end if;
  if exists (select 1 from jsonb_array_elements(v_conteudo -> 'historias') h where h ->> 'titulo' is null) then
    raise exception 'historia_sem_titulo';
  end if;
  if exists (select 1 from jsonb_array_elements(v_conteudo -> 'historias') h
             where not (h ->> 'revisada')::boolean) then
    raise exception 'historia_nao_pronta';
  end if;

  -- QR que faltam. História sem áudio aceito ou mensagem só escrita sai sem QR (alerta amarelo).
  for r in select (h ->> 'id')::uuid as id from jsonb_array_elements(v_conteudo -> 'historias') h
           where h -> 'qr' = 'null'::jsonb loop
    perform pg_advisory_xact_lock(hashtextextended('qr:' || r.id::text, 0));
    if not exists (select 1 from public.qr_codes q where q.story_id = r.id)
       and privado.historia_aceita_qr(r.id) then
      perform privado.qr_inserir(p_book, r.id, null);
    end if;
  end loop;
  for r in select (m ->> 'id')::uuid as id from jsonb_array_elements(v_conteudo -> 'mensagens') m
           where m -> 'qr' = 'null'::jsonb and (m ->> 'com_audio')::boolean loop
    perform pg_advisory_xact_lock(hashtextextended('qr:' || r.id::text, 0));
    if not exists (select 1 from public.qr_codes q where q.message_id = r.id) then
      perform privado.qr_inserir(p_book, null, r.id);
    end if;
  end loop;

  v_conteudo := privado.conteudo_do_livro(p_book, true);
  for r in select x ->> 'codigo' as codigo
           from (select h -> 'qr' as x from jsonb_array_elements(v_conteudo -> 'historias') h
                 union all select m -> 'qr' from jsonb_array_elements(v_conteudo -> 'mensagens') m) t
           where x <> 'null'::jsonb and (x ->> 'ligado')::boolean loop
    if privado.qr_reservar_audio(r.codigo) then v_pedir := v_pedir || r.codigo; end if;
  end loop;
  select count(*)::integer into v_qr
  from (select h -> 'qr' as x from jsonb_array_elements(v_conteudo -> 'historias') h
        union all select m -> 'qr' from jsonb_array_elements(v_conteudo -> 'mensagens') m) t
  where x <> 'null'::jsonb and (x ->> 'ligado')::boolean;

  select coalesce(max(e.versao), 0) + 1 into v_versao from public.book_exports e where e.book_id = p_book;
  insert into public.book_exports (book_id, versao, conteudo, qr_esperados, publicado_por)
    values (p_book, v_versao, v_conteudo, v_qr, (select auth.uid()))
    returning id into v_id;
  return query select v_id, v_versao, v_pedir;
end $$;

-- Só o servidor (Inngest): o conteúdo congelado para montar os PDFs.
create function public.servico_export_conteudo(p_id uuid)
returns table (book_id uuid, versao integer, estado public.export_estado, conteudo jsonb, criado_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.book_id, e.versao, e.estado, e.conteudo, e.criado_em from public.book_exports e where e.id = p_id
$$;

-- PDFs prontos. O servidor conferiu cada QR por software; o banco confere que foram todos.
create function public.servico_export_pronto(
  p_id uuid, p_espec jsonb, p_paginas integer, p_lombada_mm numeric, p_pasta text,
  p_miolo_bytes bigint, p_capa_bytes bigint, p_qr_conferidos integer)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  e record;
begin
  select * into e from public.book_exports x where x.id = p_id for update;
  if e.id is null or e.estado <> 'gerando' then return false; end if;
  if p_qr_conferidos is distinct from e.qr_esperados then raise exception 'qr_nao_conferido'; end if;
  update public.book_exports set estado = 'pronta', espec = p_espec, paginas = p_paginas,
    lombada_mm = p_lombada_mm, pasta = p_pasta, miolo_bytes = p_miolo_bytes, capa_bytes = p_capa_bytes,
    terminado_em = now()
  where id = p_id;
  return true;
end $$;

create function public.servico_export_falhou(p_id uuid, p_erro text)
returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.book_exports set estado = 'falhou', erro = p_erro, terminado_em = now()
  where id = p_id and estado = 'gerando';
  return found;
end $$;

-- ── 4. Mensagem com QR ou numa versão publicada não sai (T49) ──────────────
create or replace function public.mensagem_apagar(p_id uuid)
returns table (audio_caminho text, foto_caminho text)
language plpgsql security definer set search_path = '' as $$
declare
  m record;
begin
  select f.id, f.book_id, f.audio_caminho, f.foto_caminho into m
  from public.family_messages f where f.id = p_id and f.estado = 'arquivada';
  if m.id is null or not exists (
       select 1 from public.book_members b
       where b.book_id = m.book_id and b.user_id = (select auth.uid()) and b.papel = 'responsavel') then
    raise exception 'sem_permissao';
  end if;
  if exists (select 1 from public.qr_codes q where q.message_id = m.id)
     or exists (select 1 from public.book_exports e
                where e.book_id = m.book_id
                  and e.conteudo -> 'mensagens' @> jsonb_build_array(jsonb_build_object('id', m.id))) then
    raise exception 'mensagem_publicada';
  end if;
  perform set_config('ecoa.apagar_mensagem', m.id::text, true);
  delete from public.family_messages f where f.id = m.id;
  perform set_config('ecoa.apagar_mensagem', '', true);
  return query select m.audio_caminho, m.foto_caminho;
end $$;

-- ── 5. Bucket dos PDFs e das prévias ───────────────────────────────────────
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('exportacoes', 'exportacoes', false, 52428800, array['application/pdf', 'image/jpeg']);
  end if;
end $$;

-- ── 6. Quem executa o quê ──────────────────────────────────────────────────
revoke all on function
  privado.max_itens_livro(), privado.max_publicacoes_dia(), privado.publicacao_expira_s(),
  privado.capa_cores(), privado.fonte_audio_da_mensagem(uuid), privado.fonte_audio_do_qr(uuid, uuid),
  privado.qr_duracao_max_s(uuid, uuid), privado.qr_inserir(uuid, uuid, uuid),
  privado.historia_aceita_qr(uuid), privado.conteudo_do_livro(uuid, boolean),
  privado.export_imutavel(), privado.export_sem_truncate()
from public;
revoke all on function
  public.montagem_conteudo(uuid),
  public.montagem_salvar(uuid, integer, text, text, text, uuid, text, uuid[], uuid[], uuid[]),
  public.publicar_livro(uuid, integer),
  public.servico_export_conteudo(uuid),
  public.servico_export_pronto(uuid, jsonb, integer, numeric, text, bigint, bigint, integer),
  public.servico_export_falhou(uuid, text)
from public, anon, authenticated, porta_autor, service_role;
grant execute on function
  public.montagem_conteudo(uuid),
  public.montagem_salvar(uuid, integer, text, text, text, uuid, text, uuid[], uuid[], uuid[]),
  public.publicar_livro(uuid, integer)
to authenticated;
grant execute on function
  public.servico_export_conteudo(uuid),
  public.servico_export_pronto(uuid, jsonb, integer, numeric, text, bigint, bigint, integer),
  public.servico_export_falhou(uuid, text)
to service_role;
