# Backlog de áudios (prompt 5A)

Status: rascunho para aprovação · 2026-11-09 · PRD: M4 e Modelo de dados · Decisões: P26, P34, T27

## 1. Problema e hipótese

O primeiro cliente quer começar já. O gravador (prompt 5) e a IA (prompt 6) ainda não existem, mas a família já tem vozes gravadas: áudios do WhatsApp e do gravador do celular. Hoje esses áudios ficam espalhados e se perdem.

- **Hipótese:** o cliente usa um lugar seguro para essas vozes antes de qualquer transcrição.
- **Sinal de sucesso:** em 7 dias, 5 ou mais áudios subidos sem ajuda.
- **Critério de morte:** se ele só sobe áudio quando o fundador está do lado, a demo não valida nada, e o valor está na transcrição (prompt 6), que deve ser antecipada.

## 2. Escopo

**Entra:**
- tabela `recordings` e bucket privado `audios`;
- tela *Nova história* com *Subir áudios* (1 a 30 arquivos, progresso, retomada);
- pergunta e título opcionais por arquivo;
- tela *Áudios recebidos* (data, duração, pergunta, player, "Aguardando processamento");
- a pergunta ligada passa a *Respondidas*;
- 1 evento por upload.

**Não entra:**
- gravador, IA, transcrição e divisão em histórias;
- apagar ou editar áudio;
- `stories` (prompt 5);
- cópia em .m4a para o iPhone antigo (prompt 6);
- o atalho *Compartilhar* do Android (PWA, prompt 5).

## 3. Fatos que moldam o desenho

| Fato | Consequência |
| --- | --- |
| No plano grátis do Supabase, o limite por arquivo é de **50 MB** (o PRD pede 100). O storage total é de 1 GB, e hoje o uso é 0 | Limite de 50 MB no bucket, no banco e na tela. Isso cobre mais de 45 min de .m4a ou horas de .opus. Para 100 MB, é preciso o plano Pro |
| O Supabase aceita TUS (upload retomável) com o token de `createSignedUploadUrl` no cabeçalho `x-signature`. Os pedaços são de 6 MB | Mesmo modelo de segurança das fotos: o servidor assina caminho por caminho, e `storage.objects` não tem política |
| O Safari toca Ogg Opus (.opus do WhatsApp) só a partir do iOS 18.4 | Em iPhone antigo, o áudio sobe e fica guardado, mas o player avisa que não toca. A cópia .m4a fica para o prompt 6 |
| O trigger `privado.transicao_da_pergunta` não deixa `authenticated` marcar `respondida` | A ligação com a pergunta acontece numa função de serviço, na mesma transação da confirmação do upload |
| `recordings` vai crescer no prompt 5 (gravador do autor, modo conversa) | Os enums de origem já nascem completos, e `processado_em` fica nulo até o prompt 6. O prompt 5 só acrescenta colunas |

## 4. Banco de dados

**Subida:** `supabase/migrations/20261112120000_audios.sql`

```sql
-- Áudios gravados fora da plataforma (5A). O prompt 5 estende esta tabela; nunca recria.
create type public.recording_origem as enum ('autor', 'livre', 'conversa', 'upload', 'lote');
create type public.recording_upload as enum ('enviando', 'recebido');

create function privado.max_audio_bytes() returns bigint
language sql immutable set search_path = '' as $$ select 52428800::bigint $$; -- 50 MB, espelha lib/config.ts

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
    caminho ~ ('^livros/' || book_id::text || '/audios/' || id::text || '\.(opus|ogg|m4a|mp3|wav|webm)$')
  )
);
create index recordings_livro_data on public.recordings (book_id, criado_em desc);
alter table public.recordings enable row level security;

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
```

**Reversão:** `supabase/reversao/20261112120000_audios.down.sql`

```sql
drop function if exists public.servico_confirmar_audio(uuid, bigint);
drop table if exists public.recordings;
drop function if exists privado.max_audio_bytes();
drop type if exists public.recording_upload;
drop type if exists public.recording_origem;
-- O bucket "audios" só é removido à mão, se estiver vazio: áudio original nunca é apagado por script.
```

