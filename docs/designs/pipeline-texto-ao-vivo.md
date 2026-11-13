# Pipeline com texto ao vivo (prompt 6)

Status: **aprovado pelo Guilherme em 2026-11-11** (v2), revisado por 2 revisores (T28) · 2026-11-11 · PRD: M5, Pipeline de IA, M11 (marco da 1ª história), Modelo de dados · Decisões: P18, P25, P27, P36, T5, T8, T9, T10, T11, T17, T18, T28, T31, T32, T34

Relatórios: `pipeline-texto-ao-vivo/critic_report.md` (segurança e banco) e `pipeline-texto-ao-vivo/codebase_details_report.md` (código). A seção 12 mostra o que mudou por causa de cada um.

## 1. Problema, hipótese e o que está em jogo

Hoje o áudio chega e fica "aguardando processamento" para sempre. O laboratório (prompt 1) transforma áudio em texto, mas só no computador, e **ninguém rodou o lab com áudio real ainda**. Este prompt põe em produção uma qualidade de texto que ainda não foi medida.

- **Hipótese 1 (encantamento, P18):** ver o texto nascer em menos de 60 s faz a família confiar no produto e gravar a próxima história.
- **Hipótese 2 (qualidade, T31):** a família aceita o texto corrigindo no máximo 1 de cada 3 parágrafos, sem nenhuma invenção que passe sem "Confira".
- **O que este prompt mede:** a hipótese 1, pelo tempo até a primeira palavra e até "Pronta" (em `ai_usage`). A hipótese 2 só é medida quando o André corrigir as primeiras histórias. Por isso a comparação IA × corrigida (6.7) faz parte do escopo.
- **Critério de morte (PRD):** 1 escape de invenção que a família perceba, ou mais de 50% do texto reescrito em 3 histórias seguidas. Se acontecer, as telas param e a prioridade volta para regras e verificação.
- **Ordem recomendada:** a 1ª história real do André é corrigida e comparada antes de começar o prompt 7.

## 2. Escopo

**Entra:**
- Inngest (T34): SDK, rota `/api/inngest`, a função do pipeline e uma varredura a cada 15 min.
- Tabelas `stories`, `story_recordings`, `transcripts`, `story_versions`, `ai_usage`, `book_context` e `glossary_entries`; colunas de consentimento para a IA em `books`; política do canal privado do Realtime. RLS e testes em tudo.
- Pipeline para **gravações avulsas** de até 30 min: origem `autor`, `livre` ou `upload`, sem `lote_id`. Transcrição (Scribe), estruturação, edição com streaming, checagens, verificação, memória do livro e sugestão de nomes.
- Até 3 tentativas por passo; erro visível no admin, com *Tentar de novo*.
- Cartão da história com as etapas ao vivo e o texto sendo escrito.
- Tela de leitura da história (somente leitura, com os "Confira").
- Configurações do livro, com *Nomes do livro* e a confirmação do processamento com IA.
- E-mail quando ninguém viu a história ficar pronta. Marco da 1ª história (M11).
- Comparação IA × corrigida pelo `--comparar` do laboratório.

**Não entra (e por quê):**
- **Lotes, conversas e uploads de mais de 30 min** ficam como "aguardando divisão" até o prompt 7 (D2). Aprovado pelo Guilherme em 11/11.
- **Reprocessar o que já está no banco:** os 3 áudios de hoje são de teste (Guilherme, 11/11). Eles não são apagados; só não são processados (D3).
- Editor, versões manuais, trava de edição: prompt 8.
- Mudar o tamanho, revisar trecho, acrescentar áudio: prompt 9. A edição sai sempre no tamanho `medio`.
- O autor ver o próprio texto: prompt 10.
- Webhook do ElevenLabs (D1). `npm run eval` com padrão-ouro (substituído pela comparação com uso real, T31).
- ffmpeg: o original vai direto ao Scribe (T34). O lab normaliza para FLAC; a diferença é medida (6.7).

## 3. Decisões que preciso de você

| # | Decisão proposta | Por quê | O que se perde |
| --- | --- | --- | --- |
| D1 | **Transcrição síncrona** dentro de um passo do Inngest, sem o webhook de T34. O webhook volta se um passo de transcrição passar de 200 s (medido em `ai_usage.ms`). | Toda gravação processada aqui tem no máximo 30 min (o banco recusa as maiores, D2). O Scribe devolve 30 min bem antes dos 300 s do passo no Hobby. O webhook pede endpoint, segredo e configuração no ElevenLabs para um caso que só existe no prompt 7. | Num dia lento do Scribe, o passo estoura e a nova tentativa paga a transcrição de novo. |
| D2 | **Esperam o prompt 7:** lote, conversa (mesmo a de 1 parte só) e upload com mais de 30 min ou sem duração conhecida. | O servidor não sabe se uma conversa acabou na parte 1. Um upload de 50 MB pode ter horas e estouraria o passo. | Até o prompt 7, o modo conversa grava e guarda, mas não vira texto. O aceite usa o link do autor. |
| D3 | **Sem reprocessamento** do que já está no banco. | São áudios de teste. | Nada. |
| D4 | **E-mail só se a história não foi vista em 2 min.** O cartão "Pronta" na tela marca `stories.vista_em`; o job espera 2 min (pausa do Inngest, sem custo) e só manda se continuar vazio. O e-mail não leva título nem trecho: "Uma história do livro de {apelido} ficou pronta". | Atende M5 sem guardar presença. O título sai da fala e pode ser sensível ("a doença da mãe"). | Quem fecha a aba sem ver recebe o e-mail (comportamento certo). |
| D5 | **Canal privado do Realtime por livro** (`livro:{id}`), só membros, só Broadcast; o servidor publica, o navegador só ouve. O estado verdadeiro fica no banco. | Uma política só, sem `update` por token no banco. | Mensagem perdida pausa o texto até a próxima (cada uma leva o texto inteiro até ali). |
| D6 | **Comparação pelo laboratório:** `npm run lab -- --baixar <historia>` grava a versão da IA em `lab/saidas/`, e o `--comparar` existente faz o resto. | O editor só chega no prompt 8; o André pode corrigir num Google Docs já. | Passo manual até o prompt 8. |
| D7 | **Hobby da Vercel na onda 1; Pro antes do 1º cliente pagante.** | O Hobby (gratuito) cobre os 300 s por passo, mas os termos da Vercel o restringem a uso não comercial. | US$ 20/mês a partir da 1ª venda. |
| D8 | **Contexto do livro = glossário aceito + resumo das histórias prontas.** O resumo e os nomes saem de uma chamada nova ao modelo rápido, depois do "pronta". `editar.md` não muda. | A qualidade de edição ainda não foi medida; mexer no prompt agora estragaria a comparação com o lab. | O bloco de contexto muda a cada história nova, então o cache só vale dentro da mesma história. |
| D9 | **Confirmação do responsável antes da 1ª história:** uma tela única em Configurações ("{Apelido} sabe que as gravações vão ser transcritas e escritas com ajuda de inteligência artificial, por serviços fora do Brasil (ElevenLabs e Anthropic)?" → *Sim, pode processar*). Sem ela, a gravação fica "aguardando sua confirmação". O texto do consentimento do autor sobe para a versão 2 e passa a citar a IA. | Hoje o autor só autorizou "guardar a voz", e o responsável não aceitou nada. Processar a voz de um idoso fora do Brasil sem registro contraria "consentimento desde o dia 1" (PRD) e a LGPD. | Um toque a mais, uma vez por livro. |
| D10 | **Teto de 240 min de áudio processado por livro em 24 h** (`MAX_MINUTOS_IA_DIA`). Acima disso, a gravação espera o dia seguinte e aparece no admin. | O upload do responsável não tem limite de quantidade. Sem teto, um erro ou um abuso gera custo sem limite. | Uma família muito ativa espera um dia (a ceia é prompt 7, com outro fluxo). |

