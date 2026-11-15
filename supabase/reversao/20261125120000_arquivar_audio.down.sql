-- Reversão de arquivar_audio: o áudio arquivado volta às listas. Nenhum áudio, história ou QR
-- é afetado. Os que o arquivar tirou da fila (sem história) continuam marcados como "fora das
-- histórias" e voltam a ser processados pelo "Enviar de novo" do admin, se alguém quiser.
drop function public.audio_arquivar(uuid, uuid, boolean);
alter table public.recordings drop column arquivado_em;
