# Gravador, área do autor e modo conversa (prompt 5)

Status: rascunho para aprovação · 2026-11-10 · PRD: M4 (sem divisão), M7 (só gravar), M11 (primeira abertura do autor), Design e experiência · Decisões: P2, P8, P12, P26, P27, P33, T5, T6, T15, T16, T25, T27, T28

## 1. Problema, hipótese e o que está em jogo

A ceia de Natal é o primeiro teste real (P24, P28). Se a gravação de 1 hora se perder, a família perde a voz do avô e a Ecoa perde o cliente. O gravador é o maior risco técnico do produto no celular.

- **Hipótese 1 (ceia):** o filho grava a conversa no próprio celular, com pergunta no topo ou sem pergunta, e nada se perde, mesmo com sinal ruim.
- **Hipótese 2 (autor sozinho):** o autor, pelo link do WhatsApp, grava pelo menos 1 resposta sem ajuda.
- **Sinais de sucesso:** roteiro de teste do aceite passa no iPhone e no Android; nos 2 parceiros de design, 1 gravação do autor pelo link em 7 dias depois do envio.
- **Critério de morte da hipótese 2:** se nenhum dos 2 autores grava sozinho em 7 dias, a área do autor para no estado atual e o investimento vai para o modo conversa (o filho grava ao lado). Não construir as telas do prompt 10 antes desse sinal.
- **Evidência que ainda não temos:** nenhum autor real abriu um link pessoal. Hoje a hipótese 2 é suposição.

## 2. Escopo

**Entra:**
- gravador único (autor e modo conversa): gravar, pausar, retomar, ouvir, regravar, até 30 min, vibração ao iniciar;
- pedaços salvos no IndexedDB durante a gravação; envio TUS retomável depois de *Enviar*;
- recuperação: gravação interrompida (aba fechada, bateria, ligação) reaparece na próxima abertura, pronta para enviar;
- link pessoal do autor (`/a/[token]`), derivado por HMAC (T25), com troca de link;
- área do autor: primeira abertura com consentimento, "Olá, [apelido]", perguntas enviadas a ele (com foto e o áudio de quem sugeriu), *Contar uma história*;
- *Nova história* do responsável com *Gravar conversa* e *Subir áudios*;
- PWA instalável com `share_target` (Android recebe áudios do WhatsApp);
- link real do autor no kit de início e em *Enviar ao autor*.

**Não entra:**
- IA, transcrição, divisão em histórias (prompts 6 e 7);
- *Minhas histórias* e *Meu livro* do autor (prompt 10);
- apagar ou editar áudio;
- cópia .m4a para iPhone antigo (prompt 6).

## 3. Decisões que preciso de você

| # | Pergunta | Recomendo | Por quê |
| --- | --- | --- | --- |
| D1 | O prompt pede `stories` e `story_recordings` agora. Criar já? | **Adiar para o prompt 6.** Nesta etapa toda gravação fica em `recordings`, "aguardando processamento", como no 5A | P27: quem decide se 1 gravação vira 1 ou 4 histórias é a IA, não a porta. Criar a tabela agora sem ninguém escrever nela é schema morto que o prompt 6 vai alterar de novo. Nenhuma tela do prompt 5 lê história |
| D2 | O prompt pede upload de até 100 MB | **Manter 50 MB** (T27; o PRD M4 já diz 50) | 30 min de gravação a 48 kbps ≈ 11 MB. 100 MB só com plano Pro |
| D3 | Quais perguntas o autor vê? | **Só as enviadas a ele** (estado `enviada`) | P33: a lista é a base do livro; o filho pode querer perguntar ao vivo na ceia. *Enviar ao autor* passa a ser o gesto que libera a pergunta para ele |
| D4 | Gravação interrompida (aba fechada, bateria) | **Reaparece com 1 botão *Enviar*; não envia sozinha** | O autor apertou gravar, mas pode não querer mandar um pedaço cortado. Com 1 toque não se perde nada |
| D5 | Ordem de entrega dentro da sessão | **A → B → C** (abaixo). Se o tempo acabar, C fica para uma sessão curta | A (gravador + modo conversa) é o caminho da ceia; B (autor) depende de hipótese sem evidência; C (PWA) é só Android |

