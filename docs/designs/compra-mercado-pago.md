# Compra do plano pelo Mercado Pago (prompt 14, parte 1)

Status: **aprovado pelo Guilherme em 20/11/2026** (fatura: ECOAMEMORIAS) · **construído em 22/11/2026** (ver "Construção") · 18/11/2026 · PRD: M1 (onda 2). A impressão (itens 3 e 4 do prompt 14) fica para um prompt separado, por decisão do Guilherme em 18/11.

## Visão geral

Hoje o plano é pago por Pix e ativado à mão no `/admin`. Este design faz a compra andar sozinha: a pessoa toca em *Comprar* na landing, confere o e-mail, paga com Pix ou cartão em até 12x na página do Mercado Pago, volta para o app vendo "Pronto" e recebe o e-mail de acesso em menos de 1 minuto, sem ninguém da Ecoa no meio.

## O problema

- Parte dos clientes quer pagar no cartão, e parcelado. O Pix manual não atende.
- A ativação à mão cria uma espera: a pessoa paga e não tem livro até alguém abrir o admin.
- A landing é outro repositório com outro banco (T1). Se o pagamento morasse nela, ela precisaria da chave secreta do banco do app.

## Objetivos

1. Comprar em 3 toques depois da landing: e-mail, *Pagar*, pagamento no Mercado Pago.
2. Pagamento aprovado cria o livro, ativa o plano por 12 meses e manda o e-mail de acesso em menos de 1 minuto (aceite do M1).
3. O mesmo pagamento nunca cria dois livros; nenhum pagamento aprovado fica sem livro ou sem alerta.
4. Nenhum segredo e nenhum código de pagamento na landing. Nenhum dado de cartão passa pela Ecoa.
5. O admin vê cada compra e o estado dela e recebe **1** e-mail quando algo foge do normal.

## Não objetivos

- Impressão, frete e extras (prompt 14, parte 2).
- Renovação do plano pelo Mercado Pago (continua no admin; volta quando o 1º plano vencer, em 2027).
- Cupom, preço promocional, nota fiscal automática.
- Boleto (demora dias e não está na P5).
- Entrar sozinho na volta do pagamento, sem login (Alternativa B).
- Desligar o livro sozinho em estorno ou chargeback: o admin decide.
- Captcha: só se aparecer abuso (ver Revisão).

## Decisões novas (registradas em `decisoes.md` em 20/11)

- **P77 Compra pelo app.** O botão da landing leva a `app.ecoa-memorias.com.br/comprar`. Um campo (e-mail), a confirmação "O acesso vai para **fulano@gmail.com**" e *Pagar R$ 467*. O app cria a cobrança no Checkout Pro do Mercado Pago (Pix e cartão até 12x, sem boleto) e manda a pessoa para lá. O e-mail digitado na Ecoa vira o responsável, não o e-mail da conta do Mercado Pago. Na volta, "Pronto" e *Entrar com Google*; o acesso também vai por e-mail. Substitui P5 em parte: sai "link de pagamento", entra "cobrança criada pelo app" (o motivo da P5 continua: nenhum checkout próprio, nenhum dado de cartão).
- **P78 Parcelas.** Até 3x sem juros (a Ecoa paga o parcelamento); de 4x a 12x, juros do Mercado Pago para o cliente. Configurado no painel do Mercado Pago, não no código.
- **T58 Pagamento no banco e no aviso.** `payments` sem política nenhuma: só a chave secreta lê e escreve. O aviso do Mercado Pago tem a assinatura conferida, mas o estado vem **sempre** da consulta à API com o nosso token, nunca do corpo do aviso nem da URL de volta. Aviso, volta e conferência a cada 30 min chamam a mesma função; o banco garante 1 livro por compra (linha travada) e marca o envio do acesso e o alerta para que saiam 1 vez. Segredos `MP_ACCESS_TOKEN` e `MP_WEBHOOK_SEGREDO`. O Preview não tem banco (T57), então a produção roda com as credenciais **de teste** do Mercado Pago (`MP_MODO=teste`, faixa "Modo de teste" na tela) até o CNPJ; o botão da landing só aponta para `/comprar` com `MP_MODO=producao`.

## Jornadas críticas

### CUJ 1: Comprar com cartão
- **Dado** alguém na landing,
- **Quando** toca em *Comprar*, digita o e-mail em `/comprar`, confere "O acesso vai para fulano@gmail.com", toca em *Pagar R$ 467* e paga com cartão em 3x no Mercado Pago,
- **Então** volta para `/comprar/pronto/{compra}` com "Pronto! Seu livro está criado.", o e-mail mascarado (`gu•••@gmail.com`) e *Entrar com Google*; o e-mail de acesso chega em menos de 1 minuto.

### CUJ 2: Comprar com Pix
- **Quando** escolhe Pix e volta antes de pagar,
- **Então** a página diz "Esperando o pagamento. Pode fechar: avisamos por e-mail." e se atualiza a cada 4 s; com o Pix pago, vira "Pronto".

### CUJ 3: Fechou a aba no meio
- **Dado** um pagamento aprovado e a aba fechada,
- **Então** o aviso do Mercado Pago (ou, se ele se perder, a conferência de 30 min) cria o livro e manda o e-mail.

