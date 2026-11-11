# Pipeline com texto ao vivo (prompt 6)

Status: rascunho v1 para aprovação · 2026-11-11 · PRD: M5, Pipeline de IA, M11 (marco da 1ª história), Modelo de dados · Decisões: P18, P25, P27, P36, T5, T8, T9, T10, T11, T17, T18, T28, T31, T32, T34

Relatórios da revisão (T28): `pipeline-texto-ao-vivo/critic_report.md` (segurança) e `pipeline-texto-ao-vivo/codebase_details_report.md` (código). A seção 12 mostra o que mudou por causa de cada um.

## 1. Problema, hipótese e o que está em jogo

Hoje o áudio chega e fica "aguardando processamento" para sempre. O laboratório (prompt 1) transforma áudio em texto, mas só no computador do Guilherme, e **ninguém rodou o lab com áudio real ainda**. Então este prompt põe em produção uma qualidade de texto que ainda não foi medida.

- **Hipótese 1 (encantamento, P18):** ver o texto nascer em menos de 60 s faz a família confiar no produto e gravar a próxima história.
- **Hipótese 2 (qualidade, T31):** a família aceita o texto corrigindo no máximo 1 de cada 3 parágrafos, e nenhuma invenção passa sem "Confira".
- **O que este prompt mede de verdade:** a hipótese 1 (tempo até a primeira palavra e até "Pronta", gravados em `ai_usage`). A hipótese 2 só é medida quando o André corrigir as primeiras histórias. Por isso a comparação IA × corrigida (seção 6.6) é parte do escopo, e não um extra.
- **Critério de morte (já no PRD):** 1 escape de invenção que a família perceba, ou mais de 50% do texto reescrito em 3 histórias seguidas. Se acontecer, as telas param e a prioridade volta para regras e verificação.
- **Evidência que ainda não temos:** nenhum texto da IA foi lido por quem conhece o Nelson.

## 2. Escopo

**Entra:**
- Inngest (T34): SDK, rota `/api/inngest` e a função do pipeline.
- Tabelas `stories`, `story_recordings`, `transcripts`, `story_versions`, `ai_usage`, `book_context` e `glossary_entries`, com RLS e testes, e a política do canal privado do Realtime.
- Pipeline para **gravações avulsas** (sem `lote_id`): autor pelo link, gravação livre e upload de 1 arquivo. Transcrição (Scribe), estruturação, edição com streaming, checagens, verificação, memória do livro e sugestão de nomes.
- Até 3 tentativas por etapa; erro visível no admin, com o botão *Tentar de novo*.
- Cartão da história com as etapas ao vivo (Enviando, Ouvindo, Escrevendo, Pronta para revisar) e o texto sendo escrito.
- Tela de leitura da história (somente leitura, com os "Confira" grifados). Quem edita é o prompt 8.
- Tela *Nomes do livro* em Configurações: aceitar, corrigir ou recusar os nomes sugeridos.
- E-mail "sua história ficou pronta" só quando ninguém viu a história ficar pronta na tela.
- Marco da 1ª história (M11), com o botão de compartilhar no grupo.
- Comparação IA × corrigida usando o `--comparar` do laboratório, com as histórias da plataforma.

**Não entra (e por quê):**
- **Lotes e conversas (com `lote_id`)** ficam como "aguardando divisão" até o prompt 7. Sem a divisão, 1 hora de ceia viraria uma história gigante (P27). Aprovado pelo Guilherme em 11/11.
- **Reprocessar o que já está no banco:** os 3 áudios de hoje são de teste (Guilherme, 11/11). O PRD pedia que entrassem na fila na 1ª execução; isso sai do escopo. Eles não são apagados (regra de ouro); só não são processados.
- Editor, versões manuais, trava de edição: prompt 8.
- Mudar o tamanho, revisar trecho, acrescentar áudio: prompt 9. A edição sai sempre no tamanho `medio` (`TAMANHO_PADRAO`).
- O autor ver o próprio texto: prompt 10. Para o autor, nada muda neste prompt.
- Webhook do ElevenLabs para transcrição longa (ver decisão D1).
- `npm run eval` com padrão-ouro: substituído pela comparação com o uso real (T31).

## 3. Decisões que preciso de você

