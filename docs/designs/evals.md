# Plano: central de Evals no admin (T54, P68)

**Estado:** fase 0 entregue e no ar em 15/11/2026 (código e migration). Fases 1 a 3 ainda sem design.

## Por quê

A régua de qualidade escolhida na T31 é comparar o texto da IA com o texto que a família corrigiu. O código existe (`lib/ai/comparar.ts`) e só roda no laboratório: em produção, a hipótese (corrigir até 1 em cada 3 parágrafos) e o critério de morte (1 escape; mais de 50% reescrito em 3 histórias seguidas) não têm como disparar. Em 15/11 a produção tinha 2 livros, 3,45 min de áudio e 1 história corrigida: a central se justifica para capturar o lote da ceia de Natal, não para analisar o que existe hoje.

## Duas camadas, medidas separadas

| Camada | Quem erra | O que corrige |
| --- | --- | --- |
| Fala → palavras | Scribe | Glossário, dicas, provedor |
| Palavras → história | Claude | Arquivos de regras em `lib/ai/prompts` |

## Fases

| Fase | O que entra | Banco | Depende de |
| --- | --- | --- | --- |
| 0 | Guardar o que já é calculado; parar repetição paga; corte na transcrição; frase de falha por tipo; e-mail ao admin | 1 migration pequena (abaixo) | OK no SQL |
| 1A | `/admin/evals` com Custo e tempo e `/admin/evals/adocao` (livro ativo, ativação, coorte, funil); alertas por e-mail (gasto, fila parada, perda em falhas) | 1 migration só com funções de leitura (sem tabela) | OK no SQL e no plano curto (seção abaixo) |
| 1B | Comparação IA × família ao marcar como pronta; abas Resumo, Transcrição e Texto fiel; alerta no critério de morte | 1 tabela de resultados | Design doc próprio (schema: EGM) |
| 2 | Fila "histórias para olhar", comparação lado a lado, rastro por história, versões das regras | Consentimento por livro (P68) | Design doc próprio |
| 3 | Gabarito de transcrição (12 trechos), juiz calibrado (50 parágrafos), canários | Nenhum | Gatilhos da T31 |

Fica para a fase 1, com motivo: registrar o uso da transcrição das mensagens (`/m`). `ai_usage.minutos_audio` entra na cota diária de T38; gravar as mensagens ali sem mexer nas funções da cota gastaria a cota das histórias.

## Fase 0, parte sem banco (entregue)

- **Erro definitivo não repete.** `CODIGOS_DEFINITIVOS` em `lib/pipeline/erros.ts`; `passosDe` em `lib/inngest/funcoes.ts` troca por `NonRetriableError`. Falha do provedor e JSON inválido continuam repetindo (com `tentativa` gravada, os dados dirão se a repetição resolve).
- **Resposta cortada** tenta 1 vez com o dobro do teto (`lib/ai/claude.ts`).
- **Tempo e tentativas reais:** `ms` e `ms_primeira_palavra` contam do início da 1ª tentativa; `ai_usage.tentativa` passa a ser escrita; a falha também grava o tempo.
- **Corte no pedido de transcrição** pela duração do áudio (`timeoutDaTranscricaoMs`, números em `lib/config.ts`).
- **Falha na tela:** `tipoDeFalha` (`lib/pipeline/regras.ts`) devolve `sem_fala` ou `geral`; o servidor lê o código com a chave secreta e entrega só o tipo (P68). Sem fala: "Grave de novo" com botão. Geral: "Já fomos avisados".
- **E-mail ao admin** a cada falha geral (`lib/email/alerta.ts`), no máximo 1 por livro e hora, só com ids e códigos.

## Fase 0, migration (aplicada)

Arquivo: `supabase/migrations/20261124120000_evals_fase0.sql`. **Aplicada no Supabase em 15/11/2026, com o OK do Guilherme.** Teste: `supabase/tests/evals.test.ts`. `detalhes` aceita lista só de números (o jsonpath em modo lax desembrulha listas) e recusa qualquer texto, inclusive dentro de lista. Ensaiada em PGlite com as migrations reais: aceita linha boa, recusa texto em `detalhes`, recusa código com `ok = true`, função só para `service_role`, reversão e nova subida sem erro.

