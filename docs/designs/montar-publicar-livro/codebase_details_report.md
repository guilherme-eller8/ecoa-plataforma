# Revisão de código (egm:egm-codebase-details, Sonnet), prompt 13 v1

1. Recorte de mensagem quebra: `TrechosQr` (lib/qr/tipos.ts) exige `recording_id` uuid e não tem `bucket`; `cortarESubir` baixa só de `audios`; `planejarRecorte` indexa por `recording_id`. Tipo pela extensão cai em `audio/ogg` para extensão desconhecida. (confirmado)
2. Player quebra para mensagem: `OuvirQr` exige `titulo`; `EstadoPlayer` e `tela-player.tsx` só conhecem título/ano; assinaturas em lib/supabase/tipos.ts. (confirmado)
3. `sharp` não é dependência direta (só opcional do next). Adicionar e pôr em `serverExternalPackages`. (confirmado)
4. `outputFileTracingIncludes` de `/api/inngest` não tem templates nem fontes; a rota da amostra passa a precisar de `comum.typ`. ~160 MB plausível, não medido.
5. Conferência de QR reinventa `conferirQr` (só página 0, exige 1 página): generalizar. Reusar `qrDoCodigo`, `NodeCompiler.create`, `mapShadow`; QR por caminho próprio (`/qr-{codigo}.svg`). (confirmado)
6. APIs confirmadas: `query`, `svg`, `setPageBox` (TrimBox/BleedBox), `asJPEG`, `saveToBuffer`. Não confirmado: `here().position()` em `metadata` via `query`; posição em pt, página 1-based, origem inclui a sangria.
7. Q13 não sai como escrito: texto em `rgb()`, QR em SVG `#000000` (RGB). Usar `cmyk(0%,0%,0%,100%)` e desenhar o QR em Typst. (suspeita forte)
8. Consumidores de `palavras_por_pagina`/21×21 não listados: `lib/livro/paginas.ts`, `lib/exemplos/livro-jair.ts`, `servico_resumo_semanal`, `config-banco.test.ts`, `FORMATO_LIVRO`, `SANGRIA_MM`, `FOTO_LADO_MAX_PX`, `FOTO_LADO_MIN_IMPRESSAO_PX`, constantes de `amostra.ts`. (confirmado)
9. `qr_duracao_max_s`: `duracao_s` nulo desliga o teto (null + folga). (confirmado)
10. `publicar_livro`: `rev` lida sem trava; `montagem_salvar` pode confirmar entre a leitura da rev e a do conteúdo. (confirmado por análise)
11. Expirar a presa volta no rollback se a publicação falhar depois; sem layout dá `montagem_mudou` em vez de `livro_sem_titulo`; título `''`. (baixa)
12. QR já criado pela amostra conta como ligado mesmo se a história não passa mais em `historia_aceita_qr`. `pg_column_size` mede comprimido. (suspeita)

Veredito: arquitetura sólida; corrigir 1-3, 4, 7 e 9 antes de construir.
