# Compra do plano pelo Asaas (prompt 14, parte 1, refeito)

Status: **rascunho para aprovação** · 23/11/2026 · PRD: M1 (onda 2). Substitui `compra-mercado-pago.md` (aprovado em 20/11, nunca construído) só na camada do provedor; o que não depende de quem cobra (compra como intenção, 1 livro por compra, alerta 1 vez, conferência periódica, tela de e-mail) continua igual. Documentação do Asaas lida em 23/11 (`docs.asaas.com`, páginas de Checkout atualizadas em ago–out/2026).

## Visão geral

O Guilherme trocou o gateway para o Asaas. A pessoa toca em *Comprar* na landing, confere o e-mail em `/comprar` e escolhe como pagar. **Pix na própria página**: nome e CPF só nesse passo, QR e *Copiar código Pix* na tela, e a tela vira "Pronto" sozinha quando o Pix cai. **Cartão no Checkout hospedado do Asaas**, em até 3x sem juros: o número do cartão nunca passa pela Ecoa. Pagamento confirmado cria o livro, ativa o plano por 12 meses e manda o e-mail de acesso em menos de 1 minuto.

## O problema

- O gateway agora é o Asaas: o design aprovado fala com a API do Mercado Pago, que não será usada.
- O Guilherme quer o pagamento dentro da página. Para o Pix isso é seguro (o QR não é dado sensível). Para o cartão, a API do Asaas só recebe o número do cartão pelo servidor de quem integra (sem componente no navegador que guarde o cartão), o que poria a Ecoa no escopo do PCI. Por isso o cartão fica no Checkout do Asaas.
- O Asaas exige nome e CPF para criar uma cobrança Pix (`POST /v3/customers`: `name` e `cpfCnpj` obrigatórios). O CPF é dado pessoal: entra só no passo do Pix e não fica no nosso banco.

## Objetivos

1. Comprar em poucos toques: e-mail → *Continuar* → nome e CPF → QR (Pix); ou e-mail → *Continuar* → *Cartão* → Checkout do Asaas.
2. Pagamento confirmado cria o livro, ativa o plano e manda o acesso em menos de 1 minuto (aceite do M1).
3. O mesmo pagamento nunca cria dois livros; nenhum pagamento confirmado fica sem livro ou sem alerta.
4. Nenhum dado de cartão passa pela Ecoa. CPF e nome vão direto ao Asaas e não ficam no banco, nos logs nem nos eventos.
5. O admin vê cada compra e recebe **1** e-mail quando algo foge do normal.

## Não objetivos

- Impressão, frete e extras (prompt 14, parte 2).
- Renovação pelo Asaas (continua no admin).
- Parcelas de 4x a 12x com juros do cliente: a API do Checkout só tem `installment.maxInstallmentCount`, sem juros por parcela (o campo `interest` é juro por atraso). O Guilherme escolheu só até 3x sem juros (23/11).
- Boleto, cupom, nota fiscal automática, assinatura recorrente.
- Cartão dentro da nossa página (PCI). Pix pelo Checkout do Asaas (o Pix fica na nossa página).
- Entrar sozinho na volta, sem login; desligar o livro sozinho em estorno ou contestação; captcha (como no design anterior).

## Decisões novas (entram em `decisoes.md` na aprovação)

- **P83 Compra pelo Asaas.** Substitui P77 em parte (sai o Checkout Pro do Mercado Pago; fica o resto: `/comprar` com um campo, o e-mail digitado vira o responsável, *Entrar com Google* na volta, acesso também por e-mail). Depois do e-mail, `/comprar/{compra}` oferece **Pix na própria página** (nome e CPF pedidos só aqui, QR e copia-e-cola na tela) como ação principal e **cartão no Checkout hospedado do Asaas** como alternativa. Sem boleto. Nome e CPF vão ao Asaas e não ficam na Ecoa. Motivo: o Guilherme trocou o gateway; Pix na página sem tocar em dado sensível; cartão hospedado mantém o motivo da P5 (nenhum dado de cartão). Alternativas: cartão na nossa página (PCI); tudo no Checkout do Asaas (Pix fora da página).
- **P84 Parcelas.** Substitui P78. Cartão em até 3x sem juros (`maxInstallmentCount = 3`); sem 4x a 12x. Motivo: a API do Checkout do Asaas não repassa juros por parcela ao cliente; o Guilherme preferiu receber mais rápido a oferecer 12x sem juros. Alternativas: 12x sem juros recebendo mês a mês; dois preços (dois checkouts, uma escolha a mais na tela).
- **T60 Pagamento no Asaas.** Substitui T58. `payments` sem política (só a chave secreta). O aviso do Asaas é autenticado pelo cabeçalho `asaas-access-token` (token de 32+ caracteres configurado no webhook, comparado em tempo constante), mas o estado vem **sempre** da API com a nossa chave, nunca do corpo do aviso nem da URL de volta. Com o token certo a rota responde **200 sempre**, mesmo se o processamento falhar: o Asaas trata qualquer outra resposta como falha e **pausa a fila do webhook após 15 falhas seguidas**, o que pararia todas as vendas; a falha vira `erro_servidor` e a conferência a cada 10 min recupera. Pagamento ligado à compra por `externalReference` (Pix, criado por nós) ou por `checkoutSession` (cartão). Valor conferido pela **soma das parcelas**. Aviso, volta, consulta da tela e conferência chamam a mesma função; o banco garante 1 livro por compra e o alerta 1 vez. Segredos `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_MODO` (`sandbox` ou `producao`). Clientes criados com `notificationDisabled: true` (o Asaas não manda e-mail nem SMS por conta própria, e não cobra por isso). Motivo: aviso falso, volta forjada, aviso perdido ou repetido e fila pausada não podem criar livro a mais nem deixar pago sem livro. Alternativas: confiar no corpo do aviso; responder 500 na falha (pausa a fila); processar o aviso no Inngest; SDK.