### CUJ 4: Cartão recusado
- **Então** a volta mostra "O pagamento não passou." e *Tentar de novo* (a mesma cobrança aceita nova tentativa).

### CUJ 5: E-mail digitado errado
- **Quando** digita `fulano@gmial.com`,
- **Então** a tela sugere "Você quis dizer fulano@**gmail**.com?" (1 toque corrige) e mostra o e-mail inteiro antes de *Pagar*. Se mesmo assim errar, o admin troca o responsável pelo que já existe (CUJ 5 do prompt 3).

### CUJ 6: Quem já tem conta compra outro livro
- **Dado** um e-mail que já é responsável de um livro,
- **Então** a compra cria um livro novo para a mesma conta; a home já lista os livros. Segunda compra aprovada do mesmo e-mail em 24 h gera 1 alerta informativo (pode ser engano).

### CUJ 7: Algo foge do normal
- Valor ou moeda diferente, conta recusada (`identidadeAceitavel`), segundo pagamento aprovado na mesma compra, estorno, mediação ou chargeback: nenhum livro novo, a compra fica `retida` (ou `estornada`), a volta mostra "Estamos conferindo seu pagamento. Avisamos por e-mail." e o admin recebe **1** e-mail com o id da compra.

## Plano técnico

### Fluxo

```
landing ─▶ /comprar ── iniciarCompra ─▶ compra_criar (SQL) ─▶ POST /checkout/preferences ─▶ Mercado Pago
                                                                                            │
   /api/mercadopago ◀── aviso assinado ─────────────────────────────────────────────────────┤
   /comprar/pronto/{compra}?payment_id=… ◀── volta do navegador ────────────────────────────┤
   Inngest compras-conferir (30 min) ── GET /v1/payments/search?external_reference ─────────┘
                │ os três
                ▼
   processarPagamento(mpId) ─▶ GET /v1/payments/{mpId} ─▶ confere ─▶ contaParaEmail ─▶ compra_registrar ─▶ e-mail de acesso ─▶ compra_marcar_acesso
```

### Rotas

| Caminho | O que faz | Quem entra |
| --- | --- | --- |
| `/comprar` | E-mail (preenchido se houver sessão), sugestão de domínio, "O acesso vai para…", *Pagar R$ 467*, "Pix ou cartão em até 12x (3x sem juros)" | público |
| `/comprar/pronto/[compra]` | Estado da compra: esperando, pronto, não passou, conferindo | público, `noindex`, `no-store`, `no-referrer` |
| `/api/mercadopago` | Recebe o aviso; confere a assinatura; chama `processarPagamento` | Mercado Pago |

- `/comprar` não entra em `PROTEGIDAS`. `/^\/comprar\/pronto\//` entra em `PRIVADAS` (`lib/rotas.ts`).
- `api/mercadopago` sai do `matcher` do `proxy.ts` (`proxy.ts:149`), ao lado de `api/inngest`: o aviso não tem sessão.
- `[compra]` é o uuid da compra. A página mostra só o estado e o e-mail mascarado.
- Regra de limite por IP no Firewall da Vercel para `POST /comprar` (configuração, sem código; pré-requisito).

### Criar a cobrança (`iniciarCompra`, `app/comprar/acoes.ts`)

1. zod: e-mail válido, minúsculo, sem espaços.
2. `rpc("compra_criar", { p_email })` com a chave secreta. O banco:
   - devolve a compra **aberta** do mesmo e-mail (estado `criado`, com cobrança, até 30 min) em vez de criar outra: duplo clique ou voltar e tocar de novo não geram 2 cobranças;
   - confere o teto por e-mail (`MAX_COMPRAS_POR_EMAIL_DIA = 5`), contado pelo e-mail canônico (no Gmail, sem pontos e sem `+algo`), com trava da transação para o teto não furar sob concorrência;
   - grava o valor do banco (`privado.preco_plano_centavos()`).
3. Compra reaproveitada com `mp_link` → redireciona para ele. Senão, `POST https://api.mercadopago.com/checkout/preferences` (fetch, sem SDK):
   - `items`: 1 × "Plano anual Ecoa Memórias", `unit_price` = valor da compra, `BRL`;
   - `payer.email` = e-mail digitado (só preenche o formulário do Mercado Pago);
   - `external_reference` = `compra.id`;
   - `back_urls` (success, pending, failure) = `/comprar/pronto/{compra}`, `auto_return: "approved"`;
   - `notification_url` = `{urlDoApp()}/api/mercadopago`;
   - `payment_methods`: `installments: 12`, `excluded_payment_types: [{ id: "ticket" }]`;
   - `expires: true`, `expiration_date_to` = agora + 48 h;
   - `statement_descriptor`: "ECOAMEMORIAS".
4. `compra_guardar_preferencia(id, preferência, init_point)` e redireciona para `init_point`.

Erros: teto → "Muitas tentativas com este e-mail hoje. Tente amanhã ou fale com a gente."; Mercado Pago fora → "Não deu para abrir o pagamento. Tente de novo." Log sem o e-mail.