```sql
-- Evals, fase 0 (decisão T54): o que o pipeline já calcula passa a ficar guardado.
-- Mexe só em ai_usage, tabela do admin: RLS ligada, sem política e sem grant para quem está
-- logado. Nenhuma tela do cliente lê estas colunas.

-- 1. Por chamada: o código do erro, a espera desde o envio e contagens da etapa
alter table public.ai_usage
  add column erro_codigo text
    check (erro_codigo is null or erro_codigo ~ '^[a-z_]{2,40}$'),
  add column ms_desde_envio integer
    check (ms_desde_envio is null or ms_desde_envio >= 0),
  add column detalhes jsonb
    check (
      detalhes is null
      or (
        jsonb_typeof(detalhes) = 'object'
        -- Só números: nenhum texto da fala cabe aqui, nem por engano (T36).
        and not jsonb_path_exists(detalhes, '$.* ? (@.type() != "number")')
      )
    );
alter table public.ai_usage
  add constraint ai_usage_erro_so_na_falha check (erro_codigo is null or not ok);

comment on column public.ai_usage.erro_codigo is
  'Código fixo de lib/pipeline/erros.ts quando ok = false. Nunca texto.';
comment on column public.ai_usage.ms_desde_envio is
  'Na etapa editar: do áudio recebido à primeira palavra publicada na tela (meta: 60 s).';
comment on column public.ai_usage.detalhes is
  'Contagens da etapa, só números (palavras, duvidosas, falantes, marcacoes, nao_localizadas…).';

-- 2. Custo por livro somado no banco. O admin somava no servidor as linhas lidas pela API,
--    que devolve no máximo 1.000: acima disso o total ficava abaixo do real, sem erro.
create function public.admin_custos_por_livro()
returns table (
  book_id uuid,
  custo_usd numeric,
  minutos_audio numeric,
  chamadas bigint,
  falhas bigint
)
language sql stable security definer set search_path = '' as $$
  select
    u.book_id,
    sum(u.custo_usd),
    coalesce(sum(u.minutos_audio) filter (where u.etapa = 'transcrever'), 0),
    count(*),
    count(*) filter (where not u.ok)
  from public.ai_usage u
  group by u.book_id
$$;

revoke all on function public.admin_custos_por_livro() from public, anon, authenticated;
grant execute on function public.admin_custos_por_livro() to service_role;
```

Reversão (`supabase/reversao/20261124120000_evals_fase0.down.sql`):

```sql
-- Reversão de evals_fase0: volta ai_usage ao que era. As colunas novas são só registro;
-- apagar não afeta nenhuma história, versão ou transcrição.
drop function public.admin_custos_por_livro();
alter table public.ai_usage
  drop constraint ai_usage_erro_so_na_falha,
  drop column detalhes,
  drop column ms_desde_envio,
  drop column erro_codigo;
```

Depois do OK, o código passa a escrever: `erro_codigo` em toda falha; `ms_desde_envio` na etapa `editar`; `detalhes` em `transcrever` (palavras, duvidosas, falantes, cobertura), `editar` (parágrafos, palavras) e `verificar` (marcações, do verificador, não localizadas). O admin troca a soma no servidor por `admin_custos_por_livro()`.

## A central também é uma aposta

- **Hipótese:** em 10 minutos por semana, o Guilherme acha a principal causa de correção e muda uma regra com efeito medido.
- **Teste:** fases 0 e 1 no ar antes da ceia; com 5 histórias corrigidas, uma sessão de leitura cronometrada.
- **Métrica:** mudanças de regra que nasceram da central e baixaram os parágrafos corrigidos na versão seguinte.
- **Critério de morte:** 3 semanas com histórias novas e nenhuma decisão tomada a partir da tela. Vira um e-mail semanal de 6 números; as fases 2 e 3 não saem.

## Fase 1A: custo, performance e adoção (para a próxima sessão)

**Estado:** só o plano. Nada construído. Simulação visual (números inventados, exceto o custo por minuto): https://claude.ai/artifact/RU3m1d5e9dbaDbPErH9qWY (privada do Guilherme; a especificação abaixo basta sem ela).

### Por quê agora

