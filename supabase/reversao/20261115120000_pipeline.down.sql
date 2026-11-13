-- 20261115120000_pipeline.down.sql
-- Apaga histórias, transcrições e versões. Os áudios (recordings e Storage) ficam intactos.
-- Trava: com alguma versão gravada, só roda depois de exportar story_versions e de
-- `set ecoa.reversao_destrutiva = 'sim'` na mesma sessão.
do $$
declare v_tem boolean;
begin
  if to_regclass('public.story_versions') is not null
     and coalesce(current_setting('ecoa.reversao_destrutiva', true), '') <> 'sim' then
    execute 'select exists (select 1 from public.story_versions)' into v_tem;
    if v_tem then
      raise exception 'reversao_com_historias: exporte story_versions e rode com ecoa.reversao_destrutiva = sim';
    end if;
  end if;
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists "membro ouve o canal do livro" on realtime.messages';
  end if;
  if to_regclass('public.story_recordings') is not null then
    execute 'update public.recordings r set processado_em = null
             where r.id in (select recording_id from public.story_recordings)';
  end if;
end $$;

drop function if exists public.consentir_processamento_ia(uuid, smallint);
drop function if exists public.marcar_historia_vista(uuid);
drop function if exists public.servico_sugerir_nomes(uuid, jsonb);
drop function if exists public.servico_concluir_historia(uuid, text, jsonb, jsonb);
drop function if exists public.servico_mudar_etapa(uuid, public.story_estado, text, text);
drop function if exists public.servico_iniciar_historia(uuid);

drop table if exists public.glossary_entries;
drop table if exists public.book_context;
drop table if exists public.ai_usage;
drop table if exists public.story_versions;
drop table if exists public.transcripts;
drop table if exists public.story_recordings;
drop table if exists public.stories;

alter table public.books
  drop constraint if exists books_ia_consentimento,
  drop column if exists ia_consentimento_versao,
  drop column if exists ia_consentimento_por,
  drop column if exists ia_consentimento_em;

drop function if exists privado.cota_do_glossario();
drop function if exists privado.apelidos_validos(text[]);
drop function if exists privado.so_insert();
drop function if exists privado.versao_imutavel();
drop function if exists privado.consentimento_ia_versao();
drop function if exists privado.max_nomes_por_historia();
drop function if exists privado.max_nomes_glossario();
drop function if exists privado.max_minutos_ia_por_dia();
drop function if exists privado.max_historia_s();

drop type if exists public.glossario_estado;
drop type if exists public.glossario_tipo;
drop type if exists public.versao_origem;
drop type if exists public.story_estado;