**Fases de entrega:**
- **A. Gravador resiliente + modo conversa + migration.** É o que a ceia precisa.
- **B. Link e área do autor + kit.**
- **C. PWA e `share_target`.**

## 4. Fatos que moldam o desenho

| Fato | Consequência |
| --- | --- |
| O banco de produção tem 3 linhas em `recordings` e 0 em `author_access`. A migration `20261113120000_enquete_por_fase` já está aplicada, mas fora do histórico do Supabase | A migration nova só usa `alter`, nunca recria. Não reaplicar a de enquete por fase. A nova recebe a versão `20261114120000` |
| `author_access` não tem `chave_versao` | Coluna nova com default 1, para derivar o link por HMAC como o da família (T25) |
| T5: `porta_autor` não tem privilégio em `causos`, e o teste `autor-isolamento` prova | O nome e o áudio de quem sugeriu são copiados para `prompts` quando o causo vira pergunta. O autor lê só `prompts` |
| Safari (iOS 14.3+) grava em `audio/mp4` (AAC); Chrome em `audio/webm;codecs=opus`. O bucket `audios` já aceita os dois | Extensão `.m4a` ou `.webm` conforme o que o navegador gravou. Sem conversão nesta etapa |
| `MediaRecorder.start(1000)` entrega um pedaço por segundo. Os pedaços concatenados formam um arquivo válido (WebM em cluster; MP4 fragmentado no Safari) | Cada pedaço vai para o IndexedDB na hora. Uma gravação cortada no meio continua tocável |
| No iPhone, a tela que apaga ou a troca de app suspende o microfone | Wake Lock de tela durante a gravação (iOS 16.4+, Android). Se a página ficar oculta, a gravação pausa e salva; ao voltar, mostra *Continuar* |
| O Safari apaga o IndexedDB de sites não instalados após 7 dias sem uso | O envio começa logo depois de *Enviar*; `navigator.storage.persist()` pedido no início. O risco real é só o aparelho ficar 7 dias sem internet |
| O plano grátis do Supabase tem 1 GB de storage no total | ~90 gravações de 30 min. Antes da ceia, o plano Pro precisa estar contratado (ver Riscos) |
| A família já usa o padrão "função com token + caminho fixo no banco + upload assinado pelo servidor" | O autor usa o mesmo padrão. Nenhuma política em `storage.objects` |

## 5. Banco de dados

**Subida:** `supabase/migrations/20261114120000_gravador_autor.sql`

