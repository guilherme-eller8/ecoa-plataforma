-- 20261117120000_divisao.sql
-- Prompt 7: divisão em histórias (lotes e conversas longas). Design: docs/designs/divisao-historias.md.
--
-- Regras deste arquivo:
-- * O grupo de gravações (1 gravação, um lote de arquivos ou as partes de uma conversa) vira uma
--   história-contêiner no início. Depois da divisão confirmada, o contêiner é a 1ª história e as
--   outras nascem dele (divisao_de).
-- * Os valores novos do enum só aparecem dentro de corpos plpgsql: o Postgres não deixa usar um
--   valor de enum na mesma transação que o criou.
-- * Quem está logado só confirma a divisão e responde a sugestão de pergunta, por funções com guarda.
-- * porta_autor não recebe nenhum grant novo.

alter type public.story_estado add value if not exists 'dividindo'; -- a IA está propondo
alter type public.story_estado add value if not exists 'separar';   -- esperando o responsável

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.max_historias_divisao() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;   -- MAX_HISTORIAS_DIVISAO
create function privado.espera_lote_h() returns integer
language sql immutable set search_path = '' as $$ select 6 $$;    -- ESPERA_LOTE_H
create function privado.max_min_conteiner() returns integer
language sql immutable set search_path = '' as $$ select 120 $$;  -- MAX_MIN_CONTEINER
create function privado.min_fala_historia_s() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;   -- MIN_FALA_HISTORIA_S
create function privado.max_historias_dia() returns integer
language sql immutable set search_path = '' as $$ select 60 $$;   -- MAX_HISTORIAS_DIA
create function privado.max_arquivo_s() returns integer
language sql immutable set search_path = '' as $$ select 7200 $$; -- MAX_ARQUIVO_MIN = 120 (D9)
create function privado.max_fala_historia_s() returns integer
language sql immutable set search_path = '' as $$ select 3600 $$; -- MAX_HISTORIA_ESCRITA_MIN = 60

-- ── 1. recordings: tamanho do lote e posição de cada arquivo ───────────────
-- Upload: total = arquivos escolhidos, ordem = posição na lista. Conversa: total = partes,
-- ordem = número da parte. Obrigatórios em toda linha nova de lote ou conversa (política de
-- insert abaixo); as linhas antigas, sem eles, seguem pela regra de P43. Não é CHECK: um CHECK
-- "not valid" também barraria o UPDATE das linhas antigas (confirmar, processado_em).
alter table public.recordings
  add column lote_total smallint check (lote_total is null or lote_total between 1 and 100),
  add column lote_ordem smallint check (lote_ordem is null or lote_ordem between 1 and 100),
  add constraint recordings_lote_total_so_em_lote
    check ((lote_total is null and lote_ordem is null) or lote_id is not null);
grant select (lote_total, lote_ordem), insert (lote_total, lote_ordem) on public.recordings to authenticated;
drop policy "membro cria com plano ativo" on public.recordings;
create policy "membro cria com plano ativo" on public.recordings for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id)
              and upload = 'enviando' and origem in ('upload', 'lote', 'conversa')
              and (lote_id is null or (lote_total is not null and lote_ordem is not null
                                       and lote_ordem <= lote_total)));

-- ── 2. stories: divisão, origem e pergunta sugerida ────────────────────────
alter table public.stories
  add column divisao jsonb check (divisao is null or jsonb_typeof(divisao) = 'object'), -- {gravacoes, ia, final}
  add column divisao_de uuid,                              -- o contêiner de onde a história nasceu
  add column pergunta_sugerida uuid,
  add column sugestao_ignorada boolean not null default false,
  add constraint stories_divisao_de_fk foreign key (book_id, divisao_de)
    references public.stories (book_id, id) on delete restrict,
  add constraint stories_pergunta_sugerida_fk foreign key (book_id, pergunta_sugerida)
    references public.prompts (book_id, id) on delete set null (pergunta_sugerida),
  add constraint stories_sugestao_sem_pergunta check (pergunta_sugerida is null or prompt_id is null);