## Jornadas críticas

### CUJ 1: Comprar com Pix
- **Dado** alguém na landing,
- **Quando** toca em *Comprar*, digita o e-mail em `/comprar`, confere "O acesso vai para **fulano@gmail.com**", toca em *Continuar*, preenche nome e CPF e toca em *Gerar Pix*,
- **Então** vê o QR, *Copiar código Pix* e "Esperando o pagamento. Pode fechar: avisamos por e-mail."; pago o Pix (no celular, pelo copia-e-cola), a mesma tela vira "Pronto! Seu livro está criado." com *Entrar com Google*, e o e-mail de acesso chega em menos de 1 minuto.

### CUJ 2: Comprar com cartão
- **Quando** toca em *Pagar com cartão* em `/comprar/{compra}`,
- **Então** vai ao Checkout do Asaas (até 3x sem juros), preenche cartão e CPF **lá**, e volta para `/comprar/{compra}`: "Pronto" se já confirmou, senão "Conferindo o pagamento…" que vira "Pronto" sozinho.

### CUJ 3: Fechou a aba no meio
- **Dado** um pagamento confirmado e a aba fechada,
- **Então** o aviso do Asaas (ou, se falhar, a conferência de 10 min) cria o livro e manda o e-mail. Reabrir o link da compra mostra o estado certo.

### CUJ 4: Cartão recusado ou desistiu
- Recusa no Checkout: a pessoa tenta outro cartão **no próprio Checkout** (ele continua ativo por 60 min). Voltou sem pagar (`cancelUrl`) ou o Checkout expirou (`expiredUrl`): `/comprar/{compra}` volta a oferecer Pix e cartão; tocar em cartão cria um Checkout novo. Reprovado pela análise de risco do Asaas: "O pagamento não passou." e *Tentar de novo*.

### CUJ 5: Trocou de ideia entre Pix e cartão
- **Dado** um Pix gerado,
- **Quando** toca em *Prefiro cartão*,
- **Então** a cobrança Pix é cancelada no Asaas (`DELETE /v3/payments/{id}`, tentativa única; se falhar, segue) e o Checkout abre. Se mesmo assim os dois forem pagos, o segundo vira alerta `pagamento_duplicado` e o admin estorna.

### CUJ 6: E-mail digitado errado
- Sugestão de domínio ("Você quis dizer fulano@**gmail**.com?") e o e-mail inteiro antes de *Continuar*; se mesmo assim errar, o admin troca o responsável (como hoje).

### CUJ 7: Quem já tem conta compra outro livro
- A compra cria um livro novo para a mesma conta. Segunda compra confirmada do mesmo e-mail em 24 h gera 1 alerta informativo.

### CUJ 8: Algo foge do normal
- Valor diferente de R$ 467 (somadas as parcelas), meio inesperado, conta recusada (`identidadeAceitavel`), segundo pagamento na mesma compra, estorno (total ou parcial) ou contestação: nenhum livro novo, a compra fica `retida` (ou `estornada`), a tela mostra "Estamos conferindo seu pagamento. Avisamos por e-mail." e o admin recebe **1** e-mail com o id da compra.

## Plano técnico

### Fluxo

```
landing ─▶ /comprar ── iniciarCompra ─▶ compra_criar (SQL) ─▶ /comprar/{compra}
                                                                  │
          ┌──── Pix: gerarPix(nome, CPF) ─▶ POST /customers ─▶ POST /payments (PIX) ─▶ GET /payments/{id}/pixQrCode ─▶ QR na tela
          └── Cartão: pagarComCartao ─▶ POST /checkouts (CREDIT_CARD, até 3x) ─▶ asaas.com/checkoutSession/show?id=…
                                                                  │
   /api/asaas ◀── aviso (asaas-access-token) ─────────────────────┤
   /comprar/{compra} ◀── volta do Checkout e consulta da tela ────┤
   Inngest compras-conferir (10 min) ─────────────────────────────┘
                │ todos
                ▼
   processarPagamento(id) ─▶ GET /payments/{id} (+ parcelas) ─▶ confere ─▶ contaParaEmail ─▶ compra_registrar ─▶ e-mail de acesso ─▶ compra_marcar_acesso
```

### Rotas

| Caminho | O que faz | Quem entra |
| --- | --- | --- |
| `/comprar` | E-mail (preenchido se houver sessão), sugestão de domínio, "O acesso vai para…", *Continuar*, linha "Pix ou cartão em até 3x sem juros" | público |
| `/comprar/[compra]` | Escolher o meio, Pix (QR), esperando, pronto, não passou, conferindo | público, `noindex`, `no-store`, `no-referrer` |
| `/api/asaas` | Recebe o aviso; confere o token; chama `processarPagamento` | Asaas |

