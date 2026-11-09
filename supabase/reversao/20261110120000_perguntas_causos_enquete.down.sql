-- Reverte 20261110120000_perguntas_causos_enquete.sql.
-- ATENÇÃO: apaga fotos, perguntas, causos, links da família e enquetes do banco.
-- Os buckets acervo e causos e os arquivos ficam no Storage (apagar à mão, se for o caso).

drop function if exists public.enquete_salvar(uuid, uuid[]);
drop function if exists public.enquete_remover_votos(uuid, uuid);
drop function if exists public.enquete_encerrar(uuid);
drop function if exists public.enquete_adicionar_item(uuid, jsonb);
drop function if exists public.enquete_abrir(uuid, jsonb);
drop function if exists public.servico_trocar_link_familia(uuid, uuid, uuid, text, smallint);
drop function if exists public.servico_confirmar_audio_causo(text, uuid, integer);
drop function if exists public.servico_caminho_audio_causo(text, uuid);
drop function if exists public.familia_enviar_causo(text, text, text, text, boolean, smallint);
drop function if exists public.familia_votar(text, text, text, uuid[]);
drop function if exists public.familia_pagina(text, text);
drop function if exists privado.item_valido(uuid, jsonb);
drop function if exists privado.membro_editando(uuid);
drop function if exists privado.hash_aparelho(uuid, text);
drop function if exists privado.livro_da_familia(text);

drop table if exists public.poll_votes;
drop table if exists public.poll_items;
drop table if exists public.polls;
drop table if exists public.family_access;
drop function if exists privado.revogacao_definitiva();
drop table if exists public.prompts;
drop function if exists privado.transicao_da_pergunta();
drop table if exists public.causos;

alter table public.books
  drop constraint if exists books_autor_foto_do_livro,
  drop column if exists configuracao,
  drop column if exists autor_foto_id,
  drop column if exists autor_parentesco,
  drop column if exists autor_apelido;

drop table if exists public.photos;
drop function if exists privado.cota_de_fotos();

drop function if exists privado.max_fotos_por_livro();
drop function if exists privado.max_causos_por_dia();
drop function if exists privado.max_causos_por_hora();
drop function if exists privado.max_trocas_voto_por_hora();
drop function if exists privado.max_votantes_por_enquete();
drop function if exists privado.max_itens_enquete();
drop function if exists privado.votos_por_pessoa();

drop type if exists public.enquete_estado;
drop type if exists public.causo_estado;
drop type if exists public.prompt_estado;
drop type if exists public.prompt_origem;
drop type if exists public.prompt_tipo;
drop type if exists public.parentesco;

drop role if exists porta_autor;