### Processar um pagamento (`lib/pagamento/processar.ts`)

Uma função só, chamada pelo aviso, pela volta e pela conferência:

1. `GET /v1/payments/{mpId}` com `MP_ACCESS_TOKEN`; zod em `status`, `status_detail`, `external_reference`, `transaction_amount`, `currency_id`, `payment_type_id`, `installments`.
2. `external_reference` precisa ser uma compra existente; na volta, precisa ser **a** compra da URL.
3. `status` mapeado por `acaoDoStatus` (pura, testada):
   - `approved` → aprovar;
   - `pending`, `in_process`, `authorized` → pendente;
   - `rejected`, `cancelled` → recusado;
   - `refunded`, `charged_back` → estorno;
   - `in_mediation`, `partially_refunded` → reter (alerta `mediacao` ou `estorno_parcial`);
   - qualquer outro → nada, com log.
4. Aprovar, **nesta ordem**:
   1. confere no TypeScript `currency_id = "BRL"` e `Math.round(transaction_amount * 100)` = valor da compra; se não bater → `compra_registrar(…, 'reter', alerta = 'valor_diferente')`, sem criar conta;
   2. compra ainda sem livro → `contaParaEmail(compra.email)` (reuso de `lib/acesso.ts`); `recusada` → `reter` com `conta_recusada`; `erro` → falha passageira;
   3. `compra_registrar(…, 'aprovar', …)`.
5. Compra aprovada e `acesso_enviado_em` vazio → `enviarAcesso(livro, db, { idempotencyKey: "compra:{id}" })`. Deu certo (ou `repetido`) → `compra_marcar_acesso(id)`. Falhou → falha passageira: o aviso responde 500, e a conferência de 30 min tenta de novo. A decisão de enviar sai da coluna, não de `novo`: um envio que caiu depois do commit sai na próxima chamada.
6. Só com `novo = true`: `registrarEvento({ quem: null, papel: "sistema", acao: "plano_comprado", livro, detalhes: { meio: meio ?? null, parcelas } })`.
7. `alerta` devolvido pelo banco → `avisarAdminsDaCompra({ compra, alerta })` (novo, em `lib/email/alerta.ts`, reusa `adminsParaAvisar()`), com chave `compra:{id}:{alerta}:{admin}`. O banco só devolve um alerta na **mudança** de estado (e uma vez para `pagamento_duplicado` e `segunda_compra_24h`, guardado em `alertas`), então ele sai 1 vez, por mais avisos e voltas que cheguem.

Na volta, a consulta à API só acontece se a compra não estiver em estado final, se o `payment_id` da URL não for o já gravado e se a última atualização tiver mais de 3 s. Isso evita que a URL vire um amplificador de chamadas.

### Conferir o aviso (`app/api/mercadopago/route.ts`)

- Lê `x-signature` (`ts=…,v1=…`), `x-request-id` e `data.id` da query (minúsculo). O `mpId` processado é **esse** `data.id`, o mesmo que entra na assinatura; o corpo é ignorado.
- Monta `id:{data.id};request-id:{x-request-id};ts:{ts};`, calcula HMAC-SHA256 com `MP_WEBHOOK_SEGREDO` e compara com `v1` em tempo constante (`assinaturaConfere`, pura, testada). `v1` ausente, malformado ou de outro tamanho → 401, nunca 500.
- Tópico `payment` → `processarPagamento`. Tópico `chargebacks` (contestação) → alerta `contestacao` ao admin com o id, 1 vez. Outro tópico → 200 e nada.
- Repetir um aviso antigo e válido não faz mal: o estado vem da API, e o banco é idempotente. Por isso não há janela de tempo no `ts`.

### Conferência a cada 30 min (`lib/inngest/compras.ts`)

Função Inngest `compras-conferir` (cron, a cada 30 min, só produção, T57):

- compras `criado` com cobrança ou `pendente`, de 15 min a 48 h → `GET /v1/payments/search?external_reference={id}` → `processarPagamento` para cada pagamento achado;
- compras `aprovado` com `acesso_enviado_em` vazio → tenta o e-mail de novo.

Cobre aviso perdido, app fora do ar e volta sem `payment_id`. Os passos devolvem só ids (T36).

### Banco

`payments`: uma linha por compra (intenção de pagar). A mesma cobrança aceita várias tentativas; a linha guarda a tentativa aprovada (ou a que gerou o alerta).

Estados e transições (só em `compra_registrar`):

```
criado ─▶ pendente ─▶ aprovado ─▶ estornado
   │  ╲      │            │
   │   ╲     ▼            ▼
   │    ▶ recusado     retido (mediação, estorno parcial)
   │         │
   └─────────┴──▶ retido (valor, conta recusada)
```

- `aprovado` nunca volta para `pendente` ou `recusado` (um aviso atrasado de uma tentativa recusada não desfaz a compra).
- `estorno` em compra **sem** livro (avisos fora de ordem) grava `estornado` e o `mp_pagamento_id`, alerta 1 vez, e um `aprovar` posterior desse id não cria livro.
- `retido` e `estornado` são finais para a automação; o admin resolve.
- `compra_registrar` trava a linha (`for update`): dois avisos ao mesmo tempo, ou aviso e volta, criam 1 livro. Ele cria o livro chamando `admin_ativar_plano` (uma só regra para criar livro com plano).

