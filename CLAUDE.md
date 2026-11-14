# Ecoa Memórias — Plataforma do Livro

@AGENTS.md

Antes de qualquer tarefa, leia `docs/decisoes-resumo.md` (uma linha por decisão) e `docs/mapa.md` (onde está cada coisa e os padrões do código). O texto de cada prompt está em `docs/prompts.md`: leia só o do prompt atual. O PRD (`docs/prd.md`) é a fonte da verdade: leia só as seções citadas no prompt, achando o título com `grep -n` e lendo aquele trecho. Antes de propor mudança de produto ou de arquitetura, leia em `docs/decisoes.md` as linhas das decisões que o assunto toca (`grep -n "^| P27 "`). Se uma tarefa contrariar uma decisão, pare e pergunte. Toda decisão nova aprovada entra no fim da tabela correspondente de `docs/decisoes.md`, com data e motivo, **e** ganha uma linha em `docs/decisoes-resumo.md`; a antiga ganha "Substituída por #N" nos dois e nunca é apagada.

## Economia de contexto

- **Prompts com [EGM] em duas sessões.** A primeira vai até o design doc aprovado e termina. A segunda começa com `/clear`, lê o design aprovado e constrói. O design doc é a passagem; nada da exploração precisa vir junto.
- **Design docs antigos (`docs/designs/`) não se leem inteiros.** Só o do prompt atual, ou a seção que ele cita. O padrão do código está em `docs/mapa.md`.
- **Saídas de ferramenta curtas.** Nunca trazer HTML inteiro para a conversa (`web_fetch_vercel_url` só quando precisar dos cabeçalhos; para conferir uma página, `curl -s … | grep`). Tipos do Supabase: gerar, salvar em arquivo e acrescentar em `lib/supabase/tipos.ts` só o que mudou. Logs de build e de teste sempre com `tail` ou `grep`.
- **Revisores do EGM com escopo fechado:** passar o design doc, o SQL e no máximo 5 arquivos do código; pedir no máximo 12 achados.

## Produto

A família (um responsável e até 3 co-facilitadores) ou o próprio autor cria um livro de memórias, do primeiro áudio ao PDF da gráfica, sem a Ecoa no circuito, exceto na impressão. Gravar conversando é o centro da experiência. A IA transforma a fala em texto fiel, como um jornalista que não inventa: cada parágrafo aponta para os trechos do áudio que o sustentam. Cada história impressa tem um QR que toca a voz original para sempre.

## Vocabulário

- **Autor:** quem conta as histórias. Entra por link pessoal, sem login.
- **Responsável:** quem comprou, publica e envia o livro para a impressão. Entra com Google ou link por e-mail.
- **Co-facilitador:** irmão ou parente com acesso total, menos convidar, publicar, imprimir e pagar (até 3).
- **Família:** quem participa pelos links do grupo de WhatsApp (sugerir causo, deixar mensagem, ouvir). Sem login.

## Stack

Next.js 16.4.3 (App Router, `cacheComponents`), TypeScript strict, Tailwind 4, zod, Supabase (Auth, Postgres, Storage, Realtime; região São Paulo), Resend, Tiptap, Claude via API, Vercel. Fila de jobs: ver `docs/decisoes/fila-de-jobs.md`. Testes: Vitest (`*.test.ts`) e Playwright (`e2e/`). Configuração única em `lib/config.ts`: nenhum número de negócio fora dele.

## Segurança (inegociável)

- **RLS em toda tabela**, sem exceção, com teste automático de isolamento entre livros.
- **Tokens de link só como hash** (imprevisíveis, com 128 bits ou mais, um recurso por link, revogáveis). Nunca o token puro no banco, nem nome de pessoa na URL. O link que precisa ser mostrado de novo é derivado por HMAC de um segredo versionado (`LINKS_SEGREDO_V{n}`); nunca edite o valor de uma versão, crie outra.
- **O token do autor nunca lê `family_messages`** nem o capítulo de mensagens. Garantido por RLS e por teste, não só pela tela.
- **Segredos só em `.env.local`** e nas variáveis da Vercel. Nunca no código, em logs, no commit ou com o prefixo `NEXT_PUBLIC_`.
- Áudio original, `qr_codes` e `book_exports` nunca são apagados por ação comum do usuário.

## Banco de dados

Antes de qualquer alteração de schema, **mostre o SQL de subida e o de reversão e espere o OK**. Só então aplique a migration em `supabase/migrations/`.

## Prompts com [EGM]

Comece pelo fluxo do Elephant-Goldfish (`/egm:egm-brainstorm`, `/egm:egm-draft`, `/egm:egm-review`). O design doc é aprovado em português antes de qualquer código.

Escopo e custo do EGM (T28):

- **Só quando o prompt mexe em schema, RLS, tokens ou links sem login.** Tela sem banco usa um plano curto aprovado pelo Guilherme, sem revisores, mesmo que o prompt traga [EGM].
- **No máximo 2 revisores**: `egm:egm-design` (crítico, foco em segurança) e `egm:egm-codebase-details`. Nada de zoom-out, compreensão, estilo ou estrutura.
- **Revisores com `model: sonnet`** (autorizado pelo Guilherme em 10/11/2026).
- **Uma rodada só.** Se um revisor cair por limite de uso, faça a revisão você mesmo, registre no design doc e siga, sem rodar de novo.

EGM artifact directory: docs/designs

## Gate de fim de tarefa

1. `npm run build`, `npm run lint` e `npm test` sem erro (e `npm run test:e2e` quando houver tela).
2. `npm run format`.
3. Commit em português, no padrão Conventional Commits (`feat:`, `fix:`, `chore:`…).
4. Depois do push, quando o deploy de prévia ficar pronto: consulte os erros de runtime da Vercel e confira cada rota nova no deploy de verdade. O EGM revisa o design, não pega bug de código nem de integração (T28).
5. Ao final, um resumo em 5 linhas, sem jargão: o que foi construído e como testar no celular.

Um prompt por sessão: rode `/clear` entre prompts (e entre o design e a construção, nos prompts com [EGM]). O contexto vem deste arquivo, de `docs/mapa.md`, de `docs/decisoes-resumo.md` e das seções do PRD citadas, não da conversa anterior.

## Gate de design (prompts com tela)

1. Build de produção rodando (`npm run build && npm run start`).
2. `npm run taste:lint` e `npm run taste:inspect` (390, 768 e 1440 px).
3. Corrigir todo FAIL, criticar as screenshots e corrigir os 3 maiores problemas, em no máximo 3 rodadas.

Toda tela nova tem estado vazio (uma frase e um botão) e, se tiver um gesto não óbvio, uma dica de primeira vez de no máximo 1 linha.

Régua: um avô de 80 anos e um filho com pressa entendem cada tela em 3 segundos. Uma ação principal por tela, poucas palavras, celular primeiro. Conteúdo do livro em Newsreader (`font-livro`) e interface na fonte do sistema (`font-ui`). A skill `.claude/skills/design-taste-frontend` é de terceiros: não editar.