| # | Decisão proposta | Por quê | O que se perde |
| --- | --- | --- | --- |
| D1 | **Transcrição síncrona**, dentro de um passo do Inngest, sem o webhook previsto em T34. O webhook volta se um passo de transcrição passar de 200 s (medido em `ai_usage.ms`). | Toda gravação avulsa tem no máximo 30 min (autor) e 50 MB (upload). O Scribe devolve 30 min em bem menos que os 300 s do passo no Hobby. O webhook exige endpoint público, segredo novo e configuração no painel do ElevenLabs, para um caso que só aparece no prompt 7. | Se o Scribe ficar lento num dia ruim, o passo estoura e a tentativa seguinte paga a transcrição de novo. A mitigação é a medição e o gatilho de 200 s. |
| D2 | **Lotes e conversas esperam o prompt 7** (sua resposta 1). Inclui a conversa curta, de uma parte só. | O servidor não sabe se uma conversa terminou na parte 1: a parte 2 pode chegar depois. Tratar a parte 1 sozinha geraria uma história errada. | Até o prompt 7, o modo conversa grava e guarda, mas não vira texto. O aceite deste prompt usa o link do autor, que não depende disso. |
| D3 | **Sem reprocessamento na 1ª execução** (sua resposta 2). | Os áudios de hoje são de teste. | Nada. |
| D4 | **E-mail só se a história não foi vista em 2 min.** Quando o cartão mostra "Pronta" na tela de alguém, o navegador marca `stories.vista_em`. O job espera 2 min (pausa do Inngest, sem custo) e só manda o e-mail se `vista_em` continuar vazio. | Atende M5 ("e-mail só se ninguém estiver com a tela aberta") sem guardar presença nem fazer pulsação a cada minuto. | Quem fecha a aba nos 2 min seguintes, sem ter visto, recebe o e-mail. É o comportamento certo. |
| D5 | **Canal privado do Realtime por livro (`livro:{id}`)**, só para membros, só com Broadcast. O servidor publica etapas e o texto parcial; o navegador nunca publica. O estado verdadeiro fica no banco: quem abre a tela lê do banco e depois assina o canal. | Uma política só em `realtime.messages` e nenhuma tabela nova na publicação do Realtime. O texto em streaming não pode virar um `update` no banco a cada token. | Se uma mensagem se perder, o texto parcial para até a próxima (cada mensagem leva o texto inteiro até ali, não só o pedaço novo). |
| D6 | **Comparação IA × corrigida pelo laboratório**: `npm run lab -- --baixar <historia>` grava a versão da IA em `lab/saidas/<historia>/` (o mesmo formato do lab), e o `--comparar` existente faz o resto. | O editor só chega no prompt 8, mas o André pode corrigir num Google Docs já nesta semana. Reaproveita 100% do código de comparação. | É um passo manual (seu), até o prompt 8 automatizar. |
| D7 | **Plano Hobby da Vercel durante a onda 1 e plano Pro antes do 1º cliente pagante.** | O Hobby (gratuito) cobre o tempo de 300 s por passo. Mas os termos da Vercel restringem o Hobby a uso não comercial. | US$ 20/mês a partir da 1ª venda. |
| D8 | **Contexto do livro = glossário aceito + resumo das histórias prontas**, com cache de prompt. O resumo e os nomes sugeridos saem de uma chamada nova e barata (modelo rápido), depois da história pronta. O prompt `editar.md` não muda. | A qualidade de edição ainda não foi medida: mexer no prompt de edição agora estragaria a comparação com o lab. | Uma chamada a mais por história (~US$ 0,001). |

## 4. Fatos que moldam o desenho