### Telas

- `components/telas/tela-comprar.tsx`: "Comece o livro de memórias", campo de e-mail, sugestão de domínio (`sugerirDominio`, pura: gmial, gmai, hotmial, outlok…), "O acesso vai para **fulano@gmail.com**", *Pagar R$ 467*, linha pequena "Pix ou cartão em até 12x (3x sem juros)". Com `MP_MODO=teste`, faixa "Modo de teste: nenhum valor é cobrado". Uma ação.
- `components/telas/tela-compra-pronta.tsx`, quatro estados:
  - **pronto:** "Pronto! Seu livro está criado." · "Enviamos o acesso para gu•••@gmail.com." · *Entrar com Google* · "ou abra o e-mail";
  - **esperando:** "Esperando o pagamento. Pode fechar: avisamos por e-mail." (atualiza a cada 4 s por até 10 min);
  - **não passou:** "O pagamento não passou." · *Tentar de novo*;
  - **conferindo** (`retido` ou `estornado`): "Estamos conferindo seu pagamento. Avisamos por e-mail."
- Exemplos em `lib/exemplos/prompt14.ts` e no styleguide; gate de design nas duas.
- Estado vazio: não se aplica (as duas telas sempre têm conteúdo).

### Admin

- `/admin` ganha a lista *Compras* (últimas 30): data, e-mail, valor, meio, parcelas, estado, alerta, acesso enviado, link para o livro. Leitura por `admin_listar_compras`.
- Ativar à mão e trocar responsável continuam como estão.

### Variáveis

| Nome | O que é |
| --- | --- |
| `MP_ACCESS_TOKEN` | Token da aplicação no Mercado Pago (de teste até o CNPJ) |
| `MP_WEBHOOK_SEGREDO` | Assinatura secreta dos avisos (painel do Mercado Pago) |
| `MP_MODO` | `teste` ou `producao` (faixa na tela) |

Só em Production e no `.env.local`; lidas em `lib/env-pagamento.ts` (zod, `server-only`), nunca com `NEXT_PUBLIC_`. Sem elas, `/comprar` mostra "A compra abre em breve." e o aviso responde 503.

## SQL de subida

`supabase/migrations/20261130120000_compra_mercado_pago.sql`

