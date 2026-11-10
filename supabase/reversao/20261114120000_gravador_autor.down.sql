-- 20261114120000_gravador_autor.down.sql
-- Parte A, sempre segura: tira funções, políticas e privilégios do autor e devolve as regras do 5A.
-- Não toca em colunas nem em dados. Nenhum áudio é apagado em nenhum caso.
drop function if exists public.servico_trocar_link_autor(uuid, uuid, uuid, text, smallint);
drop function if exists public.servico_confirmar_gravacao_autor(text, uuid, bigint);
drop function if exists public.servico_caminho_gravacao_autor(text, uuid);
drop function if exists public.autor_preparar_gravacao(text, uuid, uuid, text, bigint, integer);
drop function if exists public.autor_consentir(text, smallint);
drop function if exists public.autor_pagina(text);
drop function if exists privado.acesso_do_autor(text);

drop policy if exists "porta do autor grava" on public.recordings;
drop policy if exists "porta do autor" on public.recordings;
drop policy if exists "porta do autor" on public.photos;
drop policy if exists "porta do autor" on public.prompts;
drop policy if exists "porta do autor consente" on public.books;
drop policy if exists "porta do autor" on public.books;
drop policy if exists "porta do autor" on public.author_access;
revoke all on public.author_access, public.books, public.prompts, public.photos, public.recordings from porta_autor;
revoke execute on function privado.livro_editavel(uuid), privado.max_audio_bytes() from porta_autor;
drop function if exists privado.livro_do_autor_atual();
drop function if exists privado.max_gravacao_s();
drop function if exists privado.max_bytes_autor_por_dia();
drop function if exists privado.max_gravacoes_autor_por_dia();
revoke usage on schema public, privado from porta_autor;

create or replace function public.servico_confirmar_audio(p_id uuid, p_tamanho_bytes bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.recordings;
begin
  update public.recordings r set upload = 'recebido', recebido_em = now()
  where r.id = p_id and r.upload = 'enviando' and r.tamanho_bytes = p_tamanho_bytes
    and r.criado_em > now() - interval '24 hours'
  returning * into v;
  if not found then return false; end if;
  if v.prompt_id is not null then
    update public.prompts set estado = 'respondida'
    where book_id = v.book_id and id = v.prompt_id and estado in ('para_enviar', 'enviada');
  end if;
  return true;
end $$;

drop policy "membro cria com plano ativo" on public.recordings;
create policy "membro cria com plano ativo" on public.recordings for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id)
              and upload = 'enviando' and origem = 'upload');

drop trigger if exists prompts_copiar_sugestao on public.prompts;
drop function if exists privado.copiar_sugestao();
drop trigger if exists author_access_revogacao on public.author_access;

-- Parte B, só sem dados do prompt 5: tira as colunas. Com dados, avisa e mantém
-- (consentimento é prova de LGPD; gravação do autor e chave_versao > 1 não podem sumir).
do $$ begin
  if exists (select 1 from public.recordings where author_access_id is not null or lote_id is not null
               or origem in ('lote', 'conversa'))
     or exists (select 1 from public.books where autor_consentimento_em is not null)
     or exists (select 1 from public.author_access where chave_versao > 1) then
    raise notice 'Há dados do prompt 5: colunas mantidas. Reversão das colunas só à mão.';
    return;
  end if;
  alter table public.recordings drop constraint recordings_lote_so_em_lote_ou_conversa,
    drop constraint recordings_lote_tem_id, drop constraint recordings_autor_tem_link,
    drop column lote_id, drop column author_access_id;
  alter table public.prompts drop column sugestao_audio_caminho, drop column sugestao_nome;
  alter table public.books drop constraint books_consentimento_completo,
    drop column autor_consentimento_versao, drop column autor_consentimento_em;
  alter table public.author_access drop column chave_versao;
end $$;