- **Inngest na Vercel:** o código roda nas funções da própria Vercel, e cada `step.run` é uma chamada separada à rota `/api/inngest`, com o teto de duração da função (Hobby: 300 s). O resultado de cada passo fica guardado pelo Inngest e não é recalculado numa nova tentativa. O SDK confere a assinatura de toda chamada com `INNGEST_SIGNING_KEY`.
- **O que cabe num passo:** a transcrição de até 30 min, uma chamada de edição e uma de verificação. Nenhum passo junta duas chamadas longas.
- **Limite do resultado de um passo:** a transcrição pode ter centenas de KB. Ela é gravada no banco dentro do passo, e o passo devolve só contagens. A edição (~10 KB) volta como resultado do passo, para o passo de verificação usar.
- **Tamanho do áudio:** até 50 MB (T27). O passo baixa do Storage com a chave secreta, na própria Vercel em São Paulo, e envia ao Scribe. O áudio só sai do Brasil para o ElevenLabs (como no lab).
- **Prompts em arquivo:** `carregarPrompt` lê `lib/ai/prompts/*.md` do disco. Na Vercel, esses arquivos precisam entrar no pacote da função (`outputFileTracingIncludes` no `next.config.ts`).
- **Streaming:** `ClienteAnthropic.gerar` já faz streaming e detecta a primeira palavra. Vou acrescentar um `aoTexto(acumulado)` opcional, chamado no máximo a cada 400 ms, que extrai dos JSON parciais os textos dos parágrafos (título e `paragrafos[].texto`).
- **Tentativas:** o cliente da Anthropic já repete 1 vez quando o JSON vem fora do schema. O Inngest repete o passo inteiro até 3 vezes (`retries: 2`). No pior caso, são 6 chamadas por etapa; o custo de cada uma vai para `ai_usage`.
- **Custo estimado:** para 6 min de áudio, ~US$ 0,15 por história (edição e verificação no modelo capaz, ~US$ 0,05 cada; Scribe, ~US$ 0,04). Com 25 histórias, ~R$ 21 por livro, dentro dos R$ 30, sem contar trocas de tamanho (prompt 9). A medição real vai para o admin.
- **Dicas de primeira vez** ficam no `localStorage` (componente `Dica`). O marco da 1ª história usa o mesmo mecanismo.

## 5. Banco de dados

Migration `supabase/migrations/20261115120000_pipeline.sql` e reversão `supabase/reversao/20261115120000_pipeline.down.sql`.

Regras do arquivo:
- `on delete restrict` em tudo o que aponta para áudio ou história. Nada some em cascata.
- **A versão da IA nunca muda:** `story_versions` só aceita insert. Um gatilho recusa `update` e `delete` de qualquer papel, inclusive a chave secreta. A exclusão por LGPD é um processo formal, que desliga o gatilho de propósito.
- **O token do autor (`porta_autor`) não recebe nenhum grant** em tabela nova. Membro lê o que é do livro dele, e só escreve em `glossary_entries` e em `stories.vista_em` (por função).
- Chaves estrangeiras compostas `(book_id, id)` garantem que história, gravação e versão sejam do mesmo livro.

### 5.1 SQL de subida