```sql
-- Prompt 5: gravador, link do autor e modo conversa. Estende recordings (5A); nunca recria.
-- stories e story_recordings ficam para o prompt 6 (decisão D1).

-- ── Números de negócio (espelham lib/config.ts; config-banco.test.ts confere) ──
create function privado.max_gravacoes_autor_por_dia() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;
create function privado.max_gravacao_s() returns integer
language sql immutable set search_path = '' as $$ select 1800 $$;   -- MAX_GRAVACAO_MIN = 30

-- ── Link do autor: versão do segredo, como o da família (T25) ──────────────
alter table public.author_access
  add column chave_versao smallint not null default 1 check (chave_versao between 1 and 99);
create trigger author_access_revogacao before update on public.author_access
  for each row execute function privado.revogacao_definitiva();

-- ── Consentimento do autor (LGPD): vale para o livro, não para o link ──────
alter table public.books
  add column autor_consentimento_em timestamptz,
  add column autor_consentimento_versao smallint
    check (autor_consentimento_versao is null or autor_consentimento_versao between 1 and 99),
  add constraint books_consentimento_completo
    check ((autor_consentimento_em is null) = (autor_consentimento_versao is null));
-- authenticated já lê books inteiro; update continua só nas colunas concedidas antes.

-- ── Quem sugeriu, copiado do causo (o autor nunca lê causos: T5) ───────────
alter table public.prompts
  add column sugestao_nome text check (sugestao_nome is null or char_length(sugestao_nome) between 1 and 80),
  add column sugestao_audio_caminho text check (
    sugestao_audio_caminho is null
    or sugestao_audio_caminho ~ ('^livros/' || book_id::text || '/causos/[0-9a-f-]{36}\.(webm|m4a|ogg)$'));

create function privado.copiar_sugestao() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.causo_id is null then
    new.sugestao_nome := null;
    new.sugestao_audio_caminho := null;
  elsif tg_op = 'INSERT' or new.causo_id is distinct from old.causo_id then
    select c.nome, case when c.audio_recebido_em is not null then c.audio_caminho end
      into new.sugestao_nome, new.sugestao_audio_caminho
    from public.causos c where c.book_id = new.book_id and c.id = new.causo_id;
  end if;
  return new;
end $$;
create trigger prompts_copiar_sugestao before insert or update of causo_id on public.prompts
  for each row execute function privado.copiar_sugestao();
-- Quem está logado não escreve estas colunas: o grant de insert/update é por coluna e não as inclui.

update public.prompts p set sugestao_nome = c.nome,
  sugestao_audio_caminho = case when c.audio_recebido_em is not null then c.audio_caminho end
from public.causos c where c.book_id = p.book_id and c.id = p.causo_id;

-- ── recordings: quem gravou pelo link, lote e novas origens ────────────────
alter table public.recordings
  add column author_access_id uuid references public.author_access (id) on delete restrict,
  add column lote_id uuid,
  add constraint recordings_autor_tem_link
    check ((origem in ('autor', 'livre')) = (author_access_id is not null)),
  add constraint recordings_lote_tem_id check ((origem = 'lote') = (lote_id is not null));
-- As 3 linhas de produção são 'upload' sem link e sem lote: passam nas duas regras.

grant select (author_access_id, lote_id) on public.recordings to authenticated;
grant insert (lote_id) on public.recordings to authenticated;
drop policy "membro cria com plano ativo" on public.recordings;
create policy "membro cria com plano ativo" on public.recordings for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id)
              and upload = 'enviando' and origem in ('upload', 'lote', 'conversa'));

-- O autor pode demorar a ter internet: a janela de confirmação passa de 24 h para 7 dias.
create or replace function public.servico_confirmar_audio(p_id uuid, p_tamanho_bytes bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.recordings;
begin
  update public.recordings r set upload = 'recebido', recebido_em = now()
  where r.id = p_id and r.upload = 'enviando' and r.tamanho_bytes = p_tamanho_bytes
    and r.criado_em > now() - interval '7 days'
  returning * into v;
  if not found then return false; end if;
  if v.prompt_id is not null then
    update public.prompts set estado = 'respondida'
    where book_id = v.book_id and id = v.prompt_id and estado in ('para_enviar', 'enviada');
  end if;
  return true;
end $$;

-- ── Portas do autor (anon, com o token do link) ────────────────────────────
-- Dono porta_autor: o que ele não tem grant (causos, enquete, family_access, family_messages)
-- nenhuma função do autor alcança, mesmo com bug.
grant usage on schema public, privado to porta_autor;
grant select on public.author_access to porta_autor;
grant select (id, autor_nome, autor_apelido, autor_consentimento_em, plano_estado, plano_vence_em),
  update (autor_consentimento_em, autor_consentimento_versao) on public.books to porta_autor;
grant select (id, book_id, tipo, texto, estado, photo_id, sugestao_nome, sugestao_audio_caminho,
  enviada_em, ordem) on public.prompts to porta_autor;
grant select (id, book_id, caminho) on public.photos to porta_autor;
grant select (id, book_id, upload, caminho, criado_em, author_access_id), insert (id, book_id, origem, prompt_id,
  nome_arquivo, caminho, content_type, tamanho_bytes, duracao_s, author_access_id, criado_por)
  on public.recordings to porta_autor;
grant execute on function privado.livro_editavel(uuid), privado.max_gravacoes_autor_por_dia(),
  privado.max_gravacao_s(), privado.max_audio_bytes() to porta_autor;

-- RLS vale para porta_autor (não é dono das tabelas). As portas abaixo são o único caminho até
-- ele, e cada uma confere o token antes: as políticas só abrem o que os grants por coluna permitem.
create policy "porta do autor" on public.author_access for select to porta_autor using (true);
create policy "porta do autor" on public.books for select to porta_autor using (true);
create policy "porta do autor consente" on public.books for update to porta_autor using (true) with check (true);
create policy "porta do autor" on public.prompts for select to porta_autor using (estado = 'enviada');
create policy "porta do autor" on public.photos for select to porta_autor using (true);
create policy "porta do autor" on public.recordings for select to porta_autor using (author_access_id is not null);
create policy "porta do autor grava" on public.recordings for insert to porta_autor
  with check (author_access_id is not null and upload = 'enviando' and origem in ('autor', 'livre'));

create function privado.acesso_do_autor(p_token text) returns public.author_access
language sql stable security definer set search_path = '' as $$
  select a.* from public.author_access a
  where p_token is not null and octet_length(p_token) between 16 and 128
    and a.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and a.revogado_em is null
$$;
alter function privado.acesso_do_autor(text) owner to porta_autor;

-- O que /a/[token] mostra. null = link inválido ou revogado.
create function public.autor_pagina(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare a public.author_access := privado.acesso_do_autor(p_token); b record;
begin
  if a.id is null then return null; end if;
  select id, autor_nome, autor_apelido, autor_consentimento_em into b from public.books where id = a.book_id;
  return jsonb_build_object(
    'nome', coalesce(b.autor_apelido, b.autor_nome),
    'consentiu', b.autor_consentimento_em is not null,
    'aberto', privado.livro_editavel(a.book_id),
    'perguntas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'tipo', p.tipo, 'texto', p.texto,
        'foto', f.caminho, 'sugestao_nome', p.sugestao_nome, 'sugestao_audio', p.sugestao_audio_caminho)
        order by p.enviada_em desc, p.ordem)
      from public.prompts p left join public.photos f on f.book_id = p.book_id and f.id = p.photo_id
      where p.book_id = a.book_id and p.estado = 'enviada'), '[]'::jsonb));
end $$;

create function public.autor_consentir(p_token text, p_versao smallint) returns boolean
language plpgsql security definer set search_path = '' as $$
declare a public.author_access := privado.acesso_do_autor(p_token);
begin
  if a.id is null or p_versao is null or p_versao not between 1 and 99 then return false; end if;
  update public.books set autor_consentimento_em = now(), autor_consentimento_versao = p_versao
  where id = a.book_id and autor_consentimento_em is null;
  return true;
end $$;

-- Cria a linha "enviando" com caminho fixo. O id vem do aparelho (uuid da gravação local):
-- repetir a chamada depois de uma queda de rede devolve a mesma linha, sem duplicar.
create function public.autor_preparar_gravacao(
  p_token text, p_id uuid, p_prompt uuid, p_ext text, p_tamanho_bytes bigint, p_duracao_s integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  a public.author_access := privado.acesso_do_autor(p_token);
  v_caminho text;
  v_existente record;
begin
  if a.id is null then raise exception 'link_invalido'; end if;
  if p_id is null or p_ext not in ('webm', 'm4a')
     or p_tamanho_bytes is null or p_tamanho_bytes not between 1 and privado.max_audio_bytes()
     or p_duracao_s is null or p_duracao_s not between 1 and privado.max_gravacao_s() + 60 then
    raise exception 'dados_invalidos';
  end if;
  if not exists (select 1 from public.books where id = a.book_id and autor_consentimento_em is not null) then
    raise exception 'sem_consentimento';
  end if;
  if not privado.livro_editavel(a.book_id) then raise exception 'livro_fechado'; end if;

  select r.book_id, r.upload, r.caminho into v_existente from public.recordings r where r.id = p_id;
  if found then
    if v_existente.book_id <> a.book_id or v_existente.upload <> 'enviando' then
      raise exception 'dados_invalidos';
    end if;
    return jsonb_build_object('id', p_id, 'caminho', v_existente.caminho);
  end if;

  if p_prompt is not null and not exists (
    select 1 from public.prompts where book_id = a.book_id and id = p_prompt and estado = 'enviada') then
    raise exception 'pergunta_invalida';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('gravacoes_autor:' || a.book_id::text, 0));
  if (select count(*) from public.recordings r where r.book_id = a.book_id and r.author_access_id is not null
      and r.criado_em > now() - interval '1 day') >= privado.max_gravacoes_autor_por_dia() then
    raise exception 'limite_gravacoes';
  end if;

  v_caminho := 'livros/' || a.book_id::text || '/audios/' || p_id::text || '.' || p_ext;
  insert into public.recordings (id, book_id, origem, prompt_id, nome_arquivo, caminho, content_type,
    tamanho_bytes, duracao_s, author_access_id, criado_por)
  values (p_id, a.book_id, case when p_prompt is null then 'livre' else 'autor' end::public.recording_origem,
    p_prompt, 'gravacao.' || p_ext, v_caminho,
    case p_ext when 'm4a' then 'audio/mp4' else 'audio/webm' end,
    p_tamanho_bytes, p_duracao_s, a.id, null);
  return jsonb_build_object('id', p_id, 'caminho', v_caminho);
end $$;

-- Só o servidor: caminho a assinar, conferindo que a gravação é do livro do token.
create function public.servico_caminho_gravacao_autor(p_token text, p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select r.caminho from public.recordings r
  where r.id = p_id and r.book_id = (privado.acesso_do_autor(p_token)).book_id
    and r.author_access_id is not null and r.upload = 'enviando'
    and r.criado_em > now() - interval '7 days'
$$;

alter function public.autor_pagina(text) owner to porta_autor;
alter function public.autor_consentir(text, smallint) owner to porta_autor;
alter function public.autor_preparar_gravacao(text, uuid, uuid, text, bigint, integer) owner to porta_autor;
alter function public.servico_caminho_gravacao_autor(text, uuid) owner to porta_autor;

revoke all on function public.autor_pagina(text), public.autor_consentir(text, smallint),
  public.autor_preparar_gravacao(text, uuid, uuid, text, bigint, integer),
  public.servico_caminho_gravacao_autor(text, uuid), privado.acesso_do_autor(text)
  from public, anon, authenticated;
grant execute on function public.autor_pagina(text), public.autor_consentir(text, smallint),
  public.autor_preparar_gravacao(text, uuid, uuid, text, bigint, integer) to anon;
grant execute on function public.servico_caminho_gravacao_autor(text, uuid) to service_role;

-- Gera ou troca o link do autor (servidor, depois de conferir o membro). O antigo para na hora.
create function public.servico_trocar_link_autor(
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
revoke all on function public.servico_trocar_link_autor(uuid, uuid, uuid, text, smallint)
  from public, anon, authenticated;
grant execute on function public.servico_trocar_link_autor(uuid, uuid, uuid, text, smallint) to service_role;
grant select (chave_versao) on public.author_access to authenticated;
```