## 4. Fatos que moldam o desenho

- **Inngest na Vercel:** cada `step.run` é uma chamada separada à rota `/api/inngest`, com o teto de duração da função (Hobby: 300 s). O resultado de um passo fica guardado **nos servidores do Inngest**, fora do Brasil. Por isso nenhum passo devolve texto: só ids, contagens e códigos (6.3).
- **Assinatura:** o SDK confere toda chamada com `INNGEST_SIGNING_KEY`, já configurada em Production e Preview. Com `INNGEST_DEV` definido, ele aceita chamada sem assinatura; a inicialização falha se isso acontecer com `VERCEL_ENV` em `production` ou `preview`.
- **Áudio:** até 50 MB (T27). O passo baixa com `clienteAdmin().storage.from("audios").download()` na Vercel (São Paulo) e manda o original ao Scribe. `minutos` = `duracao_s / 60`. O áudio só sai do Brasil para o ElevenLabs.
- **Prompts em arquivo:** `leitorDeDiretorio(join(process.cwd(), "lib/ai/prompts"))`. O tracing da Vercel não enxerga leitura dinâmica: `outputFileTracingIncludes: { "/api/inngest": ["./lib/ai/prompts/**/*"] }`.
- **Next 16 com `cacheComponents`:** a rota exporta só `maxDuration = 300` (sem `runtime` nem `dynamic`). O `proxy.ts` deixa `/api/inngest` de fora (hoje ele rodaria o Supabase SSR em cada passo). No deploy de prévia, conferir que o `GET /api/inngest` responde em tempo de requisição, e não pré-renderizado.
- **Streaming:** `ClienteAnthropic.gerar` já faz streaming, mas para de acumular depois da 1ª palavra. Ele passa a acumular sempre e chama `aoTexto(acumulado, tentativa)` no máximo a cada 400 ms. Um `extrairTextoParcial(json)` novo tira título e parágrafos do JSON incompleto. As promessas de broadcast são aguardadas antes do passo terminar.
- **Custo de toda tentativa:** `ErroIA` passa a levar o `uso` gasto. Cada chamada grava uma linha em `ai_usage` (com `ok` verdadeiro ou falso), num `finally`.
- **Custo estimado:** ~US$ 0,15 por história de 6 min; ~R$ 21 por livro de 25 histórias, dentro dos R$ 30, sem trocas de tamanho.
- **Dicas de primeira vez:** `DicaPrimeiraVez` (`components/ui/dica.tsx`), no `localStorage` com prefixo `ecoa-dica-`. O marco da 1ª história usa a mesma ideia num componente próprio.

## 5. Banco de dados

Migration `supabase/migrations/20261115120000_pipeline.sql` e reversão `supabase/reversao/20261115120000_pipeline.down.sql`. **Os dois foram rodados no PGlite com todas as migrations atuais**: subida, 30 cenários de comportamento (abaixo) e descida → subida → descida.

Regras:
- Quem cria e move a história é o pipeline, por funções `servico_*` com guarda de estado. `pronta` só por `servico_concluir_historia`, e nada sai de `pronta`.
- Nenhum `book_id` vem de fora: as funções derivam o livro da gravação ou da história, e as FKs compostas `(book_id, id)` recusam mistura de livros, inclusive em `ai_usage`.
- `transcripts` e `story_versions` aceitam só inserção. Nenhum papel altera, apaga ou trunca, nem a chave secreta. Exceção: `criado_por` vira null quando o usuário é apagado (LGPD).
- `porta_autor` não recebe nenhum grant novo. Quem está logado não lê `ai_usage`, `book_context`, `stories.rascunho` nem `stories.erro`.

### 5.1 SQL de subida

