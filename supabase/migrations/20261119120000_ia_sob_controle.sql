-- 20261119120000_ia_sob_controle.sql
-- Prompt 9: editor, parte 2. Tamanho em 5 posições, revisar trecho, acrescentar áudio e
-- propostas da IA mostradas como diferença. Design: docs/designs/ia-sob-controle.md.
--
-- Regras deste arquivo:
-- * A IA nunca escreve no texto da história: grava uma proposta. Só uma pessoa, com a trava,
--   aplica, por aplicar_proposta, que confere no banco que nenhum parágrafo editado à mão
--   mudou ou sumiu.
-- * Nenhum texto passa pelo Inngest (T36). story_versions continua só insert.
-- * porta_autor não recebe nenhum grant novo.

create type public.proposta_tipo as enum ('tamanho', 'trecho', 'audio');
create type public.proposta_estado as enum ('gerando', 'pronta', 'aplicada', 'descartada', 'falhou');

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.max_propostas_dia() returns integer
language sql immutable set search_path = '' as $$ select 40 $$;    -- MAX_PROPOSTAS_DIA
create function privado.max_audio_extra_s() returns integer
language sql immutable set search_path = '' as $$ select 1800 $$;  -- MAX_AUDIO_EXTRA_MIN = 30
create function privado.max_audios_historia() returns integer
language sql immutable set search_path = '' as $$ select 10 $$;    -- MAX_AUDIOS_HISTORIA
create function privado.instrucao_max() returns integer
language sql immutable set search_path = '' as $$ select 300 $$;   -- INSTRUCAO_MAX

-- ── 1. Tamanho em 5 posições ───────────────────────────────────────────────
-- Só alarga o CHECK: as versões existentes (3 valores) continuam valendo.
alter table public.story_versions drop constraint story_versions_tamanho_check;
alter table public.story_versions add constraint story_versions_tamanho_check
  check (tamanho in ('resumido', 'curto', 'medio', 'longo', 'detalhado'));

-- ── 2. Áudio acrescentado a uma história pronta ─────────────────────────────
-- Avulso (sem lote) e nunca passa pela divisão. A chave composta impede outro livro.
alter table public.recordings
  add column para_historia uuid,
  add constraint recordings_para_historia_fk foreign key (book_id, para_historia)
    references public.stories (book_id, id) on delete restrict,
  add constraint recordings_para_historia_avulsa check (para_historia is null or lote_id is null),
  -- Literal: um CHECK roda com o usuário corrente, que não executa funções de privado (= 30 min).
  add constraint recordings_para_historia_duracao check (para_historia is null or duracao_s between 1 and 1800);
create index recordings_para_historia on public.recordings (para_historia) where para_historia is not null;
grant select (para_historia), insert (para_historia) on public.recordings to authenticated;
-- Restritiva (soma às políticas de insert que já existem): só para história pronta do mesmo livro.
create policy "acrescenta só em história pronta" on public.recordings as restrictive
  for insert to authenticated
  with check (para_historia is null or exists (
    select 1 from public.stories s
    where s.id = recordings.para_historia and s.book_id = recordings.book_id and s.estado = 'pronta'));

-- ── 3. story_proposals ─────────────────────────────────────────────────────
-- mudancas: [{id, tira: [{id, texto}], poe: [{id, texto, fontes, editado}], depois_de}].
-- ordem: o texto inteiro proposto (ids), só no tamanho ("Aceitar tudo" = texto da IA).
-- travados: [{id, texto}] dos parágrafos editados à mão na hora do pedido.
-- gravacoes: as gravações que a proposta cobre (áudio: as novas; tamanho: todas).
-- marcacoes: grifos dos parágrafos novos, por id de parágrafo ({paragrafo_id, inicio, fim, ...}).
-- Entre passos do Inngest, a saída da IA fica aqui (servico_gravar_proposta com p_pronta = false).
create table public.story_proposals (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null,
  book_id uuid not null,
  tipo public.proposta_tipo not null,
  estado public.proposta_estado not null default 'gerando',
  tamanho text not null check (tamanho in ('resumido', 'curto', 'medio', 'longo', 'detalhado')),
  pedido jsonb not null default '{}'::jsonb
    check (jsonb_typeof(pedido) = 'object' and octet_length(pedido::text) <= 8000),
  gravacoes uuid[] not null default '{}' check (cardinality(gravacoes) <= 100),
  travados jsonb not null default '[]'::jsonb
    check (jsonb_typeof(travados) = 'array' and octet_length(travados::text) <= 2000000),
  mudancas jsonb check (mudancas is null or jsonb_typeof(mudancas) = 'array'),
  ordem text[] check (ordem is null or cardinality(ordem) <= 300),
  marcacoes jsonb not null default '[]'::jsonb check (jsonb_typeof(marcacoes) = 'array'),
  erro text check (erro is null or erro ~ '^[a-z_]{2,40}$'),
  modelos jsonb check (modelos is null or jsonb_typeof(modelos) = 'object'),           -- T31
  hash_prompts jsonb check (hash_prompts is null or jsonb_typeof(hash_prompts) = 'object'),
  aplicadas text[] check (aplicadas is null or cardinality(aplicadas) <= 400),
  versao integer check (versao is null or versao >= 1),
  pedida_por uuid references auth.users (id) on delete set null,
  pedida_em timestamptz not null default now(),
  pronta_em timestamptz,
  decidida_por uuid references auth.users (id) on delete set null,
  decidida_em timestamptz,
  unique (book_id, id),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict,
  constraint propostas_decidida check ((estado in ('aplicada', 'descartada')) = (decidida_em is not null)),
  constraint propostas_com_mudancas check (estado not in ('pronta', 'aplicada') or mudancas is not null),
  constraint propostas_falhou check ((estado = 'falhou') = (erro is not null)),
  constraint propostas_aplicada check ((estado = 'aplicada') = (versao is not null and aplicadas is not null))
);
create unique index story_proposals_uma_pendente on public.story_proposals (story_id, tipo)
  where estado in ('gerando', 'pronta');