- `/comprar` não entra em `PROTEGIDAS`. `/^\/comprar\/[^/]+/` entra em `PRIVADAS` (`lib/rotas.ts`).
- `api/asaas` fica fora do `matcher` do `proxy.ts`, ao lado de `api/inngest`: o aviso não tem sessão.
- `[compra]` é o uuid da compra (122 bits sorteados). A página mostra só o estado e o e-mail mascarado; nunca nome, CPF ou valor de outra pessoa.
- Regra de limite por IP no Firewall da Vercel para `POST` em `/comprar` e `/comprar/*` (configuração, sem código; pré-requisito).

### Cliente do Asaas (`lib/pagamento/asaas.ts`)

`fetch` com zod, sem SDK. Base `https://api-sandbox.asaas.com/v3` ou `https://api.asaas.com/v3` por `ASAAS_MODO`; cabeçalho `access_token`; `AbortSignal.timeout(7000)` em toda chamada. Erros do Asaas são registrados só com o status HTTP e os `errors[].code`, **nunca** o corpo (ele pode repetir nome e CPF). Funções:

- `criarCliente({ nome, cpf, email, compra })` → `POST /customers` com `notificationDisabled: true`, `externalReference: compra`;
- `criarPix({ cliente, compra, valorCentavos })` → `POST /payments` com `billingType: "PIX"`, `value`, `dueDate` (amanhã, fuso de São Paulo), `description: "Plano anual Ecoa Memórias"`, `externalReference: compra`;
- `qrDoPix(id)` → `GET /payments/{id}/pixQrCode` (`encodedImage`, `payload`, `expirationDate`); não é guardado, é buscado ao abrir a tela;
- `cancelarPix(id)` → `DELETE /payments/{id}`;
- `criarCheckout({ compra, valorCentavos })` → `POST /checkouts` com `billingTypes: ["CREDIT_CARD"]`, `chargeTypes: ["DETACHED", "INSTALLMENT"]`, `installment.maxInstallmentCount = MAX_PARCELAS_CARTAO` (3), `minutesToExpire: MINUTOS_CHECKOUT` (60), `externalReference: compra`, `items: [{ name: "Plano anual Ecoa Memórias", quantity: 1, value }]`, `callback` (as três URLs = `{urlDoApp()}/comprar/{compra}`); sem `customerData` (a pessoa preenche no Asaas);
- `linkDoCheckout(id)` → `https://asaas.com/checkoutSession/show?id={id}` (no sandbox, o host é conferido no 1º teste; ver Perguntas em aberto);
- `lerPagamento(id)` → `GET /payments/{id}`; zod em `id`, `status`, `billingType`, `value`, `externalReference`, `checkoutSession`, `installment`, `deleted`, `refunds`;
- `pagamentosDoCheckout(checkout)` → `GET /payments?checkoutSession={id}`; `pagamentosDoParcelamento(id)` → `GET /payments?installment={id}`.

### Criar a compra (`iniciarCompra`, `app/comprar/acoes.ts`)

1. zod: e-mail válido, minúsculo, sem espaços.
2. `rpc("compra_criar", { p_email })` com a chave secreta: devolve a compra **aberta** do mesmo e-mail (`criado`, até 30 min) em vez de criar outra; teto por e-mail canônico (`MAX_COMPRAS_POR_EMAIL_DIA = 5`) com trava; valor do banco.
3. Redireciona para `/comprar/{compra}`.

### Pix (`gerarPix`, `app/comprar/[compra]/acoes.ts`)

1. zod: nome (2 a 100 caracteres, ao menos 2 palavras), CPF com 11 dígitos e dígitos verificadores certos (`cpfValido`, pura). Os dois ficam só na memória da ação.
2. Compra precisa estar `criado` e sem Pix. Com Pix já criado, só mostra o QR de novo (duplo clique não cria 2 cobranças). Checkout ativo → `cancelarCheckout` (tentativa única) antes de criar o Pix.
3. `criarCliente` → `criarPix` → `rpc("compra_guardar_pix", { p_compra, p_cliente, p_pix })`. Se a gravação disser que outro Pix chegou antes (corrida), `cancelarPix` no que sobrou.
4. A tela busca `qrDoPix` e mostra a imagem e o código. Erro do Asaas com CPF inválido → "Confira o CPF."; outro erro → "Não deu para gerar o Pix. Tente de novo."

### Cartão (`pagarComCartao`, mesmo arquivo)

1. Compra `criado`. Checkout guardado com mais de 5 min de validade → redireciona para ele. Pix guardado → `cancelarPix` (tentativa única) e `compra_trocar_para_cartao` limpa o Pix da compra.
2. `criarCheckout` → `rpc("compra_guardar_checkout", { p_compra, p_checkout, p_expira_em })` → redireciona para `linkDoCheckout`.

### Processar um pagamento (`lib/pagamento/processar.ts`)

Uma função só, `processarPagamento(asaasId, { compraEsperada? })`, chamada pelo aviso, pela volta, pela consulta da tela e pela conferência:

1. `lerPagamento(id)`. `deleted = true` → nada.
2. **Achar a compra**: `billingType = PIX` → a compra cujo `asaas_pix_id = id`; `CREDIT_CARD` → a compra cujo `asaas_checkout_id = checkoutSession`. Sem compra → nada, com log só do id (pagamento feito fora do app). Na volta e na tela, precisa ser **a** compra da URL. `externalReference`, quando vier, tem de bater com a compra achada; se não bater → `reter` com `referencia_diferente`.
3. **Juntar as parcelas**: com `installment`, `pagamentosDoParcelamento` traz todas; `ref` = id do parcelamento, `parcelas` = quantas, valor = soma de `Math.round(value * 100)` de cada uma. Sem `installment`: `ref` = id do pagamento, 1 parcela.
4. **Estado** por `acaoDoAsaas(pagamentos)` (pura, testada), olhando todas as parcelas:
   - alguma em `CHARGEBACK_REQUESTED`, `CHARGEBACK_DISPUTE`, `AWAITING_CHARGEBACK_REVERSAL` → reter (`contestacao`);
   - alguma `REFUNDED`, `REFUND_REQUESTED` ou `REFUND_IN_PROGRESS` → estorno; `refunds` não vazio sem `REFUNDED` → reter (`estorno_parcial`);
   - todas em `CONFIRMED`, `RECEIVED` ou `RECEIVED_IN_CASH` → aprovar;
   - `PENDING`, `AWAITING_RISK_ANALYSIS`, `OVERDUE` → pendente (o QR do Pix continua pagável depois do vencimento);
   - recusado: só quando o **aviso** é `PAYMENT_REPROVED_BY_RISK_ANALYSIS` ou `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` e a API não mostra o pagamento confirmado (o evento vira uma dica, `processarPagamento(id, { recusaAvisada: true })`; ela nunca aprova nada e `recusado` não desfaz `aprovado`);
   - qualquer outro → nada, com log.
5. **Aprovar, nesta ordem** (igual ao design anterior):
   1. valor somado = valor da compra e `billingType` em (`PIX`, `CREDIT_CARD`); se não → `reter` com `valor_diferente` ou `meio_inesperado`, sem criar conta;
   2. compra ainda sem livro → `contaParaEmail(compra.email)` (`lib/acesso.ts`); `recusada` → `reter` com `conta_recusada`; `erro` → falha passageira;
   3. `compra_registrar(…, 'aprovar', …)`.
6. Compra aprovada e `acesso_enviado_em` vazio → `enviarAcesso(livro, db, { idempotencyKey: "compra:{id}" })`; deu certo (ou `repetido`) → `compra_marcar_acesso`.
7. Só com `novo = true`: `registrarEvento({ quem: null, papel: "sistema", acao: "plano_comprado", livro, detalhes: { meio, parcelas } })`. Nunca nome, CPF ou e-mail.
8. `alerta` devolvido → `avisarAdminsDaCompra({ compra, alerta })`, chave `compra:{id}:{alerta}:{admin}`.

**Consulta pela tela e pela volta:** antes de chamar a API, `rpc("compra_pode_consultar", { p_compra })` grava `consultado_em` e só devolve verdadeiro se a última consulta tiver mais de 20 s (atômico). A página de Pix lê o estado do banco a cada 4 s e pede a consulta à API no máximo a cada 20 s. A URL não vira amplificador de chamadas ao Asaas.

### Conferir o aviso (`app/api/asaas/route.ts`)

- `asaas-access-token` ausente ou diferente de `ASAAS_WEBHOOK_TOKEN` (comparação em tempo constante, `tokenConfere`, pura) → 401.
- Corpo lido com zod **permissivo** (campos novos do Asaas não podem dar erro): só `event`, `payment.id` e `checkout.id`.
  - `PAYMENT_*` → `processarPagamento(payment.id)`;
  - `CHECKOUT_PAID` → `pagamentosDoCheckout(checkout.id)` → `processarPagamento` de cada um;
  - outro evento → nada.
- **Sempre 200** com o token certo. Falha no processamento → `registrarEvento` `erro_servidor` (rota-padrão, só ids) e 200. Tempo máximo do processamento: 8 s (o Asaas espera 10 s); passou disso, 200 e a conferência termina o trabalho.
- Aviso repetido ou antigo não faz mal: o estado vem da API e o banco é idempotente.

### Conferência a cada 10 min (`lib/inngest/compras.ts`)

Função Inngest `compras-conferir` (cron `*/10 * * * *`, só produção, T57), lendo `compras_para_conferir()`:

- `criado` ou `pendente` com Pix ou Checkout, de 5 min a 48 h → Pix: `processarPagamento(asaas_pix_id)`; Checkout: `pagamentosDoCheckout` → `processarPagamento` de cada;
- `aprovado` com `acesso_enviado_em` vazio → tenta o e-mail de novo.

Os passos devolvem só ids (T36). Cobre aviso perdido, fila pausada, app fora do ar e e-mail que caiu.

### Banco

`payments`: uma linha por compra (intenção de pagar). Colunas do Asaas: `asaas_cliente_id`, `asaas_pix_id` (único), `asaas_checkout_id` (único), `asaas_checkout_expira_em`, `asaas_ref` (único: id do parcelamento ou do pagamento que aprovou ou gerou o alerta). Estados e transições iguais ao design anterior (`criado → pendente → aprovado → estornado`, `recusado`, `retido`), só em `compra_registrar`; `aprovado` nunca volta; `retido` e `estornado` são finais para a automação.

**Não guarda:** nome, CPF, telefone, endereço, dado de cartão, QR do Pix.

### Telas

