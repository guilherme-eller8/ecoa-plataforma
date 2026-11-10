-- 20261112120000_audios.sql
-- Prompt 5A: áudios gravados fora da plataforma (WhatsApp, gravador do celular), guardados
-- como "aguardando processamento". O prompt 5 estende esta tabela; nunca recria.
--
-- Regras deste arquivo:
-- * A linha nasce "enviando" com o caminho fixado aqui; o servidor só assina o upload desse
--   caminho e confirma o recebimento conferindo o objeto no Storage.
-- * Ninguém logado altera nem apaga áudio: o original nunca some por ação comum do usuário.
-- * A ligação com a pergunta (respondida) acontece na mesma transação da confirmação.

create type public.recording_origem as enum ('autor', 'livre', 'conversa', 'upload', 'lote');
create type public.recording_upload as enum ('enviando', 'recebido');

-- Espelha lib/config.ts (MAX_AUDIO_MB). supabase/tests/config-banco.test.ts confere.
create function privado.max_audio_bytes() returns bigint
language sql immutable set search_path = '' as $$ select 52428800::bigint $$;

create table public.recordings (
  id uuid primary key,                                   -- gerado no servidor
  -- restrict: áudio original nunca some em cascata; exclusão só por pedido formal (LGPD)
  book_id uuid not null references public.books (id) on delete restrict,
  origem public.recording_origem not null default 'upload',
  prompt_id uuid,                                        -- pergunta opcional
  titulo text check (titulo is null or char_length(btrim(titulo)) between 1 and 120),
  nome_arquivo text not null check (char_length(nome_arquivo) between 1 and 200),
  caminho text not null unique,
  content_type text not null check (content_type in
    ('audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm')),
  tamanho_bytes bigint not null check (tamanho_bytes between 1 and 52428800),
  duracao_s integer check (duracao_s is null or duracao_s between 1 and 21600),
  upload public.recording_upload not null default 'enviando',
  recebido_em timestamptz,
  processado_em timestamptz,                             -- null = aguardando processamento (prompt 6)
  criado_por uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (book_id, id),
  foreign key (book_id, prompt_id) references public.prompts (book_id, id) on delete set null (prompt_id),
  constraint recordings_recebido check ((upload = 'recebido') = (recebido_em is not null)),
  constraint recordings_caminho_do_livro check (
    -- regex literal: um CHECK roda com o usuário corrente, que não executa funções de privado
    caminho ~ ('^livros/' || book_id::text || '/audios/' || id::text || '\.(opus|ogg|m4a|mp3|wav|webm)$')
  )
);
create index recordings_livro_data on public.recordings (book_id, criado_em desc);
alter table public.recordings enable row level security;

-- O Supabase dá tudo a anon e authenticated por padrão: zera e concede só o necessário.
revoke all on public.recordings from public, anon, authenticated, porta_autor;
grant all on public.recordings to service_role;

-- Membro lê só o que chegou; cria a linha "enviando" com plano ativo. Sem update nem delete
-- para ninguém logado: confirmar é do servidor, apagar não existe nesta fase.
grant select (id, book_id, origem, prompt_id, titulo, nome_arquivo, caminho, content_type,
  tamanho_bytes, duracao_s, upload, recebido_em, processado_em, criado_por, criado_em),
  insert (id, book_id, origem, prompt_id, titulo, nome_arquivo, caminho, content_type,
  tamanho_bytes, duracao_s)
  on public.recordings to authenticated;
create policy "membro lê áudio recebido" on public.recordings for select to authenticated
  using (privado.eh_membro(book_id) and upload = 'recebido');
create policy "membro cria com plano ativo" on public.recordings for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id)
              and upload = 'enviando' and origem = 'upload');

-- Confirmação (só o servidor, depois de conferir o objeto no Storage): marca recebido e,
-- se houver pergunta, passa para respondida na mesma transação.
create function public.servico_confirmar_audio(p_id uuid, p_tamanho_bytes bigint)
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
revoke all on function public.servico_confirmar_audio(uuid, bigint) from public, anon, authenticated;
grant execute on function public.servico_confirmar_audio(uuid, bigint) to service_role;

-- Bucket privado, sem políticas em storage.objects: só upload por token assinado pelo servidor.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('audios', 'audios', false, 52428800,
       array['audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm']);
  end if;
end $$;
