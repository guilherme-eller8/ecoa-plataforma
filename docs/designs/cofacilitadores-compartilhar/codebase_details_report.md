# Revisão de código (egm:egm-codebase-details, Sonnet) — prompt 11, v1

Veredito: **não aprovar ainda** (itens 1 a 5). Nomes de funções, colunas e enums do SQL conferem com o schema.

1. **Blocker** — Passo 4 em `PASSOS` reabre a configuração de todo livro existente e do co-facilitador. Passo condicional por papel, sem mexer em `PASSOS`.
2. **Blocker** — Eventos citados não existem em `lib/eventos-acoes.ts` (o real é `trocou_link_*`). Listar as ações; `compartilhada_tocada` precisa de dedupe no SQL, no molde de `servico_qr_tocou`.
3. **Major** — Proxy e matcher para `/o` (sem sessão, molde de `proxyAutor`) e `/convite` (com sessão + cabeçalhos); teste em `lib/qr/host.test.ts`.
4. **Major** — `createUser` antes dos limites; função de pré-checagem e compensação.
5. **Major** — Compartilhar × `criar_qr`: `historia_sem_audio`, `historia_audio_compartilhado`, `qr_desativado` sem tratamento; `pedir_audio` precisa disparar o recorte; `/o/` sem estado "preparando". Extrair o trecho comum de `abrirQr`.
6. **Major** — Reuso: extrair `contaParaEmail` de `app/admin/acoes.ts`; `TipoLink` + `urlConvite`/`urlCompartilhada`; `lib/whatsapp.ts` (`linkWhatsApp`); `lib/telefone.ts`; helper do link do autor no lembrete.
7. **Major** — Resumo: arquivo `lib/inngest/resumo.ts`, `step.sendEvent` em lote, `servico_membros_para_resumo`, `pronta_em` em vez de `criado_em`, paridade da contagem de palavras.
8. **Major** — `aceitar_convite` × plano vencido; exceção do `servico_criar_convite` ao `eh_responsavel`; trocar as checagens inline.
9. **Major** — Fonte do nome de quem convidou e `mascararEmail`; aceitar por `convite_id`.
10. **Minor** — Onde moram ações e telas (passo 4 em `ligar-acoes.ts`), frases de erro, styleguide, `docs/mapa.md`.
11. **Minor** — Espelhos novos em `config.ts` e `config-banco.test.ts`.
12. **Minor** — "Pronta" em dois sentidos; link revogado e errado indistinguíveis (teste de código).