```sql
-- Compra do plano pelo Mercado Pago (P77, T58).

create type public.pagamento_estado as enum
  ('criado', 'pendente', 'aprovado', 'recusado', 'retido', 'estornado');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'plano' check (tipo in ('plano')),
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 254),
  valor_centavos integer not null check (valor_centavos > 0),
  estado public.pagamento_estado not null default 'criado',
  mp_preferencia_id text,
  mp_link text,
  mp_pagamento_id text unique,
  meio text,
  parcelas smallint check (parcelas between 1 and 24),
  book_id uuid references public.books (id) on delete restrict,
  alertas text[] not null default '{}',
  acesso_enviado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  aprovado_em timestamptz
);
create index payments_email_criado_em on public.payments (email, criado_em desc);
create index payments_estado_criado_em on public.payments (estado, criado_em desc);

-- Sem política: anon e authenticated não leem nem escrevem. Só a chave secreta (T58).
alter table public.payments enable row level security;
revoke all on table public.payments from anon, authenticated;

-- Números de lib/config.ts conferidos no banco (PRECO_PLANO * 100, DURACAO_PLANO_MESES, teto).
create function privado.preco_plano_centavos() returns integer language sql immutable as $$ select 46700 $$;
create function privado.duracao_plano_meses() returns integer language sql immutable as $$ select 12 $$;
create function privado.max_compras_por_email_dia() returns integer language sql immutable as $$ select 5 $$;
create function privado.minutos_compra_aberta() returns integer language sql immutable as $$ select 30 $$;

-- E-mail para o teto: no Gmail, sem pontos e sem +algo (fulano+1@gmail.com = f.ulano@gmail.com).
create function privado.email_canonico(p_email text) returns text
language sql immutable set search_path = '' as $$
  select case
    when split_part(p_email, '@', 2) in ('gmail.com', 'googlemail.com')
      then replace(split_part(split_part(p_email, '@', 1), '+', 1), '.', '') || '@gmail.com'
    else split_part(split_part(p_email, '@', 1), '+', 1) || '@' || split_part(p_email, '@', 2)
  end
$$;

revoke all on function
  privado.preco_plano_centavos(), privado.duracao_plano_meses(),
  privado.max_compras_por_email_dia(), privado.minutos_compra_aberta(),
  privado.email_canonico(text)
  from public, anon, authenticated;

create function public.compra_criar(p_email text)
returns table (id uuid, mp_link text)
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  v_canonico text := privado.email_canonico(lower(btrim(p_email)));
  v_id uuid;
begin
  -- Uma compra por vez para o mesmo e-mail canônico: o teto não fura sob concorrência.
  perform pg_advisory_xact_lock(hashtext('compra:' || v_canonico));

  return query
    select p.id, p.mp_link from public.payments p
    where p.email = v_email and p.estado = 'criado' and p.mp_link is not null
      and p.criado_em > now() - make_interval(mins => privado.minutos_compra_aberta())
    order by p.criado_em desc limit 1;
  if found then
    return;
  end if;

  if (select count(*) from public.payments p
      where privado.email_canonico(p.email) = v_canonico
        and p.criado_em > now() - interval '24 hours')
     >= privado.max_compras_por_email_dia() then
    raise exception 'compra_teto_email';
  end if;

  insert into public.payments (email, valor_centavos)
  values (v_email, privado.preco_plano_centavos())
  returning payments.id into v_id;
  return query select v_id, null::text;
end $$;

create function public.compra_guardar_preferencia(p_compra uuid, p_preferencia text, p_link text)
returns void language sql security definer set search_path = '' as $$
  update public.payments
  set mp_preferencia_id = p_preferencia, mp_link = p_link, atualizado_em = now()
  where id = p_compra and mp_preferencia_id is null
$$;

-- Uma porta para todos os estados. p_acao: aprovar | pendente | recusado | estorno | reter.
-- Devolve o livro, se a compra o criou agora (novo) e um alerta, só na 1ª vez que ele acontece.
create function public.compra_registrar(
  p_compra uuid,
  p_mp_pagamento text,
  p_acao text,
  p_valor_centavos integer,
  p_meio text,
  p_parcelas integer,
  p_responsavel uuid,
  p_alerta text default null
)
returns table (book_id uuid, novo boolean, alerta text)
language plpgsql security definer set search_path = '' as $$
declare
  v public.payments%rowtype;
  v_livro uuid;
  v_alerta text;
begin
  select * into v from public.payments where id = p_compra for update;
  if not found then
    raise exception 'compra_inexistente';
  end if;

  -- Todo ramo que não cria livro termina no bloco comum do fim, que grava o alerta em
  -- `alertas` e só o devolve na 1ª vez.
  if p_acao = 'aprovar' then
    if v.estado in ('retido', 'estornado') then
      return query select v.book_id, false, null::text;
      return;
    end if;
    if v.book_id is not null then
      v_alerta := case when v.mp_pagamento_id is distinct from p_mp_pagamento
                       then 'pagamento_duplicado' end;
    elsif p_valor_centavos is distinct from v.valor_centavos then
      update public.payments set estado = 'retido', mp_pagamento_id = p_mp_pagamento,
        atualizado_em = now() where id = p_compra;
      v_alerta := 'valor_diferente';
    else
      if p_responsavel is null then
        raise exception 'compra_sem_responsavel';
      end if;
      -- A mesma regra do admin: uma só forma de criar livro com plano.
      v_livro := public.admin_ativar_plano(p_responsavel, null, privado.duracao_plano_meses());
      update public.payments
      set estado = 'aprovado', mp_pagamento_id = p_mp_pagamento, meio = p_meio,
          parcelas = p_parcelas, book_id = v_livro, aprovado_em = now(), atualizado_em = now()
      where id = p_compra;
      if exists (select 1 from public.payments p
                 where p.email = v.email and p.id <> p_compra and p.estado = 'aprovado'
                   and p.aprovado_em > now() - interval '24 hours') then
        v_alerta := 'segunda_compra_24h';
      end if;
      if v_alerta is not null and not v_alerta = any (v.alertas) then
        update public.payments set alertas = alertas || v_alerta where id = p_compra;
      else
        v_alerta := null;
      end if;
      return query select v_livro, true, v_alerta;
      return;
    end if;

  elsif p_acao = 'estorno' then
    if v.estado <> 'estornado' and (v.mp_pagamento_id is null or v.mp_pagamento_id = p_mp_pagamento) then
      update public.payments set estado = 'estornado', mp_pagamento_id = p_mp_pagamento,
        atualizado_em = now() where id = p_compra;
      v_alerta := 'estorno';
    end if;

  elsif p_acao = 'reter' then
    if p_alerta is null then
      raise exception 'compra_acao_invalida';
    end if;
    if v.estado not in ('retido', 'estornado') then
      update public.payments set estado = 'retido',
        mp_pagamento_id = coalesce(v.mp_pagamento_id, p_mp_pagamento), atualizado_em = now()
      where id = p_compra;
    end if;
    v_alerta := p_alerta;

  elsif p_acao = 'pendente' then
    if v.estado in ('criado', 'recusado') then
      update public.payments set estado = 'pendente', atualizado_em = now() where id = p_compra;
    end if;

  elsif p_acao = 'recusado' then
    if v.estado in ('criado', 'pendente') then
      update public.payments set estado = 'recusado', atualizado_em = now() where id = p_compra;
    end if;

  else
    raise exception 'compra_acao_invalida';
  end if;

  if v_alerta is not null and not v_alerta = any (v.alertas) then
    update public.payments set alertas = alertas || v_alerta where id = p_compra;
  else
    v_alerta := null;
  end if;
  return query select v.book_id, false, v_alerta;
end $$;

create function public.compra_marcar_acesso(p_compra uuid)
returns void language sql security definer set search_path = '' as $$
  update public.payments set acesso_enviado_em = now()
  where id = p_compra and acesso_enviado_em is null
$$;

-- Lista do admin (últimas 30) e fila da conferência de 30 min.
create function public.admin_listar_compras()
returns table (
  id uuid, criado_em timestamptz, email text, valor_centavos integer, meio text,
  parcelas smallint, estado public.pagamento_estado, alertas text[],
  acesso_enviado_em timestamptz, book_id uuid
)
language sql stable security definer set search_path = '' as $$
  select id, criado_em, email, valor_centavos, meio, parcelas, estado, alertas,
         acesso_enviado_em, book_id
  from public.payments order by criado_em desc limit 30
$$;

create function public.compras_para_conferir()
returns table (id uuid, estado public.pagamento_estado)
language sql stable security definer set search_path = '' as $$
  select id, estado from public.payments
  where (estado in ('criado', 'pendente') and mp_preferencia_id is not null
         and criado_em between now() - interval '48 hours' and now() - interval '15 minutes')
     or (estado = 'aprovado' and acesso_enviado_em is null)
  order by criado_em
  limit 100
$$;

revoke all on function
  public.compra_criar(text),
  public.compra_guardar_preferencia(uuid, text, text),
  public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text),
  public.compra_marcar_acesso(uuid),
  public.admin_listar_compras(),
  public.compras_para_conferir()
  from public, anon, authenticated;
grant execute on function
  public.compra_criar(text),
  public.compra_guardar_preferencia(uuid, text, text),
  public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text),
  public.compra_marcar_acesso(uuid),
  public.admin_listar_compras(),
  public.compras_para_conferir()
  to service_role;
```