**Reversão:** `supabase/reversao/20261114120000_gravador_autor.down.sql`

```sql
-- Só roda se nenhuma gravação do autor existir: áudio original nunca é apagado por script.
do $$ begin
  if exists (select 1 from public.recordings where author_access_id is not null or origem in ('lote', 'conversa')) then
    raise exception 'há gravações do prompt 5; reversão manual';
  end if;
end $$;
drop function if exists public.servico_trocar_link_autor(uuid, uuid, uuid, text, smallint);
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
alter table public.recordings drop constraint recordings_lote_tem_id,
  drop constraint recordings_autor_tem_link, drop column lote_id, drop column author_access_id;

drop trigger if exists prompts_copiar_sugestao on public.prompts;
drop function if exists privado.copiar_sugestao();
alter table public.prompts drop column sugestao_audio_caminho, drop column sugestao_nome;

alter table public.books drop constraint books_consentimento_completo,
  drop column autor_consentimento_versao, drop column autor_consentimento_em;

drop trigger if exists author_access_revogacao on public.author_access;
alter table public.author_access drop column chave_versao;

drop function if exists privado.max_gravacao_s();
drop function if exists privado.max_gravacoes_autor_por_dia();
```

**Por que assim:**
- **Dono `porta_autor` em toda função do autor:** o isolamento de T5 vem de privilégio. O teste `autor-isolamento` já confere que `porta_autor` não tem nada em `causos`, enquete e `family_access`; passa a conferir também `books` (só as colunas concedidas) e que nenhuma função `autor_*` tem outro dono.
- **Id da gravação gerado no aparelho:** torna `autor_preparar_gravacao` idempotente. A queda de rede na resposta não cria linha duplicada, e o TUS usa o mesmo id como impressão digital para retomar.
- **Pergunta só se `enviada`:** o autor não alcança pergunta que o responsável ainda não liberou (D3), nem por id adivinhado.
- **Teto de 30 gravações por dia por livro:** o link do autor é público; o teto limita storage gasto por um link vazado. O responsável troca o link se acontecer.
- **Modo conversa usa o fluxo do 5A** (`prepararAudios` → TUS → `confirmarAudio`) com `origem = 'conversa'`; não precisa de função nova.
- **`lote_id`** guarda quais arquivos subiram juntos, para a divisão do prompt 7. Um arquivo só continua `upload`.