create index story_proposals_livro_data on public.story_proposals (book_id, pedida_em desc);
create index story_proposals_gerando on public.story_proposals (pedida_em) where estado = 'gerando';

-- Decidida não muda nem se apaga (base das métricas). Só os ids de pessoa podem virar null (LGPD).
create function privado.proposta_imutavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'versao_imutavel'; end if;
  if old.estado::text in ('aplicada', 'descartada', 'falhou')
     and (to_jsonb(new) - array['pedida_por', 'decidida_por'])
         <> (to_jsonb(old) - array['pedida_por', 'decidida_por']) then
    raise exception 'versao_imutavel';
  end if;
  return new;
end $$;
create trigger story_proposals_imutavel before update or delete on public.story_proposals
  for each row execute function privado.proposta_imutavel();
create trigger story_proposals_sem_truncate before truncate on public.story_proposals
  for each statement execute function privado.so_insert();

alter table public.story_proposals enable row level security;
revoke all on public.story_proposals from public, anon, authenticated, porta_autor, service_role;
grant select, insert, update on public.story_proposals to service_role;  -- sem delete nem truncate
grant select (id, story_id, book_id, tipo, estado, tamanho, pedido, gravacoes, mudancas, ordem,
  marcacoes, erro, aplicadas, versao, pedida_em, pronta_em, decidida_em)
  on public.story_proposals to authenticated;
create policy "membro lê" on public.story_proposals for select to authenticated
  using (privado.eh_membro(book_id));

-- A versão que nasceu de uma proposta aceita aponta para ela (origem sempre 'ia').
alter table public.story_versions
  add column proposta_id uuid,
  add constraint story_versions_proposta_fk foreign key (book_id, proposta_id)
    references public.story_proposals (book_id, id) on delete restrict,
  add constraint story_versions_proposta_so_ia check (proposta_id is null or origem = 'ia');

-- ── 4. Auxiliares ──────────────────────────────────────────────────────────
-- Parágrafos do texto atual (o salvo, ou a última versão). A versão da IA não tem id nem
-- "editado": ganha p1..pN, como normalizarTexto (lib/editor/conteudo.ts).
create function privado.paragrafos_atuais(p_story uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  select s.texto into v from public.stories s where s.id = p_story;
  if v is null then
    select x.conteudo into v from public.story_versions x where x.story_id = p_story
      order by x.numero desc limit 1;
  end if;
  return coalesce((
    select jsonb_agg(case when jsonb_typeof(p -> 'id') = 'string'
                          then p || jsonb_build_object('editado', coalesce((p ->> 'editado')::boolean, false))
                          else p || jsonb_build_object('id', 'p' || n, 'editado', false) end
                     order by n)
    from jsonb_array_elements(v -> 'paragrafos') with ordinality t(p, n)), '[]'::jsonb);
end $$;

create function privado.travados_atuais(p_story uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a ->> 'id', 'texto', a ->> 'texto')), '[]'::jsonb)
  from jsonb_array_elements(privado.paragrafos_atuais(p_story)) a
  where (a ->> 'editado')::boolean
$$;

create function privado.tamanho_atual(p_story uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select x.tamanho from public.story_versions x where x.story_id = p_story
                   order by x.numero desc limit 1), 'medio')
$$;

create function privado.propostas_hoje(p_book uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.story_proposals p
  where p.book_id = p_book and p.pedida_em > now() - interval '24 hours'
$$;

-- Segundos de fala da história: pelos segmentos dela; gravação ainda sem transcrição, pela duração.
create function privado.fala_da_historia_s(p_story uuid) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(case
    when t.recording_id is null then r.duracao_s::numeric
    else (select coalesce(sum((s ->> 'fim')::numeric - (s ->> 'inicio')::numeric), 0)
          from jsonb_array_elements(t.segmentos) s
          where sr.segmentos is null or (s ->> 'id')::integer = any (sr.segmentos))
  end), 0)
  from public.story_recordings sr
  join public.recordings r on r.id = sr.recording_id
  left join public.transcripts t on t.recording_id = sr.recording_id
  where sr.story_id = p_story
$$;

-- Áudios acrescentados que ainda não entraram no texto por uma proposta aplicada.
create function privado.audios_fora_do_texto(p_story uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(sr.recording_id order by sr.ordem), '{}')
  from public.story_recordings sr join public.recordings r on r.id = sr.recording_id
  where sr.story_id = p_story and r.para_historia = p_story
    and not exists (select 1 from public.story_proposals p
                    where p.story_id = p_story and p.estado = 'aplicada'
                      and sr.recording_id = any (p.gravacoes)
                      -- Tamanho aceito só em parte pode ter deixado o áudio de fora.
                      and (p.tipo = 'audio' or cardinality(p.aplicadas) = jsonb_array_length(p.mudancas)))
