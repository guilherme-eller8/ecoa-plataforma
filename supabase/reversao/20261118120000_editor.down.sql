-- Reversão de 20261118120000_editor.sql.
-- As versões criadas pelo editor ficam em story_versions (só insert, T36); só a coluna
-- restaurada_de some. O texto atual (stories.texto) se perde: a última versão continua lá.
drop function if exists public.marcar_historia_pronta(uuid, boolean);
drop function if exists public.restaurar_versao(uuid, uuid, integer);
drop function if exists public.parar_de_editar(uuid, uuid);
drop function if exists public.salvar_historia(uuid, uuid, integer, jsonb, jsonb);
drop function if exists public.editar_historia(uuid, uuid, boolean, boolean);
drop function if exists privado.guardar_versao(uuid);
drop function if exists privado.origem_do_membro(uuid);
drop function if exists privado.primeiro_nome();
drop function if exists privado.marcacoes_validas(jsonb);
drop function if exists privado.conteudo_valido(jsonb);

drop table if exists public.story_photos;
drop function if exists privado.cota_fotos_historia();
drop table if exists public.edit_locks;

alter table public.story_versions drop column if exists restaurada_de;

revoke select (texto, texto_marcacoes, texto_rev, versao_rev, texto_por, texto_origem, texto_em,
  ano, revisada_em, estrutura) on public.stories from authenticated;
alter table public.stories
  drop constraint if exists stories_versao_rev,
  drop column if exists revisada_por,
  drop column if exists revisada_em,
  drop column if exists ano,
  drop column if exists texto_em,
  drop column if exists texto_origem,
  drop column if exists texto_por,
  drop column if exists versao_rev,
  drop column if exists texto_rev,
  drop column if exists texto_marcacoes,
  drop column if exists texto;

drop function if exists privado.max_letras_paragrafo();
drop function if exists privado.max_paragrafos();
drop function if exists privado.max_fotos_historia();
drop function if exists privado.versao_a_cada_s();
drop function if exists privado.trava_edicao_s();
