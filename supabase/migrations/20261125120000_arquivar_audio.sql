-- Arquivar áudio (pedido do Guilherme, 15/11/2026; decisão P69): o áudio sai das listas do
-- livro, mas nunca é apagado. Vale também para o áudio que já virou história: a história, o
-- texto e o QR continuam como estão (o QR toca a voz original para sempre).
-- Qualquer membro que pode escrever arquiva e desarquiva. Escrita só por função.

alter table public.recordings add column arquivado_em timestamptz;
grant select (arquivado_em) on public.recordings to authenticated;

-- Devolve true quando desarquivar põe o áudio de volta na fila do processamento (ele ainda não
-- tinha virado história e foi o próprio arquivar que o tirou da fila): o servidor então o dispara.
create function public.audio_arquivar(p_book uuid, p_id uuid, p_arquivar boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v public.recordings;
  v_historia boolean;
  v_agora timestamptz := now();
  v_fila boolean := false;
begin
  perform privado.membro_editando(p_book);
  -- O mesmo lock do pipeline: arquivar e iniciar a história não correm juntos.
  perform pg_advisory_xact_lock(hashtextextended('livro:' || p_book::text, 0));
  select * into v from public.recordings r
   where r.id = p_id and r.book_id = p_book and r.upload = 'recebido' for update;
  if not found then raise exception 'dados_invalidos'; end if;
  v_historia := exists (select 1 from public.story_recordings sr where sr.recording_id = p_id);

  if p_arquivar then
    -- Sem história ainda: também sai da fila (processado_em), para a varredura não o processar.
    update public.recordings r
       set arquivado_em = coalesce(r.arquivado_em, v_agora),
           processado_em = case when r.processado_em is null and not v_historia
                                then v_agora else r.processado_em end
     where r.id = p_id;
  else
    -- Só volta à fila o que o arquivar tirou dela (as duas marcas iguais, gravadas juntas).
    v_fila := v.arquivado_em is not null and v.processado_em = v.arquivado_em and not v_historia;
    update public.recordings r
       set arquivado_em = null,
           processado_em = case when v_fila then null else r.processado_em end
     where r.id = p_id;
  end if;
  return v_fila;
end $$;

revoke all on function public.audio_arquivar(uuid, uuid, boolean) from public, anon, authenticated, porta_autor, service_role;
grant execute on function public.audio_arquivar(uuid, uuid, boolean) to authenticated;