```sql
-- 20261115120000_pipeline.sql
-- Prompt 6: histórias, transcrições, versões, custo, memória do livro, glossário e
-- consentimento para a IA. stories e story_recordings saíram do prompt 5 (P36).
--
-- Regras deste arquivo:
-- * Quem cria e move a história é o pipeline, por funções servico_* com guarda de estado.
-- * Nenhum texto do áudio passa pelo Inngest: o rascunho fica em stories.rascunho (só servidor).
-- * Transcrição e versões são só insert. Nem a chave secreta altera, apaga ou trunca.
-- * porta_autor não recebe nenhum grant novo.

create type public.story_estado as enum ('ouvindo', 'escrevendo', 'pronta', 'falhou');
create type public.versao_origem as enum ('ia', 'responsavel', 'cofacilitador', 'autor');
create type public.glossario_tipo as enum ('pessoa', 'lugar');
create type public.glossario_estado as enum ('sugerido', 'aceito', 'recusado');

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.max_historia_s() returns integer
language sql immutable set search_path = '' as $$ select 1800 $$;           -- MAX_HISTORIA_MIN = 30
create function privado.max_minutos_ia_por_dia() returns integer
language sql immutable set search_path = '' as $$ select 240 $$;            -- MAX_MINUTOS_IA_DIA
create function privado.max_nomes_glossario() returns integer
language sql immutable set search_path = '' as $$ select 300 $$;            -- MAX_NOMES_GLOSSARIO
create function privado.max_nomes_por_historia() returns integer
language sql immutable set search_path = '' as $$ select 10 $$;             -- MAX_NOMES_POR_HISTORIA
create function privado.consentimento_ia_versao() returns smallint
language sql immutable set search_path = '' as $$ select 1::smallint $$;    -- CONSENTIMENTO_IA_VERSAO

-- ── 1. Consentimento do responsável para o processamento com IA (D9) ───────
alter table public.books
  add column ia_consentimento_em timestamptz,
  add column ia_consentimento_por uuid references auth.users (id) on delete set null,
  add column ia_consentimento_versao smallint check (ia_consentimento_versao between 1 and 99),
  add constraint books_ia_consentimento check ((ia_consentimento_em is null) = (ia_consentimento_versao is null));

create function public.consentir_processamento_ia(p_book uuid, p_versao smallint) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_versao is distinct from privado.consentimento_ia_versao() then return false; end if;
  if not exists (select 1 from public.book_members m where m.book_id = p_book
                   and m.user_id = (select auth.uid()) and m.papel = 'responsavel')
     or not privado.livro_editavel(p_book) then
    raise exception 'sem_permissao';
  end if;
  update public.books set ia_consentimento_em = now(), ia_consentimento_por = (select auth.uid()),
    ia_consentimento_versao = p_versao
  where id = p_book;
  return true;
end $$;

-- ── 2. stories ─────────────────────────────────────────────────────────────
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  prompt_id uuid,
  titulo text check (titulo is null or char_length(btrim(titulo)) between 1 and 200),
  estado public.story_estado not null default 'ouvindo',
  estrutura jsonb check (estrutura is null or jsonb_typeof(estrutura) = 'object'), -- base original (T11)
  rascunho jsonb check (rascunho is null or jsonb_typeof(rascunho) = 'object'),    -- edição entre passos; só servidor
  erro_etapa text check (erro_etapa is null or erro_etapa ~ '^[a-z_]{2,30}$'),     -- só admin
  erro text check (erro is null or erro ~ '^[a-z_]{2,40}$'),                       -- código fixo, nunca texto do áudio
  vista_em timestamptz,
  pronta_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (book_id, id),
  foreign key (book_id, prompt_id) references public.prompts (book_id, id) on delete set null (prompt_id),
  constraint stories_pronta check ((estado = 'pronta') = (pronta_em is not null)),
  constraint stories_vista_so_pronta check (vista_em is null or pronta_em is not null),
  constraint stories_erro_so_falhou check ((estado = 'falhou') = (erro_etapa is not null))
);
create index stories_livro_data on public.stories (book_id, criado_em desc);
create index stories_em_andamento on public.stories (atualizado_em) where estado in ('ouvindo', 'escrevendo');
create trigger stories_atualizado_em before update on public.stories
  for each row execute function privado.tocar_atualizado_em();

-- ── 3. story_recordings ────────────────────────────────────────────────────
-- Ids de segmento contínuos por história: a gravação de ordem N começa em segmento_inicial.
-- Uma gravação pode, a partir do prompt 7, alimentar mais de uma história.
create table public.story_recordings (
  story_id uuid not null,
  recording_id uuid not null,
  book_id uuid not null,
  ordem smallint not null check (ordem between 1 and 100),
  segmento_inicial integer not null default 1 check (segmento_inicial >= 1),
  primary key (story_id, recording_id),
  unique (story_id, ordem),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict,
  foreign key (book_id, recording_id) references public.recordings (book_id, id) on delete restrict
);
create index story_recordings_gravacao on public.story_recordings (recording_id);

-- ── 4. transcripts (só insert) ─────────────────────────────────────────────
create table public.transcripts (
  recording_id uuid primary key,
  book_id uuid not null,
  provedor text not null check (provedor ~ '^[a-z0-9_-]{2,30}$'),
  modelo text not null check (char_length(modelo) between 1 and 60),
  segmentos jsonb not null check (jsonb_typeof(segmentos) = 'array'), -- Segmento[] de lib/ai/schemas.ts
  palavras jsonb not null check (jsonb_typeof(palavras) = 'array'),   -- Palavra[]
  minutos numeric(7, 2) not null check (minutos >= 0),
  criado_em timestamptz not null default now(),
  foreign key (book_id, recording_id) references public.recordings (book_id, id) on delete restrict
);
create index transcripts_livro on public.transcripts (book_id);

-- ── 5. story_versions (só insert; a versão da IA nunca muda, T31) ──────────
create table public.story_versions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null,
  book_id uuid not null,
  numero integer not null check (numero >= 1),
  origem public.versao_origem not null,
  tamanho text not null check (tamanho in ('resumido', 'medio', 'detalhado')),
  conteudo jsonb not null check (jsonb_typeof(conteudo) = 'object'), -- {titulo, paragrafos: [{texto, fontes}], lacunas}
  marcacoes jsonb not null default '[]'::jsonb check (jsonb_typeof(marcacoes) = 'array'),
  modelos jsonb check (modelos is null or jsonb_typeof(modelos) = 'object'),           -- {transcricao, rapido, capaz}
  hash_prompts jsonb check (hash_prompts is null or jsonb_typeof(hash_prompts) = 'object'), -- nome → hash
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (story_id, numero),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict,
  constraint versao_ia_sem_pessoa check (origem <> 'ia' or criado_por is null)
);

-- A única mudança aceita: criado_por virar null quando o usuário é apagado (LGPD).
create function privado.versao_imutavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.criado_por is null
     and (to_jsonb(new) - 'criado_por') = (to_jsonb(old) - 'criado_por') then
    return new;
  end if;
  raise exception 'versao_imutavel';
end $$;
create function privado.so_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'versao_imutavel';
end $$;
create trigger story_versions_imutavel before update or delete on public.story_versions
  for each row execute function privado.versao_imutavel();
create trigger story_versions_sem_truncate before truncate on public.story_versions
  for each statement execute function privado.so_insert();
create trigger transcripts_imutavel before update or delete on public.transcripts
  for each row execute function privado.so_insert();
create trigger transcripts_sem_truncate before truncate on public.transcripts
  for each statement execute function privado.so_insert();

-- ── 6. ai_usage (só o admin, pela chave secreta) ───────────────────────────
create table public.ai_usage (
  id bigint generated always as identity primary key,
  book_id uuid not null references public.books (id) on delete restrict,
  story_id uuid,
  recording_id uuid,
  etapa text not null check (etapa ~ '^[a-z_]{2,30}$'),
  provedor text not null check (provedor ~ '^[a-z0-9_-]{2,30}$'),
  modelo text not null check (char_length(modelo) between 1 and 60),
  tentativa smallint not null default 1 check (tentativa between 1 and 20),
  ok boolean not null,
  tokens_entrada integer not null default 0 check (tokens_entrada >= 0),
  tokens_saida integer not null default 0 check (tokens_saida >= 0),
  tokens_cache_lido integer not null default 0 check (tokens_cache_lido >= 0),
  tokens_cache_gravado integer not null default 0 check (tokens_cache_gravado >= 0),
  minutos_audio numeric(7, 2) check (minutos_audio is null or minutos_audio >= 0),
  custo_usd numeric(10, 6) not null check (custo_usd >= 0),
  ms integer check (ms is null or ms >= 0),
  ms_primeira_palavra integer check (ms_primeira_palavra is null or ms_primeira_palavra >= 0),
  id_requisicao text check (id_requisicao is null or char_length(id_requisicao) <= 120),
  criado_em timestamptz not null default now(),
  constraint ai_usage_tem_origem check (story_id is not null or recording_id is not null),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict,
  foreign key (book_id, recording_id) references public.recordings (book_id, id) on delete restrict
);
create index ai_usage_livro_data on public.ai_usage (book_id, criado_em desc);

-- ── 7. book_context (memória do livro; só o pipeline) ───────────────────────
create table public.book_context (
  story_id uuid primary key,
  book_id uuid not null,
  resumo text not null check (char_length(btrim(resumo)) between 1 and 600),
  temas text[] not null default '{}' check (cardinality(temas) <= 8),
  atualizado_em timestamptz not null default now(),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict
);
create index book_context_livro on public.book_context (book_id);

-- ── 8. glossary_entries ────────────────────────────────────────────────────
create function privado.apelidos_validos(p text[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(p) <= 10
     and not exists (select 1 from unnest(p) a where a is null or char_length(btrim(a)) not between 1 and 80)
$$;

create table public.glossary_entries (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  tipo public.glossario_tipo not null,
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  chave text generated always as (lower(btrim(nome))) stored,
  apelidos text[] not null default '{}' check (privado.apelidos_validos(apelidos)),
  observacao text check (observacao is null or char_length(observacao) <= 200),
  estado public.glossario_estado not null default 'sugerido',
  origem_story_id uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (book_id, tipo, chave),
  foreign key (book_id, origem_story_id) references public.stories (book_id, id)
    on delete set null (origem_story_id)
);
create trigger glossary_entries_atualizado_em before update on public.glossary_entries
  for each row execute function privado.tocar_atualizado_em();

-- Recusados não contam. O lock evita estourar a cota com inserts paralelos.
create function privado.cota_do_glossario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('glossario:' || new.book_id::text, 0));
  if (select count(*) from public.glossary_entries
      where book_id = new.book_id and estado in ('sugerido', 'aceito')) >= privado.max_nomes_glossario() then
    raise exception 'glossario_cheio';
  end if;
  return new;
end $$;
create trigger glossary_entries_cota before insert on public.glossary_entries
  for each row execute function privado.cota_do_glossario();

-- ── 9. RLS e privilégios ───────────────────────────────────────────────────
alter table public.stories enable row level security;
alter table public.story_recordings enable row level security;
alter table public.transcripts enable row level security;
alter table public.story_versions enable row level security;
alter table public.ai_usage enable row level security;
alter table public.book_context enable row level security;
alter table public.glossary_entries enable row level security;

revoke all on public.stories, public.story_recordings, public.transcripts, public.story_versions,
  public.ai_usage, public.book_context, public.glossary_entries
  from public, anon, authenticated, porta_autor, service_role;
grant all on public.stories, public.story_recordings, public.ai_usage, public.book_context,
  public.glossary_entries to service_role;
grant select, insert on public.transcripts, public.story_versions to service_role; -- sem update, delete nem truncate

-- Membro lê as histórias do livro, sem o rascunho e sem o erro técnico.
grant select (id, book_id, prompt_id, titulo, estado, vista_em, pronta_em, criado_em, atualizado_em)
  on public.stories to authenticated;
create policy "membro lê" on public.stories for select to authenticated
  using (privado.eh_membro(book_id));

grant select on public.story_recordings, public.transcripts, public.story_versions to authenticated;
create policy "membro lê" on public.story_recordings for select to authenticated
  using (privado.eh_membro(book_id));
create policy "membro lê" on public.transcripts for select to authenticated
  using (privado.eh_membro(book_id));
create policy "membro lê" on public.story_versions for select to authenticated
  using (privado.eh_membro(book_id));
-- ai_usage e book_context: nenhum grant para quem está logado. RLS ligada e sem política.

-- Glossário: membro lê, acrescenta (já aceito) e ajusta com o plano ativo. Não apaga: recusa.
grant select (id, book_id, tipo, nome, apelidos, observacao, estado, origem_story_id, criado_em, atualizado_em),
  insert (book_id, tipo, nome, apelidos, observacao, estado),
  update (nome, apelidos, observacao, estado)
  on public.glossary_entries to authenticated;
create policy "membro lê" on public.glossary_entries for select to authenticated
  using (privado.eh_membro(book_id));
create policy "membro acrescenta" on public.glossary_entries for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id) and estado = 'aceito');
create policy "membro ajusta" on public.glossary_entries for update to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id))
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
grant execute on function privado.apelidos_validos(text[]) to authenticated, service_role;

-- ── 10. Funções do pipeline (só o servidor) ────────────────────────────────
-- Cria (ou devolve) a história de uma gravação avulsa. Nunca recebe book_id de fora.
-- historia null = não processar agora; motivo diz por quê (aparece no admin e no cartão).
create function public.servico_iniciar_historia(p_recording uuid)
returns table (historia uuid, estado public.story_estado, motivo text)
language plpgsql security definer set search_path = '' as $$
declare v public.recordings; v_story uuid; v_estado public.story_estado; v_min numeric;
begin
  select * into v from public.recordings r where r.id = p_recording for update;
  if not found or v.upload <> 'recebido' then
    return query select null::uuid, null::public.story_estado, 'nao_recebido'; return;
  end if;
  select sr.story_id, s.estado into v_story, v_estado
    from public.story_recordings sr join public.stories s on s.id = sr.story_id
    where sr.recording_id = p_recording order by sr.ordem limit 1;
  if found then  -- já existe: quem chamou decide (pronta/falhou = parar; em andamento = seguir)
    return query select v_story, v_estado, null::text; return;
  end if;
  if v.lote_id is not null or v.origem not in ('autor', 'livre', 'upload') then
    return query select null::uuid, null::public.story_estado, 'divisao'; return;
  end if;
  if v.duracao_s is null then
    return query select null::uuid, null::public.story_estado, 'sem_duracao'; return;
  end if;
  if v.duracao_s > privado.max_historia_s() then
    return query select null::uuid, null::public.story_estado, 'longa'; return;
  end if;
  if not privado.livro_editavel(v.book_id) then
    return query select null::uuid, null::public.story_estado, 'livro_fechado'; return;
  end if;
  if not exists (select 1 from public.books b where b.id = v.book_id
                   and b.ia_consentimento_versao >= privado.consentimento_ia_versao()) then
    return query select null::uuid, null::public.story_estado, 'sem_consentimento'; return;
  end if;
  select coalesce(sum(u.minutos_audio), 0) into v_min from public.ai_usage u
    where u.book_id = v.book_id and u.etapa = 'transcrever' and u.criado_em > now() - interval '24 hours';
  if v_min + v.duracao_s / 60.0 > privado.max_minutos_ia_por_dia() then
    return query select null::uuid, null::public.story_estado, 'cota_diaria'; return;
  end if;
  insert into public.stories (book_id, prompt_id) values (v.book_id, v.prompt_id) returning id into v_story;
  insert into public.story_recordings (story_id, recording_id, book_id, ordem)
    values (v_story, p_recording, v.book_id, 1);
  return query select v_story, 'ouvindo'::public.story_estado, null::text;
end $$;

-- Transições permitidas: ouvindo → escrevendo; ouvindo|escrevendo → falhou; falhou → ouvindo.
-- Devolve false se a história não estava num estado de origem válido (nada muda).
create function public.servico_mudar_etapa(p_story uuid, p_para public.story_estado, p_erro_etapa text default null, p_erro text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_para = 'escrevendo' then
    update public.stories set estado = 'escrevendo' where id = p_story and estado = 'ouvindo';
  elsif p_para = 'falhou' then
    update public.stories set estado = 'falhou', erro_etapa = coalesce(p_erro_etapa, 'desconhecida'),
      erro = coalesce(p_erro, 'erro_inesperado'), rascunho = null
    where id = p_story and estado in ('ouvindo', 'escrevendo');
  elsif p_para = 'ouvindo' then
    update public.stories set estado = 'ouvindo', erro_etapa = null, erro = null
    where id = p_story and estado = 'falhou';
  else
    return false;  -- pronta só por servico_concluir_historia
  end if;
  return found;
end $$;

-- Grava a versão 1 (IA) a partir do rascunho guardado no banco e marca tudo como pronto.
create function public.servico_concluir_historia(p_story uuid, p_tamanho text, p_modelos jsonb, p_hash jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.stories; v_titulo text;
begin
  select * into v from public.stories s where s.id = p_story for update;
  if not found then return false; end if;
  if v.estado = 'pronta' then return true; end if;
  if v.estado <> 'escrevendo' or v.rascunho is null or v.rascunho -> 'edicao' is null then return false; end if;
  v_titulo := nullif(left(btrim(coalesce(v.rascunho -> 'edicao' ->> 'titulo', '')), 200), '');
  insert into public.story_versions (story_id, book_id, numero, origem, tamanho, conteudo, marcacoes, modelos, hash_prompts)
    values (p_story, v.book_id, 1, 'ia', p_tamanho, v.rascunho -> 'edicao',
            coalesce(v.rascunho -> 'marcacoes', '[]'::jsonb), p_modelos, p_hash)
    on conflict (story_id, numero) do nothing;
  update public.stories
    set estado = 'pronta', titulo = v_titulo, pronta_em = now(), rascunho = null
    where id = p_story;
  update public.recordings r set processado_em = now()
    from public.story_recordings sr
    where sr.story_id = p_story and r.id = sr.recording_id and r.processado_em is null;
  return true;
end $$;

-- Sugestões de nomes: no máximo 10 por história, saneadas, sem lançar erro (descarta o excesso).
create function public.servico_sugerir_nomes(p_story uuid, p_nomes jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_livro uuid; v_item jsonb; v_nome text; v_tipo text; v_n integer := 0;
begin
  select s.book_id into v_livro from public.stories s where s.id = p_story;
  if v_livro is null or jsonb_typeof(p_nomes) <> 'array' then return 0; end if;
  for v_item in select value from jsonb_array_elements(p_nomes) limit privado.max_nomes_por_historia() loop
    v_nome := left(btrim(coalesce(v_item ->> 'nome', '')), 80);
    v_tipo := v_item ->> 'tipo';
    continue when v_nome = '' or v_tipo not in ('pessoa', 'lugar');
    begin
      insert into public.glossary_entries (book_id, tipo, nome, origem_story_id)
        values (v_livro, v_tipo::public.glossario_tipo, v_nome, p_story)
        on conflict (book_id, tipo, chave) do nothing;
      if found then v_n := v_n + 1; end if;
    exception when raise_exception then
      exit;  -- glossario_cheio: para sem derrubar o passo
    end;
  end loop;
  return v_n;
end $$;

-- O navegador marca que alguém viu a história pronta (decide o e-mail, D4).
create function public.marcar_historia_vista(p_story uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.stories s set vista_em = now()
  where s.id = p_story and s.estado = 'pronta' and s.vista_em is null
    and privado.eh_membro(s.book_id);
end $$;

revoke all on function public.servico_iniciar_historia(uuid),
  public.servico_mudar_etapa(uuid, public.story_estado, text, text),
  public.servico_concluir_historia(uuid, text, jsonb, jsonb),
  public.servico_sugerir_nomes(uuid, jsonb),
  public.marcar_historia_vista(uuid),
  public.consentir_processamento_ia(uuid, smallint)
  from public, anon, authenticated, porta_autor;
grant execute on function public.servico_iniciar_historia(uuid),
  public.servico_mudar_etapa(uuid, public.story_estado, text, text),
  public.servico_concluir_historia(uuid, text, jsonb, jsonb),
  public.servico_sugerir_nomes(uuid, jsonb) to service_role;
grant execute on function public.marcar_historia_vista(uuid),
  public.consentir_processamento_ia(uuid, smallint) to authenticated;

-- ── 11. Realtime: canal privado livro:{id}, só leitura e só para membros ───
-- Sem política de insert: só o servidor (chave secreta) publica. O case garante que o
-- cast para uuid só acontece com o tópico já validado (nega sem erro).
create policy "membro ouve o canal do livro" on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and case
      when (select realtime.topic()) ~ '^livro:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then privado.eh_membro(substring((select realtime.topic()) from 7)::uuid)
      else false
    end
  );
```