- A ceia de Natal gera o primeiro lote real. O que não for medido nela, não se recupera.
- Custo e adoção já têm dado no banco (`ai_usage` e `events`); falta somar, definir e mostrar.
- O custo real medido na história de 1 min 42 (15/11) é US$ 0,064, ou R$ 0,21 por minuto de áudio. Isso dá cerca de R$ 32 por livro de 150 min só na primeira escrita, contra a meta de R$ 30 (PRD). Uma história é pouco: parte do custo é fixo. São precisas cerca de 10 histórias para separar o fixo do variável.
- Falhas e repetições custaram 23% de todo o gasto de IA até 15/11 (US$ 0,056 de 0,245, todos de 13/11, antes da fase 0).
- Em 15/11 a fila do Inngest ficou parada e nada avisou: uma gravação esperou 18 min.

### Aposta (hipótese, métrica, critério de morte)

- **Hipótese:** em 10 minutos por semana, o Guilherme vê quanto cada livro custa, qual hábito de uso o encarece e quais livros pararam, e decide sobre o custo da escrita antes de ter 5 histórias corrigidas.
- **Teste mais rápido:** 1A no ar antes da ceia.
- **Métrica de sucesso:** uma decisão de custo ou de retenção tomada a partir da tela até 25/12 (por exemplo, abrir o experimento de escrita com modelo ou esforço menor).
- **Critério de morte:** 3 semanas com histórias novas e nenhuma decisão tomada a partir da tela. Vira um e-mail semanal de 6 números e a 1B e as fases seguintes não saem.

### Antes de construir (30 min, nesta ordem, com resultado escrito neste doc)

1. **Por que o Inngest não sincronizou sozinho.** Depois dos merges dos PRs #12 a #15, o último sync era o manual de 15/11 às 17:04, com a URL fixa `https://app.ecoa-memorias.com.br/api/inngest`. Antes dele, o sync apontava para um deploy específico (09:25) e a varredura reenviou uma gravação sem que nenhuma execução começasse. Confirmar como a integração Vercel × Inngest sincroniza (os valores `INNGEST_*` têm `configurationId`, então a integração está instalada) e se a URL fixa resolve. Se não resolver, o alerta de fila parada abaixo passa a ser a defesa.
2. **Teto de linhas da API.** O PostgREST devolve no máximo `max_rows` linhas (padrão 1.000), qualquer que seja o `.limit()`. O painel de aderência pede até 20.000 eventos (`ADERENCIA_MAX_EVENTOS`) e só avisa "truncado" se vierem 20.000, então pode estar lendo menos sem avisar. Conferir o `max_rows` do projeto; ler `events` paginando ou agregando no banco. Tudo o que somar linhas na 1A faz isso no banco.

### Entregas

**1. Páginas do admin** (nova aba "Evals" em `components/telas/admin-cabecalho.tsx`; padrão de `app/admin/aderencia/page.tsx`: `notFound()` se não for admin, chave secreta só no servidor).

- `/admin/evals` (Custo e tempo):
  - gasto de 30 dias, por minuto de áudio, por história, perda em falhas e repetições, custo das trocas de tamanho, entrada servida pelo cache;
  - gasto por semana e etapa (barras empilhadas);
  - projeção de custo por livro, com a tabela de hábitos (0; 0,5; 1 e 2 trocas de tamanho por história) a partir do custo por minuto medido, contra a meta de R$ 30 (`lib/ai/custo.ts` → `projetarLivroUSD` hoje só roda no laboratório);
  - primeira palavra por faixa de duração do áudio (mediana e 95%);
  - falhas por código.
- `/admin/evals/adocao`:
  - livros ativos na semana; ativação em 7 dias; retenção por coorte; funil até publicar; quem mantém o livro vivo; valor entregue;
  - lista "livros para conversar", ligada a `/admin/aderencia/[livro]` (não duplica o que a Aderência já mostra).
- Toda taxa mostra a contagem e, abaixo de N (em `lib/config.ts`), "amostra pequena" em vez de percentual. Estado vazio: uma frase e um botão. Celular primeiro.

**2. Definições** (puras, em `lib/evals/`, com testes; viram decisão nova em `docs/decisoes.md` e `decisoes-resumo.md`):