- `components/telas/tela-comprar.tsx`: "Comece o livro de memórias", campo de e-mail, sugestão de domínio, "O acesso vai para **fulano@gmail.com**", *Continuar*, linha pequena "Pix ou cartão em até 3x sem juros". Com `ASAAS_MODO=sandbox`, faixa "Modo de teste: nenhum valor é cobrado".
- `components/telas/tela-compra.tsx`, por estado:
  - **escolher** (`criado`, sem Pix): "R$ 467 · plano de 1 ano" · campos *Nome completo* e *CPF* (teclado numérico, máscara, `autocomplete="off"`) · *Gerar Pix* (principal) · "Pedimos o CPF só para gerar o Pix. A Ecoa não guarda o CPF." · link *Pagar com cartão em até 3x*;
  - **pix** (`criado`/`pendente` com Pix): QR · *Copiar código Pix* (principal; no celular é o que se usa) · "Esperando o pagamento. Pode fechar: avisamos por e-mail." · link *Prefiro cartão*;
  - **conferindo o cartão** (voltou do Checkout, ainda sem confirmação): "Conferindo o pagamento…" (atualiza a cada 4 s por até 10 min; depois "Pode fechar: avisamos por e-mail.");
  - **pronto:** "Pronto! Seu livro está criado." · "Enviamos o acesso para gu•••@gmail.com." · *Entrar com Google* · "ou abra o e-mail";
  - **não passou:** "O pagamento não passou." · *Tentar de novo* (volta para escolher);
  - **conferindo** (`retido`/`estornado`): "Estamos conferindo seu pagamento. Avisamos por e-mail."
- Dica de primeira vez: não se aplica (nenhum gesto escondido). Estado vazio: não se aplica.
- Exemplos em `lib/exemplos/prompt14.ts` e no styleguide; gate de design nas duas telas.

### Admin

`/admin` ganha *Compras* (últimas 30): data, e-mail, valor, meio, parcelas, estado, alerta, acesso enviado, link do livro, e o id do Asaas para achar no painel. Leitura por `admin_listar_compras`.

### LGPD

- **Minimização:** a Ecoa guarda só e-mail, valor, meio, parcelas, estado e ids do Asaas. Nome e CPF passam pela ação do servidor direto para o Asaas e não ficam em banco, log, evento, Inngest nem `localStorage`.
- **Finalidade e transparência:** a frase ao lado do CPF diz para que serve e que não fica com a Ecoa. O Asaas é o meio de pagamento (instituição de pagamento autorizada pelo Banco Central) e trata nome e CPF para emitir a cobrança; entra na lista de terceiros da `/privacidade` (prompt 15).
- **Sem comunicação do Asaas:** `notificationDisabled: true` em todo cliente criado; quem fala com o comprador é a Ecoa.
- **Retenção:** compras não pagas há mais de 90 dias perdem o e-mail (job do prompt 15, que já cuida da retenção). Registrado aqui para não esquecer.
- **Erros:** `lib/pagamento/asaas.ts` nunca registra o corpo da resposta nem os parâmetros; só status e códigos.

### Variáveis

| Nome | O que é |
| --- | --- |
| `ASAAS_API_KEY` | Chave da API (`$aact_…`), do sandbox até a conta de produção aprovada |
| `ASAAS_WEBHOOK_TOKEN` | Token do webhook (32+ caracteres, sorteado), o mesmo configurado no painel |
| `ASAAS_MODO` | `sandbox` ou `producao` (base da API, host do Checkout e faixa na tela) |

Só em Production e no `.env.local`; lidas em `lib/env-pagamento.ts` (zod, `server-only`), nunca com `NEXT_PUBLIC_`. A chave com `$` vai entre aspas simples no `.env.local`. Sem elas, `/comprar` mostra "A compra abre em breve." e o aviso responde 503 (uma falha só, que não chega a 15 seguidas sem alguém perceber no painel).

## SQL de subida

`supabase/migrations/20261130120000_compra_asaas.sql`