create index stories_divisao_de on public.stories (divisao_de) where divisao_de is not null;
grant select (divisao, divisao_de, pergunta_sugerida, sugestao_ignorada) on public.stories to authenticated;

-- ── 3. story_recordings: quais segmentos da gravação a história usa ────────
-- null = todos (gravação inteira). Ids fixados na transcrição (contínuos no contêiner).
alter table public.story_recordings
  add column segmentos integer[] check (segmentos is null or cardinality(segmentos) between 1 and 20000);

-- ── 4. Início: gravação única ou o grupo inteiro vira o contêiner ──────────
-- historia null = não processar agora; motivo diz por quê. motivo 'dividida' com historia
-- preenchida = a gravação já passou por uma divisão confirmada (quem chamou para).
-- Se a gravação que chamou ficou fora do grupo (mais de 2 h, sem duração, além de 120 min), o
-- contêiner dos outros é criado e devolvido; ela segue sozinha na próxima chamada.
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

-- ── 5. Transições ──────────────────────────────────────────────────────────
-- ouvindo → dividindo (só contêiner que nunca foi dividido); ouvindo|dividindo → escrevendo;
-- ouvindo|dividindo|escrevendo → falhou; falhou → ouvindo. separar só por servico_propor_divisao;
-- separar → ouvindo só por confirmar_divisao; pronta só por servico_concluir_historia.
create or replace function public.servico_mudar_etapa(p_story uuid, p_para public.story_estado,
  p_erro_etapa text default null, p_erro text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_para::text = 'escrevendo' then
    update public.stories set estado = 'escrevendo'
    where id = p_story and estado::text in ('ouvindo', 'dividindo');
  elsif p_para::text = 'dividindo' then
    update public.stories set estado = 'dividindo'
    where id = p_story and estado::text = 'ouvindo' and divisao_de is null and divisao is null;
  elsif p_para::text = 'falhou' then
    update public.stories set estado = 'falhou', erro_etapa = coalesce(p_erro_etapa, 'desconhecida'),
      erro = coalesce(p_erro, 'erro_inesperado'), rascunho = null
    where id = p_story and estado::text in ('ouvindo', 'escrevendo', 'dividindo');
  elsif p_para::text = 'ouvindo' then
    update public.stories set estado = 'ouvindo', erro_etapa = null, erro = null
    where id = p_story and estado::text = 'falhou';
  else
    return false;
  end if;
  return found;
end $$;

-- ── 6. Proposta da IA (só o servidor; ids já conferidos no código) ─────────
-- Grupo de 2 ou mais gravações vai para a confirmação mesmo com 1 história (P17).
create function public.servico_propor_divisao(p_story uuid, p_proposta jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(p_proposta -> 'historias') is distinct from 'array'
     or jsonb_array_length(p_proposta -> 'historias') not between 1 and privado.max_historias_divisao() then
    return false;
  end if;
  update public.stories s
    set estado = 'separar',
        divisao = jsonb_build_object(
          'gravacoes', (select jsonb_agg(sr.recording_id order by sr.ordem)
                        from public.story_recordings sr where sr.story_id = s.id),
          'ia', p_proposta, 'proposta_em', now())
  where s.id = p_story and s.estado::text = 'dividindo';
  return found;
end $$;

-- ── 7. Confirmação (membro do livro, plano ativo) ──────────────────────────
-- p_historias: [{titulo, segmentos: int[], prompt_id, sugerida, ignorada}], na ordem da tela.
-- A 1ª é o próprio contêiner; as outras nascem com divisao_de. Devolve os ids, nessa ordem.
-- Lista vazia = "deixar fora do livro": nada vai para a escrita e as gravações saem da fila.
create function public.confirmar_divisao(p_story uuid, p_historias jsonb) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare
  v public.stories; v_livro uuid; v_todos integer[]; v_usados integer[] := '{}'; v_ids integer[];
  v_item jsonb; v_k integer := 0; v_n integer; v_nova uuid; v_out uuid[] := '{}';
  v_titulo text; v_prompt uuid; v_sug uuid; v_ign boolean; v_final jsonb := '[]'::jsonb;
  v_estrutura jsonb; v_rec record; v_fala numeric;
  c_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  -- Confere o livro antes de travar a linha (ninguém de fora segura o lock).
  select s.book_id into v_livro from public.stories s where s.id = p_story;
  if v_livro is null or not privado.eh_membro(v_livro) or not privado.livro_editavel(v_livro) then
    raise exception 'sem_permissao';
  end if;
  select * into v from public.stories s where s.id = p_story for update;
  if v.estado::text <> 'separar' then raise exception 'divisao_ja_confirmada'; end if;
  if jsonb_typeof(p_historias) is distinct from 'array' or v.estrutura is null then
    raise exception 'divisao_invalida';
  end if;
  v_n := jsonb_array_length(p_historias);
  if v_n > privado.max_historias_divisao() then raise exception 'divisao_invalida'; end if;
  if v_n > 1 and (select count(*) from public.stories s where s.book_id = v.book_id
                    and s.criado_em > now() - interval '24 hours') + v_n - 1 > privado.max_historias_dia() then
    raise exception 'divisao_limite_dia';
  end if;
  v_estrutura := jsonb_set(v.estrutura, '{mudancasDeAssunto}', '[]'::jsonb);

  -- Universo: os segmentos das gravações do contêiner. Id repetido entre gravações = recusa.
  select array_agg((e ->> 'id')::integer) into v_todos
    from public.story_recordings sr
    join public.transcripts t on t.recording_id = sr.recording_id,
    lateral jsonb_array_elements(t.segmentos) e
    where sr.story_id = p_story;
  if v_todos is null
     or cardinality(v_todos) <> (select count(distinct x) from unnest(v_todos) x) then
    raise exception 'divisao_invalida';
  end if;

  -- Forma de cada item, antes de qualquer cast (erro de cast viraria 500 com o valor no log).
  if exists (
    select 1 from jsonb_array_elements(p_historias) i
    where jsonb_typeof(i) <> 'object'
       or jsonb_typeof(i -> 'segmentos') is distinct from 'array'
       or jsonb_array_length(i -> 'segmentos') not between 1 and cardinality(v_todos)
       or coalesce(jsonb_typeof(i -> 'titulo'), 'null') not in ('string', 'null')
       or coalesce(jsonb_typeof(i -> 'ignorada'), 'null') not in ('boolean', 'null')
       or coalesce(jsonb_typeof(i -> 'prompt_id'), 'null') not in ('string', 'null')
       or coalesce(jsonb_typeof(i -> 'sugerida'), 'null') not in ('string', 'null')
       or (jsonb_typeof(i -> 'prompt_id') = 'string' and not (i ->> 'prompt_id') ~ c_uuid)
       or (jsonb_typeof(i -> 'sugerida') = 'string' and not (i ->> 'sugerida') ~ c_uuid)
       or exists (select 1 from jsonb_array_elements(i -> 'segmentos') x
                  where jsonb_typeof(x) <> 'number' or x::text !~ '^[0-9]{1,9}$')) then
    raise exception 'divisao_invalida';
  end if;

  -- Perguntas aceitas: do livro, e viram respondidas antes de olhar as sugestões.
  for v_item in select value from jsonb_array_elements(p_historias) loop
    v_prompt := (v_item ->> 'prompt_id')::uuid;
    continue when v_prompt is null;
    if not exists (select 1 from public.prompts p where p.book_id = v.book_id and p.id = v_prompt
                     and p.estado in ('para_enviar', 'enviada', 'respondida')) then
      raise exception 'divisao_invalida';
    end if;
    update public.prompts set estado = 'respondida'
      where book_id = v.book_id and id = v_prompt and estado in ('para_enviar', 'enviada');
  end loop;

  -- Do fim para o começo: o contêiner (1ª) muda por último, depois que as filhas leram dele.
  for v_k in reverse v_n..1 loop
    v_item := p_historias -> (v_k - 1);
    select array_agg(distinct x::integer order by x::integer) into v_ids
      from jsonb_array_elements_text(v_item -> 'segmentos') x;
    if not (v_ids <@ v_todos) or v_ids && v_usados then raise exception 'divisao_invalida'; end if;
    -- Fala mínima por história: o custo de cada uma (edição, verificação) não vale para migalhas.
    select coalesce(sum((e ->> 'fim')::numeric - (e ->> 'inicio')::numeric), 0) into v_fala
      from public.story_recordings sr
      join public.transcripts t on t.recording_id = sr.recording_id,
      lateral jsonb_array_elements(t.segmentos) e
      where sr.story_id = p_story and (e ->> 'id')::integer = any (v_ids);
    if v_fala < privado.min_fala_historia_s() then raise exception 'divisao_curta'; end if;
    -- E máxima: uma história de mais de 60 min não cabe numa escrita só (passo de 300 s).
    if v_fala > privado.max_fala_historia_s() then raise exception 'divisao_longa'; end if;
    v_usados := v_usados || v_ids;
    v_titulo := nullif(left(btrim(coalesce(v_item ->> 'titulo', '')), 200), '');
    v_prompt := (v_item ->> 'prompt_id')::uuid;
    v_sug := (v_item ->> 'sugerida')::uuid;
    v_ign := coalesce((v_item ->> 'ignorada')::boolean, false);
    if v_prompt is not null or v_ign or not exists (select 1 from public.prompts p
         where p.book_id = v.book_id and p.id = v_sug and p.estado in ('para_enviar', 'enviada')) then
      v_sug := null;
    end if;

    if v_k > 1 then
      insert into public.stories (book_id, prompt_id, titulo, estado, estrutura, divisao_de,
                                  pergunta_sugerida, sugestao_ignorada)
        values (v.book_id, v_prompt, v_titulo, 'ouvindo', v_estrutura, p_story, v_sug, v_ign)
        returning id into v_nova;
      -- A filha guarda a ordem do contêiner: o rótulo g{ordem} gravado na transcrição continua valendo.
      for v_rec in
        select sr.recording_id, sr.segmento_inicial, sr.ordem, array_agg(x.id order by x.id) as segs
          from public.story_recordings sr
          join public.transcripts t on t.recording_id = sr.recording_id,
          lateral (select (e ->> 'id')::integer as id from jsonb_array_elements(t.segmentos) e) x
          where sr.story_id = p_story and x.id = any (v_ids)
          group by sr.recording_id, sr.segmento_inicial, sr.ordem
      loop
        insert into public.story_recordings (story_id, recording_id, book_id, ordem, segmento_inicial, segmentos)
          values (v_nova, v_rec.recording_id, v.book_id, v_rec.ordem, v_rec.segmento_inicial, v_rec.segs);
      end loop;
    else
      v_nova := p_story;
      update public.story_recordings sr set segmentos = x.segs
        from (select sr2.recording_id, array_agg(y.id order by y.id) as segs
                from public.story_recordings sr2
                join public.transcripts t on t.recording_id = sr2.recording_id,
                lateral (select (e ->> 'id')::integer as id from jsonb_array_elements(t.segmentos) e) y
                where sr2.story_id = p_story and y.id = any (v_ids)
                group by sr2.recording_id) x
        where sr.story_id = p_story and sr.recording_id = x.recording_id;
    end if;
    v_out := v_nova || v_out;
    v_final := jsonb_build_array(jsonb_build_object('titulo', v_titulo, 'segmentos', to_jsonb(v_ids),
                                                    'prompt_id', v_prompt)) || v_final;
  end loop;

  -- Gravação com todos os trechos descartados: sai da fila (o áudio continua guardado).
  update public.recordings r set processado_em = now()
    from public.story_recordings sr
    where sr.story_id = p_story and r.id = sr.recording_id and r.processado_em is null
      and not exists (select 1 from public.story_recordings s2
                      join public.stories s on s.id = s2.story_id
                      where s2.recording_id = r.id and (s.id = p_story and s2.segmentos is not null
                                                        or s.divisao_de = p_story));

  if v_n = 0 then  -- deixar fora do livro: o contêiner encerra sem texto
    update public.stories
      set estado = 'falhou', erro_etapa = 'divisao', erro = 'tudo_descartado',
          divisao = v.divisao || jsonb_build_object('final', '[]'::jsonb, 'confirmada_em', now())
    where id = p_story;
    return v_out;
  end if;

  delete from public.story_recordings sr where sr.story_id = p_story and sr.segmentos is null;
  update public.stories
    set estado = 'ouvindo', titulo = v_titulo, prompt_id = v_prompt, pergunta_sugerida = v_sug,
        sugestao_ignorada = v_ign, estrutura = v_estrutura,
        divisao = v.divisao || jsonb_build_object('final', v_final, 'confirmada_em', now())
  where id = p_story;
  return v_out;
end $$;

-- ── 8. Pergunta sugerida ───────────────────────────────────────────────────
create function public.servico_sugerir_pergunta(p_story uuid, p_prompt uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.stories s set pergunta_sugerida = p_prompt
  where s.id = p_story and s.prompt_id is null and s.pergunta_sugerida is null and not s.sugestao_ignorada
    and exists (select 1 from public.prompts p where p.book_id = s.book_id and p.id = p_prompt
                  and p.estado in ('para_enviar', 'enviada'));
  return found;
end $$;

create function public.responder_sugestao(p_story uuid, p_aceitar boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_livro uuid; v public.stories;
begin
  select s.book_id into v_livro from public.stories s where s.id = p_story;
  if v_livro is null or not privado.eh_membro(v_livro) or not privado.livro_editavel(v_livro) then
    raise exception 'sem_permissao';
  end if;
  select * into v from public.stories s where s.id = p_story for update;
  if p_aceitar is null or v.pergunta_sugerida is null then return false; end if;
  if p_aceitar then
    if not exists (select 1 from public.prompts p where p.book_id = v.book_id and p.id = v.pergunta_sugerida
                     and p.estado in ('para_enviar', 'enviada', 'respondida')) then
      return false;
    end if;
    update public.prompts set estado = 'respondida'
      where book_id = v.book_id and id = v.pergunta_sugerida and estado in ('para_enviar', 'enviada');
    update public.stories set prompt_id = v.pergunta_sugerida, pergunta_sugerida = null where id = p_story;
  else
    update public.stories set pergunta_sugerida = null, sugestao_ignorada = true where id = p_story;
  end if;
  return true;
end $$;

-- ── 9. Título confirmado pela pessoa vale mais que o da edição ─────────────
create or replace function public.servico_concluir_historia(p_story uuid, p_tamanho text, p_modelos jsonb, p_hash jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.stories; v_titulo text;
begin
  select * into v from public.stories s where s.id = p_story for update;
  if not found then return false; end if;
  if v.estado = 'pronta' then return true; end if;
  if v.estado <> 'escrevendo' or v.rascunho is null or v.rascunho -> 'edicao' is null then return false; end if;
  v_titulo := nullif(left(btrim(coalesce(v.rascunho -> 'edicao' ->> 'titulo', '')), 200), '');
  insert into public.story_versions (story_id, book_id, numero, origem, tamanho, conteudo, marcacoes, modelos, hash_prompts)
    values (p_story, v.book_id, 1, 'ia', p_tamanho, v.rascunho -> 'edicao',
            coalesce(v.rascunho -> 'marcacoes', '[]'::jsonb), p_modelos, p_hash)
    on conflict (story_id, numero) do nothing;
  update public.stories
    set estado = 'pronta', titulo = coalesce(v.titulo, v_titulo), pronta_em = now(), rascunho = null
    where id = p_story;
  update public.recordings r set processado_em = now()
    from public.story_recordings sr
    where sr.story_id = p_story and r.id = sr.recording_id and r.processado_em is null;
  return true;
end $$;

-- ── 10. Privilégios ────────────────────────────────────────────────────────
revoke all on function public.servico_propor_divisao(uuid, jsonb),
  public.confirmar_divisao(uuid, jsonb),
  public.servico_sugerir_pergunta(uuid, uuid),
  public.responder_sugestao(uuid, boolean)
  from public, anon, authenticated, porta_autor;
grant execute on function public.servico_propor_divisao(uuid, jsonb),
  public.servico_sugerir_pergunta(uuid, uuid) to service_role;
grant execute on function public.confirmar_divisao(uuid, jsonb),
  public.responder_sugestao(uuid, boolean) to authenticated;