**Por que assim:**
- **Linha antes do arquivo:** como nos causos, a linha nasce "enviando", e o caminho é fixado no banco. O servidor só assina esse caminho. O membro não vê a linha até a confirmação; por isso o id é gerado no servidor e o insert não usa `returning`.
- **Sem update nem delete para `authenticated`:** cumpre "nada pode ser apagado nesta fase" no banco, não só na tela.
- **`on delete restrict` no livro:** apagar um livro com áudio exige o procedimento formal de LGPD, que fica para o prompt 15.
- **Sem cota por livro:** o PRD diz "gravações ilimitadas". O risco é o 1 GB do plano grátis, e o admin acompanha.
- **Linhas "enviando" abandonadas:** ficam invisíveis e não ocupam storage. A limpeza fica para o job do prompt 6.

## 5. Fluxo

1. *Nova história* → *Subir áudios*. O seletor tem `accept="audio/*,.opus,.ogg,.m4a,.mp3,.wav,.webm"` e `multiple`.
2. No aparelho, para cada arquivo:
   - **formato:** pela extensão; o tipo que o celular informa não é confiável (o iPhone manda `.opus` sem tipo);
   - **tamanho:** até 50 MB;
   - **duração:**
     - Ogg/Opus: lida da última página "OggS", granule position menos o pre-skip, dividido por 48000. Funciona mesmo onde o Safari não toca;
     - outros formatos: `<audio>` com `loadedmetadata`;
     - falhou: fica vazia.
3. Recusas aparecem no cartão do arquivo, com frase clara:
   - "«PTT-0001.opus» passa de 50 MB e não pode subir."
   - "«video.mp4» não é áudio. Use .opus, .m4a, .mp3, .ogg, .wav ou .webm."
4. Cada arquivo aceito ganha *Pergunta (opcional)*, um seletor com a lista *Para perguntar* e *Enviadas*, e *Título (opcional)*.
5. *Enviar N áudios* chama `prepararAudios`, que:
   - valida tudo de novo com zod;
   - confere que o livro está aberto para escrita;
   - confere que a pergunta é do livro e está pendente;
   - insere as linhas;
   - devolve `{id, caminho, token}`.
6. TUS (`tus-js-client`):
   - endpoint `https://<ref>.storage.supabase.co/storage/v1/upload/resumable`;
   - cabeçalhos `apikey` e `x-signature`;
   - pedaços de 6 MB, 2 arquivos ao mesmo tempo;
   - novas tentativas em 0, 3, 5, 10, 20 e 60 s;
   - se a página recarregar, escolher o mesmo arquivo retoma do ponto onde parou (`findPreviousUploads`);
   - um arquivo que falhou mostra *Tentar de novo*.
7. Ao fim de cada arquivo, `confirmarAudio(id)`:
   - confere o caminho;
   - lê o objeto no Storage com a chave secreta e compara o tamanho;
   - chama `servico_confirmar_audio`;
   - registra o evento `subiu_audio` com `{ recording, com_pergunta }`.
8. *Pronto. Ver áudios recebidos.*

## 6. Telas

- **Home:**
  - o botão principal vira **Nova história** (P26);
  - *Perguntas* passa a botão secundário;
  - entra o link *Áudios recebidos (N)*.
- **Nova história** (`/livro/[id]/historias/nova`):
  - ação única: *Subir áudios*. O prompt 5 acrescenta *Gravar conversa* nesta mesma tela;
  - depois da escolha: cartões por arquivo e *Enviar N áudios*.
- **Áudios recebidos** (`/livro/[id]/audios`):
  - cartões com data, duração, pergunta, título ou nome do arquivo, `<audio controls preload="none">` com URL assinada por 1 h, e o selo *Aguardando processamento*;
  - não há botão de apagar;
  - se o formato não tocar: "Este celular não toca este formato. Ouça no computador ou atualize o iPhone.";
  - estado vazio: "Nenhum áudio ainda." e *Subir áudios*.