## SQL de reversão

`supabase/reversao/20261130120000_compra_mercado_pago.down.sql`

```sql
drop function public.compras_para_conferir();
drop function public.admin_listar_compras();
drop function public.compra_marcar_acesso(uuid);
drop function public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text);
drop function public.compra_guardar_preferencia(uuid, text, text);
drop function public.compra_criar(text);
drop function privado.email_canonico(text);
drop function privado.minutos_compra_aberta();
drop function privado.max_compras_por_email_dia();
drop function privado.duracao_plano_meses();
drop function privado.preco_plano_centavos();
drop table public.payments;
drop type public.pagamento_estado;
```

A reversão apaga o histórico de compras. Antes de reverter em produção, exportar `payments`.

## Testes

- **Banco** (`supabase/tests/compra.test.ts`, PGlite, com `criarBanco` e `criarUsuario` de `banco.ts`):
  - compra aberta reaproveitada; teto por e-mail canônico (`f.ulano+1@gmail.com` conta como `fulano@gmail.com`);
  - aprovar cria 1 livro + 1 responsável com 12 meses; aprovar 2 vezes devolve o mesmo livro com `novo = false` e sem alerta;
  - outro `mp_pagamento_id` aprovado → `pagamento_duplicado` 1 vez só;
  - valor diferente → `retido`, nenhum livro, alerta 1 vez;
  - `recusado` depois de `aprovado` não muda nada;
  - estorno antes do aprovar → `estornado` e o aprovar seguinte não cria livro;
  - `reter` sem alerta → erro; segunda compra aprovada em 24 h → `segunda_compra_24h`;
  - `compras_para_conferir` acha pendente antigo e aprovado sem acesso.
- **RLS** (`rls.test.ts`): as 6 funções novas no array `chamadas` ("funções do admin só com a chave secreta"); `payments` na lista "anon não tem acesso a nenhuma tabela"; as listas exatas do que `anon` e `authenticated` executam não mudam; a reversão entra em `reverter()`.
- **Config** (`config-banco.test.ts`): `["preco_plano_centavos", PRECO_PLANO * 100]`, `["duracao_plano_meses", DURACAO_PLANO_MESES]`, `["max_compras_por_email_dia", …]`, `["minutos_compra_aberta", …]`. Frases em `lib/erros-banco.ts` para `compra_teto_email`, `compra_inexistente`, `compra_sem_responsavel` e `compra_acao_invalida`.
- **Puras** (Vitest):
  - `assinaturaConfere`: válida, `v1` trocado, `ts` trocado, cabeçalho faltando, `v1` de outro tamanho → falso sem lançar;
  - `acaoDoStatus` (todos os status);
  - `mascararEmail` e `sugerirDominio`;
  - centavos: `Math.round(155.1 * 100)` e afins;
  - corpo da preferência: `installments: 12`, sem `ticket`, `external_reference`, expiração.
- **Processar**, com o Mercado Pago, o banco e o e-mail falsos:
  - aviso e volta ao mesmo tempo → 1 livro e 1 e-mail;
  - e-mail falhou → `acesso_enviado_em` vazio, e a próxima chamada envia;
  - moeda `USD` → retido sem criar conta;
  - conta `recusada` → retido e alerta.