```sql
-- 20261115120000_pipeline.sql
-- Prompt 6: histórias, transcrições, versões, custo, memória do livro e glossário.
-- stories e story_recordings saíram do prompt 5 (P36). Quem cria a história é o pipeline.

create type public.story_estado as enum ('ouvindo', 'escrevendo', 'pronta', 'falhou');
create type public.versao_origem as enum ('ia', 'responsavel', 'cofacilitador', 'autor');
create type public.glossario_tipo as enum ('pessoa', 'lugar');
create type public.glossario_estado as enum ('sugerido', 'aceito', 'recusado');

-- Espelha lib/config.ts (MAX_NOMES_GLOSSARIO). supabase/tests/config-banco.test.ts confere.
create function privado.max_nomes_glossario() returns integer
language sql immutable set search_path = '' as $$ select 300 $$;

-- ── stories ───────────────────────────────────────────────────────────────
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  prompt_id uuid,
  titulo text check (titulo is null or char_length(btrim(titulo)) between 1 and 200),
  estado public.story_estado not null default 'ouvindo',
  estrutura jsonb check (estrutura is null or jsonb_typeof(estrutura) = 'object'), -- base original (T11)
  erro_etapa text check (erro_etapa is null or erro_etapa ~ '^[a-z_]{2,30}$'),     -- só admin
  erro text check (erro is null or char_length(erro) <= 500),                      -- só admin
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
create trigger stories_atualizado_em before update on public.stories
  for each row execute function privado.tocar_atualizado_em();

-- ── story_recordings: gravações que formam a história, em ordem ────────────
-- Os ids de segmento são contínuos por história: a gravação de ordem N começa em segmento_inicial.
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

-- ── transcripts: uma por gravação ─────────────────────────────────────────
create table public.transcripts (
  recording_id uuid primary key,
  book_id uuid not null,
  provedor text not null check (provedor ~ '^[a-z0-9_-]{2,30}$'),
  modelo text not null check (char_length(modelo) between 1 and 60),
  segmentos jsonb not null check (jsonb_typeof(segmentos) = 'array'), -- {id, inicio, fim, falante, texto, confianca}
  palavras jsonb not null check (jsonb_typeof(palavras) = 'array'),
  minutos numeric(7, 2) not null check (minutos >= 0),
  criado_em timestamptz not null default now(),
  foreign key (book_id, recording_id) references public.recordings (book_id, id) on delete restrict
);
create index transcripts_livro on public.transcripts (book_id);

-- ── story_versions: só insert; a versão da IA nunca muda (T31) ──────────────
create table public.story_versions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null,
  book_id uuid not null,
  numero integer not null check (numero >= 1),
  origem public.versao_origem not null,
  tamanho text not null check (tamanho in ('resumido', 'medio', 'detalhado')),
  conteudo jsonb not null check (jsonb_typeof(conteudo) = 'object'),  -- {titulo, paragrafos: [{texto, fontes, travado}]}
  marcacoes jsonb not null default '[]'::jsonb check (jsonb_typeof(marcacoes) = 'array'),
  modelo text check (modelo is null or char_length(modelo) <= 60),
  hash_prompts text check (hash_prompts is null or hash_prompts ~ '^[0-9a-f]{16,64}$'),
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (story_id, numero),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict,
  constraint versao_ia_sem_pessoa check (origem <> 'ia' or criado_por is null)
);

create function privado.versao_imutavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'versao_imutavel';
end $$;
create trigger story_versions_imutavel before update or delete on public.story_versions
  for each row execute function privado.versao_imutavel();

-- ── ai_usage: custo por etapa (só o admin, pela chave secreta) ──────────────
create table public.ai_usage (
  id bigint generated always as identity primary key,
  book_id uuid not null references public.books (id) on delete restrict,
  story_id uuid,
  recording_id uuid,
  etapa text not null check (etapa ~ '^[a-z_]{2,30}$'),
  provedor text not null check (provedor ~ '^[a-z0-9_-]{2,30}$'),
  modelo text not null check (char_length(modelo) between 1 and 60),
  tentativa smallint not null default 1 check (tentativa between 1 and 20),
  tokens_entrada integer not null default 0 check (tokens_entrada >= 0),
  tokens_saida integer not null default 0 check (tokens_saida >= 0),
  tokens_cache_lido integer not null default 0 check (tokens_cache_lido >= 0),
  tokens_cache_gravado integer not null default 0 check (tokens_cache_gravado >= 0),
  minutos_audio numeric(7, 2) check (minutos_audio is null or minutos_audio >= 0),
  custo_usd numeric(10, 6) not null check (custo_usd >= 0),
  ms integer check (ms is null or ms >= 0),
  ms_primeira_palavra integer check (ms_primeira_palavra is null or ms_primeira_palavra >= 0),
  id_requisicao text check (id_requisicao is null or char_length(id_requisicao) <= 120),
  criado_em timestamptz not null default now()
);
create index ai_usage_livro_data on public.ai_usage (book_id, criado_em desc);

-- ── book_context: memória do livro (só o pipeline) ─────────────────────────
create table public.book_context (
  story_id uuid primary key,
  book_id uuid not null,
  resumo text not null check (char_length(btrim(resumo)) between 1 and 600),
  temas text[] not null default '{}' check (cardinality(temas) <= 8),
  atualizado_em timestamptz not null default now(),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict
);
create index book_context_livro on public.book_context (book_id);

-- ── glossary_entries: nomes sugeridos pela IA e ajustados pela família ─────
create function privado.apelidos_validos(p text[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(p) <= 10
     and not exists (select 1 from unnest(p) a where char_length(btrim(a)) not between 1 and 80)
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

create function privado.cota_do_glossario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.glossary_entries where book_id = new.book_id)
       >= privado.max_nomes_glossario() then
    raise exception 'glossario_cheio';
  end if;
  return new;
end $$;
create trigger glossary_entries_cota before insert on public.glossary_entries
  for each row execute function privado.cota_do_glossario();

-- ── RLS e privilégios ──────────────────────────────────────────────────────
alter table public.stories enable row level security;
alter table public.story_recordings enable row level security;
alter table public.transcripts enable row level security;
alter table public.story_versions enable row level security;
alter table public.ai_usage enable row level security;
alter table public.book_context enable row level security;
alter table public.glossary_entries enable row level security;

revoke all on public.stories, public.story_recordings, public.transcripts, public.story_versions,
  public.ai_usage, public.book_context, public.glossary_entries
  from public, anon, authenticated, porta_autor;
grant all on public.stories, public.story_recordings, public.transcripts, public.story_versions,
  public.ai_usage, public.book_context, public.glossary_entries to service_role;

-- Membro lê as histórias do livro (sem o erro técnico, que é só do admin).
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

-- Glossário: membro lê, acrescenta (já aceito) e ajusta, com o plano ativo. Não apaga: recusa.
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

-- ── Funções do pipeline (só o servidor) ─────────────────────────────────────
-- Cria a história de uma gravação avulsa. Idempotente: a 2ª chamada devolve a mesma história.
-- null = não é para processar agora (não chegou, tem lote_id ou o livro não está ativo).
create function public.servico_iniciar_historia(p_recording uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v public.recordings; v_story uuid;
begin
  select * into v from public.recordings where id = p_recording for update;
  if not found or v.upload <> 'recebido' or v.lote_id is not null
     or not privado.livro_editavel(v.book_id) then
    return null;
  end if;
  select sr.story_id into v_story from public.story_recordings sr where sr.recording_id = p_recording;
  if found then return v_story; end if;
  insert into public.stories (book_id, prompt_id) values (v.book_id, v.prompt_id) returning id into v_story;
  insert into public.story_recordings (story_id, recording_id, book_id, ordem)
    values (v_story, p_recording, v.book_id, 1);
  return v_story;
end $$;

-- Grava a versão 1 (IA) e marca a história e as gravações como prontas, na mesma transação.
create function public.servico_concluir_historia(
  p_story uuid, p_conteudo jsonb, p_marcacoes jsonb, p_tamanho text, p_modelo text, p_hash text
) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v public.stories;
begin
  select * into v from public.stories where id = p_story for update;
  if not found then return false; end if;
  if v.estado = 'pronta' then return true; end if;  -- nova tentativa depois de concluir
  insert into public.story_versions (story_id, book_id, numero, origem, tamanho, conteudo, marcacoes, modelo, hash_prompts)
    values (p_story, v.book_id, 1, 'ia', p_tamanho, p_conteudo, p_marcacoes, p_modelo, p_hash)
    on conflict (story_id, numero) do nothing;
  update public.stories
    set estado = 'pronta', titulo = left(btrim(p_conteudo ->> 'titulo'), 200), pronta_em = now(),
        erro_etapa = null, erro = null
    where id = p_story;
  update public.recordings r set processado_em = now()
    from public.story_recordings sr
    where sr.story_id = p_story and r.id = sr.recording_id and r.processado_em is null;
  return true;
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
  public.servico_concluir_historia(uuid, jsonb, jsonb, text, text, text),
  public.marcar_historia_vista(uuid) from public, anon, authenticated, porta_autor;
grant execute on function public.servico_iniciar_historia(uuid),
  public.servico_concluir_historia(uuid, jsonb, jsonb, text, text, text) to service_role;
grant execute on function public.marcar_historia_vista(uuid) to authenticated;

-- ── Realtime: canal privado livro:{id}, só leitura e só para membros ───────
-- Sem política de insert: só o servidor (chave secreta) publica.
create policy "membro ouve o canal do livro" on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (select realtime.topic()) ~ '^livro:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and privado.eh_membro(substring((select realtime.topic()) from 7)::uuid)
  );
```

