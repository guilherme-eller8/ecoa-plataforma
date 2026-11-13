-- Reversão de 20261119120000_ia_sob_controle.sql.
-- As versões criadas por aceite ficam em story_versions (só insert); só a coluna proposta_id
-- some. As propostas se perdem (o texto aceito continua nas versões). Os áudios acrescentados
-- continuam ligados às histórias (story_recordings); só a coluna para_historia some.
-- O CHECK de 5 tamanhos fica: voltar para 3 quebraria guardar_versao nas histórias que já têm
-- versão Curto ou Longo.

-- Trava (como a da divisão): com proposta já pedida, só roda com `set ecoa.reversao_destrutiva = 'sim'`.
-- Forçada: proposta gerando ou pronta se perde; a de áudio deixa o áudio ligado e fora do texto.
do $$
begin
  if to_regclass('public.story_proposals') is not null
     and exists (select 1 from public.story_proposals)
     and coalesce(current_setting('ecoa.reversao_destrutiva', true), '') <> 'sim' then
    raise exception 'reversao_com_propostas: rode com ecoa.reversao_destrutiva = sim';
  end if;
end $$;

-- servico_iniciar_historia volta ao corpo de 20261117120000_divisao.sql (copiado sem mudança).
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


drop function if exists public.aplicar_proposta(uuid, uuid, integer, uuid, text[], jsonb, jsonb);
drop function if exists public.descartar_proposta(uuid, uuid, uuid);
drop function if exists public.servico_falhar_proposta(uuid, text);
drop function if exists public.servico_gravar_proposta(uuid, jsonb, text[], jsonb, boolean, jsonb, jsonb);
drop function if exists public.pedir_proposta(uuid, uuid, public.proposta_tipo, text, jsonb);
drop function if exists privado.acrescentar_audio(uuid);
drop function if exists privado.mudancas_validas(jsonb, public.proposta_tipo, jsonb);
drop function if exists privado.audios_fora_do_texto(uuid);
drop function if exists privado.fala_da_historia_s(uuid);
drop function if exists privado.propostas_hoje(uuid);
drop function if exists privado.tamanho_atual(uuid);
drop function if exists privado.travados_atuais(uuid);
drop function if exists privado.paragrafos_atuais(uuid);

alter table public.story_versions
  drop constraint if exists story_versions_proposta_so_ia,
  drop constraint if exists story_versions_proposta_fk,
  drop column if exists proposta_id;
drop table if exists public.story_proposals;
drop function if exists privado.proposta_imutavel();

drop policy if exists "acrescenta só em história pronta" on public.recordings;
revoke select (para_historia), insert (para_historia) on public.recordings from authenticated;
drop index if exists public.recordings_para_historia;
alter table public.recordings
  drop constraint if exists recordings_para_historia_duracao,
  drop constraint if exists recordings_para_historia_avulsa,
  drop constraint if exists recordings_para_historia_fk,
  drop column if exists para_historia;

drop type if exists public.proposta_estado;
drop type if exists public.proposta_tipo;
drop function if exists privado.instrucao_max();
drop function if exists privado.max_audios_historia();
drop function if exists privado.max_audio_extra_s();
drop function if exists privado.max_propostas_dia();
