# Decisão: fila de jobs (Inngest × Trigger.dev)

Data: 2026-11-08 · **Decisão final em 2026-11-11: Inngest (T34).** O Trigger.dev (T33) foi descartado no mesmo dia: em 01/11/2026 ele informou um vazamento de variáveis de ambiente de parte dos clientes, e a integração com a Vercel copiaria para lá a chave secreta do Supabase. O projeto `proj_xpayjgisiwpadkufryyi` foi criado e não recebeu nenhuma chave nem acesso a repositório.

## Como ligar o Inngest (prompt 6)

1. **Guilherme:** conta no Inngest e a integração dele na Vercel (Marketplace), ligada ao projeto `ecoa-plataforma`. Ela cria só as chaves do próprio Inngest (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`) na Vercel.
2. **Prompt 6:** SDK, rota `/api/inngest` e as funções do pipeline. As chaves do Supabase, da Anthropic e do ElevenLabs ficam só na Vercel.
3. **Guilherme:** `ANTHROPIC_API_KEY` e `ELEVENLABS_API_KEY` nas variáveis da Vercel (Production e Preview). Nunca no chat.
4. **Prompt 6:** conferir o teto de tempo das funções no plano da Vercel e dividir os passos para caber nele.

A análise original (abaixo) é mantida como histórico.

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