A troca de etapa (`ouvindo` → `escrevendo`) e a falha são `update` simples, feitos pelo servidor com a chave secreta, sempre filtrando por `id` e `book_id`.

### 5.2 SQL de reversão

```sql
-- 20261115120000_pipeline.down.sql
-- Apaga histórias, transcrições e versões. Os áudios (recordings e Storage) ficam intactos.
-- O gatilho de versões imutáveis é desligado antes, de propósito: só a reversão faz isso.
drop policy if exists "membro ouve o canal do livro" on realtime.messages;

drop function if exists public.marcar_historia_vista(uuid);
drop function if exists public.servico_concluir_historia(uuid, jsonb, jsonb, text, text, text);
drop function if exists public.servico_iniciar_historia(uuid);

update public.recordings set processado_em = null where processado_em is not null;

drop table if exists public.glossary_entries;
drop table if exists public.book_context;
drop table if exists public.ai_usage;
alter table if exists public.story_versions disable trigger story_versions_imutavel;
drop table if exists public.story_versions;
drop table if exists public.transcripts;
drop table if exists public.story_recordings;
drop table if exists public.stories;

drop function if exists privado.cota_do_glossario();
drop function if exists privado.apelidos_validos(text[]);
drop function if exists privado.versao_imutavel();
drop function if exists privado.max_nomes_glossario();

drop type if exists public.glossario_estado;
drop type if exists public.glossario_tipo;
drop type if exists public.versao_origem;
drop type if exists public.story_estado;
```

