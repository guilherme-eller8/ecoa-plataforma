# Plano: central de Evals no admin (T51, P66)

**Estado:** fase 0 sem banco entregue em 15/11/2026. Migration da fase 0 ensaiada, **esperando o OK do Guilherme**. Fases 1 a 3 ainda sem design.

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
| 1 | Comparação IA × família ao marcar como pronta; `/admin/evals` com Resumo, Transcrição, Texto fiel, Custo e tempo; alerta no critério de morte | 1 tabela de resultados | Design doc próprio (schema: EGM) |
| 2 | Fila "histórias para olhar", comparação lado a lado, rastro por história, versões das regras | Consentimento por livro (P66) | Design doc próprio |
| 3 | Gabarito de transcrição (12 trechos), juiz calibrado (50 parágrafos), canários | Nenhum | Gatilhos da T31 |

Fica para a fase 1, com motivo: registrar o uso da transcrição das mensagens (`/m`). `ai_usage.minutos_audio` entra na cota diária de T38; gravar as mensagens ali sem mexer nas funções da cota gastaria a cota das histórias.

## Fase 0, parte sem banco (entregue)

- **Erro definitivo não repete.** `CODIGOS_DEFINITIVOS` em `lib/pipeline/erros.ts`; `passosDe` em `lib/inngest/funcoes.ts` troca por `NonRetriableError`. Falha do provedor e JSON inválido continuam repetindo (com `tentativa` gravada, os dados dirão se a repetição resolve).
- **Resposta cortada** tenta 1 vez com o dobro do teto (`lib/ai/claude.ts`).
- **Tempo e tentativas reais:** `ms` e `ms_primeira_palavra` contam do início da 1ª tentativa; `ai_usage.tentativa` passa a ser escrita; a falha também grava o tempo.
- **Corte no pedido de transcrição** pela duração do áudio (`timeoutDaTranscricaoMs`, números em `lib/config.ts`).
- **Falha na tela:** `tipoDeFalha` (`lib/pipeline/regras.ts`) devolve `sem_fala` ou `geral`; o servidor lê o código com a chave secreta e entrega só o tipo (P66). Sem fala: "Grave de novo" com botão. Geral: "Já fomos avisados".
- **E-mail ao admin** a cada falha geral (`lib/email/alerta.ts`), no máximo 1 por livro e hora, só com ids e códigos.

## Fase 0, migration (esperando OK)

Arquivo: `supabase/migrations/20261123120000_evals_fase0.sql`. Ensaiada em PGlite com as migrations reais: aceita linha boa, recusa texto em `detalhes`, recusa código com `ok = true`, função só para `service_role`, reversão e nova subida sem erro.

```sql
-- Evals, fase 0 (decisão T51): o que o pipeline já calcula passa a ficar guardado.
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

Reversão (`supabase/reversao/20261123120000_evals_fase0.down.sql`):

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