```sql
-- Compra do plano pelo Asaas (P83, P84, T60).

create type public.pagamento_estado as enum
  ('criado', 'pendente', 'aprovado', 'recusado', 'retido', 'estornado');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'plano' check (tipo in ('plano')),
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 254),
  valor_centavos integer not null check (valor_centavos > 0),
  estado public.pagamento_estado not null default 'criado',
  asaas_cliente_id text,
  asaas_pix_id text unique,
  asaas_checkout_id text unique,
  asaas_checkout_expira_em timestamptz,
  asaas_ref text unique,
  meio text check (meio in ('pix', 'cartao')),
  parcelas smallint check (parcelas between 1 and 12),
  book_id uuid references public.books (id) on delete restrict,
  alertas text[] not null default '{}',
  acesso_enviado_em timestamptz,
  consultado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  aprovado_em timestamptz
);
create index payments_email_criado_em on public.payments (email, criado_em desc);
create index payments_estado_criado_em on public.payments (estado, criado_em desc);

-- Sem política: anon e authenticated não leem nem escrevem. Só a chave secreta (T60).
alter table public.payments enable row level security;
revoke all on table public.payments from anon, authenticated;

-- Números de lib/config.ts conferidos no banco.
create function privado.preco_plano_centavos() returns integer language sql immutable as $$ select 46700 $$;
create function privado.duracao_plano_meses() returns integer language sql immutable as $$ select 12 $$;
create function privado.max_compras_por_email_dia() returns integer language sql immutable as $$ select 5 $$;
create function privado.minutos_compra_aberta() returns integer language sql immutable as $$ select 30 $$;

-- E-mail para o teto: no Gmail, sem pontos e sem +algo.
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
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  v_canonico text := privado.email_canonico(lower(btrim(p_email)));
  v_id uuid;
begin
  -- Uma compra por vez para o mesmo e-mail canônico: o teto não fura sob concorrência.
  perform pg_advisory_xact_lock(hashtext('compra:' || v_canonico));

  select p.id into v_id from public.payments p
  where p.email = v_email and p.estado = 'criado'
    and p.criado_em > now() - make_interval(mins => privado.minutos_compra_aberta())
  order by p.criado_em desc limit 1;
  if found then
    return v_id;
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
  return v_id;
end $$;

-- Guarda o Pix criado. Falso se a compra já tinha Pix ou não está mais 'criado' (corrida):
-- quem chamou cancela no Asaas o Pix que sobrou.
create function public.compra_guardar_pix(p_compra uuid, p_cliente text, p_pix text)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.payments
  set asaas_cliente_id = p_cliente, asaas_pix_id = p_pix, meio = 'pix', atualizado_em = now()
  where id = p_compra and estado = 'criado' and asaas_pix_id is null;
  return found;
end $$;

-- Guarda o Checkout do cartão e solta o Pix (já cancelado no Asaas por quem chamou).
create function public.compra_guardar_checkout(p_compra uuid, p_checkout text, p_expira_em timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.payments
  set asaas_checkout_id = p_checkout, asaas_checkout_expira_em = p_expira_em,
      asaas_pix_id = null, meio = 'cartao', atualizado_em = now()
  where id = p_compra and estado in ('criado', 'recusado');
  if found then
    update public.payments set estado = 'criado' where id = p_compra and estado = 'recusado';
  end if;
  return found;
end $$;

-- Freio da consulta pela tela e pela volta: no máximo 1 a cada 20 s por compra.
create function public.compra_pode_consultar(p_compra uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.payments set consultado_em = now()
  where id = p_compra
    and estado in ('criado', 'pendente', 'recusado')
    and (consultado_em is null or consultado_em < now() - interval '20 seconds');
  return found;
end $$;

-- Uma porta para todos os estados. p_acao: aprovar | pendente | recusado | estorno | reter.
-- p_ref: id do parcelamento ou do pagamento no Asaas. Devolve o livro, se a compra o criou agora
-- (novo) e um alerta, só na 1ª vez que ele acontece.
create function public.compra_registrar(
  p_compra uuid,
  p_ref text,
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

  if p_acao = 'aprovar' then
    if v.estado in ('retido', 'estornado') then
      return query select v.book_id, false, null::text;
      return;
    end if;
    if v.book_id is not null then
      v_alerta := case when v.asaas_ref is distinct from p_ref then 'pagamento_duplicado' end;
    elsif p_valor_centavos is distinct from v.valor_centavos then
      update public.payments set estado = 'retido', asaas_ref = p_ref,
        atualizado_em = now() where id = p_compra;
      v_alerta := 'valor_diferente';
    else
      if p_responsavel is null then
        raise exception 'compra_sem_responsavel';
      end if;
      -- A mesma regra do admin: uma só forma de criar livro com plano.
      v_livro := public.admin_ativar_plano(p_responsavel, null, privado.duracao_plano_meses());
      update public.payments
      set estado = 'aprovado', asaas_ref = p_ref, meio = p_meio, parcelas = p_parcelas,
          book_id = v_livro, aprovado_em = now(), atualizado_em = now()
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
    if v.estado <> 'estornado' and (v.asaas_ref is null or v.asaas_ref = p_ref) then
      update public.payments set estado = 'estornado', asaas_ref = p_ref,
        atualizado_em = now() where id = p_compra;
      v_alerta := 'estorno';
    end if;

  elsif p_acao = 'reter' then
    if p_alerta is null then
      raise exception 'compra_acao_invalida';
    end if;
    if v.estado not in ('retido', 'estornado') then
      update public.payments set estado = 'retido',
        asaas_ref = coalesce(v.asaas_ref, p_ref), atualizado_em = now()
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

create function public.admin_listar_compras()
returns table (
  id uuid, criado_em timestamptz, email text, valor_centavos integer, meio text,
  parcelas smallint, estado public.pagamento_estado, alertas text[],
  acesso_enviado_em timestamptz, book_id uuid, asaas_ref text
)
language sql stable security definer set search_path = '' as $$
  select id, criado_em, email, valor_centavos, meio, parcelas, estado, alertas,
         acesso_enviado_em, book_id, coalesce(asaas_ref, asaas_pix_id, asaas_checkout_id)
  from public.payments order by criado_em desc limit 30
$$;

create function public.compras_para_conferir()
returns table (id uuid, estado public.pagamento_estado, asaas_pix_id text, asaas_checkout_id text)
language sql stable security definer set search_path = '' as $$
  select id, estado, asaas_pix_id, asaas_checkout_id from public.payments
  where (estado in ('criado', 'pendente')
         and (asaas_pix_id is not null or asaas_checkout_id is not null)
         and criado_em between now() - interval '48 hours' and now() - interval '5 minutes')
     or (estado = 'aprovado' and acesso_enviado_em is null)
  order by criado_em
  limit 100
$$;

revoke all on function
  public.compra_criar(text),
  public.compra_guardar_pix(uuid, text, text),
  public.compra_guardar_checkout(uuid, text, timestamptz),
  public.compra_pode_consultar(uuid),
  public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text),
  public.compra_marcar_acesso(uuid),
  public.admin_listar_compras(),
  public.compras_para_conferir()
  from public, anon, authenticated;
grant execute on function
  public.compra_criar(text),
  public.compra_guardar_pix(uuid, text, text),
  public.compra_guardar_checkout(uuid, text, timestamptz),
  public.compra_pode_consultar(uuid),
  public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text),
  public.compra_marcar_acesso(uuid),
  public.admin_listar_compras(),
  public.compras_para_conferir()
  to service_role;
```