- **Livro ativo na semana:** 1 ou mais ações de criação por responsável, co-facilitador ou autor: `gravou`, `subiu_audio`, `editou`, `enviou_pergunta`, `historia_revisada`, `montou_livro`. `entrou` e eventos de família não contam (o link da família não tem login: contar ações por livro, nunca "pessoa distinta").
- **Ativação:** 1ª história revisada em até 7 dias do `plano_ativado`.
- **Retenção por coorte:** livros da coorte (semana do `plano_ativado`) ativos na semana N, dividido pelos da coorte.
- **Tempo até a 1ª história pronta:** mediana em horas desde o `plano_ativado`.
- **Perda em falhas:** custo das linhas de `ai_usage` com `ok = false`, dividido pelo gasto. Repetição dentro de uma chamada que deu certo já está somada na linha (`uso` acumula as tentativas): contar `tentativa > 1`, não somar à parte.
- **Custo por minuto, já com trocas e falhas:** gasto dividido pelos minutos da etapa `transcrever`. Meta provisória: R$ 0,20 por minuto (R$ 30 por 150 min).
- **Primeira palavra:** `ms_desde_envio` da etapa `editar`. Esperas acima de 30 min contam à parte como "fila parada" e saem dos percentis (a de 15/11 foi 19 min por causa do Inngest). Faixa de duração = soma de `minutos_audio` da etapa `transcrever` da mesma história.
- Metas provisórias a decidir com o Guilherme: livros ativos 60%, ativação 70%, retenção na semana 4 de 50%, tempo até a 1ª história pronta 48 h.

**3. Banco** (1 migration, **sem tabela**): funções de leitura `security definer`, só `service_role` (padrão de `admin_custos_por_livro`), mostrando antes o SQL de subida e o de reversão e esperando o OK.

- `admin_uso_por_dia(p_desde, p_ate)`: por dia (Brasília), etapa e modelo: chamadas, falhas, chamadas com `tentativa > 1`, `custo_usd`, `custo_usd` das falhas, minutos de áudio, tokens de entrada, saída, cache lido e cache gravado.
- `admin_primeira_palavra(p_desde)`: percentis 50 e 95 de `ms_desde_envio` por faixa de duração, mais a contagem de esperas acima de 30 min.
- Testes em `supabase/tests/`: só `service_role` executa; soma correta acima de 1.000 linhas; percentis ignoram a espera acima de 30 min; nenhuma coluna de texto.

**4. Alertas por e-mail** (função do Inngest com cron, padrão de `lib/inngest/resumo.ts` e `lib/email/alerta.ts`; só ids e números, nunca nome nem texto; no máximo 1 por condição e por dia, com chave de idempotência):

- **Fila parada:** gravação `recebida` há mais de 15 min, com consentimento, sem `processado_em`, fora das esperas legítimas (lote incompleto até 6 h, cota diária adiada, arquivo acima de 2 h) e que a varredura já reenviou. É o sinal de que o reenvio não adiantou.
- **Gasto do dia** acima de R$ 25, ou de um livro acima de R$ 30 acumulados.
- **Perda em falhas** acima de 5% do gasto da semana.
- **Pedidos de IA de um livro** em 80% do teto do dia (P54: 40 pedidos; T38: 240 min).
- Todos os limites em `lib/config.ts`, nenhum número de negócio fora dele.

### Fora da 1A, de propósito

- Comparação IA × família, texto da história e consentimento (1B e fase 2). Foto semanal e diário de mudanças: precisam de tabela, entram com a 1B.
- Gabarito, juiz de IA e canários (fase 3, gatilhos da T31).
- Registrar o uso da transcrição das mensagens `/m` (mexe na cota da T38).
- Qualquer coisa de LGPD ou de e-mail de resumo ao cliente.

### Como conduzir (CLAUDE.md)

- Começar lendo `docs/decisoes-resumo.md`, `docs/mapa.md` e este arquivo. Uma sessão só para a 1A, com `/clear` antes.
- Tela com 1 migration só de funções de leitura: plano curto aprovado pelo Guilherme e SQL aprovado antes de aplicar. Revisores do EGM: decidir com o Guilherme no início; recomendação: 1 revisor de segurança (`egm:egm-design`, `model: sonnet`), uma rodada, sobre o SQL, porque o admin lê dados de todos os livros.
- Gate: build, lint, testes e e2e; gate de design nas telas novas (390, 768 e 1440 px); deploy de prévia conferido na Vercel. **Testar a produção em `app.ecoa-memorias.com.br`:** o link de prévia sobe áudio mas não processa (o Inngest só está ligado à produção).
- Depois do merge, conferir no Inngest se a função nova entrou (`sync` com a URL fixa de produção).