**Atenção:** a reversão apaga os textos gerados. Os áudios originais continuam. Antes de reverter em produção com histórias reais, exportar `story_versions`.

## 6. Pipeline

### 6.1 Disparo

- Depois de `servico_confirmar_audio` (upload do responsável) e de `servico_confirmar_gravacao_autor` (link do autor) devolverem `true`, a ação do servidor envia o evento `ecoa/gravacao.recebida` com `{ recordingId }` e `id: recordingId` (o Inngest ignora um evento repetido com o mesmo id por 24 h).
- O evento só sai quando a gravação não tem `lote_id`. A função confere de novo no banco (`servico_iniciar_historia`), sem confiar no evento.
- Se o envio do evento falhar, o upload continua confirmado (o áudio está salvo) e o admin mostra a gravação "recebida e sem história", com *Processar*.

### 6.2 Função `processar-gravacao`

`retries: 2` (3 tentativas por passo), `concurrency: { limit: 1, key: "event.data.recordingId" }` e `idempotency` pelo id do evento. Passos:

| Passo | O que faz | Escreve | Publica no canal |
| --- | --- | --- | --- |
| `iniciar` | `servico_iniciar_historia`. Se devolver null, a função termina | `stories` (ouvindo), `story_recordings` | `etapa: ouvindo` |
| `transcrever` | URL assinada de 5 min → baixa o áudio → Scribe com os nomes aceitos como dica → `segmentar` | `transcripts`, `ai_usage` | — |
| `estruturar` | modelo rápido sobre os segmentos | `stories.estrutura`, `ai_usage` | — |
| `editar` | `estado = escrevendo` → edição em streaming, no tamanho `medio`, com o contexto do livro em cache | `ai_usage` (devolve a edição) | `etapa: escrevendo`, depois `texto` a cada 400 ms |
| `verificar` | checagens locais + verificador independente (sem o contexto da edição, T10) | `ai_usage` (devolve as marcações) | — |
| `concluir` | `servico_concluir_historia` | `story_versions` v1, `stories` (pronta), `recordings.processado_em` | `etapa: pronta` |
| `memoria` | modelo rápido: resumo de até 3 frases, temas e nomes citados. Uma falha aqui não desfaz o "pronta" | `book_context`, `glossary_entries` (sugerido; ignora nome já existente) | — |
| `esperar` | `step.sleep("2m")` | — | — |
| `avisar` | se `vista_em` estiver vazio, e-mail ao responsável pelo Resend; registra o evento `historia_pronta` | `events` | — |

`onFailure`: grava `estado = falhou`, `erro_etapa` e `erro` (mensagem curta, sem o texto do áudio nem a chave) e publica `etapa: falhou`. No cartão aparece "Não deu certo. Já estamos vendo." O botão *Tentar de novo* fica só no admin, que volta a história para `ouvindo` e reenvia o evento com um id novo. Os passos que já tinham dado certo são refeitos, mas a transcrição não é paga de novo: o passo lê a de `transcripts` se ela já existir.

### 6.3 Código reaproveitado do laboratório

- `lib/ai/etapas.ts` (`estruturar`, `editar`, `checar`, `verificar`), `segmentar.ts`, `schemas.ts`, `custo.ts`, `transcricao/*` e os prompts: sem mudança de comportamento.
- `contexto-livro.md` ganha `{{historias}}` (resumos das histórias prontas, no máximo 40, os mais recentes). No lab o valor é "(nenhuma ainda)".
- `ClienteAnthropic.gerar` ganha `aoTexto?(acumulado: string)`, com intervalo mínimo entre chamadas. Um `extrairTextoParcial(json)` novo, testado, tira título e parágrafos de um JSON incompleto.
- Novo `lib/ai/prompts/memoria.md` e `memoria-entrada.md`, com o schema `Memoria` (`resumo`, `temas`, `pessoas`, `lugares`).
- `Glossario` da plataforma: montado a partir de `books` (nome e apelido do autor) e de `glossary_entries` aceitos. O campo `sobre` fica vazio (P13).

### 6.4 Tempo real (D5)

- Servidor: `POST {SUPABASE_URL}/realtime/v1/api/broadcast` com a chave secreta e `private: true`, no tópico `livro:{book_id}`. Mensagens: `{ tipo: "etapa", historia, etapa }` e `{ tipo: "texto", historia, titulo, paragrafos: string[] }`, sempre com o texto inteiro até ali.
- Navegador: `supabase.channel("livro:{id}", { config: { private: true } })`, depois de `realtime.setAuth()`. Ao assinar (SUBSCRIBED), lê de novo as histórias em andamento no banco, para não perder o que aconteceu antes de entrar.
- O canal só existe nas telas do responsável. O link do autor e o da família nunca assinam nada.