## 6. Gravador (código do aparelho)

**Arquivos:** `lib/gravacao/local.ts` (IndexedDB), `lib/gravacao/gravador.ts` (MediaRecorder), `lib/gravacao/envio.ts` (fila de envio), `components/gravacao/gravar.tsx` (tela, compõe `components/ui/gravador`).

**IndexedDB** (`ecoa-gravacoes`, pacote `idb`, ~1 KB):
- `gravacoes`: `{ id (uuid), destino: {tipo: 'autor', token} | {tipo: 'livro', livroId}, promptId?, mime, ext, segundos, estado: 'gravando' | 'pronta' | 'enviando' | 'enviada', criadaEm }`;
- `pedacos`: `{ gravacaoId, seq, blob }`, chave `[gravacaoId, seq]`.

**Gravar:**
1. `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false } })`. Supressão de ruído desligada: corta voz fraca de idoso.
2. Tipo: `audio/webm;codecs=opus`, senão `audio/mp4`. 48 kbps (`GRAVACAO_KBPS` em `lib/config.ts`).
3. `start(1000)`; cada `dataavailable` grava o pedaço no IndexedDB antes de qualquer outra coisa.
4. `navigator.vibrate(40)` ao iniciar; Wake Lock de tela enquanto grava; `navigator.storage.persist()`.
5. Pausar e retomar com `pause()` e `resume()`. Aos 29 min, aviso de 1 linha; aos 30, conclui sozinho.
6. Página oculta (`visibilitychange`) durante a gravação: pausa e salva. Se o MediaRecorder morrer (`error`, faixa `ended` por ligação), a gravação é concluída com o que tem e vira `pronta`.
7. *Ouvir*: junta os pedaços num Blob e toca. *Gravar de novo*: confirma ("Apagar esta gravação?") e apaga os pedaços.

