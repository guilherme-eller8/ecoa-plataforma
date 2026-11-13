# Revisão de segurança e banco: pipeline com texto ao vivo (prompt 6)

Revisor: `egm:egm-design` (Sonnet), rodada única (T28) · 2026-11-11 · revisou a v1 do design doc.

**Veredito:** aprovar com correções. Não há falha crítica: nenhum vazamento entre livros e nenhum acesso pelo `porta_autor`. Os achados 1 a 4 entram na v2; do 5 ao 12, cada um vem com teste de banco ou de prévia.

**Conferido:** `alter default privileges revoke execute ... from public` já existe, então as funções novas em `privado` não ficam abertas. Os grants por coluna e as FKs compostas `(book_id, id)` seguem o padrão das migrations 20261112 e 20261114.

| # | Sev. | Achado | Correção proposta |
| --- | --- | --- | --- |
| 1 | Alto | O `onFailure` de `memoria` ou `avisar`, depois do "pronta", grava `falhou` com `pronta_em` preenchido e viola `stories_pronta`. Uma nova execução sobre história pronta passa para `escrevendo` e paga a IA de novo | `iniciar` devolve o estado; transições com guarda; `memoria` e `avisar` nunca lançam; `onFailure` só sai de `ouvindo`/`escrevendo` |
| 2 | Alto | Gatilho de imutabilidade + `criado_por ... on delete set null`: apagar um usuário (LGPD) falha | O gatilho deixa passar só `criado_por` → null; teste |
| 3 | Alto | O resultado dos passos (a edição) e as mensagens de erro (JSON, zod, SDK com trechos da fala) ficam guardados no Inngest, fora do Brasil. Isso contraria "o Inngest só orquestra" (T34) | Rascunho no banco; passos devolvem só ids; erros com código fixo; nada de texto em log |
| 4 | Alto | `INNGEST_SIGNING_KEY` não aparece como requisito; com `INNGEST_DEV`, o `serve()` aceita chamada sem assinatura; falta teste; o bypass de proteção põe um segredo em terceiro | Chave como gate; travar a inicialização com `INNGEST_DEV` em produção ou prévia; teste de POST sem assinatura; bypass só em Preview |
| 5 | Médio | Concorrência enfileira; *Tentar de novo* sem guarda; história fica em `ouvindo` para sempre se `iniciar` devolver null; evento perdido deixa gravação órfã | `servico_reabrir_historia` atômico; varredura agendada; livro vencido → regra explícita |
| 6 | Médio | `conversa` sem `lote_id` passa; upload de 50 MB pode ter horas; sem teto de custo por livro | Filtro por origem, teto de duração e cota diária no banco |
| 7 | Médio | CHECKs rígidos contra a saída livre do modelo (título vazio, resumo longo, nome longo); a cota do glossário conta recusados e lança no meio do lote; apelido nulo passa | `nullif`, `coalesce`, truncar; `servico_sugerir_nomes` com máximo de 10 e sem lançar; lock; `a is not null` |
| 8 | Médio | `and` não garante a ordem: o cast para uuid pode rodar antes do regex e gerar erro em vez de negar | `case when` ou função com exceção; testes de tópicos malformados |
| 9 | Médio | O canal público com o mesmo nome depende de um clique no painel; a API REST pode guardar o texto em `realtime.messages` | Gate na prévia; se guardar, o canal leva só a etapa |
| 10 | Médio | A reversão apaga a versão da IA; zera `processado_em` de tudo; `disable trigger` inútil; `drop policy` falha sem o schema `realtime` | Trava sem exportação; `update` restrito; sem `disable`; `to_regclass` |
| 11 | Médio | O título vai no e-mail; o e-mail não tem idempotência; a retenção zero do ElevenLabs não está confirmada; o upload do responsável não confere consentimento nenhum | E-mail genérico; `Idempotency-Key`; confirmar o plano; exigir consentimento para a IA |
| 12 | Médio | `grant all` dá TRUNCATE a `service_role`, e o TRUNCATE passa por cima do gatilho de linha | Só select e insert; gatilho `before truncate` |
| 13 | Baixo | As escritas diretas não passam por `livro_editavel`, e o `book_id` vem do código | Funções derivam o livro; regra do livro vencido |
| 14 | Baixo | Falta dizer como o admin é conferido; `event.data` não tem schema | Papel conferido no servidor; zod |
| 15 | Baixo | Insert da transcrição sem `on conflict`; `ai_usage` sem FKs compostas; `select` sem `order by`; tentativas que falham ficam fora do custo | `on conflict`; FKs compostas; `order by ordem`; custo em `finally` |