A gravação da transcrição (`insert ... on conflict (recording_id) do nothing`), o rascunho (`update stories set rascunho = ... where id = $1 and estado = 'escrevendo'`), o custo e a memória (`insert ... on conflict (story_id) do update`, com textos já truncados no código) são escritas diretas com a chave secreta, protegidas pelas FKs compostas e pelos CHECKs.

### 5.2 SQL de reversão

```sql
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
```

**A reversão trava** se houver alguma versão gravada. Antes, é preciso exportar `story_versions` e rodar `set ecoa.reversao_destrutiva = 'sim'` na mesma sessão. Os áudios originais nunca são tocados.

### 5.3 Cenários já rodados no PGlite

Sem consentimento → `sem_consentimento`; consentimento com versão errada → `false`; upload de 50 min → `longa`; iniciar 2 vezes → a mesma história; `pronta` direto → recusado; concluir antes de escrever → `false`; membro lendo `rascunho` → negado; título só com espaços → `null` (sem quebrar); iniciar depois de pronta → devolve `pronta` (o job para); falhar depois de pronta → `false`; 4 nomes sugeridos (1 válido, 1 duplicado, 1 vazio, 1 tipo inválido) → 1 gravado; `update`/`truncate` da versão pela chave secreta → negado; `update`/`delete`/`truncate` pelo dono → `versao_imutavel`; apagar usuário com versão humana → `criado_por` vira null, sem erro; tópico `livro:zzz` → nega sem erro; `porta_autor` lendo `stories` → negado; reversão com versões → trava; reversão forçada, subida e descida de novo → ok.