**Enviar** (`envio.ts`, uma fila por aparelho):
1. `pronta` → `enviando`. Pede o caminho e o token de upload: o autor chama `autor_preparar_gravacao` e depois a ação `assinarGravacaoAutor`; o responsável usa `prepararAudios` (5A).
2. TUS (`lib/audios/tus.ts`) com o Blob dos pedaços, impressão digital = id da gravação, novas tentativas em 0, 3, 5, 10, 20 e 60 s.
3. Evento `online` e abertura da página retomam o que ficou `enviando`.
4. Ao terminar, `confirmarGravacao` (servidor confere o objeto no Storage e o tamanho; registra `gravou_autor` ou `gravou_conversa`). Só então `enviada`, e os pedaços são apagados.

**Recuperação:** ao abrir a área do autor ou *Gravar conversa*, toda gravação `gravando` (a aba morreu) vira `pronta` com a duração dos pedaços. Aparece um cartão: "Achamos uma gravação de 4 min que não foi enviada." com *Enviar* (D4). Gravação `pronta` ou `enviando` volta para a fila sozinha.

**Por que não enviar durante a gravação:** com modo avião no meio, o envio em tempo real só falharia e tentaria de novo. Gravar local e enviar depois é mais simples e cumpre "nenhuma gravação se perde": o arquivo está inteiro no aparelho até o servidor confirmar.

