-- Reverte 20261109120000_acesso_e_passe.sql
-- ATENÇÃO: apaga livros, membros, links do autor e eventos. Só antes de haver dados reais.
drop function if exists public.admin_listar_livros();
drop function if exists public.admin_usuario_por_email(text);
drop function if exists public.admin_trocar_responsavel(uuid, uuid);
drop function if exists public.admin_renovar_passe(uuid, integer);
drop function if exists public.admin_ativar_passe(uuid, text, integer);
drop table if exists public.events;
drop table if exists public.author_access;
drop table if exists public.book_members;
drop table if exists public.books;
drop function if exists privado.livro_editavel(uuid);
drop function if exists privado.eh_membro(uuid);
drop function if exists privado.tocar_atualizado_em();
alter default privileges grant execute on functions to public;
drop schema if exists privado;
drop type if exists public.ator_tipo;
drop type if exists public.papel_membro;
drop type if exists public.passe_estado;
