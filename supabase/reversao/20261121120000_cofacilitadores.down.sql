-- Reverte 20261121120000_cofacilitadores.sql. Apaga convites, compartilhamentos e as preferências
-- do resumo; membros co-facilitadores ficam (book_members já existia).
drop function if exists public.servico_resumo_semanal(uuid);
drop function if exists public.servico_livros_para_resumo();
drop function if exists public.lembrar_pergunta(uuid);
alter table public.prompts drop column if exists lembrada_em;
drop function if exists public.servico_ler_compartilhada(text);
drop function if exists public.revogar_compartilhamento(uuid);
drop function if exists public.servico_compartilhar_historia(uuid, uuid, uuid, text, smallint);
drop table if exists public.story_shares;
drop function if exists public.definir_resumo_semanal(uuid, boolean);
alter table public.book_members drop column if exists resumo_semanal;
drop function if exists public.sair_do_livro(uuid);
drop function if exists public.remover_membro(uuid, uuid);
drop function if exists public.membros_do_livro(uuid);
drop function if exists public.cancelar_convite(uuid);
drop function if exists public.aceitar_convite(uuid);
drop function if exists public.meus_convites();
drop function if exists public.servico_ler_convite(text);
drop function if exists public.servico_criar_convite(uuid, uuid, uuid, text, text, smallint);
drop table if exists public.book_invites;
drop function if exists privado.eh_responsavel(uuid);
drop function if exists privado.palavras_do_texto(jsonb);
drop function if exists privado.palavras_por_pagina();
drop function if exists privado.convite_validade_dias();
drop function if exists privado.max_convites_dia();
drop function if exists privado.max_cofacilitadores();
