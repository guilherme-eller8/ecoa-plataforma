# Decisão: fila de jobs (Inngest × Trigger.dev)

Data: 2026-11-08 · Status: **aprovada em 2026-11-11 (T33): Trigger.dev v4, cloud** · Projeto `proj_xpayjgisiwpadkufryyi` criado pelo Guilherme · A instalação (SDK, `trigger.config.ts`, jobs) é do prompt 6.

## Como ligar (ordem)

1. **Feito:** conta e projeto no Trigger.dev.
2. **Guilherme:** integração com o GitHub, só no repositório `guilherme-eller8/ecoa-plataforma`, com `main` → produção (e *Preview branches*, se o plano permitir).
3. **Prompt 6:** SDK e `trigger.config.ts` com o projeto acima, sem rodar `trigger.dev init` (ele pede login pelo navegador e cria arquivos fora da branch).
4. **Guilherme, depois do passo 3:** integração com a Vercel (Production → Production, Preview → Preview), sem *atomic deploy* no começo e sem sincronizar `LINKS_SEGREDO_V*`.
5. **Guilherme:** `ANTHROPIC_API_KEY` e `ELEVENLABS_API_KEY` nas variáveis da Vercel (Production e Preview); a integração leva ao Trigger.dev. Nunca no chat.

## Recomendação (5 linhas)

1. **Trigger.dev (v4, cloud).** Os jobs rodam na infraestrutura deles, e não dentro das funções da Vercel: uma transcrição com edição de 10 minutos não esbarra no limite de duração da função.
2. O trabalho de áudio pesado (converter .opus, cortar arquivos de até 100 MB, rodar o ffmpeg) fica fora da Vercel. No Inngest, ele rodaria dentro de uma função da Vercel, com limite de pacote e de memória.
3. Novas tentativas por tarefa e espera sem custo (pausas com checkpoint). O streaming dos tokens para o front já vem nativo (Realtime e streams com hooks de React), mas o PRD usa Supabase Realtime de qualquer forma.
4. Risco: o plano grátis tem só US$ 5 de crédito de computação por mês, e o tempo esperando a resposta da API conta. Para 2 famílias deve bastar; o plano Hobby (US$ 10/mês) é o próximo passo.
5. Inngest seria a escolha se tudo coubesse em passos curtos na Vercel: 50 mil execuções grátis e nenhum custo de computação extra. Mas cada passo fica preso ao teto da função (Pro: 300 s padrão, 800 s no máximo), e o ffmpeg teria que rodar dentro da Vercel.

## Comparação

| Critério | Inngest | Trigger.dev |
| --- | --- | --- |
| Plano grátis | 50 mil execuções/mês, 5 passos simultâneos; pausa ao estourar | US$ 5/mês de crédito de computação, ~10–20 execuções simultâneas, logs por 1 dia; para ao estourar |
| Onde o código roda | Dentro das funções da Vercel (Inngest só orquestra) | Contêineres do Trigger.dev |
| Jobs de até 10 min | Sim, se divididos em `step.run`; cada passo ≤ duração máxima da função (Hobby 300 s; Pro até 800 s) | Sim, sem teto prático; espera com checkpoint não consome computação |
| Novas tentativas | Por passo, configurável | Por tarefa, configurável, com backoff |
| Tempo real para o front | `@inngest/realtime` (canais publicados a partir dos passos) | Realtime nativo, streams de metadados, hooks `useRealtimeRun` |
| ffmpeg / arquivos grandes | Limitado pelo pacote e pela memória da função na Vercel | Extensão de build do ffmpeg, máquina configurável |
| Next.js na Vercel | Integração oficial, rota `/api/inngest` | SDK + deploy separado (`npx trigger.dev deploy`) |

## A verificar antes de instalar (prompt 6)

- Os sites de preço (inngest.com, trigger.dev) estavam bloqueados na rede desta sessão. Os números acima vêm de buscas e de sites de terceiros, que divergem quanto ao limite de execuções simultâneas do Trigger.dev grátis. Confirmar na página oficial.
- LGPD: a região de execução do Trigger.dev é EUA/UE. Passar só o caminho do áudio no Storage (região São Paulo) e baixar com URL assinada de curta duração dentro do job. Registrar o provedor na política de privacidade.
- Medir no laboratório (prompt 1) quanto tempo de computação um áudio de 15 min consome, para projetar o custo do crédito grátis.

## Fontes

- [Inngest pricing](https://www.inngest.com/pricing?ref=footer)
- [Trigger.dev pricing](https://trigger.dev/pricing)
- [Trigger.dev pricing guide (ZenML)](https://www.zenml.io/blog/trigger-dev-pricing)
- [Vercel Functions limitations](https://vercel.com/docs/functions/limitations)
- [Vercel fluid compute](https://vercel.com/docs/concepts/functions/fluid-compute)