## SQL de reversão

`supabase/reversao/20261130120000_compra_asaas.down.sql`

```sql
drop function public.compras_para_conferir();
drop function public.admin_listar_compras();
drop function public.compra_marcar_acesso(uuid);
drop function public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text);
drop function public.compra_pode_consultar(uuid);
drop function public.compra_guardar_checkout(uuid, text, timestamptz);
drop function public.compra_guardar_pix(uuid, text, text);
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

- **Banco** (`supabase/tests/compra.test.ts`, PGlite):
  - compra aberta reaproveitada; teto por e-mail canônico;
  - `compra_guardar_pix` 2 vezes → a 2ª devolve falso; `compra_guardar_checkout` solta o Pix e volta `recusado` para `criado`;
  - `compra_pode_consultar` → verdadeiro, falso em seguida, falso em compra `aprovado`;
  - aprovar cria 1 livro + 1 responsável com 12 meses; aprovar 2 vezes com o mesmo `ref` devolve o mesmo livro, `novo = false`, sem alerta;
  - outro `ref` aprovado → `pagamento_duplicado` 1 vez só;
  - valor diferente → `retido`, nenhum livro, alerta 1 vez;
  - `recusado` depois de `aprovado` não muda nada; estorno antes do aprovar → `estornado` e o aprovar seguinte não cria livro;
  - `reter` sem alerta → erro; segunda compra aprovada em 24 h → `segunda_compra_24h`;
  - `compras_para_conferir` acha pendente com Pix, criado com Checkout e aprovado sem acesso; ignora `criado` sem Pix nem Checkout.
- **RLS** (`rls.test.ts`): as 8 funções novas no array `chamadas`; `payments` na lista "anon não tem acesso a nenhuma tabela"; a reversão em `reverter()`.
- **Config** (`config-banco.test.ts`): preço, duração, teto e minutos. Frases em `lib/erros-banco.ts` para `compra_teto_email`, `compra_inexistente`, `compra_sem_responsavel`, `compra_acao_invalida`.
- **Puras** (Vitest): `tokenConfere` (certo, errado, vazio, outro tamanho → falso sem lançar); `acaoDoAsaas` (todos os status, parcelas misturadas, `refunds` parcial); `cpfValido` (válidos, dígito errado, 11 iguais); soma de parcelas em centavos (155,67 + 155,67 + 155,66 = 46700); `mascararEmail`; `sugerirDominio`; corpo do Checkout (`maxInstallmentCount: 3`, só `CREDIT_CARD`, `externalReference`, callbacks).
- **Processar** (Asaas, banco e e-mail falsos): aviso e volta ao mesmo tempo → 1 livro e 1 e-mail; 3 avisos de parcelas do mesmo parcelamento → 1 livro, sem alerta; e-mail falhou → a próxima chamada envia; Pix de outra compra na URL → nada; `externalReference` diferente → retido; pagamento sem compra → nada.
- **Aviso** (`app/api/asaas/route.test.ts`): token errado → 401; corpo com campo desconhecido → 200; processamento que lança → 200 e `erro_servidor`; `lib/erros-servidor.test.ts` com caso para `/api/asaas`.
- **Log sem dado pessoal:** teste que força erro do Asaas com nome e CPF no corpo e confere que nada disso aparece no que foi registrado.
- **Telas** (Playwright, styleguide): `/comprar` (com e sem faixa de teste, com sugestão de domínio) e os 6 estados de `/comprar/[compra]` a 390 px.
- **Aceite** (produção com `ASAAS_MODO=sandbox`):
  - Pix de teste pago pelo painel do sandbox: a tela vira "Pronto" sozinha e o e-mail chega em menos de 1 minuto;
  - cartão de teste à vista e em 3x: 1 livro, `parcelas = 3`, valor somado 46700;
  - cartão recusado no Checkout; voltar sem pagar; trocar de Pix para cartão;
  - aviso com token errado → 401; fila do webhook ativa no painel depois dos testes.
  - Depois, apagar os livros de teste pelo admin ou deixá-los marcados.

## Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Aviso falso criando livro | O token só autentica; o estado vem da API com a nossa chave, e sem o pagamento na nossa conta nada acontece |
| Token do webhook vazado | Mesmo efeito do aviso falso (só provoca uma consulta); trocar no painel e na Vercel |
| Fila do webhook pausada (15 falhas) | 200 sempre que o token confere; falha vira `erro_servidor`; conferência de 10 min; checar a fila no painel no aceite |
| Volta forjada | A volta só dispara consulta à API (com freio de 20 s); nada da URL vira estado |
| Pix e cartão pagos na mesma compra | Pix cancelado ao trocar; se ainda assim, `pagamento_duplicado` e estorno pelo admin |
| 3 avisos por parcelamento | `ref` = id do parcelamento; soma das parcelas; idempotente |
| CPF ou nome em log | Cliente do Asaas sem corpo nos logs; teste dedicado; nada no Inngest nem em eventos |
| Teste de cartões roubados | O cartão é digitado no Checkout do Asaas, com o antifraude dele; limite por IP no Firewall; contestação vira alerta |
| Script gerando Pix em massa | Limite por IP no Firewall; teto por e-mail; 1 Pix por compra |
| Asaas cobrando notificação | `notificationDisabled: true` |
| Chave do sandbox em produção (ou o contrário) | `ASAAS_MODO` decide a base; a faixa na tela mostra o modo |
| Vercel Hobby não permite uso comercial | T39: Pro antes do 1º cliente pagante |

## Alternativas consideradas

### A: Cartão na nossa página (API de cartão do Asaas)
O número do cartão passaria pelas funções da Vercel: escopo PCI e risco que uma empresa de 1 pessoa não deve carregar. Descartada.

### B: Tudo no Checkout do Asaas (Pix também)
Menos código, mas o Pix sairia da página, contra o pedido do Guilherme. Descartada; continua como plano B se o Pix na página der problema.

### C: Responder 500 quando o processamento falha
É o padrão de "o provedor repete", mas no Asaas 15 falhas seguidas pausam a fila e param todas as vendas. Descartada: 200 sempre e conferência de 10 min.

### D: Processar o aviso no Inngest
É o que o Asaas recomenda (guardar e responder rápido). Só que acrescenta uma peça no caminho quente, e o processamento leva ~2 s, bem abaixo dos 10 s. Fica a conferência de 10 min como rede de segurança.

### E: Link de pagamento fixo
Não liga o pagamento à compra; continua útil à mão, enquanto este prompt não sai.

### F: Guardar o CPF para reaproveitar
Facilitaria uma 2ª compra, mas é dado pessoal sem necessidade para a Ecoa. Descartada.

## Revisão (EGM, 1 rodada, 2 revisores em Sonnet)

Pendente.

## Pré-requisitos (passos do Guilherme)

1. Conta no Asaas aprovada (produção) e conta no sandbox (`sandbox.asaas.com`), cada uma com a sua chave de API.
2. No sandbox e na produção: chave Pix cadastrada (sem ela o QR dá erro no sandbox).
3. Webhook no painel (*Integrações → Webhooks*): URL `https://app.ecoa-memorias.com.br/api/asaas`, versão 3, envio **não sequencial**, token de autenticação (32+ caracteres, sorteado), eventos `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE`, `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`, `PAYMENT_REPROVED_BY_RISK_ANALYSIS`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `CHECKOUT_PAID`.
4. Variáveis na Vercel (Production) e no `.env.local`.
5. Limite por IP no Firewall da Vercel para `POST` em `/comprar` e `/comprar/*`.
6. Vercel Pro antes da 1ª venda real (T39).
7. Com `ASAAS_MODO=producao`: botão *Comprar* da landing apontando para `https://app.ecoa-memorias.com.br/comprar`.