- **Gesto não óbvio:** nenhum. Escolher arquivo e tocar o player são padrão, então não há dica de primeira vez.
- **Styleguide:** as 3 telas com dados falsos (vazio, escolhendo, recusado, subindo, falhou, recebidos).

## 7. Código

**Arquivos novos:**
- `lib/audios/formatos.ts` (puro): `formatoDoArquivo`, `recusa`, `caminhoAudio`, `audioDoLivro` (regex igual ao CHECK).
- `lib/audios/duracao.ts` (navegador).
- `components/audios/subir-audios.tsx`, `components/telas/tela-nova-historia.tsx` e `components/telas/tela-audios.tsx`.
- `app/livro/[id]/historias/nova/page.tsx` e `app/livro/[id]/audios/page.tsx`.

**Arquivos alterados:**
- `lib/config.ts`: `MAX_AUDIO_MB = 50`, espelhado em `privado.max_audio_bytes()`; `FORMATOS_AUDIO`; `SUBIDAS_SIMULTANEAS = 2`. Reaproveita `MAX_ARQUIVOS_LOTE = 30`.
- `app/livro/[id]/acoes.ts` (`prepararAudios`, `confirmarAudio`) e `ligar-acoes.ts`.
- `lib/livro/dados.ts`: `audiosDoLivro`, reaproveitando `assinar()` com o bucket `audios`.
- `lib/livro/tipos.ts`: `AudioDaTela` e `AcoesAudios`.
- `lib/eventos-acoes.ts`: `subiu_audio`.
- `components/telas/tela-livro.tsx`.

**Reaproveitado:**
- `paraEscrever`, `evento`, `falhou` e `atualizar` (`acoes.ts`);
- o padrão de `components/fotos/upload-fotos.tsx`;
- os componentes de `components/ui`.

**Dependência nova:** `tus-js-client`.

## 8. Testes

- **Banco** (`supabase/tests/audios.test.ts`):
  - um livro não lê nem cria áudio de outro livro;
  - um áudio "enviando" fica invisível;
  - `authenticated` não faz update nem delete;
  - `anon` e `porta_autor` não têm acesso;
  - a confirmação é só do `service_role`, marca a pergunta como respondida e falha com tamanho diferente ou em segunda chamada;
  - caminho de outro livro e arquivo acima de 50 MB são recusados;
  - livro vencido não cria áudio;
  - `rls.test.ts` e `config-banco.test.ts` são atualizados.
- **Unidade:**
  - `formatos.ts`: recusas por tamanho e formato, com as frases exatas;
  - `duracao.ts` com um Ogg mínimo;
  - esquema de `prepararAudios`.
- **E2E** (`e2e/audios.spec.ts`, pelo styleguide):
  - 4 arquivos, 1 de 51 MB, mostram a recusa clara;
  - ligar uma pergunta;
  - os recebidos mostram player e selo;
  - estado vazio;
  - a home mostra *Nova história*.
- **Gate de design:** nas 3 telas, a 390, 768 e 1440 px.

## 9. Aceite

No iPhone e num Android:
1. subir 3 áudios do WhatsApp e 1 do gravador. No iPhone, o caminho é WhatsApp → Compartilhar → Salvar em Arquivos;
2. ouvir os 4;
3. ver um deles ligado à pergunta certa, e a pergunta em *Respondidas*.

No iPhone com iOS anterior ao 18.4, os .opus não tocam (seção 3).

## 10. Riscos

| Risco | Mitigação |
| --- | --- |
| iPhone antigo não toca .opus | Aviso no player; cópia .m4a no prompt 6 |
| 1 GB de storage no plano grátis | O uso aparece no admin; passar para o Pro (US$ 25) ao chegar a 70% |
| WhatsApp do iPhone não entrega o arquivo direto ao navegador | Roteiro "Salvar em Arquivos" no aceite; o atalho de compartilhar vem com o PWA (prompt 5, Android) |
| Linha "enviando" sem arquivo | Invisível; a limpeza fica no job do prompt 6 |