- **Rota segura** (`lib/erros-servidor.test.ts`): caso para `/api/mercadopago`, como o de `/api/inngest`.
- **Telas** (Playwright, styleguide): `/comprar` (com e sem modo de teste, com sugestão de domínio) e os 4 estados de `pronto` a 390 px.
- **Aceite** (produção com `MP_MODO=teste`):
  - cartão de teste aprovado em 3x e em 6x, para conferir que `transaction_amount` não muda com juros; o e-mail de acesso chega em menos de 1 minuto;
  - Pix de teste;
  - cartão recusado;
  - aviso com assinatura errada → 401.
  - Depois, apagar os livros de teste pelo admin ou deixá-los marcados.

## Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Aviso falso criando livro | Assinatura conferida e estado lido da API com o nosso token; sem o pagamento real na nossa conta, nada acontece |
| Volta com `?status=approved` forjado | A volta só usa o `payment_id` para consultar a API; `status` da URL é ignorado |
| Aviso e volta ao mesmo tempo | `for update` na compra; envio do acesso marcado em coluna |
| Aviso perdido, app fora, e-mail que caiu | Conferência de 30 min no Inngest |
| E-mail digitado errado | Sugestão de domínio, e-mail inteiro antes de *Pagar*, admin troca o responsável |
| Pagou com um e-mail, tenta entrar com outro Google | A tela e o e-mail mostram o e-mail certo; o cadastro segue fechado ("Este e-mail ainda não tem um livro") |
| Script esgotando o teto de um e-mail ou criando compras em massa | Limite por IP no Firewall da Vercel; teto por e-mail canônico; sem teto global (ele travaria as vendas de todos) |
| Teste de cartões roubados pela nossa página | Antifraude do próprio Checkout Pro; chargeback vira alerta; captcha se aparecer abuso |
| Fraude e chargeback | Tópico de contestações assinado; alerta; o admin decide o somente leitura |
| Compras de teste em produção | `MP_MODO=teste` com faixa na tela; a landing só aponta para `/comprar` em `producao`; livros de teste apagados ou marcados pelo admin |
| Vercel Hobby não permite uso comercial | T39: Pro antes do 1º cliente pagante |
| E-mail de quem não comprou guardado em `payments` | Retenção das compras não pagas entra no prompt 15 (LGPD) |

## Alternativas consideradas

### A: Link de pagamento fixo criado no painel
Zero código para criar a cobrança, mas o aviso não traz uma referência nossa: o livro teria de ser ligado pelo e-mail da conta do Mercado Pago, que muitas vezes não é o e-mail que a pessoa usa. Descartada para a automação. Continua útil **hoje**, à mão, enquanto este prompt não sai.

### B: Entrar sozinho na volta, sem login
A volta criaria a sessão do comprador direto. Mais fluido, mas quem digita o e-mail de outra pessoa e paga ganharia a sessão daquela conta e os livros dela. Descartada: o login com Google ou pelo e-mail prova que o e-mail é de quem pagou.

### C: Pagamento na landing
A landing precisaria da chave secreta do banco do app ou de uma API nova entre os dois. Descartada pela T1.

### D: SDK oficial do Mercado Pago
Três chamadas (`preferences`, `payments` e `payments/search`) não justificam a dependência. `fetch` com zod.

### E: Processar o aviso no Inngest
O aviso precisa responder rápido e o Mercado Pago já repete quando a rota falha. O Inngest entra só na conferência de 30 min, que é a rede de segurança.

### F: Pedir o e-mail duas vezes
Mais um campo para o avô. A sugestão de domínio e o e-mail inteiro antes de *Pagar* pegam o mesmo erro com menos esforço.

## Revisão (EGM, 1 rodada, 2 revisores em Sonnet)

**Código** (12 achados, todos aceitos): reusar `admin_ativar_plano`, `PRECO_PLANO` e `DURACAO_PLANO_MESES`; `avisarAdminsDaCompra` novo, porque `avisarAdmins` não existe; campos completos de `registrarEvento` e rótulo em `aderencia/rotulos.ts`; listas exatas de `rls.test.ts` e `config-banco.test.ts`; frase para cada código de erro; regex em `PRIVADAS`; caso em `erros-servidor.test.ts`; tipos gerados; plano com arquivos a criar e alterar.

**Segurança** (12 achados):
- Aceitos:
  - envio do acesso por coluna, não por `novo`;
  - sugestão de domínio e e-mail inteiro antes de pagar;
  - estado `retido` e alerta gravado para sair 1 vez, com valor e moeda conferidos antes de criar conta;
  - conferência de 30 min;
  - teto por e-mail canônico com trava;
  - sem teto global e com limite por IP no Firewall;
  - tópico de contestações, mediação e estorno parcial;
  - estorno antes da aprovação;
  - volta que só consulta a API quando precisa;
  - centavos com `Math.round` e moeda BRL;
  - compra aberta reaproveitada e preferência com validade;
  - `data.id` assinado como `mpId` e `v1` malformado → 401;
  - `revoke` nas funções `privado` novas.
- Recusados:
  - captcha (atrito para o avô; volta se houver abuso);
  - pedir o e-mail duas vezes (Alternativa F).