## 6. Pipeline

### 6.1 Disparo

- Depois de `servico_confirmar_audio` (upload) e de `servico_confirmar_gravacao_autor` (link do autor), a ação envia o evento `ecoa/gravacao.recebida` com `{ recordingId }` e `id: recordingId`, **dentro de `after()`**, com try/catch e log sem dados. O upload nunca fica lento nem falha por causa do Inngest.
- Só envia para `origem in ('autor', 'livre', 'upload')` sem `lote_id`. O banco confere de novo.
- As duas ações também reenviam no ramo "já recebido" quando `processado_em` é null (o id do evento evita duplicata no Inngest).
- **Varredura** (função agendada do Inngest, a cada 15 min): reenvia gravações recebidas há mais de 5 min, sem história e com `processado_em` null; marca como `falhou` (`erro = 'parada'`) histórias em `ouvindo` ou `escrevendo` há mais de 20 min. Nada fica preso em "Ouvindo…".

### 6.2 Função `processar-gravacao`

`event.data` é validado com zod (`recordingId: uuid`). `retries: 2` (3 tentativas por passo), `concurrency: { limit: 1, key: "event.data.recordingId" }`.

| Passo | O que faz | Escreve | Canal |
| --- | --- | --- | --- |
| `iniciar` | `servico_iniciar_historia`. Sem história (motivo), ou com história `pronta`/`falhou`: termina sem gastar nada | `stories`, `story_recordings` | `ouvindo` |
| `transcrever` | se já houver `transcripts`, reaproveita; senão baixa, manda ao Scribe com os nomes aceitos como dica e roda `segmentar(recording_id, palavras, segmento_inicial)` | `transcripts`, `ai_usage` | — |
| `estruturar` | modelo rápido | `stories.estrutura`, `ai_usage` | — |
| `editar` | `servico_mudar_etapa(escrevendo)` → edição em streaming no tamanho `medio` → grava `{edicao}` em `stories.rascunho` | `stories.rascunho`, `ai_usage` | `escrevendo`, depois `texto` a cada 400 ms (`recomecar` se o cliente tentar de novo) |
| `verificar` | lê o rascunho; checagens locais + verificador independente (T10) → grava `{edicao, marcacoes}` | `stories.rascunho`, `ai_usage` | — |
| `concluir` | `servico_concluir_historia` (lê o rascunho do banco, grava a v1 e limpa o rascunho) | `story_versions`, `stories`, `recordings.processado_em` | `revisar` |
| `memoria` | modelo rápido: resumo (até 3 frases), temas e nomes → `book_context` e `servico_sugerir_nomes`. **Nunca lança:** captura o erro e registra `memoria_falhou` em `events` | `book_context`, `glossary_entries`, `ai_usage` | — |
| `esperar` | `step.sleep("2m")` | — | — |
| `avisar` | se `vista_em` estiver vazio: e-mail ao responsável, com `idempotencyKey: historia_pronta:{id}` no Resend. Registra `historia_pronta`. **Nunca lança** | `events` | — |

