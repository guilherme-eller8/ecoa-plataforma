-- 20261117120000_divisao.down.sql
-- Desfaz a divisão em histórias. Os áudios, as transcrições e as versões ficam intactos.
-- * Os valores 'dividindo' e 'separar' continuam no enum (o Postgres não remove valor de enum).
-- * Trava: com qualquer divisão já feita (proposta, confirmada ou com segmentos escolhidos), só
--   roda com `set ecoa.reversao_destrutiva = 'sim'`. Sem a coluna `segmentos`, o código antigo
--   escreveria a gravação inteira (inclusive trechos descartados) ou o lote inteiro numa história.
-- * Forçada: toda história que passou pela divisão e ainda não está pronta vira 'falhou'
--   (erro 'reversao'); o admin decide o que refazer.
-- Só roda a trava e a marcação se a migration ainda estiver aplicada (a reversão pode rodar 2 vezes).
do $$
declare v_tem boolean;
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'stories' and column_name = 'divisao_de') then
    return;
  end if;
  execute $q$select exists (select 1 from public.stories where divisao is not null or divisao_de is not null)
              or exists (select 1 from public.story_recordings where segmentos is not null)
              or exists (select 1 from public.story_recordings group by story_id having count(*) > 1)$q$
    into v_tem;
  if v_tem and coalesce(current_setting('ecoa.reversao_destrutiva', true), '') <> 'sim' then
    raise exception 'reversao_com_divisao: rode com ecoa.reversao_destrutiva = sim';
  end if;
  execute $q$update public.stories s set estado = 'falhou', erro_etapa = 'reversao', erro = 'reversao', rascunho = null
    where s.estado::text in ('ouvindo', 'escrevendo', 'dividindo', 'separar')
      and (s.divisao is not null or s.divisao_de is not null
           or exists (select 1 from public.story_recordings sr where sr.story_id = s.id
                      group by sr.story_id having count(*) > 1))$q$;
end $$;

drop function if exists public.responder_sugestao(uuid, boolean);
drop function if exists public.servico_sugerir_pergunta(uuid, uuid);
drop function if exists public.confirmar_divisao(uuid, jsonb);
drop function if exists public.servico_propor_divisao(uuid, jsonb);

-- Funções de volta às versões de 20261115 (mudar etapa, concluir) e 20261116 (iniciar).
create or replace function public.servico_mudar_etapa(p_story uuid, p_para public.story_estado, p_erro_etapa text default null, p_erro text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_para = 'escrevendo' then
    update public.stories set estado = 'escrevendo' where id = p_story and estado = 'ouvindo';
  elsif p_para = 'falhou' then
    update public.stories set estado = 'falhou', erro_etapa = coalesce(p_erro_etapa, 'desconhecida'),
      erro = coalesce(p_erro, 'erro_inesperado'), rascunho = null
    where id = p_story and estado in ('ouvindo', 'escrevendo');
  elsif p_para = 'ouvindo' then
    update public.stories set estado = 'ouvindo', erro_etapa = null, erro = null
    where id = p_story and estado = 'falhou';
  else
    return false;  -- pronta só por servico_concluir_historia
  end if;
  return found;
end $$;

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
    set estado = 'pronta', titulo = v_titulo, pronta_em = now(), rascunho = null
    where id = p_story;
  update public.recordings r set processado_em = now()
    from public.story_recordings sr
    where sr.story_id = p_story and r.id = sr.recording_id and r.processado_em is null;
  return true;
end $$;

create or replace function public.servico_iniciar_historia(p_recording uuid)
returns table (historia uuid, estado public.story_estado, motivo text)
language plpgsql security definer set search_path = '' as $$
declare v public.recordings; v_story uuid; v_estado public.story_estado; v_min numeric;
begin
  select * into v from public.recordings r where r.id = p_recording for update;
  if not found or v.upload <> 'recebido' then
    return query select null::uuid, null::public.story_estado, 'nao_recebido'; return;
  end if;
  select sr.story_id, s.estado into v_story, v_estado
    from public.story_recordings sr join public.stories s on s.id = sr.story_id
    where sr.recording_id = p_recording order by sr.ordem limit 1;
  if found then  -- já existe: quem chamou decide (pronta/falhou = parar; em andamento = seguir)
    return query select v_story, v_estado, null::text; return;
  end if;
  -- P43: conversa de uma parte só e com menos de 29 min vira história direto. A 1ª parte de uma
  -- conversa longa tem 30 min (espera pelo tamanho); as seguintes acham a 1ª no mesmo lote.
  if v.origem not in ('autor', 'livre', 'upload', 'conversa')
     or (v.origem = 'conversa' and (
           v.duracao_s is null
           or v.duracao_s >= privado.max_historia_s() - 60
           or (select count(*) from public.recordings r2 where r2.lote_id = v.lote_id) > 1))
     or (v.origem <> 'conversa' and v.lote_id is not null) then
    return query select null::uuid, null::public.story_estado, 'divisao'; return;
  end if;
  if v.duracao_s is null then
    return query select null::uuid, null::public.story_estado, 'sem_duracao'; return;
  end if;
  if v.duracao_s > privado.max_historia_s() then
    return query select null::uuid, null::public.story_estado, 'longa'; return;
  end if;
  if not privado.livro_editavel(v.book_id) then
    return query select null::uuid, null::public.story_estado, 'livro_fechado'; return;
  end if;
  if not exists (select 1 from public.books b where b.id = v.book_id
                   and b.ia_consentimento_versao >= privado.consentimento_ia_versao()) then
    return query select null::uuid, null::public.story_estado, 'sem_consentimento'; return;
  end if;
  select coalesce(sum(u.minutos_audio), 0) into v_min from public.ai_usage u
    where u.book_id = v.book_id and u.etapa = 'transcrever' and u.criado_em > now() - interval '24 hours';
  if v_min + v.duracao_s / 60.0 > privado.max_minutos_ia_por_dia() then
    return query select null::uuid, null::public.story_estado, 'cota_diaria'; return;
  end if;
  insert into public.stories (book_id, prompt_id) values (v.book_id, v.prompt_id) returning id into v_story;
  insert into public.story_recordings (story_id, recording_id, book_id, ordem)
    values (v_story, p_recording, v.book_id, 1);
  return query select v_story, 'ouvindo'::public.story_estado, null::text;
end $$;

alter table public.story_recordings drop column if exists segmentos;

drop index if exists public.stories_divisao_de;
alter table public.stories
  drop constraint if exists stories_sugestao_sem_pergunta,
  drop constraint if exists stories_pergunta_sugerida_fk,
  drop constraint if exists stories_divisao_de_fk,
  drop column if exists sugestao_ignorada,
  drop column if exists pergunta_sugerida,
  drop column if exists divisao_de,
  drop column if exists divisao;

drop policy if exists "membro cria com plano ativo" on public.recordings;
create policy "membro cria com plano ativo" on public.recordings for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id)
              and upload = 'enviando' and origem in ('upload', 'lote', 'conversa'));
alter table public.recordings
  drop constraint if exists recordings_lote_total_so_em_lote,
  drop column if exists lote_ordem,
  drop column if exists lote_total;

drop function if exists privado.max_fala_historia_s();
drop function if exists privado.max_arquivo_s();
drop function if exists privado.max_historias_dia();
drop function if exists privado.min_fala_historia_s();
drop function if exists privado.max_min_conteiner();
drop function if exists privado.espera_lote_h();
drop function if exists privado.max_historias_divisao();
