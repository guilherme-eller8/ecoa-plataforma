-- Reverte 20261121120000_cofacilitadores.sql. Apaga convites, compartilhamentos e as preferências
-- do resumo, e tira os co-facilitadores: sem remover_membro, ninguém conseguiria tirá-los depois.
-- As duas funções de troca de link voltam a aceitar qualquer membro (como antes).
delete from public.edit_locks l using public.book_members m
  where m.book_id = l.book_id and m.user_id = l.user_id and m.papel = 'cofacilitador';
delete from public.book_members where papel = 'cofacilitador';

create or replace function public.servico_trocar_link_familia(
  p_livro uuid, p_usuario uuid, p_id uuid, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.book_members m where m.book_id = p_livro and m.user_id = p_usuario) then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then
    raise exception 'livro_fechado';
  end if;
  update public.family_access set revogado_em = now()
  where book_id = p_livro and revogado_em is null;
  insert into public.family_access (id, book_id, token_hash, chave_versao, criado_por)
  values (p_id, p_livro, p_token_hash, p_chave_versao, p_usuario);
end $$;

create or replace function public.servico_trocar_link_autor(
  p_livro uuid, p_usuario uuid, p_id uuid, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.book_members m where m.book_id = p_livro and m.user_id = p_usuario) then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then raise exception 'livro_fechado'; end if;
  update public.author_access set revogado_em = now() where book_id = p_livro and revogado_em is null;
  insert into public.author_access (id, book_id, token_hash, chave_versao, criado_por)
  values (p_id, p_livro, p_token_hash, p_chave_versao, p_usuario);
end $$;

drop function if exists public.servico_resumo_semanal(uuid);
drop function if exists public.servico_membros_para_resumo(uuid);
drop function if exists public.servico_livros_para_resumo();
drop function if exists public.servico_desligar_resumo(uuid);
drop function if exists public.definir_resumo_semanal(uuid, boolean);
alter table public.book_members drop column if exists resumo_semanal;
drop function if exists public.lembrar_pergunta(uuid);
alter table public.prompts drop column if exists lembrada_em;
drop function if exists public.servico_compartilhada_tocou(text, text);
drop function if exists public.servico_ler_compartilhada(text);
drop function if exists public.revogar_compartilhamento(uuid);
drop function if exists public.servico_compartilhar_historia(uuid, uuid, uuid, text, smallint);
drop function if exists public.sair_do_livro(uuid);
drop function if exists public.remover_membro(uuid, uuid);
drop function if exists privado.tirar_cofacilitador(uuid, uuid, uuid);
drop table if exists public.story_shares;
drop function if exists public.membros_do_livro(uuid);
drop function if exists public.cancelar_convite(uuid);
drop function if exists public.aceitar_convite(uuid);
drop function if exists public.meus_convites();
drop function if exists public.servico_ler_convite(text);
drop function if exists public.servico_criar_convite(uuid, uuid, uuid, text, text, smallint);
drop function if exists public.servico_pode_convidar(uuid, uuid, text);
drop function if exists privado.conferir_convite(uuid, uuid, text);
drop function if exists privado.convite_valido(uuid);
drop table if exists public.book_invites;
drop function if exists privado.eh_responsavel(uuid);
drop function if exists privado.palavras_do_texto(jsonb);
drop function if exists privado.palavras_por_pagina();
drop function if exists privado.convite_validade_dias();
drop function if exists privado.max_convites_por_email_dia();
drop function if exists privado.max_convites_dia();
drop function if exists privado.max_cofacilitadores();