- **Erros:** todo passo captura o erro e lança `ErroPipeline(etapa, codigo)` com código fixo (`scribe_falhou`, `ia_recusou`, `json_invalido`, `transcricao_vazia`…). Nunca repassa `e.message` de zod, JSON ou SDK, porque essas mensagens podem conter trechos da fala e iriam para o Inngest e para os logs. Nenhum `console.log` imprime texto.
- **`onFailure`:** `servico_mudar_etapa(falhou, etapa, codigo)`, que só muda `ouvindo`/`escrevendo`. Uma falha depois do "pronta" não muda nada. Publica `falhou` no canal.
- **Livro que venceu no meio:** o que já começou termina. Só uma história nova não começa (`livro_fechado`).
- **Admin:** *Tentar de novo* confere o papel admin no servidor, chama `servico_mudar_etapa(ouvindo)` (só sai de `falhou`) e, só se der `true`, reenvia o evento com id novo. A transcrição já paga é reaproveitada. Registra `events` com papel `admin`.

### 6.3 Código reaproveitado e o que muda

- **Sem mudança de comportamento:** `estruturar`, `editar`, `checar`, `verificar`, `segmentar`, `custo.ts`, `transcricao/*` e os prompts de edição e verificação.
- `contextoDoLivro(ler, g, historias = "(nenhuma ainda)")` e `editar(..., { historias })`: parâmetro opcional. `contexto-livro.md` ganha `{{historias}}`, então o lab continua igual. O hash de `contexto-livro` muda uma vez; isso fica registrado.
- `transcripts.segmentos` guarda `Segmento[]` exatamente como `segmentar` devolve (`arquivo` = id da gravação; `falante` = `"arquivo:falante"`).
- `story_versions.conteudo` = `Edicao` inteira (`titulo`, `paragrafos[{texto, fontes}]`, `lacunas`). `travado` chega no prompt 8. `modelos` = `{transcricao, rapido, capaz}`; `hash_prompts` = o `Record` de `hashPrompts()`.
- `claude.ts`: `aoTexto(acumulado, tentativa)`, `ErroIA.uso` e `Etapa` com `memoria` (e `scripts/lab/fakes.ts` com o ramo `memoria`).
- Novo `lib/ai/prompts/memoria.md` e `memoria-entrada.md`, schema `Memoria` (`resumo`, `temas`, `nomes[{nome, tipo}]`).
- `Glossario` da plataforma montado de `books` (nome e apelido do autor) e de `glossary_entries` aceitos; `sobre` vazio (P13).

### 6.4 Tempo real (D5)

- **Servidor:** `POST {SUPABASE_URL}/realtime/v1/api/broadcast` com a chave secreta e `private: true`, tópico `livro:{book_id}`. Mensagens: `{tipo:"etapa", historia, etapa}` e `{tipo:"texto", historia, tentativa, titulo, paragrafos: string[]}`, sempre com o texto inteiro até ali.
- **Navegador:** `supabase.channel("livro:{id}", { config: { private: true } })` depois de `realtime.setAuth()`. Ao assinar, relê do banco as histórias em andamento.
- **Mapa único de estados** (em `lib/historias/etapas.ts`, com teste): `ouvindo → ouvindo`, `escrevendo → escrevendo`, `pronta → revisar`, `falhou → falhou`. "Enviando" só existe no navegador, durante o upload. O canal usa os ids do cartão.
- O link do autor e o da família nunca assinam nada.
- **A verificar no deploy de prévia (gate):** (a) com *Allow public access* desligado, um cliente anônimo e um membro de outro livro tentam ouvir `livro:{A}` (público e privado) e não recebem nada; (b) depois de um broadcast pela API, `realtime.messages` não guarda o texto. Se guardar, o canal passa a levar só a etapa, e o texto parcial deixa de ser transmitido até haver outra solução. Isso muda o aceite e volta para você.

### 6.5 E-mail e marco da 1ª história

- **E-mail (D4):** `historiaPronta()` em `lib/email/modelos.ts`, com a `moldura()`. Assunto: "Uma história do livro de {apelido} ficou pronta"; botão *Ler a história* (`urlDoApp()`). O e-mail do responsável é resolvido via `book_members` + `auth.admin.getUserById`, como em `app/admin/acoes.ts`. `enviarEmail` ganha a opção `idempotencyKey`.
- **Marco (M11):** quando a 1ª história do livro chega a "Pronta para revisar" na tela, ou quando o responsável abre a home com 1 história pronta e o marco ainda não foi visto naquele aparelho: "A primeira história do livro está pronta." + *Contar no grupo*. O botão abre o WhatsApp com `mensagemPrimeiraHistoria()` (nova, em `lib/whatsapp.ts`) e o link da família.

### 6.6 Consentimento (D9)

- `CONSENTIMENTO_IA_VERSAO = 1` e `CONSENTIMENTO_AUTOR_VERSAO = 2` em `lib/config.ts`. Texto do autor v2: "Suas histórias vão virar um livro para a sua família. Podemos guardar a sua voz e escrever o texto com ajuda de inteligência artificial?"
- Configurações mostra a confirmação do responsável até ela ser feita. Áudios recebidos e o cartão mostram "Aguardando sua confirmação", com o link.
- Na hora do aceite, as gravações que estavam esperando só por isso são enviadas ao pipeline.

