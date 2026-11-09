-- Reverte 20261112120000_audios.sql.
-- O bucket "audios" só é removido à mão, se estiver vazio: áudio original nunca é apagado por script.
drop function if exists public.servico_confirmar_audio(uuid, bigint);
drop table if exists public.recordings;
drop function if exists privado.max_audio_bytes();
drop type if exists public.recording_upload;
drop type if exists public.recording_origem;