$$;

-- Formato das mudanças (o servidor monta; o banco confere antes de mostrar).
create function privado.mudancas_validas(p jsonb, p_tipo public.proposta_tipo, p_pedido jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare m jsonb; x jsonb; v_ids text[] := '{}'; v_poe text[] := '{}';
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 400
     or octet_length(p::text) > 2000000 then return false; end if;
  -- Revisar trecho: 1 mudança, que tira só o parágrafo pedido e põe 1 parágrafo.
  if p_tipo = 'trecho' and (jsonb_array_length(p) <> 1
       or jsonb_array_length(p -> 0 -> 'tira') <> 1 or jsonb_array_length(p -> 0 -> 'poe') <> 1
       or (p -> 0 -> 'tira' -> 0 ->> 'id') is distinct from (p_pedido ->> 'paragrafo')) then
    return false;
  end if;
  for m in select value from jsonb_array_elements(p) loop
    if jsonb_typeof(m) <> 'object' or (m - array['id', 'tira', 'poe', 'depois_de']) <> '{}'::jsonb
       or coalesce(m ->> 'id', '') !~ '^m[0-9]{1,4}$' or (m ->> 'id') = any (v_ids)
       or coalesce(jsonb_typeof(m -> 'tira'), '') <> 'array'
       or coalesce(jsonb_typeof(m -> 'poe'), '') <> 'array'
       or jsonb_array_length(m -> 'tira') + jsonb_array_length(m -> 'poe') = 0
       or coalesce(jsonb_typeof(m -> 'depois_de'), 'null') not in ('null', 'string')
       or (jsonb_array_length(m -> 'tira') > 0 and jsonb_typeof(m -> 'depois_de') = 'string') then
      return false;
    end if;
    v_ids := v_ids || (m ->> 'id');
    for x in select value from jsonb_array_elements(m -> 'tira') loop
      if jsonb_typeof(x) <> 'object' or (x - array['id', 'texto']) <> '{}'::jsonb
         or coalesce(x ->> 'id', '') !~ '^[a-z0-9-]{1,40}$'
         or coalesce(jsonb_typeof(x -> 'texto'), '') <> 'string' then return false; end if;
    end loop;
    for x in select value from jsonb_array_elements(m -> 'poe') loop
      -- Mesmo formato de parágrafo do editor (conteudo_valido); editado só no trecho (I3).
      if not privado.conteudo_valido(jsonb_build_object('titulo', '', 'paragrafos', jsonb_build_array(x)))
         or btrim(x ->> 'texto') = '' or (x ->> 'id') = any (v_poe)
         or coalesce((x ->> 'editado')::boolean, false) <> (p_tipo = 'trecho') then
        return false;
      end if;
      v_poe := v_poe || (x ->> 'id');
    end loop;
  end loop;
  return true;
end $$;

-- ── 5. Áudio acrescentado (chamado por servico_iniciar_historia) ────────────
-- Liga a gravação à história e cria a proposta "gerando". historia null = não processar agora.
create function privado.acrescentar_audio(p_recording uuid)
returns table (historia uuid, estado public.story_estado, motivo text)
language plpgsql security definer set search_path = '' as $$
declare v public.recordings; s public.stories; v_min numeric; v_reservado numeric;
  v_pend public.story_proposals; v_ordem integer;
begin
  select * into v from public.recordings r where r.id = p_recording;
  perform pg_advisory_xact_lock(hashtextextended('livro:' || v.book_id::text, 0));
  select * into s from public.stories x where x.id = v.para_historia for update;
  if exists (select 1 from public.story_recordings sr where sr.recording_id = p_recording) then
    return query select s.id, s.estado, 'acrescentar'; return;  -- idempotente
  end if;
  if s.estado::text <> 'pronta' then
    return query select null::uuid, null::public.story_estado, 'historia_indisponivel'; return;
  end if;
  if not privado.livro_editavel(v.book_id) then
    return query select null::uuid, null::public.story_estado, 'livro_fechado'; return;
  end if;
  if not exists (select 1 from public.books b where b.id = v.book_id
                   and b.ia_consentimento_versao >= privado.consentimento_ia_versao()) then
    return query select null::uuid, null::public.story_estado, 'sem_consentimento'; return;
  end if;
  if v.duracao_s is null then
    return query select null::uuid, null::public.story_estado, 'sem_duracao'; return;
  end if;
  if v.duracao_s > privado.max_audio_extra_s()
     or privado.fala_da_historia_s(s.id) + v.duracao_s > privado.max_fala_historia_s()
     or (select count(*) from public.story_recordings sr where sr.story_id = s.id)
        >= privado.max_audios_historia() then
    return query select null::uuid, null::public.story_estado, 'longa'; return;
  end if;
  -- Cota de minutos (T38): a mesma conta de servico_iniciar_historia.
  select coalesce(sum(u.minutos_audio), 0) into v_min from public.ai_usage u
    where u.book_id = v.book_id and u.etapa = 'transcrever' and u.criado_em > now() - interval '24 hours';
  select coalesce(sum(r.duracao_s), 0) / 60.0 into v_reservado from public.recordings r
    where r.book_id = v.book_id and r.recebido_em > now() - interval '24 hours'
      and exists (select 1 from public.story_recordings sr where sr.recording_id = r.id)
      and not exists (select 1 from public.transcripts t where t.recording_id = r.id);
  if v_min + v_reservado + v.duracao_s / 60.0 > privado.max_minutos_ia_por_dia() then
    return query select null::uuid, null::public.story_estado, 'cota_diaria'; return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('propostas:' || v.book_id::text, 0));
  if privado.propostas_hoje(v.book_id) >= privado.max_propostas_dia() then
    return query select null::uuid, null::public.story_estado, 'cota_ia_diaria'; return;
  end if;
  select * into v_pend from public.story_proposals p
    where p.story_id = s.id and p.tipo = 'audio' and p.estado in ('gerando', 'pronta') for update;
  if found and v_pend.estado = 'gerando' then raise exception 'proposta_em_andamento'; end if;  -- o Inngest tenta de novo
  select coalesce(max(sr.ordem), 0) + 1 into v_ordem from public.story_recordings sr where sr.story_id = s.id;
  insert into public.story_recordings (story_id, recording_id, book_id, ordem)
    values (s.id, p_recording, v.book_id, v_ordem);
  -- A nova cobre a anterior (que ainda não foi aceita) e o áudio novo.
  if v_pend.id is not null then
    update public.story_proposals set estado = 'descartada', decidida_em = now() where id = v_pend.id;
  end if;
  insert into public.story_proposals (story_id, book_id, tipo, tamanho, gravacoes, travados, pedida_por)
    values (s.id, v.book_id, 'audio', privado.tamanho_atual(s.id), privado.audios_fora_do_texto(s.id),
            privado.travados_atuais(s.id), v.criado_por);
  return query select s.id, s.estado, 'acrescentar';
