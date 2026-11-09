# Ecoa Memórias — Plataforma do Livro

@AGENTS.md

Antes de qualquer tarefa, leia as seções de `docs/prd.md` citadas no prompt. O PRD é a fonte da verdade; este arquivo só guarda as regras que valem sempre. O porquê das decisões de produto e arquitetura (e o que se perde com cada uma) está em `docs/decisoes/produto-e-arquitetura.md`: leia antes de propor mudar algo ali.

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
- **Tokens de link só como hash** (128 bits aleatórios, um recurso por link, revogável). Nunca o token puro no banco, nem nome de pessoa na URL.
- **O token do autor nunca lê `family_messages`** nem o capítulo de mensagens. Garantido por RLS e por teste, não só pela tela.
- **Segredos só em `.env.local`** e nas variáveis da Vercel. Nunca no código, em logs, no commit ou com o prefixo `NEXT_PUBLIC_`.
- Áudio original, `qr_codes` e `book_exports` nunca são apagados por ação comum do usuário.

## Banco de dados

Antes de qualquer alteração de schema, **mostre o SQL de subida e o de reversão e espere o OK**. Só então aplique a migration em `supabase/migrations/`.

## Prompts com [EGM]

Comece pelo fluxo do Elephant-Goldfish (`/egm:egm-brainstorm`, `/egm:egm-draft`, `/egm:egm-review`). O design doc é aprovado em português antes de qualquer código.

EGM artifact directory: docs/designs

## Gate de fim de tarefa

1. `npm run build`, `npm run lint` e `npm test` sem erro (e `npm run test:e2e` quando houver tela).
2. `npm run format`.
3. Commit em português, no padrão Conventional Commits (`feat:`, `fix:`, `chore:`…).
4. Ao final, um resumo em 5 linhas, sem jargão: o que foi construído e como testar no celular.

## Gate de design (prompts com tela)

1. Build de produção rodando (`npm run build && npm run start`).
2. `npm run taste:lint` e `npm run taste:inspect` (390, 768 e 1440 px).
3. Corrigir todo FAIL, criticar as screenshots e corrigir os 3 maiores problemas, em no máximo 3 rodadas.

Régua: um avô de 80 anos e um filho com pressa entendem cada tela em 3 segundos. Uma ação principal por tela, poucas palavras, celular primeiro. Conteúdo do livro em Newsreader (`font-livro`) e interface na fonte do sistema (`font-ui`). A skill `.claude/skills/design-taste-frontend` é de terceiros: não editar.