### 6.5 E-mail e marco da 1ª história

- E-mail (D4): "A história *{título}* ficou pronta", com o botão *Ler a história*. Vai para o responsável. Nenhum trecho do texto vai no e-mail.
- Marco (M11): quando o cartão da 1ª história do livro muda para *Pronta para revisar* na tela, ou quando o responsável abre a home com 1 história pronta e o marco ainda não foi visto naquele aparelho, aparece o momento de celebração ("A primeira história do livro está pronta.") com *Contar no grupo*. O botão abre o WhatsApp com a mensagem e o link da família (`lib/whatsapp.ts`).

### 6.6 Comparação IA × corrigida (D6, T31)

- `npm run lab -- --baixar <historia_id>` (lê do banco com a chave secreta do `.env.local`) grava `lab/saidas/<historia>/ia.json` e `ia.md` no formato que o `--comparar` já entende. O texto real fica só no computador (a pasta está no `.gitignore`).
- O André corrige o `ia.md` num Google Docs; o Guilherme salva como `editado.md` e roda `npm run lab -- --comparar <historia>`.
- No prompt 8, o editor grava a versão corrigida em `story_versions`, e a comparação passa a rodar sozinha.

## 7. Configuração (Guilherme)

| # | Ação | Onde | Quando |
| --- | --- | --- | --- |
| 1 | ~~`ELEVENLABS_API_KEY` e `INNGEST_EVENT_KEY` em Production e Preview~~ | Vercel | Feito em 11/11 |
| 2 | Desligar *Allow public access* do Realtime (o app não usa canal público) | Supabase → Realtime → Settings | Antes do deploy |
| 3 | Ligar no ElevenLabs a retenção zero ou o apagamento depois do processamento, e o não uso para treino | Painel do ElevenLabs | Antes do 1º áudio real |
| 4 | Se o deploy de prévia estiver protegido: configurar o bypass de proteção para o Inngest | Vercel → Deployment Protection + Inngest | Se a prévia não sincronizar |
| 5 | Conferir o preço por minuto do Scribe e virar `PRECOS_TRANSCRICAO_CONFIRMADOS` | lib/config.ts | Antes de ler o custo no admin |

## 8. Telas

Celular primeiro. Uma ação principal por tela. Conteúdo do livro em `font-livro`.

- **Home do livro:** se houver história em andamento, o cartão dela aparece em destaque, acima da lista de passos, com as etapas ao vivo e o texto aparecendo. As prontas aparecem como cartões simples, com o link *Ver todas*.
- **Histórias (`/livro/[id]/historias`):** lista de cartões, os mais recentes no alto. Estado vazio: "Nenhuma história ainda." + *Nova história*.
- **Ler a história (`/livro/[id]/historias/[historiaId]`):** título, texto e os "Confira" grifados (toque mostra o motivo numa folha inferior), mais o player do áudio original. Sem edição. Dica de primeira vez: "Grifado = confira com o áudio."
- **Áudios recebidos:** cada áudio mostra a situação: *Virou história* (link), *Escrevendo…*, *Aguardando divisão* (lote e conversa) ou *Aguardando* (antigos).
- **Configurações → Nomes do livro (`/livro/[id]/configuracoes`):** sugeridos no alto (*Aceitar*, *Corrigir*, *Não é nome*), depois os aceitos. *Acrescentar nome*. Estado vazio: "Os nomes aparecem aqui depois da primeira história."
- **Admin:** nova seção *Processamento*: histórias com falha (livro, etapa, erro, *Tentar de novo*), gravações recebidas sem história (*Processar*) e o custo por livro (soma de `ai_usage`), em reais.

## 9. Arquivos

