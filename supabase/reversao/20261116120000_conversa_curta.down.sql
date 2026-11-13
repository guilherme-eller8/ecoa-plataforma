-- 20261116120000_conversa_curta.down.sql
-- Volta a regra de P40: toda conversa (com lote_id) espera a divisão.
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
  if v.lote_id is not null or v.origem not in ('autor', 'livre', 'upload') then
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
