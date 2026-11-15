# Prompt 15, parte 1: painel de aderência e erros no admin

Plano curto (T28: tela sem banco, sem revisores). Escopo aprovado em 15/11/2026: só os itens 1 e 4 do prompt 15. Termos, exportar/excluir, teste ponta a ponta e checklist ficam para depois dos prompts 13 e 14.

## Hipótese que o painel serve

P55: um autor grava sozinho pelo link em até 7 dias. Prazo 17/11. Em 15/11, no banco de produção: 2 livros, 5 gravações, **0 do autor** (todas do responsável); o autor consentiu em 10/11 e não gravou. O painel tem que responder em 3 segundos: o autor abriu o link? Gravou? Em que passo cada livro travou?

Lacuna encontrada: `entrou` só é gravado para membros (`/livro/[id]`). A abertura do link do autor não vira evento. Sem isso, "abriu e não gravou" e "nem abriu" ficam iguais.

## O que entra

1. **`/admin/aderencia`** (lista, 1 linha por livro, ordenada por parado há mais tempo):
   - autor, passo do onboarding (dos 5 passos da M11, calculado dos dados, como pede a P48), dias desde a última ação de pessoa (sistema e admin não contam), selo "parado" com 7 dias ou mais;
   - gravações por semana (últimas 8), separando autor de membro;
   - funil no topo: configurou → 1ª história pronta → 5 prontas → publicado (este mostra "—" até o prompt 13).
2. **`/admin/aderencia/[livro]`**: acessos por dia por pessoa (últimos 14 dias, papel + e-mail do membro; autor e família sem nome) e a linha do tempo das ações (quem, o quê, quando). É o aceite da M10: "vejo quem acessou o livro X ontem e o que fez".
3. **Evento `entrou` do autor**: ao abrir `/a/[token]` com link válido, 1 por livro e dia (`umaVezPorDia`), `quem: null`, como `autor_consentiu`.
4. **Jobs que falharam**: função do Inngest ouvindo `inngest/function.failed` grava `job_falhou` em `events` (ator `sistema`, detalhes `{ funcao, run_id }` e o livro quando o evento original traz o id). Nunca a mensagem do erro (T36). No admin, lista dos últimos 30 dias com o link do run no painel do Inngest.
5. **Erros do servidor**: `instrumentation.ts` com `onRequestError` grava `erro_servidor` com `{ rota, tipo, digest }` (a rota é o padrão, `/a/[token]`, nunca a URL com token), no máximo 1 por rota por minuto por instância. No admin, contagem das últimas 24 h e 7 dias por rota.

Os 5 passos (P25/M11), em ordem; o livro está no primeiro que falta:

| Passo | Feito quando |
| --- | --- |
| Quem é o autor | `books.autor_nome` preenchido |
| Enquete no grupo | evento `abriu_enquete` |
| 1ª pergunta ou conversa | evento `enviou_pergunta` ou qualquer gravação recebida |
| 1ª história nasce | 1 história `pronta` |
| Revisar e marcar pronta | 1 história com `revisada_em` |

## Como

- Leitura pelo `clienteAdmin()` na página, como o admin atual (o proxy já devolve 404 para quem não é admin, e a página confere de novo). Agregação em TypeScript, em `lib/aderencia/` (funções puras, testadas com Vitest). Volume atual: 32 eventos; o teto de leitura é 30 dias e 20 mil eventos.
- Números em `lib/config.ts`: `LIVRO_PARADO_DIAS = 7`, `ADERENCIA_SEMANAS = 8`, `ADERENCIA_DIAS_ACESSO = 14`.
- Ações novas em `lib/eventos-acoes.ts`: `job_falhou`, `erro_servidor`.
- Telas `components/telas/tela-aderencia.tsx` e `tela-aderencia-livro.tsx`, com exemplos no styleguide e estado vazio. Link "Aderência" no admin atual.
- **Sem migration.** `events.acao` já aceita qualquer `[a-z_]` e o admin lê com a chave secreta.

## Fora

Sentry ou outro serviço de erros (fornecedor novo, sem necessidade com 2 livros: o Vercel já guarda os logs); alerta por e-mail; acessos da família por pessoa (não há identidade, só aparelho).

## Aceite

Com os dados de produção: abro `/admin/aderencia`, vejo os 2 livros com o passo de cada um e as semanas sem gravação do autor; abro um livro e vejo quem entrou ontem e o que fez. Abro `/a/{token}` e o `entrou` do autor aparece no livro. Um job forçado a falhar no dev aparece na lista.