## 7. Telas

**Autor** (`/a/[token]`, sem login, regras do autor: pergunta 28 px, texto 20 px, alvos de 56 px, botão de 120 px):
- **Primeira abertura** (sem consentimento): "Toque no círculo e conte. Pode pausar quando quiser." + "Suas histórias vão virar um livro para a sua família. Podemos guardar a sua voz para isso?" + botão *Sim, pode guardar*. Registra o consentimento e o evento `autor_consentiu`.
- **Início:** "Olá, Jair". Botão principal *Contar uma história*. Abaixo, as perguntas enviadas, uma por cartão, com a foto quando houver.
  - Estado vazio: "Nenhuma pergunta por enquanto." O botão *Contar uma história* continua lá.
- **Gravar** (`/a/[token]/gravar` e `/a/[token]/gravar/[pergunta]`): pergunta no topo; foto; "A Ana pediu:" com o áudio de quem sugeriu; gravador; depois de concluir, player, *Enviar* e *Gravar de novo*. Ao enviar: "Guardando sua história…" e, ao fim, "Pronto. Sua história chegou." + *Voltar*.
  - Sem internet: "Sem internet agora. Sua gravação está guardada e sobe sozinha."
- **Link inválido ou trocado:** "Este link não vale mais. Peça um novo a quem está fazendo o seu livro."
- **Plano vencido:** "Este livro está fechado para novas gravações."
- **Dica de primeira vez:** nenhuma. O círculo de gravar já tem a frase da primeira abertura.

**Responsável:**
- **Nova história** (`/livro/[id]/historias/nova`): duas opções grandes, *Gravar conversa* e *Subir áudios*.
- **Gravar conversa** (`/livro/[id]/historias/gravar`): passo 1 escolhe a pergunta (lista *Para perguntar* e *Enviadas*, mais *Conversa livre, sem pergunta* no topo); passo 2 é o gravador com a pergunta no topo. Ao enviar, volta para *Áudios recebidos*.
  - Dica de primeira vez (1 linha): "Deixe o celular na mesa, perto de quem fala."
- **Áudios recebidos:** mostra a origem ("Gravado pelo Jair", "Conversa", "Enviado por você").
- **Perguntas e kit:** *Enviar ao autor* manda o link da pergunta (`/a/[token]/gravar/[pergunta]`); o kit manda o link do início. *Trocar link do autor* no kit, com confirmação.

