# Resolução dos achados goldfish

Cada achado foi classificado como **Aceito** (o design mudou) ou **Contestado** (fica como está, com o motivo).

## Segurança (critic_report.md)

| Achado | Decisão | Onde mudou |
| --- | --- | --- |
| B1 redirect curinga | Aceito: só URLs exatas | Login, guia de setup |
| B2 conta criada antes por estranho | Aceito: cadastro desligado, `identidadeAceitavel` | Login, `ativarPlano`, CUJ 6 |
| M1 limite contornável | Aceito: limite fica com o Supabase Auth; fluxo próprio removido | Login, Alternativa C |
| M2 enumeração por tempo | Aceito: `after()` | Login |
| M3 scanner queima link | Aceito: página com botão e POST | `/auth/confirmar` |
| M4 chave secreta ignora plano | Aceito: regra escrita | Quem pode o quê |
| M5 `autor_foto_path` | Aceito: coluna sai (vai para o prompt 4) | SQL |
| M6 grants padrão | Aceito: revogação global de EXECUTE e testes genéricos | SQL, `rls.test.ts` |
| M7 e-mail digitado errado | Aceito: confirmação e `admin_trocar_responsavel` | CUJ 1, SQL |
| M8 seção de riscos | Aceito | Riscos e mitigações |
| Nit MFA do admin | Aceito em parte: 2 etapas no Google agora, MFA no Supabase na onda 2 | Riscos |
| Nits de testes e LGPD | Aceitos | `rls.test.ts`, Eventos |

## Zoom out (zoom_out_report.md)

| Achado | Decisão |
| --- | --- |
| 1 M10 falha (sessão longa) | Aceito: `entrou` ao abrir o livro, 1 por dia |
| 2 escopo e retrabalho | Aceito: cortes 3, 6, 7, 8 e 9; gate para no PASS. **Contestado** fazer o prompt 2 antes: o aceite do Natal depende de login, e o prompt 2 não bloqueia |
| 3 reinvenção do link mágico | Aceito |
| 4 domínio escondido | Aceito: `docs/decisoes/dominio.md` e commit separado |
| 5 dois caminhos do admin | Aceito: só servidor e chave secreta |
| 6 `lib/tokens.ts` | Aceito: fica para o prompt 5 |
| 7 colunas e enum do prompt 4 | Aceito |
| 8 `/previa` × `/styleguide` | Aceito |
| 9 lista de livros e duplo toque | Aceito |
| 10 fonte em e-mail | Aceito: Georgia |

## Prontidão (implementation_readiness_report.md)

Todos os achados foram aceitos: B1 (alias do Vitest), M1–M12 e todos os nits. Os novos testes automáticos de `urlDoApp`, `decidirRota`, `prepararPedidoDeLink`, `identidadeAceitavel` e da porta única de eventos respondem ao M10 do relatório.

## Ficou de fora, de propósito

- Teste automático do tempo de entrega do e-mail (Objetivo 1): verificação manual.
- MFA (`aal2`) para o admin no Supabase: onda 2.