- O achado do segredo de bypass da Vercel caiu sozinho: o Preview não tem banco (T57), então o aceite roda na produção em modo de teste.

## Pré-requisitos (passos do Guilherme)

1. Conta no Mercado Pago (pode ser a de CPF para o teste) e uma aplicação em *Suas integrações*: credenciais de teste agora; de produção depois do CNPJ.
2. No painel: parcelamento sem juros até 3x (P78); Webhooks com os eventos *Pagamentos* e *Contestações*, URL `https://app.ecoa-memorias.com.br/api/mercadopago`, e a assinatura secreta.
3. Variáveis na Vercel (Production) e no `.env.local`.
4. Regra de limite por IP no Firewall da Vercel para `POST /comprar`.
5. Vercel Pro antes da 1ª venda real (T39).
6. Com `MP_MODO=producao`: botão *Comprar* da landing apontando para `https://app.ecoa-memorias.com.br/comprar`.

## Perguntas em aberto

Nenhuma. Texto na fatura: "ECOAMEMORIAS" (Guilherme, 20/11).

## Plano de implementação

1. **Banco.** Criar a migration, a reversão e `supabase/tests/compra.test.ts`. Alterar `rls.test.ts`, `config-banco.test.ts` e `lib/erros-banco.ts`; os quatro andam juntos, senão o teste fica vermelho.
2. **Config e tipos.** Alterar `lib/config.ts` (só `MAX_COMPRAS_POR_EMAIL_DIA` e `MINUTOS_COMPRA_ABERTA`; preço e duração já existem). Gerar os tipos em arquivo e acrescentar em `lib/supabase/tipos.ts` só `payments`, `pagamento_estado` e as 6 funções.
3. **Pagamento.** Criar `lib/env-pagamento.ts` e `lib/pagamento/`: `mercado-pago.ts` (preferência, consulta, busca, assinatura), `estado.ts` (puras: `acaoDoStatus`, `mascararEmail`, `sugerirDominio`, centavos), `processar.ts` e os testes.
4. **Acesso, alertas e eventos.** Alterar:
   - `lib/acesso.ts`: `enviarAcesso` aceita `idempotencyKey`;
   - `lib/email/alerta.ts`: `avisarAdminsDaCompra`;
   - `lib/email/modelos.ts`: e-mail do alerta de compra;
   - `lib/eventos-acoes.ts`: `plano_comprado`;
   - `lib/aderencia/rotulos.ts`: "Plano comprado".
5. **Rotas e fila.**
   - Criar `app/api/mercadopago/route.ts` e `lib/inngest/compras.ts`.
   - Alterar o registro das funções em `/api/inngest`, `proxy.ts` (matcher), `lib/rotas.ts` (`PRIVADAS`) e `lib/erros-servidor.test.ts`.
6. **Telas.** Criar `app/comprar/` (página, `acoes.ts`, `pronto/[compra]/`), `components/telas/tela-comprar.tsx`, `tela-compra-pronta.tsx` e `lib/exemplos/prompt14.ts`. Alterar `lib/styleguide.ts`, a vitrine e `scripts/inspecionar-telas.mjs`. Depois, o gate de design.
7. **Admin.** Alterar `app/admin/page.tsx` e a tela do admin para a lista *Compras*.
8. **Documentos.** Alterar `docs/mapa.md` (rotas, `lib/pagamento/`, `compras-conferir`), `decisoes.md` e `decisoes-resumo.md` (P77, P78 e T58; P5 "substituída em parte por P77").
9. **Fechamento.** Gate de fim de tarefa; aceite na produção com `MP_MODO=teste`.

## Construção (22/11/2026)

A migration foi aplicada como aprovada, sem mudar uma linha. Ajustes feitos no código, sem mudar decisão:

- **E-mail mascarado:** reusa `mascararEmail` de `lib/convite/textos.ts` (`b•••@gmail.com`, 1 letra), em vez de criar outro com 2.
- **Conta criada por aviso e volta ao mesmo tempo:** a 2ª criação no Auth falha; `processarPagamento` busca a conta de novo uma vez antes de tratar como falha passageira.
- **Link do pagamento:** credencial de teste antiga (`TEST-…`) usa `sandbox_init_point`; usuário de teste e produção usam `init_point`.
- **Contestação:** o aviso de `chargebacks` traz o id da contestação, não a compra; o alerta vai com `contestacao-{id}` e a chave do Resend segura as repetições.
- **Volta "não passou":** *Tentar de novo* abre a mesma cobrança (`mp_link`); sem ela, volta para `/comprar`.
- **Conferência de 30 min:** processa os pagamentos da compra do mais antigo ao mais novo; falha passageira fica para a rodada seguinte.
- **Gate de design:** a faixa de teste ocupa a largura toda; a confirmação "O acesso vai para…" some enquanto há sugestão de domínio; o logo do Google entra como ícone do botão (corrigiu também `/entrar`, onde ele ficava em cima do texto).
- **Alerta do Supabase:** as 4 funções-constante novas em `privado` (`preco_plano_centavos` etc.) não fixam `search_path`. Sem risco (só `select` de um número), mas o linter avisa; correção numa migration de 4 linhas, se aprovada.