**PWA** (fase C): `app/manifest.ts` com `share_target` (`POST /compartilhar`, `multipart/form-data`, `audio/*`) e um service worker mínimo (`public/sw.js`) que só trata esse POST: guarda os arquivos no IndexedDB e redireciona para `/compartilhar`. A página pede o livro (se houver mais de um) e reaproveita *Subir áudios* com os arquivos já escolhidos. O service worker não faz cache de páginas: nada de app offline nesta etapa.

## 8. Código alterado

- `lib/links.ts`: `linkDoAutor` sai; entra `urlAutor(token)` e `urlPerguntaAutor(token, pergunta)`.
- `lib/livro/dados.ts`: `linkDoAutor(livroId)`, que cria o link na primeira vez (como `linkDaFamilia`).
- `app/livro/[id]/acoes.ts`: `pegarLinkDoAutor`, `trocarLinkDoAutor`; `prepararAudios` aceita `origem` (`upload`, `lote`, `conversa`) e gera `lote_id` quando há mais de 1 arquivo.
- `app/a/[token]/acoes.ts` (novo): `consentir`, `prepararGravacao`, `assinarGravacao`, `confirmarGravacao`, todas com zod e limite por IP (como a família).
- `app/a/em-breve` é removida.
- `lib/config.ts`: `GRAVACAO_KBPS = 48`, `MAX_GRAVACOES_AUTOR_DIA = 30`, `CONSENTIMENTO_AUTOR_VERSAO = 1`.

## 9. Testes

**Banco (Vitest + PGlite):**
- o token do autor só alcança o próprio livro; token revogado não alcança nada;
- `autor_preparar_gravacao` recusa: sem consentimento, pergunta `para_enviar`, pergunta de outro livro, id de gravação de outro livro, livro fechado, acima de 30 por dia;
- repetir `autor_preparar_gravacao` com o mesmo id devolve a mesma linha;
- `porta_autor` sem privilégio em `causos`, `polls`, `poll_items`, `poll_votes`, `family_access`; toda função `autor_*` com dono `porta_autor`;
- `copiar_sugestao` preenche nome e áudio; o membro não consegue escrever essas colunas;
- membro não insere `origem = 'autor'`;
- reversão roda limpa num banco sem gravações do autor.

**Unidade:** fila de envio (estados, retomada, recuperação de `gravando`), escolha de tipo e extensão.

**Ponta a ponta (Playwright, Chromium com microfone falso):** gravar 5 s, pausar, retomar, enviar; recarregar no meio da gravação e ver o cartão de recuperação; modo offline do navegador durante o envio e retomada ao voltar.

**Roteiro manual de aceite** (entregue junto, para iPhone/Safari e Android/Chrome): gravar 10 min com modo avião ligado no meio; fechar a aba durante a gravação e reabrir; bloquear a tela; receber ligação; compartilhar 3 áudios do WhatsApp (Android).

## 10. Riscos

| Risco | Quanto | O que fazer |
| --- | --- | --- |
| **Storage de 1 GB acaba** antes do fim da ceia (~90 gravações de 30 min no total, somando todas as famílias) | Alto, na ceia | Contratar o plano Pro (US$ 25/mês, 100 GB) antes de 20/12. Decisão sua, fora do código |
| iPhone suspende o microfone com a tela apagada | Médio | Wake Lock + pausa e salva ao ocultar. O roteiro testa |
| O Safari apaga o IndexedDB depois de 7 dias sem uso | Baixo | Envio imediato; só perde se o aparelho ficar 7 dias offline |
| WebM gravado no Android não toca em iPhone antigo | Baixo | Cópia .m4a no prompt 6 |
| Link do autor vazado enche o storage | Baixo | Teto diário + *Trocar link* |
| Sessão longa e cara (T28) | Médio | Fases A → B → C, com commit por fase |