### 6.7 Comparação IA × corrigida (D6, T31)

- `npm run lab -- --baixar <historia_id>`: `scripts/lab/baixar.ts` cria o cliente com `createClient` direto (os módulos com `server-only` não rodam no lab), lê a história e a transcrição e monta o `SaidaIA` do lab, reaproveitando `renderizarIaMd` e `gravarSaidas`. A opção entra em `opcoes.ts`.
- O André corrige o `ia.md` num Google Docs; o Guilherme salva como `editado.md` e roda `npm run lab -- --comparar <historia>`.
- Para saber se a qualidade de produção (áudio original) é a mesma do lab (FLAC): rodar o mesmo áudio no lab e comparar os dois textos uma vez.

## 7. Configuração (Guilherme)

| # | Ação | Onde | Quando |
| --- | --- | --- | --- |
| 1 | ~~`ELEVENLABS_API_KEY`, `INNGEST_EVENT_KEY` em Production e Preview~~ (`ANTHROPIC_API_KEY` e `INNGEST_SIGNING_KEY` já estavam) | Vercel | Feito em 11/11 |
| 2 | Desligar *Allow public access* do Realtime | Supabase → Realtime → Settings | **Gate do deploy** |
| 3 | Ver o que o plano do ElevenLabs oferece de retenção zero ou apagamento e de não uso para treino. Ligar o que existir. Se não houver, registrar como risco aceito | Painel do ElevenLabs | Antes do 1º áudio real |
| 4 | Se a prévia não sincronizar com o Inngest por causa da proteção de deploy: bypass só em Preview, com rotação | Vercel + Inngest | Só se precisar |
| 5 | Conferir o preço do Scribe e virar `PRECOS_TRANSCRICAO_CONFIRMADOS` | lib/config.ts | Antes de ler o custo no admin |

## 8. Telas

Celular primeiro; uma ação principal por tela; texto do livro em `font-livro`.

- **Home do livro:** história em andamento em destaque, acima da lista de passos, com etapas e texto ao vivo. Prontas como cartões simples; *Ver todas*.
- **Histórias (`/livro/[id]/historias`):** cartões, os mais recentes no alto. Vazio: "Nenhuma história ainda." + *Nova história*.
- **Ler a história (`/livro/[id]/historias/[historiaId]`):** título, texto, "Confira" grifados (toque abre o motivo numa folha inferior) e o player do original (`assinarLeitura`). Dica: "Grifado = confira com o áudio."
- **Áudios recebidos:** *Virou história*, *Escrevendo…*, *Aguardando sua confirmação*, *Aguardando divisão* ou *Aguardando*.
- **Configurações (`/livro/[id]/configuracoes`, link no menu da home):** confirmação da IA (enquanto faltar) e *Nomes do livro*: sugeridos no alto (*Aceitar*, *Corrigir*, *Não é nome*), depois os aceitos, e *Acrescentar nome*. Vazio: "Os nomes aparecem aqui depois da primeira história."
- **Admin → Processamento:** histórias com falha (livro, etapa, código, *Tentar de novo*), gravações esperando (motivo) e o custo por livro em reais.
- **Cartão:** novo estado `falhou` ("Não deu certo. Já estamos vendo."); `titulo` opcional ("Escrevendo…"); o trecho ao vivo vem dos parágrafos.

## 9. Arquivos

**Criar:**
```
app/api/inngest/route.ts                    serve(); só maxDuration = 300
lib/inngest/cliente.ts                      cliente, schema zod dos eventos
lib/inngest/processar-gravacao.ts           6.2
lib/inngest/varredura.ts                    6.1
lib/pipeline/banco.ts                       leituras e escritas com a chave secreta
lib/pipeline/contexto.ts                    glossário e resumos → contexto
lib/pipeline/canal.ts                       broadcast
lib/pipeline/erros.ts                       ErroPipeline e códigos
lib/pipeline/disparo.ts                     enviar o evento (after + try/catch)
lib/historias/etapas.ts (+ .test.ts)        mapa estado → cartão
lib/historias/dados.ts, tipos.ts
lib/ai/parcial.ts (+ .test.ts)              extrairTextoParcial
lib/ai/prompts/memoria.md, memoria-entrada.md
app/livro/[id]/historias/page.tsx, [historiaId]/page.tsx
app/livro/[id]/configuracoes/page.tsx, acoes.ts
components/telas/tela-historias.tsx, tela-historia.tsx, tela-configuracoes.tsx
components/ui/cartao-historia-vivo.tsx, marco-primeira-historia.tsx
scripts/lab/baixar.ts
supabase/migrations/20261115120000_pipeline.sql, supabase/reversao/20261115120000_pipeline.down.sql
supabase/tests/pipeline.test.ts, realtime.test.ts
```
**Modificar:**
```
lib/ai/claude.ts, etapas.ts, schemas.ts, prompts/contexto-livro.md, carregar-prompt.ts (comentário)
lib/ui/etapas.ts (+ teste), components/ui/cartao-historia.tsx, app/(dev)/styleguide (demo)
app/livro/[id]/acoes.ts, app/a/[token]/acoes.ts        disparo
app/admin/*                                           Processamento
components/telas/tela-livro.tsx, tela-audios.tsx, tela-autor.tsx (texto v2)
lib/livro/dados.ts                                    situação de cada áudio
lib/email/modelos.ts (+ teste), enviar.ts             historiaPronta, idempotencyKey
lib/whatsapp.ts (+ teste)                             mensagemPrimeiraHistoria
lib/eventos-acoes.ts                                  historia_pronta, memoria_falhou, processamento_*
lib/erros-banco.ts                                    versao_imutavel, glossario_cheio
lib/env-servidor.ts                                   ANTHROPIC, ELEVENLABS, INNGEST_* e a trava de INNGEST_DEV
lib/config.ts                                         MAX_HISTORIA_MIN, MAX_MINUTOS_IA_DIA, MAX_NOMES_*, CONSENTIMENTO_*, ESPERA_EMAIL_MIN, INTERVALO_TEXTO_MS
lib/supabase/tipos.ts                                 regerar
proxy.ts                                              matcher sem api/inngest
next.config.ts                                        outputFileTracingIncludes
scripts/lab/opcoes.ts, index.ts, fakes.ts
supabase/tests/auth-shim.sql                          schema realtime mínimo
supabase/tests/rls.test.ts, config-banco.test.ts      listas de funções e de limites
package.json (inngest), .env.example
```

O shim de teste ganha: `create schema realtime`, `realtime.messages (topic text, extension text, payload jsonb)` com RLS e `realtime.topic()` lendo `current_setting('realtime.topic', true)`. O teste define esse valor antes de cada consulta.

## 10. Testes