## Perguntas em aberto

1. **Host do Checkout no sandbox.** A documentação só mostra `https://asaas.com/checkoutSession/show?id=…`. O 1º teste confirma se no sandbox é `sandbox.asaas.com`; o código lê o host por `ASAAS_MODO`.
2. **Texto na fatura do cartão.** A API do Asaas não tem campo para isso; o nome que aparece vem do cadastro da conta. Conferir no painel se dá para deixar "ECOAMEMORIAS".

## Plano de implementação

1. **Banco.** Migration, reversão e `supabase/tests/compra.test.ts`; alterar `rls.test.ts`, `config-banco.test.ts` e `lib/erros-banco.ts` juntos.
2. **Config e tipos.** `lib/config.ts`: `MAX_COMPRAS_POR_EMAIL_DIA`, `MINUTOS_COMPRA_ABERTA`, `MAX_PARCELAS_CARTAO = 3`, `MINUTOS_CHECKOUT = 60`. Tipos gerados em arquivo; em `lib/supabase/tipos.ts` só `payments`, `pagamento_estado` e as 8 funções.
3. **Pagamento.** `lib/env-pagamento.ts`; `lib/pagamento/`: `asaas.ts` (cliente), `estado.ts` (puras: `acaoDoAsaas`, `tokenConfere`, `cpfValido`, `mascararEmail`, `sugerirDominio`, centavos), `processar.ts` e os testes.
4. **Acesso, alertas e eventos.** `enviarAcesso` com `idempotencyKey`; `avisarAdminsDaCompra` e o modelo de e-mail; `plano_comprado` em `lib/eventos-acoes.ts` e "Plano comprado" em `lib/aderencia/rotulos.ts`.
5. **Rotas e fila.** `app/api/asaas/route.ts`, `lib/inngest/compras.ts` e o registro; `proxy.ts` (matcher), `lib/rotas.ts` (`PRIVADAS`), `lib/erros-servidor.test.ts`.
6. **Telas.** `app/comprar/` (página e `acoes.ts`), `app/comprar/[compra]/` (página e `acoes.ts`), `tela-comprar.tsx`, `tela-compra.tsx`, `lib/exemplos/prompt14.ts`, styleguide e `scripts/inspecionar-telas.mjs`; gate de design.
7. **Admin.** Lista *Compras*.
8. **Documentos.** `docs/mapa.md`; `decisoes.md` e `decisoes-resumo.md` (P83, P84, T60; P77 "substituída em parte por P83", P78 por P84, T58 por T60); `compra-mercado-pago.md` ganha "Substituído por `compra-asaas.md`" no status.
9. **Fechamento.** Gate de fim de tarefa; aceite na produção com `ASAAS_MODO=sandbox`.
