# Revisão de código — mensagens da família (prompt 12, v1)

Revisor: `egm:egm-codebase-details` (Sonnet), 14/11/2026, escopo fechado (design doc, SQL, `app/f/[token]/acoes.ts`, `lib/links.ts`, `components/familia/gravador-causo.tsx`, `lib/ai/transcricao/elevenlabs.ts`). Veredito: **não aprovar ainda** (achados 1 a 3 travam a construção; o 4 trava o reaproveitamento da ação do causo).

1. **[Bloqueio] Nada limita o tempo da transcrição na ação.** Só há `maxDuration` em `app/api/inngest/route.ts`, na página da história e na rota da amostra; `transcreverScribe` chama `fetch` sem `AbortSignal`. Se o Scribe pendurar, a reserva de 2 min vence e outra chamada pode começar em paralelo. Correção: `maxDuration` explícito em `app/m/[token]`, `fetch` com `AbortSignal.timeout` abaixo de 2 min, e documentar.
2. **[Bloqueio] O teto de 5 min só existe no cliente; 8 MB não o garante.** `duracao_s` vem do cliente; Opus a 32 kbps cabe ~30 min em 8 MB. Correção: limite de bucket coerente com 5 min (4 a 5 MB) ou medir/limitar a duração no servidor.
3. **[Bloqueio] O gravador do causo não aceita teto por parâmetro.** `LIMITE_S = MAX_CAUSO_AUDIO_MIN * 60` fixo; textos do causo fixos. Correção: props `maxMin` e textos, com o padrão do causo. O mime do gravador cabe no bucket.
4. **[Maior] A ação do causo tem constantes do causo embutidas.** `Math.min(190, …)`, bucket `causos`, `audioDoCauso`, `MAX_CAUSO_AUDIO_MB`, RPCs `servico_*_causo`; não assina foto. Correção: helper parametrizado (bucket, RPC, validador de caminho, MB, duração), incluindo foto.
5. **[Maior] O transcritor força diarização.** `diarize=true` fixo; `OpcoesTranscricao` sem opção. Correção: `diarizar?: boolean`. Citar a origem da chave (`ELEVENLABS_API_KEY` em `lib/pipeline/env.ts`) e do modelo, e conferir que o env do pipeline carrega numa ação.
6. **[Maior] Cookie do aparelho e proxy não servem para `/m`.** Cookie com `path: "/f"`; desvio sem sessão só para `/f/`; matcher só `/f/` e `/a/`. Correção: parametrizar `proxyFamilia(request, path)`, `/m/:path*` no matcher, `/m` público em `lib/rotas.ts`.
7. **[Maior] Imutabilidade bloqueia exclusão de livro.** FK restrict e o gatilho impedem apagar livro com mensagem enviada. Correção: registrar a consequência e o caminho do prompt 15.
8. **[Maior] Q10 diz "os mesmos tetos do causo", e são outros** (causo: 3 min, 2 MB, 2.000 caracteres). Correção: "tetos próprios", com motivo.
9. **[Maior] A dica do apelido não chega à transcrição.** A reserva devolve só `{caminho, livro}`. Correção: devolver o apelido na reserva.
10. **[Detalhe] A reserva não confere plano ativo.** Correção: `livro_editavel` na reserva.
11. **[Detalhe] Doc diz "só enviadas"; a política inclui arquivadas** (`estado <> 'rascunho'`). Corrigir o doc.
12. **[Detalhe] `mensagem_criar` também exige a versão do consentimento; comentário de `hashDoToken` cita só a família.**