**Banco (PGlite):** os cenários de 5.3 viram testes; mais o isolamento entre livros em todas as tabelas novas; `porta_autor` sem acesso a nenhuma tabela e nenhuma função nova; logado sem `ai_usage`, `book_context`, `rascunho` e `erro`; glossário (insert só `aceito`, cota sem contar recusados, plano vencido não muda nada); canal (membro de A ouve `livro:{A}`; nega `livro:{B}`, `livro:`, `LIVRO:{A}`, maiúsculas, vazio e `porta_autor`); `consentir_processamento_ia` só pelo responsável; cota diária; reversão com e sem versões.

**Unidade:** `extrairTextoParcial` (JSON cortado em vários pontos, inclusive no meio de um escape); mapa de estados; a função do pipeline com IA, transcritor, banco e canal falsos: ordem dos passos, história pronta não refaz nada, `memoria` e `avisar` falhando sem mudar o estado, e-mail só sem `vista_em`, nenhum erro com texto de entrada na mensagem, transcrição reaproveitada na nova tentativa; rota `/api/inngest` recusando POST sem assinatura.

**Ponta a ponta (Playwright):** cartão recebendo mensagens falsas (etapas, texto, recomeçar, falhou); leitura com "Confira"; Configurações: confirmar a IA, aceitar e corrigir um nome.

**No deploy de prévia (gate T28):** os 2 testes do canal (6.4); `GET /api/inngest` dinâmico; gravar 5 min pelo link do autor com a home aberta no computador → primeira palavra em menos de 60 s e "Pronta" em menos de 3 min (`ai_usage` + cronômetro); erros de runtime da Vercel.

## 11. Riscos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Qualidade do texto não medida com áudio real | Alto | 6.7 entra junto; a 1ª história do André é comparada antes do prompt 7 |
| Áudio e texto saindo do Brasil (ElevenLabs, Anthropic) | Alto | D9 (consentimento registrado e com versão); nada de texto no Inngest nem em logs; item 3 da seção 7 |
| Canal público com o mesmo nome, ou texto guardado em `realtime.messages` | Médio | Gate de prévia (6.4); se falhar, o canal leva só a etapa |
| Passo de edição perto de 300 s numa gravação de 30 min | Médio | Só `medio`; `ai_usage.ms` mede; acima de 200 s, a edição passa para o Sonnet ou é dividida (prompt 9) |
| Hobby da Vercel é de uso não comercial | Médio | D7 |
| Injeção de prompt na fala | Baixo | Só afeta o próprio livro; verificação independente; máximo de 10 nomes por história; o texto não executa nada |
| Evento perdido depois do upload | Baixo | Reenvio no "já recebido" + varredura a cada 15 min |
| Cache de prompt não pegar | Baixo | `ai_usage.tokens_cache_lido` mostra; custo segue baixo |

## 12. O que mudou com a revisão

**Segurança e banco (`critic_report.md`):** veredito "aprovar com correções", sem falha crítica. Os 15 achados entraram:
1. Estados: transições só por `servico_mudar_etapa`, com guarda; `iniciar` devolve o estado e o job para se a história já está pronta ou falhou; `memoria` e `avisar` nunca lançam.
2. Apagar um usuário não trava mais: o gatilho deixa passar só `criado_por` → null (testado).
3. Nada de texto no Inngest: edição e marcações em `stories.rascunho`; `ErroPipeline` com códigos fixos.
4. A assinatura do Inngest é checada; a inicialização trava se `INNGEST_DEV` estiver definido em produção ou prévia; teste de POST sem assinatura.
5. *Tentar de novo* atômico; varredura de 15 min para eventos perdidos e histórias paradas; livro vencido no meio termina.
6. Filtro por origem, teto de 30 min e cota de 240 min/dia no banco (D2, D10).
7. Saída do modelo saneada: título vazio vira null, nomes por `servico_sugerir_nomes` (máximo de 10, sem lançar), cota sem recusados e com lock, apelido nulo recusado.
8. Política do canal com `case`: tópico malformado nega sem erro (testado).
9. Canal público e retenção em `realtime.messages` viram gate da prévia.
10. Reversão travada com versões gravadas; `processado_em` só das gravações processadas; sem `disable trigger`; `realtime` conferido antes do drop.
11. E-mail sem título; `idempotencyKey`; consentimento para a IA (D9).
12. `service_role` só com select e insert em `transcripts` e `story_versions`; gatilhos contra `truncate`.
13. Funções derivam o livro; FKs compostas em `ai_usage`; regra do livro vencido escrita.
14. Admin confere o papel no servidor; `event.data` validado com zod.
15. `on conflict` na transcrição; `order by` em `story_recordings`; custo de toda tentativa.

**Código (`codebase_details_report.md`):** os 15 achados entraram: original direto ao Scribe e `minutos` pela duração (1, 15); `Segmento[]` como o código devolve (2); `hash_prompts` e `modelos` em jsonb, `lacunas` na versão (3); `historias` opcional sem quebrar o lab (4); mapa de estados do cartão e estado `falhou` (5); testes de lista atualizados (6); shim do Realtime especificado (7); disparo em `after()` com reenvio (8); custo das tentativas que falham, acúmulo do stream e `recomecar` (9); `--baixar` sem `server-only` (10); nome certo do leitor de prompts e chave do tracing (11); proxy, rota e variáveis validadas (12); evento, e-mail e helpers existentes (13); `download()` em vez de URL assinada (14); nomes de arquivos e componentes corrigidos (15).

**O que não entrou:** mover a reversão para outro schema em vez de apagar (achado 10 de segurança). A trava com exportação obrigatória cobre o risco com menos código.

## 13. O que mudou no teste real (11–13/11)

- **Inngest na prévia:** a Proteção de Deploy da Vercel bloqueia o Inngest. Solução: *Protection Bypass for Automation* na Vercel e sync manual no **ambiente de branch** do Inngest (a prévia assina com a chave do ambiente de branch; sync no Production dá "assinatura inválida").
- **Estruturação falhava com áudio real:** o modelo precisava repetir o falante com o uuid da gravação (36 caracteres) e errava. Agora o rótulo é curto (`g1:speaker_0`), e falante ou id inventado é descartado em vez de derrubar a história. O motivo da recusa (escrito pelo nosso código) vai para o log.
- **P43 (substitui em parte P40):** conversa de uma parte só e com menos de 29 min vira história direto (migration `20261116120000_conversa_curta`). Conversa longa e lote continuam esperando o prompt 7.
- **Cartão sem ansiedade:** uma barra que enche pelo tempo previsto (para em 95%) e uma frase curta; gravações guardadas aparecem na home com o motivo.
- **Primeira história real:** conversa de 2 min 35 s → pronta em 39 s depois de começar (primeiras palavras ~27 s), R$ 0,47. O cache de prompt não pegou (0 tokens lidos): medir de novo com as histórias do André antes de mexer.

**Pendências do aceite:** teste ao vivo de 5 min com a tela aberta; leitura de fidelidade pelo André (`--baixar` + `--comparar`); roteiro do prompt 5 no iPhone e no Android; event key, Redirect URL e sync do Inngest de **produção** ao juntar no `main`.