```
app/api/inngest/route.ts                    serve(); maxDuration = 300
lib/inngest/cliente.ts                      cliente e tipos dos eventos
lib/inngest/processar-gravacao.ts           a função (seção 6.2)
lib/pipeline/banco.ts                       leituras e escritas do pipeline (chave secreta)
lib/pipeline/contexto.ts                    glossário e resumos → contexto do livro
lib/pipeline/canal.ts                       broadcast do servidor
lib/pipeline/eventos.ts                     enviar ecoa/gravacao.recebida
lib/ai/parcial.ts (+ .test.ts)              extrairTextoParcial
lib/ai/claude.ts                            aoTexto com intervalo
lib/ai/etapas.ts                            memoria()
lib/ai/schemas.ts                           Memoria
lib/ai/prompts/memoria*.md, contexto-livro.md
lib/historias/dados.ts, tipos.ts            leitura para as telas
lib/email/modelos.ts                        historiaPronta
lib/config.ts                               MAX_NOMES_GLOSSARIO, ESPERA_EMAIL_MIN, INTERVALO_TEXTO_MS
app/livro/[id]/acoes.ts, app/a/[token]/acoes.ts   enviar o evento depois de confirmar
app/livro/[id]/historias/page.tsx, [historiaId]/page.tsx
app/livro/[id]/configuracoes/page.tsx (+ acoes.ts)
app/admin/...                               seção Processamento
components/telas/tela-historias.tsx, tela-historia.tsx, tela-nomes.tsx
components/ui/cartao-historia-vivo.tsx      assina o canal; usa cartao-historia
scripts/lab/baixar.ts                       --baixar
next.config.ts                              outputFileTracingIncludes dos prompts
supabase/migrations/20261115120000_pipeline.sql, reversao/...down.sql
supabase/tests/auth-shim.sql                schema realtime mínimo (messages, topic())
supabase/tests/pipeline.test.ts
```

## 10. Testes

**Banco (PGlite, com as migrations reais):**
- Isolamento: o membro do livro A não lê `stories`, `story_recordings`, `transcripts`, `story_versions` nem `glossary_entries` do livro B, e não altera o glossário de B.
- Token do autor: `porta_autor` não lê nenhuma tabela nova e não executa nenhuma função nova.
- Quem está logado não lê `ai_usage` nem `book_context`, e não vê `stories.erro`.
- `story_versions`: `update` e `delete` falham para `authenticated` e para `service_role`.
- `servico_iniciar_historia`: devolve a mesma história na 2ª chamada; devolve null para gravação com `lote_id`, ainda enviando ou de livro somente leitura.
- `servico_concluir_historia`: idempotente; marca `processado_em`.
- `marcar_historia_vista`: membro de outro livro não marca.
- Glossário: insert só como `aceito`; cota de 300; sem plano ativo, nada muda.
- Canal: a política de `realtime.messages` libera `livro:{A}` para o membro de A e nega `livro:{B}`, um tópico malformado e o `porta_autor`.
- Reversão: sobe, desce e sobe de novo sem erro.

**Unidade:** `extrairTextoParcial` com JSON cortado em pontos diferentes (inclusive no meio de um escape); a função do pipeline com cliente de IA, transcritor, banco e canal falsos: ordem dos passos, gravação com lote ignorada, `memoria` falhando sem desfazer o "pronta", e-mail só sem `vista_em`.

**Ponta a ponta (Playwright):** cartão recebendo mensagens falsas do canal (etapas e texto) e virando "Pronta"; tela de leitura com "Confira"; Nomes do livro: aceitar e corrigir.

**Manual, no deploy de prévia (gate T28):** gravar 5 min pelo link do autor, com a home aberta no computador. Medir a primeira palavra (< 60 s) e o "Pronta" (< 3 min) pelo `ai_usage` e por um cronômetro.

## 11. Riscos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| A qualidade do texto ainda não foi medida com áudio real | Alto | A seção 6.6 entra junto. A 1ª história do André é corrigida antes de qualquer tela nova (prompt 7 em diante) |
| Passo de edição perto de 300 s em gravação de 30 min no tamanho detalhado | Médio | Este prompt só usa `medio`. `ai_usage.ms` mede; se passar de 200 s, a edição vai para o Sonnet ou é dividida (prompt 9) |
| Mensagens do canal perdidas ou fora de ordem | Baixo | Cada mensagem leva o texto inteiro; ao reconectar, a tela relê o banco |
| Transcrição como vetor de injeção de prompt ("ignore as regras…") | Baixo | Só afeta o próprio livro; a verificação independente marca o que não tem sustentação; o texto não executa nada |
| Hobby da Vercel é de uso não comercial | Médio | D7: plano Pro antes do 1º cliente pagante |
| Cache de prompt não pegar (contexto curto) | Baixo | `ai_usage.tokens_cache_lido` mostra; custo segue baixo sem cache |
| Envio do evento falhar depois do upload | Baixo | O áudio fica salvo; o admin mostra "recebida sem história" com *Processar* |

## 12. O que mudou com a revisão

(preenchido depois dos 2 revisores)