end $$;

-- servico_iniciar_historia: corpo de 20261117120000_divisao.sql com UMA mudança (o desvio por
-- para_historia, logo depois de conferir que a gravação chegou). A reversão recria o anterior.
create or replace function public.servico_iniciar_historia(p_recording uuid)
returns table (historia uuid, estado public.story_estado, motivo text)
language plpgsql security definer set search_path = '' as $$
declare
  v public.recordings; v_story uuid; v_estado public.story_estado; v_dividida boolean;
  v_grupo uuid[]; v_total integer; v_recebidas integer; v_enviando integer; v_ultima timestamptz;
  v_longa_sem_total boolean; v_min numeric; v_reservado numeric; v_prompt uuid; v_id uuid;
  v_i integer := 0;
begin
  select * into v from public.recordings r where r.id = p_recording;
  if not found or v.upload <> 'recebido' then
    return query select null::uuid, null::public.story_estado, 'nao_recebido'; return;
  end if;
  if v.processado_em is not null and not exists (select 1 from public.story_recordings sr
                                                 where sr.recording_id = p_recording) then
    return query select null::uuid, null::public.story_estado, 'descartada'; return;
  end if;
  -- Prompt 9: áudio acrescentado a uma história pronta (nunca vira história nova nem divisão).
  if v.para_historia is not null then
    return query select * from privado.acrescentar_audio(p_recording); return;
  end if;
  -- Um livro de cada vez por aqui: o grupo e a cota diária são decididos sem corrida.
  perform pg_advisory_xact_lock(hashtextextended('livro:' || v.book_id::text, 0));

  select sr.story_id, s.estado, (s.divisao_de is not null or coalesce(s.divisao ? 'final', false))
    into v_story, v_estado, v_dividida
    from public.story_recordings sr join public.stories s on s.id = sr.story_id
    where sr.recording_id = p_recording order by s.criado_em, sr.ordem limit 1;
  if found then  -- já existe: quem chamou decide (pronta/falhou/separar/dividida = parar)
    return query select v_story, v_estado, case when v_dividida then 'dividida' end; return;
  end if;

  if v.lote_id is null then
    v_grupo := array[p_recording];
  elsif exists (select 1 from public.recordings r join public.story_recordings sr on sr.recording_id = r.id
                where r.book_id = v.book_id and r.lote_id = v.lote_id) then
    v_grupo := array[p_recording];  -- chegou depois que o lote já virou história: segue sozinha
  else
    select count(*) filter (where r.upload = 'recebido'), count(*) filter (where r.upload = 'enviando'),
           max(r.recebido_em), max(r.lote_total),
           bool_or(r.lote_total is null and r.origem = 'conversa' and r.upload = 'recebido'
                   and r.duracao_s >= privado.max_historia_s() - 60)
      into v_recebidas, v_enviando, v_ultima, v_total, v_longa_sem_total
      from public.recordings r where r.book_id = v.book_id and r.lote_id = v.lote_id;
    -- Completo: chegaram todos os que o aparelho anunciou. Linha antiga, sem total: nenhum
    -- enviando e nenhuma parte de conversa com 29 min ou mais (a regra de P43). Ou 6 h de espera.
    if not ((v_total is not null and v_recebidas >= v_total)
            or (v_total is null and v_enviando = 0 and not coalesce(v_longa_sem_total, false))
            or v_ultima < now() - make_interval(hours => privado.espera_lote_h())) then
      return query select null::uuid, null::public.story_estado, 'lote_incompleto'; return;
    end if;
    -- Em ordem, até 120 min: o que passar fica sem história e segue sozinho depois.
    select array_agg(x.id order by x.n) into v_grupo
      from (select r.id, row_number() over w as n, sum(r.duracao_s) over w as acumulado
            from public.recordings r
            where r.book_id = v.book_id and r.lote_id = v.lote_id and r.upload = 'recebido'
              and r.duracao_s is not null and r.duracao_s <= privado.max_arquivo_s()
            window w as (order by r.lote_ordem nulls last, r.criado_em, r.nome_arquivo, r.id)) x
      where x.n = 1 or x.acumulado <= privado.max_min_conteiner() * 60;
    if v_grupo is null then v_grupo := array[p_recording]; end if;
  end if;

  if exists (select 1 from public.recordings r where r.id = any (v_grupo) and r.duracao_s is null) then
    return query select null::uuid, null::public.story_estado, 'sem_duracao'; return;
  end if;
  -- D9: arquivo de até 2 h é processado inteiro; a divisão é lógica, pelo texto, e o original não é cortado.
  if exists (select 1 from public.recordings r where r.id = any (v_grupo)
             and r.duracao_s > privado.max_arquivo_s()) then
    return query select null::uuid, null::public.story_estado, 'longa'; return;
  end if;
  if not privado.livro_editavel(v.book_id) then
    return query select null::uuid, null::public.story_estado, 'livro_fechado'; return;
  end if;
  if not exists (select 1 from public.books b where b.id = v.book_id
                   and b.ia_consentimento_versao >= privado.consentimento_ia_versao()) then
    return query select null::uuid, null::public.story_estado, 'sem_consentimento'; return;
  end if;
  -- Cota (T38): o que já foi transcrito em 24 h + o que já tem história e ainda não foi transcrito.
  select coalesce(sum(u.minutos_audio), 0) into v_min from public.ai_usage u
    where u.book_id = v.book_id and u.etapa = 'transcrever' and u.criado_em > now() - interval '24 hours';
  select coalesce(sum(r.duracao_s), 0) / 60.0 into v_reservado
    from public.recordings r
    where r.book_id = v.book_id and r.recebido_em > now() - interval '24 hours'
      and exists (select 1 from public.story_recordings sr where sr.recording_id = r.id)
      and not exists (select 1 from public.transcripts t where t.recording_id = r.id);
  if v_min + v_reservado + (select sum(r.duracao_s) from public.recordings r where r.id = any (v_grupo)) / 60.0
       > privado.max_minutos_ia_por_dia() then
    return query select null::uuid, null::public.story_estado, 'cota_diaria'; return;
  end if;

  -- Pergunta do contêiner: a da gravação, ou a mesma em todos os arquivos do grupo.
  select case when count(*) = count(r.prompt_id) and count(distinct r.prompt_id) = 1
              then (array_agg(r.prompt_id))[1] end
    into v_prompt from public.recordings r where r.id = any (v_grupo);
  insert into public.stories (book_id, prompt_id) values (v.book_id, v_prompt) returning id into v_story;
  foreach v_id in array v_grupo loop
    v_i := v_i + 1;
    insert into public.story_recordings (story_id, recording_id, book_id, ordem)
      values (v_story, v_id, v.book_id, v_i);
  end loop;
  return query select v_story, 'ouvindo'::public.story_estado, null::text;
