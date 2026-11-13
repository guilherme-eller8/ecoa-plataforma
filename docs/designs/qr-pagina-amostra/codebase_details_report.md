# Revisão de precisão técnica e reuso (egm:egm-codebase-details, Sonnet) — v1

Resumo do relatório (íntegra na conversa da sessão do prompt 10, 13/11/2026). Veredito: o SQL está coerente com as migrations reais; o doc tinha 3 afirmações que não batiam com o código (ids do recorte, teste das rotas do autor, "menu" do editor) e lacunas de empacotamento e de proxy.

1. **Alto:** o teste das rotas do autor com allowlist não é viável (superfície real inclui `autor_consentir`, `autor_preparar_gravacao`, `autor_pagina`, `servico_confirmar_gravacao_autor`, `events`, `lib/pipeline/disparo.ts`). Inverter para denylist das tabelas da família e dizer que não cobre acesso dinâmico.
2. **Alto:** ids de `story_recordings.segmentos` = ids de `transcripts.segmentos` (já contínuos na história), sem somar `segmento_inicial`; `inicio`/`fim` em segundos do arquivo; filtrar por `recording_id`. Reusar `temposDosSegmentos`/`trechoDaGravacao` de `lib/historias/dados.ts`.
3. **Alto:** áudio acrescentado entra em `story_recordings` com `segmentos` nulo, às vezes sem transcrição, e mesmo antes de a proposta entrar no texto. Decidir se entra no recorte.
4. **Alto:** proxy: checar o host `ouvir.` antes de `/f` e `/a`; o matcher deixa passar `_next/*` e arquivos com extensão; `/ouvir` no host `app.` cai no ramo com sessão; o rewrite precisa da regex do alfabeto; usar `DOMINIO_QR`.
5. **Médio:** chave de rede com `envLinks()` + `createHmac` em hex; `assinarLeitura` ganha validade por parâmetro; definir o cabeçalho do IP e o caso sem IP.
6. **Médio:** `ffmpeg-static` vai para dependencies; `outputFileTracingIncludes` para ffmpeg, template, fontes e `.wasm`; `serverExternalPackages` para Typst e mupdf; não importar Typst/mupdf em `funcoes.ts`.
7. **Médio:** `scripts/lab/pdf-motor/` não existia: marcar como a criar ou commitar.
8. **Médio:** não há "menu da história": o botão fica no bloco "Pronta para o livro" do editor; fluxo em 2 passos (ação `criarQr`, depois o link do GET).
9. **Médio:** `cacheComponents`: `/ouvir/[codigo]` com `<Suspense>` e `params.then`; `maxDuration` na rota do PDF; falha da conferência não pode responder `application/pdf`.
10. **Baixo:** contagem de testes; reusar `caminhoFfmpeg()` de `scripts/lab/audio.ts`.
11. **Baixo:** limpeza de `qr_consultas` a cada chamada (mover para cron); `qr_aberto` conta "preparando" e recargas; **`criar_qr` aceita código escolhido pelo membro** (sortear no banco).
12. **Baixo:** lacunas: tela para erro inesperado, normalização de 0/O/1/I/L, título nulo, slug do arquivo, formato de `stories.texto`, foto do bucket `acervo`, configuração do job no Inngest.