end $$;


-- ── 6. Funções das propostas ───────────────────────────────────────────────
-- Pedir tamanho, revisão de trecho ou "usar este áudio no texto". Exige a trava desta tela.
-- p_pedido: tamanho e áudio = {}; trecho = {paragrafo, inicio, fim, instrucao, texto?}.
create function public.pedir_proposta(p_story uuid, p_aba uuid, p_tipo public.proposta_tipo,
  p_tamanho text default null, p_pedido jsonb default '{}'::jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_ok boolean; v_livro uuid; v_tam text; v_atual jsonb; v_alvo jsonb; v_grav uuid[] := '{}';
  v_pend public.story_proposals; v_id uuid; v_ini integer; v_fim integer;
begin
  select e.editando into v_ok from public.editar_historia(p_story, p_aba, true, false) e;
  if not v_ok then raise exception 'trava_de_outro'; end if;  -- editar_historia já confere membro, pronta e plano
  select s.book_id into v_livro from public.stories s where s.id = p_story;
  if not exists (select 1 from public.books b where b.id = v_livro
                   and b.ia_consentimento_versao >= privado.consentimento_ia_versao()) then
    raise exception 'sem_consentimento';
  end if;
  -- Sempre história antes de 'propostas:' (a mesma ordem de acrescentar_audio): sem deadlock.
  perform pg_advisory_xact_lock(hashtextextended('propostas:' || v_livro::text, 0));
  if privado.propostas_hoje(v_livro) >= privado.max_propostas_dia() then raise exception 'cota_ia_diaria'; end if;
  v_tam := coalesce(p_tamanho, privado.tamanho_atual(p_story));
  if v_tam not in ('resumido', 'curto', 'medio', 'longo', 'detalhado') or p_pedido is null
     or jsonb_typeof(p_pedido) <> 'object' then
    raise exception 'dados_invalidos';
  end if;
  v_atual := privado.paragrafos_atuais(p_story);
  if (select count(*) <> count(distinct a ->> 'id') from jsonb_array_elements(v_atual) a) then
    raise exception 'dados_invalidos';  -- ids repetidos: o editor salva de novo (normalizarTexto) antes
  end if;
  if p_tipo = 'tamanho' then
    if p_pedido <> '{}'::jsonb then raise exception 'dados_invalidos'; end if;
    -- Áudio ainda sendo ouvido: a estrutura não tem os falantes dele.
    if exists (select 1 from public.story_proposals p where p.story_id = p_story
               and p.tipo = 'audio' and p.estado = 'gerando') then
      raise exception 'proposta_em_andamento';
    end if;
    select coalesce(array_agg(sr.recording_id order by sr.ordem), '{}') into v_grav
      from public.story_recordings sr where sr.story_id = p_story;
  elsif p_tipo = 'trecho' then
    if (p_pedido - array['paragrafo', 'inicio', 'fim', 'instrucao', 'texto']) <> '{}'::jsonb
       or coalesce(p_pedido ->> 'instrucao', '') not in ('curto', 'fiel', 'corrigir', 'livre')
       or coalesce(jsonb_typeof(p_pedido -> 'paragrafo'), '') <> 'string'
       or coalesce(jsonb_typeof(p_pedido -> 'inicio'), '') <> 'number'
       or coalesce(jsonb_typeof(p_pedido -> 'fim'), '') <> 'number'
       or (p_pedido ->> 'inicio') !~ '^[0-9]{1,5}$' or (p_pedido ->> 'fim') !~ '^[0-9]{1,5}$'
       or ((p_pedido ->> 'instrucao') = 'livre')
          <> coalesce(jsonb_typeof(p_pedido -> 'texto') = 'string', false)
       or char_length(btrim(coalesce(p_pedido ->> 'texto', 'x'))) not between 1 and privado.instrucao_max() then
      raise exception 'dados_invalidos';
    end if;
    -- Posições em pontos de código (char_length); o servidor converte do UTF-16 da tela.
    select a into v_alvo from jsonb_array_elements(v_atual) a where a ->> 'id' = p_pedido ->> 'paragrafo';
    v_ini := (p_pedido ->> 'inicio')::integer;
    v_fim := (p_pedido ->> 'fim')::integer;
    if v_alvo is null or v_fim <= v_ini or v_fim > char_length(v_alvo ->> 'texto') then
      raise exception 'dados_invalidos';
    end if;
    -- A revisão roda na ação do servidor: se ela morreu, a pendente de 3 min não bloqueia.
    update public.story_proposals set estado = 'falhou', erro = 'parada'
      where story_id = p_story and tipo = 'trecho' and estado = 'gerando'
        and pedida_em < now() - interval '3 minutes';
  else  -- audio: usar no texto os áudios acrescentados que ficaram de fora
    if p_pedido <> '{}'::jsonb then raise exception 'dados_invalidos'; end if;
    v_grav := privado.audios_fora_do_texto(p_story);
    if cardinality(v_grav) = 0 then raise exception 'dados_invalidos'; end if;
  end if;
  select * into v_pend from public.story_proposals p
    where p.story_id = p_story and p.tipo = p_tipo and p.estado in ('gerando', 'pronta') for update;
  if found then
    if v_pend.estado = 'gerando' then raise exception 'proposta_em_andamento'; end if;
    update public.story_proposals set estado = 'descartada', decidida_por = (select auth.uid()),
      decidida_em = now() where id = v_pend.id;
  end if;
  insert into public.story_proposals (story_id, book_id, tipo, tamanho, pedido, gravacoes, travados, pedida_por)
    values (p_story, v_livro, p_tipo, v_tam, p_pedido, v_grav, privado.travados_atuais(p_story),
            (select auth.uid()))
    returning id into v_id;
  return v_id;
end $$;

-- O pipeline grava as mudanças (p_pronta = false entre passos; true no fim).
create function public.servico_gravar_proposta(p_proposta uuid, p_mudancas jsonb, p_ordem text[],
  p_marcacoes jsonb, p_pronta boolean, p_modelos jsonb default null, p_hash jsonb default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare pr public.story_proposals;
begin
  select * into pr from public.story_proposals p where p.id = p_proposta for update;
  if not found or pr.estado <> 'gerando' then return false; end if;
  if not privado.mudancas_validas(p_mudancas, pr.tipo, pr.pedido)
     or not privado.marcacoes_validas(coalesce(p_marcacoes, '[]'::jsonb))
     or (p_ordem is not null and pr.tipo <> 'tamanho') then
    raise exception 'dados_invalidos';
  end if;
  begin
    update public.story_proposals set mudancas = p_mudancas, ordem = p_ordem,
      marcacoes = coalesce(p_marcacoes, '[]'::jsonb), modelos = p_modelos, hash_prompts = p_hash,
      estado = case when p_pronta then 'pronta'::public.proposta_estado else 'gerando'::public.proposta_estado end,
      pronta_em = case when p_pronta then now() end
    where id = p_proposta;
  exception when check_violation then
    raise exception 'dados_invalidos';  -- nunca a linha com o texto na mensagem (T36)
  end;
  if p_pronta then
    update public.recordings r set processado_em = now()
      where r.id = any (pr.gravacoes) and r.para_historia = pr.story_id and r.processado_em is null;
  end if;
  return true;
end $$;

create function public.servico_falhar_proposta(p_proposta uuid, p_erro text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.story_proposals set estado = 'falhou',
    erro = case when p_erro ~ '^[a-z_]{2,40}$' then p_erro else 'erro_inesperado' end
  where id = p_proposta and estado = 'gerando';
  return found;
end $$;

create function public.descartar_proposta(p_story uuid, p_aba uuid, p_proposta uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_ok boolean;
begin
  select e.editando into v_ok from public.editar_historia(p_story, p_aba, true, false) e;
  if not v_ok then raise exception 'trava_de_outro'; end if;
  update public.story_proposals set estado = 'descartada', decidida_por = (select auth.uid()),
    decidida_em = now()
  where id = p_proposta and story_id = p_story and estado = 'pronta';
  return found;
end $$;

-- Aceitar (tudo ou parte). p_conteudo é o texto final montado pelo servidor; o banco confere
-- que ele é exatamente "texto atual - o que as mudanças aceitas tiram + o que elas põem".
create function public.aplicar_proposta(p_story uuid, p_aba uuid, p_rev integer, p_proposta uuid,
  p_aplicadas text[], p_conteudo jsonb, p_marcacoes jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_ok boolean; v public.stories; pr public.story_proposals; v_eu uuid := (select auth.uid());
  v_base jsonb; v_atual jsonb; v_ms jsonb; v_novos jsonb; v_tira text[]; v_poe text[]; v_num integer;
  v_tam text; v_final jsonb;
begin
  select e.editando into v_ok from public.editar_historia(p_story, p_aba, true, false) e;
  if not v_ok then raise exception 'trava_de_outro'; end if;
  select * into v from public.stories s where s.id = p_story for update;
  if v.texto_rev <> p_rev then raise exception 'texto_desatualizado'; end if;
  select * into pr from public.story_proposals p where p.id = p_proposta and p.story_id = p_story for update;
  if not found or pr.estado <> 'pronta' then raise exception 'proposta_indisponivel'; end if;
  if p_aplicadas is null or cardinality(p_aplicadas) = 0
     or p_conteudo is null or jsonb_typeof(p_conteudo -> 'paragrafos') <> 'array'
     or not privado.marcacoes_validas(p_marcacoes) then
    raise exception 'dados_invalidos';
  end if;
  -- Título, ano e lacunas são os do texto atual: o aceite só mexe nos parágrafos.
  v_base := coalesce(v.texto, (select x.conteudo from public.story_versions x
                               where x.story_id = p_story order by x.numero desc limit 1));
  -- Ninguém editou ainda: o título é o de stories (P46: pode ser o confirmado na divisão).
  if v.texto is null then
    v_base := v_base - 'ano' || jsonb_build_object('titulo', coalesce(v.titulo, v_base ->> 'titulo', ''))
              || case when v.ano is null then '{}'::jsonb else jsonb_build_object('ano', v.ano) end;
  end if;
  v_novos := p_conteudo -> 'paragrafos';
  v_final := (v_base - 'paragrafos') || jsonb_build_object('paragrafos', v_novos);
  if not privado.conteudo_valido(v_final) then raise exception 'dados_invalidos'; end if;
  v_atual := privado.paragrafos_atuais(p_story);
  if (select count(*) <> count(distinct n ->> 'id') from jsonb_array_elements(v_novos) n)
     or (select count(*) <> count(distinct a ->> 'id') from jsonb_array_elements(v_atual) a) then
    raise exception 'dados_invalidos';
  end if;
  select coalesce(jsonb_agg(m), '[]'::jsonb) into v_ms
    from jsonb_array_elements(pr.mudancas) m where m ->> 'id' = any (p_aplicadas);
  if jsonb_array_length(v_ms) <> (select count(distinct x) from unnest(p_aplicadas) x) then
    raise exception 'dados_invalidos';
  end if;
  select coalesce(array_agg(t ->> 'id'), '{}') into v_tira
    from jsonb_array_elements(v_ms) m, jsonb_array_elements(m -> 'tira') t;
  select coalesce(array_agg(q ->> 'id'), '{}') into v_poe
    from jsonb_array_elements(v_ms) m, jsonb_array_elements(m -> 'poe') q;

  -- O que as mudanças tiram ainda está igual ao da hora do pedido...
  if exists (select 1 from jsonb_array_elements(v_ms) m, jsonb_array_elements(m -> 'tira') t
             where not exists (select 1 from jsonb_array_elements(v_atual) a
                               where a ->> 'id' = t ->> 'id' and a ->> 'texto' = t ->> 'texto')) then
    raise exception 'proposta_vencida';
  end if;
  -- ...e não é travado (salvo o parágrafo escolhido num "Revisar trecho").
  if exists (select 1 from jsonb_array_elements(v_atual) a
             where a ->> 'id' = any (v_tira) and (a ->> 'editado')::boolean
               and not (pr.tipo = 'trecho' and a ->> 'id' = pr.pedido ->> 'paragrafo')) then
    raise exception 'travado_alterado';
  end if;
  -- Id novo não pode repetir o de um parágrafo que fica.
  if exists (select 1 from jsonb_array_elements(v_atual) a
             where a ->> 'id' = any (v_poe) and not (a ->> 'id' = any (v_tira))) then
    raise exception 'dados_invalidos';
  end if;
  -- Todo parágrafo atual fora das mudanças continua idêntico (é aqui que o editado à mão é garantido).
  if exists (select 1 from jsonb_array_elements(v_atual) a
             where not (a ->> 'id' = any (v_tira)) and (a ->> 'editado')::boolean
               and not exists (select 1 from jsonb_array_elements(v_novos) n
                               where n ->> 'id' = a ->> 'id' and n ->> 'texto' = a ->> 'texto'
                                 and n -> 'fontes' = a -> 'fontes'
                                 and coalesce((n ->> 'editado')::boolean, false))) then
    raise exception 'travado_alterado';
  end if;
  if exists (select 1 from jsonb_array_elements(v_atual) a
             where not (a ->> 'id' = any (v_tira))
               and not exists (select 1 from jsonb_array_elements(v_novos) n
                               where n ->> 'id' = a ->> 'id' and n ->> 'texto' = a ->> 'texto'
                                 and n -> 'fontes' = a -> 'fontes'
                                 and coalesce((n ->> 'editado')::boolean, false) = (a ->> 'editado')::boolean)) then
    raise exception 'proposta_vencida';
  end if;
  -- Todo parágrafo posto está lá, idêntico ao da proposta.
  if exists (select 1 from jsonb_array_elements(v_ms) m, jsonb_array_elements(m -> 'poe') q
             where not exists (select 1 from jsonb_array_elements(v_novos) n
                               where n ->> 'id' = q ->> 'id' and n ->> 'texto' = q ->> 'texto'
                                 and n -> 'fontes' = q -> 'fontes'
                                 and coalesce((n ->> 'editado')::boolean, false)
                                     = coalesce((q ->> 'editado')::boolean, false))) then
    raise exception 'dados_invalidos';
  end if;
  -- E nada além: atuais que ficam + postos (com os dois checks acima, nada estranho entra).
  if jsonb_array_length(v_novos)
     <> (select count(*) from jsonb_array_elements(v_atual) a where not (a ->> 'id' = any (v_tira)))
        + cardinality(v_poe) then
    raise exception 'dados_invalidos';
  end if;
  -- Os que ficam mantêm a ordem entre si.
  if (select coalesce(array_agg(a ->> 'id' order by i), '{}') from jsonb_array_elements(v_atual)
        with ordinality t(a, i) where not (a ->> 'id' = any (v_tira)))
     <> (select coalesce(array_agg(n ->> 'id' order by i), '{}') from jsonb_array_elements(v_novos)
        with ordinality t(n, i) where not (n ->> 'id' = any (v_poe))) then
    raise exception 'dados_invalidos';
  end if;

  perform privado.guardar_versao(p_story);  -- o texto pendente vira versão antes (nada se perde)
  v_tam := case when pr.tipo = 'tamanho' then pr.tamanho else privado.tamanho_atual(p_story) end;
  select coalesce(max(x.numero), 0) + 1 into v_num from public.story_versions x where x.story_id = p_story;
  insert into public.story_versions (story_id, book_id, numero, origem, tamanho, conteudo, marcacoes,
    modelos, hash_prompts, proposta_id)
    values (p_story, v.book_id, v_num, 'ia', v_tam, v_final, p_marcacoes, pr.modelos, pr.hash_prompts,
            p_proposta);
  -- Título e ano da história não mudam (P46: o título pode ser o confirmado na divisão).
  update public.stories set
    texto = v_final, texto_marcacoes = p_marcacoes, texto_rev = texto_rev + 1,
    versao_rev = texto_rev + 1, texto_por = v_eu, texto_origem = 'ia', texto_em = now()
  where id = p_story;
  update public.story_proposals set estado = 'aplicada', aplicadas = p_aplicadas, versao = v_num,
    decidida_por = v_eu, decidida_em = now()
  where id = p_proposta;
  return v.texto_rev + 1;
end $$;

revoke all on function public.pedir_proposta(uuid, uuid, public.proposta_tipo, text, jsonb),
  public.aplicar_proposta(uuid, uuid, integer, uuid, text[], jsonb, jsonb),
  public.descartar_proposta(uuid, uuid, uuid),
  public.servico_gravar_proposta(uuid, jsonb, text[], jsonb, boolean, jsonb, jsonb),
  public.servico_falhar_proposta(uuid, text)
  from public, anon, authenticated, porta_autor, service_role;
grant execute on function public.pedir_proposta(uuid, uuid, public.proposta_tipo, text, jsonb),
  public.aplicar_proposta(uuid, uuid, integer, uuid, text[], jsonb, jsonb),
  public.descartar_proposta(uuid, uuid, uuid)
  to authenticated;
grant execute on function public.servico_gravar_proposta(uuid, jsonb, text[], jsonb, boolean, jsonb, jsonb),
  public.servico_falhar_proposta(uuid, text)
  to service_role;
revoke all on function privado.max_propostas_dia(), privado.max_audio_extra_s(),
  privado.max_audios_historia(), privado.instrucao_max(), privado.proposta_imutavel(),
  privado.paragrafos_atuais(uuid), privado.travados_atuais(uuid), privado.tamanho_atual(uuid),
  privado.propostas_hoje(uuid), privado.fala_da_historia_s(uuid), privado.audios_fora_do_texto(uuid),
  privado.mudancas_validas(jsonb, public.proposta_tipo, jsonb), privado.acrescentar_audio(uuid)
  from public;
