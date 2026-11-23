# Compra do plano pelo Asaas (prompt 14, parte 1, refeito)

Status: **aprovado pelo Guilherme em 23/11/2026** · 23/11/2026 · PRD: M1 (onda 2). Substitui `compra-mercado-pago.md` (aprovado em 20/11, nunca construído) na camada do provedor. Do anterior ficam a compra como intenção de pagar, 1 livro por compra, o alerta que sai 1 vez, a conferência periódica e a tela de e-mail. Documentação do Asaas lida em 23/11 em `docs.asaas.com` (páginas de Checkout de ago–out/2026).

## Visão geral

O Guilherme trocou o gateway para o Asaas. A pessoa toca em *Comprar* na landing, confere o e-mail em `/comprar` e escolhe como pagar:

- Nome e CPF são pedidos só nesse passo, num formulário único para os dois meios.
- **Pix na própria página.** O QR e *Copiar código Pix* aparecem na tela, e ela vira "Pronto" sozinha quando o Pix cai.
- **Cartão no Checkout hospedado do Asaas**, em até 3x sem juros. O número do cartão nunca passa pela Ecoa.

Pagamento confirmado cria o livro, ativa o plano por 12 meses e manda o e-mail de acesso em menos de 1 minuto.

## O problema

- O gateway agora é o Asaas. O design aprovado fala com a API do Mercado Pago, que não será usada.
- O Guilherme quer o pagamento dentro da página.
  - Para o Pix isso é seguro: o QR não é dado sensível.
  - Para o cartão, a API do Asaas só recebe o número pelo servidor de quem integra, o que poria a Ecoa no escopo do PCI. Por isso o cartão fica no Checkout do Asaas.
- O Asaas exige nome e CPF para criar uma cobrança Pix (`POST /v3/customers`: `name` e `cpfCnpj` obrigatórios). O CPF é dado pessoal: entra só no passo do Pix e não fica no nosso banco.

## Objetivos

1. Comprar em poucos toques:
   - **Pix:** e-mail → *Continuar* → nome e CPF → QR;
   - **Cartão:** e-mail → *Continuar* → nome e CPF → *Cartão* → Checkout do Asaas.
2. Pagamento confirmado cria o livro, ativa o plano e manda o acesso em menos de 1 minuto (aceite do M1).
3. O mesmo pagamento nunca cria dois livros. Nenhum pagamento confirmado fica sem livro **e** sem alerta entregue ao admin.
4. Nenhum dado de cartão passa pela Ecoa. CPF e nome vão direto ao Asaas e não ficam no banco, nos logs, nos eventos nem no Inngest.
5. O admin vê cada compra e recebe **1** e-mail quando algo foge do normal.

## Não objetivos

- Impressão, frete e extras (prompt 14, parte 2).
- Renovação pelo Asaas (continua no admin).
- Parcelas de 4x a 12x com juros do cliente. A API do Checkout só tem `installment.maxInstallmentCount`, sem juros por parcela (o campo `interest` é juro por atraso). O Guilherme escolheu só até 3x sem juros (23/11).
- Boleto, cupom, nota fiscal automática, assinatura recorrente.
- Cartão dentro da nossa página (PCI). Pix pelo Checkout do Asaas (o Pix fica na nossa página).
- Botão *Liberar* para compra `retida`. O admin resolve à mão, como hoje: ativa o plano pelo admin e estorna no painel do Asaas. Volta como prompt se acontecer mais de uma vez.
- Entrar sozinho na volta, sem login. Desligar o livro sozinho em estorno ou contestação.

## Decisões novas (entram em `decisoes.md` na aprovação)

- **P83 Compra pelo Asaas.** Substitui P77 em parte.
  - **Sai:** o Checkout Pro do Mercado Pago.
  - **Fica:** `/comprar` com um campo; o e-mail digitado vira o responsável; *Entrar com Google* na volta; o acesso também por e-mail.
  - **Depois do e-mail:** `/comprar/{compra}` pede nome e CPF (só aqui, para os dois meios) e oferece Pix na própria página como ação principal (QR e copia-e-cola na tela) e cartão no Checkout hospedado do Asaas como alternativa. Sem boleto.
  - **Dados pessoais:** nome e CPF vão ao Asaas e não ficam na Ecoa. A compra só é mexida pelo aparelho que a começou.
  - **Motivo:** o Guilherme trocou o gateway; o Pix fica na página sem tocar em dado sensível; o cartão hospedado mantém o motivo da P5 (nenhum dado de cartão).
  - **Alternativas:** cartão na nossa página (PCI); tudo no Checkout do Asaas (Pix fora da página).
- **P84 Parcelas.** Substitui P78. Cartão em até 3x sem juros (`maxInstallmentCount = 3`); sem 4x a 12x.
  - **Motivo:** a API do Checkout do Asaas não repassa juros por parcela ao cliente; o Guilherme preferiu receber mais rápido a oferecer 12x sem juros.
  - **Alternativas:** 12x sem juros recebendo mês a mês; dois preços (dois checkouts, uma escolha a mais na tela).
- **T60 Pagamento no Asaas.** Substitui T58.
  - **Estado:** `payments` e `payment_attempts` sem política (só a chave secreta). O estado vem **sempre** da API com a nossa chave, nunca do corpo do aviso nem da URL de volta.
  - **Aviso:** autenticado pelo cabeçalho `asaas-access-token` (token de 32+ caracteres, comparado em tempo constante; um token anterior aceito durante a troca). Com o token certo, ou faltando configuração, a rota responde **200 sempre**: o Asaas pausa a fila do webhook após 15 falhas seguidas, o que pararia todas as vendas. A falha vira `erro_servidor`, e a conferência a cada 10 min recupera.
  - **Ligação com a compra:** pelo `externalReference` (o id da compra) e, no cartão, pelo `checkoutSession` registrado em `payment_attempts`. Pagamento confirmado que não liga a nenhuma compra vira alerta, nunca silêncio.
  - **Valor:** conferido pela soma das parcelas, sem juros nem multa.
  - **Uma função só:** aviso, volta, consulta da tela e conferência chamam a mesma `processarPagamento`. O banco garante 1 livro por compra; o alerta é marcado como enviado só depois de entregue.
  - **Ambiente:** cada compra grava `ambiente` (`sandbox` ou `producao`). A chave é conferida contra `ASAAS_MODO` pelo prefixo (`$aact_hmlg_` ou `$aact_prod_`). No sandbox, `/comprar` só aceita os e-mails de `ASAAS_EMAILS_TESTE`.
  - **Notificações:** clientes criados com `notificationDisabled: true`.
  - **Segredos:** `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN`, `ASAAS_WEBHOOK_TOKEN_ANTERIOR` (opcional), `ASAAS_MODO`, `ASAAS_EMAILS_TESTE`.
  - **Motivo:** aviso falso, volta forjada, aviso perdido ou repetido, fila pausada, troca de meio no meio do caminho e teste em produção não podem criar livro a mais nem deixar pago sem livro.
  - **Alternativas:** confiar no corpo do aviso; responder 500 na falha (pausa a fila); processar o aviso no Inngest; SDK.

## Jornadas críticas

### CUJ 1: Comprar com Pix
- **Dado** alguém na landing,
- **Quando** toca em *Comprar*, digita o e-mail em `/comprar`, confere "O acesso vai para **fulano@gmail.com**", toca em *Continuar*, preenche nome e CPF e toca em *Gerar Pix*,
- **Então** vê o QR, *Copiar código Pix* e "Esperando o pagamento. Pode fechar: avisamos por e-mail."; pago o Pix (no celular, pelo copia-e-cola), a mesma tela vira "Pronto! Seu livro está criado." com *Entrar com Google*, e o e-mail de acesso chega em menos de 1 minuto.
- O Pix vale 48 h. Depois disso, é cancelado no Asaas e a tela oferece *Gerar outro Pix*.

### CUJ 2: Comprar com cartão
- **Quando** toca em *Pagar com cartão* em `/comprar/{compra}`,
- **Então** vai ao Checkout do Asaas (até 3x sem juros), já com nome e CPF preenchidos, digita o cartão **lá** e volta para `/comprar/{compra}`: "Pronto" se já confirmou; senão, "Conferindo o pagamento…", que vira "Pronto" sozinho.

### CUJ 3: Fechou a aba no meio
- **Dado** um pagamento confirmado e a aba fechada,
- **Então** o aviso do Asaas cria o livro e manda o e-mail. Se o aviso falhar, a conferência de 10 min faz isso.

### CUJ 4: Cartão recusado ou desistiu
- **Recusa no Checkout:** a pessoa tenta outro cartão no próprio Checkout, que continua ativo por 60 min.
- **Voltou sem pagar ou o Checkout expirou:** `/comprar/{compra}` volta a oferecer Pix e cartão.
- **Reprovado pela análise de risco do Asaas:** "O pagamento não passou." e *Tentar de novo*.

### CUJ 5: Trocou de ideia entre Pix e cartão
- **Dado** um Pix gerado,
- **Quando** toca em *Prefiro cartão*,
- **Então** o Pix é cancelado no Asaas e o Checkout abre.
- Se o cancelamento falhar e o Pix antigo for pago, ele ainda liga à compra (pelo `externalReference` e por `payment_attempts`). O 1º pagamento cria o livro; o 2º vira o alerta `pagamento_duplicado`, e o admin estorna.

### CUJ 6: E-mail digitado errado
- A tela sugere o domínio ("Você quis dizer fulano@**gmail**.com?") e mostra o e-mail inteiro antes de *Continuar*.
- Se mesmo assim errar, o admin troca o responsável, como hoje.

### CUJ 7: Quem já tem conta compra outro livro
- A compra cria um livro novo para a mesma conta.
- Uma segunda compra confirmada do mesmo e-mail em 24 h gera 1 alerta informativo.

### CUJ 8: Abriu o link da compra em outro aparelho
- **Dado** o link `/comprar/{compra}` aberto sem o cookie do aparelho que começou a compra,
- **Então** a tela mostra só o estado, sem e-mail e sem botões: "Esperando o pagamento", "Pronto" ou "Estamos conferindo". Se a compra ainda não tem cobrança: "Abra no aparelho onde começou, ou comece de novo." e *Começar de novo*.

### CUJ 9: Algo foge do normal
- **Casos:**
  - valor diferente de R$ 467 (somadas as parcelas);
  - juros ou multa no pagamento;
  - meio inesperado;
  - baixa manual no painel;
  - conta recusada (`identidadeAceitavel`);
  - segundo pagamento na mesma compra;
  - estorno total ou parcial;
  - contestação;
  - pagamento confirmado sem compra;
  - acesso que não sai depois de 6 tentativas.
- **Então:**
  - nenhum livro novo; a compra fica `retida` (ou `estornada`) quando é ela a afetada;
  - a tela mostra "Estamos conferindo seu pagamento. Avisamos por e-mail.";
  - o admin recebe **1** e-mail com o id da compra ou do Asaas, reenviado pela conferência até sair.

## Plano técnico

### Fluxo

```
landing ─▶ /comprar ── iniciarCompra ─▶ compra_criar (SQL) ─▶ cookie do dono ─▶ /comprar/{compra}
                                                                                   │
          ┌──── Pix: gerarPix(nome, CPF) ─▶ POST /customers ─▶ POST /payments (PIX) ─▶ compra_guardar_tentativa ─▶ QR na tela
          └── Cartão: pagarComCartao ─▶ POST /checkouts (até 3x) ─▶ compra_guardar_tentativa ─▶ Checkout do Asaas
                                                                                   │
   /api/asaas ◀── aviso (asaas-access-token) ──────────────────────────────────────┤
   /comprar/{compra} ◀── volta do Checkout e consulta da tela (freio de 20 s) ─────┤
   Inngest compras-conferir (10 min) ──────────────────────────────────────────────┘
                │ todos
                ▼
   processarPagamento(id) ─▶ GET /payments/{id} (+ parcelas) ─▶ acha a compra ─▶ confere
       ─▶ contaParaEmail ─▶ compra_registrar ─▶ e-mail de acesso ─▶ compra_marcar_acesso
       ─▶ alerta ─▶ e-mail aos admins ─▶ compra_marcar_alerta
```

### Rotas

| Caminho | O que faz | Quem entra |
| --- | --- | --- |
| `/comprar` | E-mail (preenchido se houver sessão), sugestão de domínio, "O acesso vai para…", *Continuar*, linha "Pix ou cartão em até 3x sem juros" | público |
| `/comprar/[compra]` | Escolher o meio, Pix (QR), esperando, pronto, não passou, conferindo | público; ações só com o cookie do dono; `noindex`, `no-store`, `no-referrer` |
| `/api/asaas` | Recebe o aviso; confere o token; chama `processarPagamento` | Asaas |

- `/comprar` não entra em `PROTEGIDAS`. `/^\/comprar\/[^/]+/` entra em `PRIVADAS` (`lib/rotas.ts`).
- `api/asaas` entra no regex do `matcher` do `proxy.ts` (`|api/asaas`, ao lado de `api/inngest`): o aviso não tem sessão.
- `[compra]` é o uuid da compra.
- Limite por IP no Firewall da Vercel para `POST` em `/comprar` e `/comprar/*` (configuração, pré-requisito). O código tem os próprios tetos (abaixo).

### Dono da compra

- `iniciarCompra` sorteia um segredo de 32 bytes (`crypto.getRandomValues`, base64url) e manda só o hash SHA-256 ao banco (`p_dono_hash`), no mesmo padrão dos tokens de link (T6).
- O segredo vai num cookie `ecoa_compra`:
  - valor `{compra}.{segredo}`;
  - `httpOnly`, `secure`, `sameSite=lax` (sobrevive à volta do Checkout, que é uma navegação de topo);
  - `path=/comprar`, validade de 72 h.
- Toda ação de `/comprar/[compra]` (gerar Pix, cartão, *Prefiro cartão*, mostrar QR e e-mail mascarado) confere o hash do cookie contra `dono_hash`, em tempo constante (`donoConfere`, pura).
- Sem o cookie, a página só mostra o estado (CUJ 8).
- **Reaproveitamento** só pelo cookie: o mesmo aparelho com compra `criado` do mesmo e-mail há menos de 30 min volta para ela. Digitar o e-mail de outra pessoa cria **outra** compra e nunca entrega a dela.

### Tetos

- **Por e-mail:** até `MAX_COMPRAS_POR_EMAIL_DIA = 5` compras **com cobrança** (com alguma linha em `payment_attempts`) em 24 h, pelo e-mail canônico, com trava. Compra sem cobrança não conta, então ninguém esgota o teto de outra pessoa só digitando o e-mail dela.
- **Global:** até `MAX_COBRANCAS_HORA = 30` cobranças criadas no Asaas por hora, em todas as compras.
  - Acima disso: "Muitas compras agora. Tente de novo em alguns minutos." e 1 alerta por hora ao admin.
  - Protege a conta do Asaas de Pix e Checkouts em massa.
  - 30 por hora é muito acima da venda esperada; o número fica em `lib/config.ts` para subir se faltar.
- **Por compra:** 1 Pix ativo e 1 Checkout ativo por vez; criar um novo cancela o anterior (tentativa única) e guarda os dois em `payment_attempts`.

### Cliente do Asaas (`lib/pagamento/asaas.ts`)

**Como chama:**
- `fetch` com zod, sem SDK.
- Base `https://api-sandbox.asaas.com/v3` ou `https://api.asaas.com/v3`, por `ASAAS_MODO`.
- Cabeçalho `access_token`; `AbortSignal.timeout(7000)` em toda chamada.

**Erros sem dado pessoal:**
- Toda resposta passa por um único `chamar()`, que embrulha **qualquer** erro (HTTP, rede, JSON inválido, `ZodError`) num `ErroAsaas { status, codigos }`.
- `ErroAsaas` nunca carrega o corpo, a mensagem do zod nem os parâmetros: uma resposta 200 malformada de `/customers` traz `name` e `cpfCnpj` e não pode chegar ao log padrão do Next.

**Funções:**
- `criarCliente({ nome, cpf, email, compra })` → `POST /customers` com `notificationDisabled: true` e `externalReference: compra`;
- `criarPix({ cliente, compra, valorCentavos })` → `POST /payments` com:
  - `billingType: "PIX"`, `value`, `description: "Plano anual Ecoa Memórias"`, `externalReference: compra`;
  - `dueDate` = daqui a 2 dias (fuso de São Paulo). O Pix é cancelado em 48 h, antes de vencer: sem juros nem multa;
- `qrDoPix(id)` → `GET /payments/{id}/pixQrCode` (`encodedImage`, `payload`). Não é guardado; é buscado ao abrir a tela;
- `cancelarPix(id)` → `DELETE /payments/{id}`; `cancelarCheckout(id)` → `POST /checkouts/{id}/cancel`;
- `criarCheckout({ compra, valorCentavos })` → `POST /checkouts` com:
  - `billingTypes: ["CREDIT_CARD"]`, `chargeTypes: ["DETACHED", "INSTALLMENT"]`;
  - `installment.maxInstallmentCount = MAX_PARCELAS_CARTAO` (3), `minutesToExpire: MINUTOS_CHECKOUT` (60);
  - `externalReference: compra`, `items: [{ name: "Plano anual Ecoa Memórias", quantity: 1, value }]`;
  - `callback`: as três URLs = `{urlDoApp()}/comprar/{compra}`;
  - `customer`: o cliente criado pela Ecoa com `notificationDisabled: true` (as notificações do Asaas são por cliente; um cliente criado pelo próprio Checkout receberia e-mail e SMS do Asaas, cobrados da Ecoa);
- `linkDoCheckout(id)` → `https://asaas.com/checkoutSession/show?id={id}` (host do sandbox: Perguntas em aberto);
- `lerPagamento(id)` → `GET /payments/{id}`; zod **permissivo** em `id`, `status`, `billingType`, `value`, `originalValue`, `interestValue`, `externalReference`, `checkoutSession`, `installment`, `deleted`, `refunds`;
- `pagamentosDoCheckout(checkout)` → `GET /payments?checkoutSession={id}`;
- `pagamentosDoParcelamento(id)` → `GET /payments?installment={id}`.

### Criar a compra (`iniciarCompra`, `app/comprar/acoes.ts`)

1. zod: e-mail válido, minúsculo, sem espaços. Com `ASAAS_MODO=sandbox`, o e-mail precisa estar em `ASAAS_EMAILS_TESTE`; senão, "A compra abre em breve."
2. Cookie `ecoa_compra` válido para uma compra `criado` do mesmo e-mail, há menos de 30 min → redireciona para ela.
3. Senão, sorteia o segredo e chama `rpc("compra_criar", { p_email, p_dono_hash, p_ambiente })` com a chave secreta. O banco cria a compra com o valor dele.
4. Grava o cookie e redireciona para `/comprar/{compra}`.

### Pix (`gerarPix`, `app/comprar/[compra]/acoes.ts`)

1. Dono conferido. zod:
   - nome de 2 a 100 caracteres, com ao menos 2 palavras;
   - CPF com 11 dígitos e dígitos verificadores certos (`cpfValido`, pura).
   - Os dois ficam só na memória da ação.
2. A compra precisa estar `criado` ou `recusado`.
   - Pix ativo com menos de 48 h → só mostra o QR de novo (duplo clique não cria 2 cobranças).
   - Checkout ativo → `cancelarCheckout` (tentativa única).
3. `rpc("compra_pode_cobrar", { p_compra, p_email })` confere o teto por e-mail e o global **antes** de falar com o Asaas.
4. `criarCliente` → `criarPix` → `rpc("compra_guardar_tentativa", { p_compra, p_tipo: 'pix', p_asaas_id, p_cliente, p_expira_em })`.
   - Se o Asaas criar o Pix e a resposta se perder (timeout), o Pix ainda liga à compra pelo `externalReference`.
5. A tela busca `qrDoPix` e mostra a imagem e o código.
   - Erro do Asaas de CPF inválido → "Confira o CPF.";
   - teto → frase do teto;
   - outro erro → "Não deu para gerar o Pix. Tente de novo."

### Cartão (`pagarComCartao`, mesmo arquivo)

1. Dono conferido. Nome e CPF validados como no Pix. A compra precisa estar `criado` ou `recusado`.
2. Checkout ativo com mais de 5 min de validade → redireciona para ele.
3. Pix ativo → `cancelarPix` (tentativa única); ele continua em `payment_attempts`.
4. `compra_pode_cobrar` → `criarCliente` (ou reusa o `asaas_cliente_id` do Pix, se houver) → `criarCheckout` com esse `customer` → `compra_guardar_tentativa` (tipo `checkout`, expira em 60 min) → redireciona para `linkDoCheckout`.

### Processar um pagamento (`lib/pagamento/processar.ts`)

Uma função só, `processarPagamento(asaasId, opcoes)`, chamada pelo aviso, pela volta, pela consulta da tela e pela conferência. `opcoes`: `compraEsperada?` (volta e tela) e `recusaAvisada?` (aviso de recusa).

1. `lerPagamento(id)`. `deleted = true` → nada.
2. **Achar a compra**, nesta ordem, só entre compras do `ambiente` atual:
   1. `externalReference` = uuid de uma compra existente;
   2. `checkoutSession` registrado em `payment_attempts`;
   3. o próprio id registrado em `payment_attempts` (Pix).
   - Se 1 e 2 apontarem para compras diferentes → `reter` com `referencia_diferente`.
   - Na volta e na tela, precisa ser **a** compra da URL (`compraEsperada`); se não for, nada.
   - **Sem compra:** se o pagamento estiver confirmado, alerta `pagamento_sem_compra` ao admin, com o id do Asaas e a chave `orfao:{id}`; se não, nada. Nunca silêncio para dinheiro recebido.
3. **Juntar as parcelas:**
   - com `installment`, `pagamentosDoParcelamento` traz todas: `ref` = id do parcelamento, `parcelas` = quantas, valor = soma de `Math.round(value * 100)` de cada uma;
   - sem `installment`: `ref` = id do pagamento, 1 parcela.
4. **Estado** por `acaoDoAsaas(pagamentos, { recusaAvisada })` (pura, testada), olhando todas as parcelas:
   - alguma em `CHARGEBACK_REQUESTED`, `CHARGEBACK_DISPUTE` ou `AWAITING_CHARGEBACK_REVERSAL` → reter (`contestacao`);
   - alguma `REFUNDED`, `REFUND_REQUESTED` ou `REFUND_IN_PROGRESS` → estorno;
   - `refunds` não vazio sem `REFUNDED` → reter (`estorno_parcial`);
   - alguma `RECEIVED_IN_CASH` → reter (`baixa_manual`): é baixa feita no painel, sem dinheiro;
   - todas em `CONFIRMED` ou `RECEIVED` → aprovar;
   - alguma em `PENDING`, `AWAITING_RISK_ANALYSIS` ou `OVERDUE` → pendente (inclui parcelas misturadas; o status real de cada parcela no cartão em 3x é registrado no aceite);
   - `recusaAvisada` e nenhuma confirmada → recusado. A dica nunca aprova nada, e `recusado` não desfaz `aprovado`;
   - qualquer outro → nada, com log do status.
5. **Aprovar, nesta ordem:**
   1. Conferências, sem criar conta se alguma falhar:
      - valor somado = valor da compra e `originalValue`/`interestValue` vazios ou zero → senão, `reter` com `valor_diferente`;
      - `billingType` em (`PIX`, `CREDIT_CARD`) → senão, `meio_inesperado`;
      - parcelas ≤ `MAX_PARCELAS_CARTAO` → senão, `parcelas_inesperadas`.
   2. Compra ainda sem livro → `contaParaEmail(compra.email)` (`lib/acesso.ts`):
      - `recusada` → `reter` com `conta_recusada`;
      - `erro` → falha passageira.
   3. `compra_registrar(…, 'aprovar', …)`.
6. **Acesso:** compra aprovada com `acesso_enviado_em` vazio e menos de `MAX_TENTATIVAS_ACESSO = 6` tentativas:
   - `rpc("compra_tentar_acesso")` conta a tentativa (e devolve o alerta `acesso_falhou` na 6ª);
   - depois, `enviarAcesso(livro, db, { idempotencyKey: "compra:{id}" })`;
   - deu certo (ou `repetido`) → `compra_marcar_acesso`.
7. **Evento:** só com `novo = true`, `registrarEvento({ quem: null, papel: "sistema", acao: "plano_ativado", livro, detalhes: { origem: "compra", meio, parcelas } })`.
   - Reusa a ação que o admin já grava (`app/admin/acoes.ts:43-73`), para aderência e evals (`lib/aderencia/calculo`) contarem compras sem mudança.
   - O `origem` separa compra de ativação à mão. Nunca nome, CPF ou e-mail.
8. **Alertas:** para cada alerta registrado e ainda não enviado:
   - `avisarAdminsDaCompra({ compra, alerta })`, chave `compra:{id}:{alerta}:{admin}`;
   - `compra_marcar_alerta(id, alerta)` **só depois** de todos os envios darem certo;
   - envio que falhou fica pendente, e a conferência tenta de novo.

**Assinatura nova de `enviarAcesso`** (`lib/acesso.ts:56`):
- `enviarAcesso(livroId, cliente = clienteAdmin(), opcoes?: { idempotencyKey?: string }): Promise<{ ok: boolean; repetido?: boolean }>`.
- A chave vai a `enviarEmail`, que já a aceita e devolve `repetido`.
- O reenvio manual do admin segue sem chave.
- As 6 tentativas cabem na hora seguinte, dentro da janela de 24 h da chave do Resend: não há e-mail duplicado.

**A ordem é a da ativação do admin** (`contaParaEmail` → plano → evento → e-mail). Só que o livro nasce dentro de `compra_registrar`, que trava a compra; por isso `processar.ts` chama as mesmas peças, não a ação do admin.

**Freio de consultas:** `rpc("compra_pode_consultar", { p_compra, p_segundos })` grava `consultado_em` e só devolve verdadeiro se a última consulta foi há mais de `p_segundos` (atômico).
- A tela e a volta usam 20 s: a página de Pix lê o estado do banco a cada 4 s e pede a consulta à API no máximo a cada 20 s.
- O aviso usa 5 s. Avisos de parcelas do mesmo pagamento chegam juntos e o 1º já lê todas.
- A conferência não usa freio.

### Conferir o aviso (`app/api/asaas/route.ts`)

- **Token:** `asaas-access-token` ausente ou diferente de `ASAAS_WEBHOOK_TOKEN` **e** de `ASAAS_WEBHOOK_TOKEN_ANTERIOR` (comparação em tempo constante, `tokenConfere`, pura) → 401.
  - Na troca do token, o novo entra em `ASAAS_WEBHOOK_TOKEN`, o antigo fica em `_ANTERIOR` até o painel ser trocado, e depois sai.
  - O 401 só acontece para quem não é o Asaas.
- **Configuração faltando** (chave ou token): 200, com `erro_servidor`. Nunca 503, que contaria como falha e pausaria a fila.
- **Corpo:** lido com zod **permissivo** (campos novos do Asaas não podem dar erro). Usa só `event`, `payment.id` e `checkout.id`:
  - `PAYMENT_*` → `processarPagamento(payment.id, { recusaAvisada })`, com `recusaAvisada` para `PAYMENT_REPROVED_BY_RISK_ANALYSIS` e `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`;
  - `CHECKOUT_PAID` → `pagamentosDoCheckout(checkout.id)` → `processarPagamento` de cada um;
  - outro evento → nada.
- **Sempre 200** com o token certo. Falha no processamento → `erro_servidor` no formato existente `{ rota: "/api/asaas", tipo, digest }` (como em `lib/pipeline/disparo.ts:25`), que aparece agrupado em `/admin/erros`.
- **Tempo:** o processamento tem até 8 s (o Asaas espera 10 s). Passou disso, 200, e a conferência termina o trabalho.
- **Repetição:** aviso repetido ou antigo não faz mal, porque o estado vem da API e o banco é idempotente.
- **Token vazado:** quem tem o token só provoca consultas, freadas a 1 a cada 5 s por compra; a correção é trocar o token. Uma recusa forjada põe a compra em `recusado`, e a tela oferece *Tentar de novo*. Não aprova nada.

### Conferência a cada 10 min (`lib/inngest/compras.ts`)

- Função Inngest `compras-conferir`, no array `funcoes` de `lib/inngest/funcoes.ts`:
  - `triggers: [cron("*/10 * * * *")]`, com `retries` e `checkpointing: false` como as outras crons;
  - "só produção" vem de `inngestAtendeAqui` (T57), sem condição na função.
- Lê `compras_para_conferir(p_ambiente)`, do `ambiente` atual, até 100 por rodada, ordenadas por `consultado_em` (as nunca consultadas primeiro), para compras falsas não deixarem as reais para trás:
  - **`criado`, `pendente` ou `recusado` com cobrança, de 5 min a 72 h:**
    - **Pix:** para cada Pix de `payment_attempts`, `processarPagamento`. Pix com mais de 48 h ainda pendente → `cancelarPix` → `processarPagamento` de novo (pega o pagamento que caiu no meio).
    - **Checkout:** `pagamentosDoCheckout` → `processarPagamento` de cada.
  - **`aprovado` com `acesso_enviado_em` vazio e menos de 6 tentativas:** tenta o e-mail de novo.
  - **Qualquer estado com alerta registrado e não enviado:** tenta o alerta de novo.
- Os passos devolvem só ids (T36).
- Cobre aviso perdido, fila pausada, app fora do ar, Pix pago tarde e e-mail que caiu.

### Banco

**`payments`:** uma linha por compra, a intenção de pagar.
- `ambiente`, `dono_hash`;
- a cobrança ativa: `asaas_cliente_id`, `asaas_pix_id`, `asaas_pix_expira_em`, `asaas_checkout_id`, `asaas_checkout_expira_em`;
- `asaas_ref` (o id do parcelamento ou do pagamento que aprovou ou gerou o alerta);
- `alertas` e `alertas_enviados`;
- `acesso_tentativas`.

**`payment_attempts`:** **toda** cobrança criada no Asaas (`asaas_id` único, compra, tipo, quando). É por ela que um Pix cancelado, mas pago, ou um Checkout antigo ainda liga à compra.

**Estados** (só em `compra_registrar`):
- `criado → pendente → aprovado → estornado`, mais `recusado` e `retido`.
- `aprovado` nunca volta para `pendente` ou `recusado`.
- Estorno ou contestação de **outro** `ref` numa compra aprovada (o pagamento duplicado que o admin estornou) só gera alerta e não mexe na compra.
- `retido` e `estornado` são finais para a automação.

**Invariantes:** `unique (book_id)` (1 livro por compra). `book_id … on delete set null`: apagar o livro a pedido do cliente (LGPD, prompt 15) não é bloqueado pela compra.

**Não guarda:** nome, CPF, telefone, endereço, dado de cartão, QR do Pix.

### Telas

`components/telas/tela-comprar.tsx`:
- "Comece o livro de memórias", campo de e-mail, sugestão de domínio;
- "O acesso vai para **fulano@gmail.com**" e *Continuar*;
- linha pequena "Pix ou cartão em até 3x sem juros";
- com `ASAAS_MODO=sandbox`, faixa "Modo de teste: nenhum valor é cobrado".

`components/telas/tela-compra.tsx`, por estado:
- **escolher** (`criado` ou `recusado`, sem Pix ativo):
  - "R$ 467 · plano de 1 ano";
  - campos *Nome completo* e *CPF* (teclado numérico, máscara, `autocomplete="off"`);
  - *Gerar Pix* (principal);
  - link *Pagar com cartão em até 3x* (usa os mesmos campos);
  - "Pedimos nome e CPF só para a cobrança no Asaas. A Ecoa não guarda o CPF.";
- **pix** (Pix ativo):
  - QR;
  - *Copiar código Pix* (principal; no celular é o que se usa);
  - "Esperando o pagamento. Pode fechar: avisamos por e-mail.";
  - link *Prefiro cartão*;
- **conferindo o cartão** (voltou do Checkout, ainda sem confirmação): "Conferindo o pagamento…", que atualiza a cada 4 s por até 10 min; depois, "Pode fechar: avisamos por e-mail.";
- **pronto:**
  - "Pronto! Seu livro está criado.";
  - "Enviamos o acesso para gu•••@gmail.com." (só com o cookie do dono);
  - *Entrar com Google*;
  - "ou abra o e-mail";
- **não passou:** "O pagamento não passou." e *Tentar de novo*, que volta para escolher;
- **conferindo** (`retido` ou `estornado`): "Estamos conferindo seu pagamento. Avisamos por e-mail.";
- **outro aparelho** (sem cookie, sem cobrança): "Abra no aparelho onde começou, ou comece de novo." e *Começar de novo*.

Dica de primeira vez e estado vazio não se aplicam (nenhum gesto escondido; as telas sempre têm conteúdo).

Exemplos em `lib/exemplos/prompt14.ts` e no styleguide; gate de design nas duas telas.

### Admin

`/admin` ganha *Compras* (últimas 30), lida por `admin_listar_compras`:
- data, e-mail, valor, meio, parcelas, estado;
- alertas (enviados ou não), acesso enviado ou tentativas;
- link do livro e id do Asaas, para achar no painel.

### LGPD

- **Minimização:** a Ecoa guarda só o e-mail, valor, meio, parcelas, estado e ids do Asaas. Nome e CPF passam pela ação do servidor direto para o Asaas. Não ficam em banco, log (`ErroAsaas` sanitizado), evento, Inngest nem `localStorage`.
- **Finalidade e transparência:** a frase ao lado do CPF diz para que serve e que não fica com a Ecoa. O Asaas é o meio de pagamento (instituição de pagamento autorizada pelo Banco Central) e trata nome e CPF para emitir a cobrança; entra na lista de terceiros da `/privacidade` (prompt 15).
- **Notificações do Asaas:** são por cliente (não há chave na conta inteira). Todo cliente é criado pela Ecoa com `notificationDisabled: true`, inclusive o do cartão, que vai ao Checkout como `customer`. O Asaas não manda e-mail nem SMS ao comprador, e a Ecoa não paga por eles.
- **Retenção:** a varredura diária (`varreduraFn`, novo passo `compras-vencidas`, ao lado de `mensagens-rascunhos`) chama `servico_apagar_compras_vencidas()`. Ela apaga:
  - compras sem livro em `criado`, `pendente` ou `recusado` há mais de 90 dias;
  - compras sem nenhuma cobrança há mais de 1 dia.
  - Nessa hora nenhuma delas é mais pagável: o Pix é cancelado em 48 h e o Checkout expira em 60 min. `payment_attempts` vai junto (`on delete cascade`).
  - Ficam as aprovadas, retidas e estornadas (contabilidade e contestação).
- **Livro apagado:** a compra perde o `book_id` (`set null`) e guarda só o dado financeiro.

### Variáveis

| Nome | O que é |
| --- | --- |
| `ASAAS_API_KEY` | Chave da API: `$aact_hmlg_…` (sandbox) ou `$aact_prod_…` (produção) |
| `ASAAS_MODO` | `sandbox` ou `producao`. Decide a base da API, o host do Checkout e a faixa na tela. O zod recusa chave com prefixo de outro modo |
| `ASAAS_WEBHOOK_TOKEN` | Token do webhook (32+ caracteres, sorteado), o mesmo do painel |
| `ASAAS_WEBHOOK_TOKEN_ANTERIOR` | Opcional, só durante a troca do token |
| `ASAAS_EMAILS_TESTE` | Só no sandbox: e-mails (separados por vírgula) que podem comprar |

- Só em Production e no `.env.local`, lidas em `lib/env-pagamento.ts` (zod, `server-only`), nunca com `NEXT_PUBLIC_`.
- A chave começa com `$`: no `.env.local`, entre aspas simples.
- Sem as variáveis, `/comprar` mostra "A compra abre em breve.", e o aviso responde 200 com `erro_servidor`.

## SQL de subida

`supabase/migrations/20261130120000_compra_asaas.sql`

```sql
-- Compra do plano pelo Asaas (P83, P84, T60).

create type public.pagamento_estado as enum
  ('criado', 'pendente', 'aprovado', 'recusado', 'retido', 'estornado');

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  tipo text not null default 'plano' check (tipo in ('plano')),
  ambiente text not null check (ambiente in ('sandbox', 'producao')),
  email text not null check (email = lower(btrim(email)) and length(email) between 3 and 254),
  dono_hash text not null check (length(dono_hash) = 64),
  valor_centavos integer not null check (valor_centavos > 0),
  estado public.pagamento_estado not null default 'criado',
  asaas_cliente_id text,
  asaas_pix_id text,
  asaas_pix_expira_em timestamptz,
  asaas_checkout_id text,
  asaas_checkout_expira_em timestamptz,
  asaas_ref text unique,
  meio text check (meio in ('pix', 'cartao')),
  parcelas smallint check (parcelas between 1 and 12),
  book_id uuid unique references public.books (id) on delete set null,
  alertas text[] not null default '{}',
  alertas_enviados text[] not null default '{}',
  acesso_tentativas smallint not null default 0,
  acesso_enviado_em timestamptz,
  consultado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  aprovado_em timestamptz
);
create index payments_email_criado_em on public.payments (email, criado_em desc);
create index payments_estado_criado_em on public.payments (ambiente, estado, criado_em desc);

-- Toda cobrança criada no Asaas, para um Pix cancelado mas pago (ou um Checkout antigo) ainda
-- achar a compra.
create table public.payment_attempts (
  asaas_id text primary key,
  compra_id uuid not null references public.payments (id) on delete cascade,
  tipo text not null check (tipo in ('pix', 'checkout')),
  expira_em timestamptz not null,
  criado_em timestamptz not null default now()
);
create index payment_attempts_compra on public.payment_attempts (compra_id);
create index payment_attempts_criado_em on public.payment_attempts (criado_em);

-- Sem política: anon e authenticated não leem nem escrevem. Só a chave secreta (T60).
alter table public.payments enable row level security;
alter table public.payment_attempts enable row level security;
revoke all on table public.payments, public.payment_attempts from anon, authenticated;

-- Números de lib/config.ts conferidos no banco.
create function privado.preco_plano_centavos() returns integer language sql immutable as $$ select 46700 $$;
create function privado.duracao_plano_meses() returns integer language sql immutable as $$ select 12 $$;
create function privado.max_compras_por_email_dia() returns integer language sql immutable as $$ select 5 $$;
create function privado.max_cobrancas_hora() returns integer language sql immutable as $$ select 30 $$;
create function privado.max_tentativas_acesso() returns integer language sql immutable as $$ select 6 $$;
create function privado.dias_retencao_compra() returns integer language sql immutable as $$ select 90 $$;

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
  privado.max_compras_por_email_dia(), privado.max_cobrancas_hora(),
  privado.max_tentativas_acesso(), privado.dias_retencao_compra(),
  privado.email_canonico(text)
  from public, anon, authenticated;

create function public.compra_criar(p_email text, p_dono_hash text, p_ambiente text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.payments (email, dono_hash, ambiente, valor_centavos)
  values (lower(btrim(p_email)), p_dono_hash, p_ambiente, privado.preco_plano_centavos())
  returning payments.id into v_id;
  return v_id;
end $$;

-- Antes de falar com o Asaas: teto por e-mail (só compras com cobrança) e teto global por hora.
create function public.compra_pode_cobrar(p_compra uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
  v_canonico text;
begin
  select email into v_email from public.payments where id = p_compra;
  if not found then
    raise exception 'compra_inexistente';
  end if;
  v_canonico := privado.email_canonico(v_email);
  perform pg_advisory_xact_lock(hashtext('compra:' || v_canonico));

  if (select count(*) from public.payment_attempts a
      where a.criado_em > now() - interval '1 hour') >= privado.max_cobrancas_hora() then
    raise exception 'compra_teto_global';
  end if;

  if (select count(distinct p.id) from public.payments p
      join public.payment_attempts a on a.compra_id = p.id
      where p.id <> p_compra
        and privado.email_canonico(p.email) = v_canonico
        and a.criado_em > now() - interval '24 hours')
     >= privado.max_compras_por_email_dia() then
    raise exception 'compra_teto_email';
  end if;
end $$;

-- Registra a cobrança criada no Asaas e a torna a ativa da compra.
create function public.compra_guardar_tentativa(
  p_compra uuid, p_tipo text, p_asaas_id text, p_cliente text, p_expira_em timestamptz
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.payment_attempts (asaas_id, compra_id, tipo, expira_em)
  values (p_asaas_id, p_compra, p_tipo, p_expira_em)
  on conflict (asaas_id) do nothing;

  if p_tipo = 'pix' then
    update public.payments
    set asaas_cliente_id = p_cliente, asaas_pix_id = p_asaas_id, asaas_pix_expira_em = p_expira_em,
        asaas_checkout_id = null, asaas_checkout_expira_em = null, atualizado_em = now(),
        estado = case when estado = 'recusado' then 'criado'::public.pagamento_estado else estado end
    where id = p_compra and estado in ('criado', 'recusado');
  elsif p_tipo = 'checkout' then
    update public.payments
    set asaas_cliente_id = coalesce(p_cliente, asaas_cliente_id),
        asaas_checkout_id = p_asaas_id, asaas_checkout_expira_em = p_expira_em,
        asaas_pix_id = null, asaas_pix_expira_em = null, atualizado_em = now(),
        estado = case when estado = 'recusado' then 'criado'::public.pagamento_estado else estado end
    where id = p_compra and estado in ('criado', 'recusado');
  else
    raise exception 'compra_acao_invalida';
  end if;
end $$;

-- Freio das consultas à API: no máximo 1 a cada p_segundos por compra.
create function public.compra_pode_consultar(p_compra uuid, p_segundos integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.payments set consultado_em = now()
  where id = p_compra
    and (consultado_em is null or consultado_em < now() - make_interval(secs => p_segundos));
  return found;
end $$;

-- Uma porta para todos os estados. p_acao: aprovar | pendente | recusado | estorno | reter.
-- p_ref: id do parcelamento ou do pagamento no Asaas. Devolve o livro, se a compra o criou agora
-- (novo) e o alerta, se ele é novo. O alerta fica em `alertas` e só vai para `alertas_enviados`
-- quando o e-mail sai (compra_marcar_alerta).
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
  v_outro_ref boolean;
begin
  select * into v from public.payments where id = p_compra for update;
  if not found then
    raise exception 'compra_inexistente';
  end if;
  -- Pagamento de outro ref numa compra que já tem o seu (o duplicado).
  v_outro_ref := v.asaas_ref is not null and v.asaas_ref is distinct from p_ref;

  if p_acao = 'aprovar' then
    if v.estado in ('retido', 'estornado') then
      v_alerta := case when v_outro_ref then 'pagamento_duplicado' end;
    elsif v.book_id is not null then
      v_alerta := case when v_outro_ref then 'pagamento_duplicado' end;
    elsif p_valor_centavos is distinct from v.valor_centavos then
      update public.payments set estado = 'retido', asaas_ref = p_ref, atualizado_em = now()
      where id = p_compra;
      v_alerta := 'valor_diferente';
    else
      if p_responsavel is null then
        raise exception 'compra_sem_responsavel';
      end if;
      if p_meio not in ('pix', 'cartao') or p_parcelas not between 1 and 12 then
        raise exception 'compra_acao_invalida';
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

  elsif p_acao in ('estorno', 'reter') then
    if p_acao = 'reter' and p_alerta is null then
      raise exception 'compra_acao_invalida';
    end if;
    if v_outro_ref then
      -- Estorno ou contestação do pagamento duplicado: avisa, não mexe na compra.
      v_alerta := coalesce(p_alerta, 'estorno') || '_outro_pagamento';
    elsif v.estado not in ('retido', 'estornado') then
      update public.payments
      set estado = case when p_acao = 'estorno' then 'estornado' else 'retido' end::public.pagamento_estado,
          asaas_ref = coalesce(v.asaas_ref, p_ref), atualizado_em = now()
      where id = p_compra;
      v_alerta := coalesce(p_alerta, 'estorno');
    else
      v_alerta := p_alerta;
    end if;

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

create function public.compra_marcar_alerta(p_compra uuid, p_alerta text)
returns void language sql security definer set search_path = '' as $$
  update public.payments set alertas_enviados = alertas_enviados || p_alerta
  where id = p_compra and p_alerta = any (alertas) and not p_alerta = any (alertas_enviados)
$$;

-- Conta uma tentativa de enviar o acesso. Devolve 'acesso_falhou' (registrado como alerta) na
-- última; depois dela, falso em `pode`, e só o admin reenvia.
create function public.compra_tentar_acesso(p_compra uuid)
returns table (pode boolean, alerta text)
language plpgsql security definer set search_path = '' as $$
declare
  v_n smallint;
begin
  update public.payments set acesso_tentativas = acesso_tentativas + 1
  where id = p_compra and acesso_enviado_em is null
    and acesso_tentativas < privado.max_tentativas_acesso()
  returning acesso_tentativas into v_n;
  if not found then
    return query select false, null::text;
    return;
  end if;
  if v_n = privado.max_tentativas_acesso() then
    update public.payments set alertas = alertas || 'acesso_falhou'::text
    where id = p_compra and not 'acesso_falhou' = any (alertas);
    return query select true, 'acesso_falhou'::text;
    return;
  end if;
  return query select true, null::text;
end $$;

create function public.compra_marcar_acesso(p_compra uuid)
returns void language sql security definer set search_path = '' as $$
  update public.payments set acesso_enviado_em = now()
  where id = p_compra and acesso_enviado_em is null
$$;

create function public.admin_listar_compras()
returns table (
  id uuid, criado_em timestamptz, ambiente text, email text, valor_centavos integer, meio text,
  parcelas smallint, estado public.pagamento_estado, alertas text[], alertas_enviados text[],
  acesso_enviado_em timestamptz, acesso_tentativas smallint, book_id uuid, asaas_id text
)
language sql stable security definer set search_path = '' as $$
  select id, criado_em, ambiente, email, valor_centavos, meio, parcelas, estado, alertas,
         alertas_enviados, acesso_enviado_em, acesso_tentativas, book_id,
         coalesce(asaas_ref, asaas_pix_id, asaas_checkout_id)
  from public.payments order by criado_em desc limit 30
$$;

create function public.compras_para_conferir(p_ambiente text)
returns table (id uuid, estado public.pagamento_estado)
language sql stable security definer set search_path = '' as $$
  select p.id, p.estado from public.payments p
  where p.ambiente = p_ambiente
    and (
      (p.estado in ('criado', 'pendente', 'recusado')
       and exists (select 1 from public.payment_attempts a where a.compra_id = p.id)
       and p.criado_em between now() - interval '72 hours' and now() - interval '5 minutes')
      or (p.estado = 'aprovado' and p.acesso_enviado_em is null
          and p.acesso_tentativas < privado.max_tentativas_acesso())
      or not (p.alertas <@ p.alertas_enviados)
    )
  order by p.consultado_em nulls first, p.criado_em
  limit 100
$$;

-- LGPD: compra que não virou pagamento não guarda o e-mail para sempre (varredura diária).
create function public.servico_apagar_compras_vencidas()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_n integer;
begin
  delete from public.payments p
  where p.book_id is null and p.estado in ('criado', 'pendente', 'recusado')
    and (p.criado_em < now() - make_interval(days => privado.dias_retencao_compra())
         or (p.criado_em < now() - interval '1 day'
             and not exists (select 1 from public.payment_attempts a where a.compra_id = p.id)));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function
  public.compra_criar(text, text, text),
  public.compra_pode_cobrar(uuid),
  public.compra_guardar_tentativa(uuid, text, text, text, timestamptz),
  public.compra_pode_consultar(uuid, integer),
  public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text),
  public.compra_marcar_alerta(uuid, text),
  public.compra_tentar_acesso(uuid),
  public.compra_marcar_acesso(uuid),
  public.admin_listar_compras(),
  public.compras_para_conferir(text),
  public.servico_apagar_compras_vencidas()
  from public, anon, authenticated;
grant execute on function
  public.compra_criar(text, text, text),
  public.compra_pode_cobrar(uuid),
  public.compra_guardar_tentativa(uuid, text, text, text, timestamptz),
  public.compra_pode_consultar(uuid, integer),
  public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text),
  public.compra_marcar_alerta(uuid, text),
  public.compra_tentar_acesso(uuid),
  public.compra_marcar_acesso(uuid),
  public.admin_listar_compras(),
  public.compras_para_conferir(text),
  public.servico_apagar_compras_vencidas()
  to service_role;
```

## SQL de reversão

`supabase/reversao/20261130120000_compra_asaas.down.sql`

```sql
drop function public.servico_apagar_compras_vencidas();
drop function public.compras_para_conferir(text);
drop function public.admin_listar_compras();
drop function public.compra_marcar_acesso(uuid);
drop function public.compra_tentar_acesso(uuid);
drop function public.compra_marcar_alerta(uuid, text);
drop function public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text);
drop function public.compra_pode_consultar(uuid, integer);
drop function public.compra_guardar_tentativa(uuid, text, text, text, timestamptz);
drop function public.compra_pode_cobrar(uuid);
drop function public.compra_criar(text, text, text);
drop function privado.email_canonico(text);
drop function privado.dias_retencao_compra();
drop function privado.max_tentativas_acesso();
drop function privado.max_cobrancas_hora();
drop function privado.max_compras_por_email_dia();
drop function privado.duracao_plano_meses();
drop function privado.preco_plano_centavos();
drop table public.payment_attempts;
drop table public.payments;
drop type public.pagamento_estado;
```

A reversão apaga o histórico de compras. Antes de reverter em produção, exportar `payments` e `payment_attempts`.

## Testes

**Banco** (`supabase/tests/compra.test.ts`, PGlite):
- `compra_criar` grava ambiente, dono e valor do banco;
- `compra_pode_cobrar`:
  - o teto por e-mail canônico conta só compras com cobrança;
  - 5 compras **sem** cobrança não bloqueiam;
  - teto global por hora → `compra_teto_global`;
- `compra_guardar_tentativa`:
  - Pix e depois Checkout: os dois ficam em `payment_attempts`, e o ativo é o Checkout;
  - `recusado` volta para `criado`;
- `compra_pode_consultar` → verdadeiro, falso em seguida, verdadeiro depois do intervalo;
- aprovar:
  - cria 1 livro + 1 responsável com 12 meses;
  - aprovar 2 vezes com o mesmo `ref` devolve o mesmo livro, `novo = false`, sem alerta;
  - outro `ref` aprovado → `pagamento_duplicado` 1 vez só, também em compra `retida`;
  - valor diferente → `retido`, nenhum livro, alerta 1 vez;
  - `p_meio` inválido → erro;
- outros estados:
  - `recusado` depois de `aprovado` não muda nada;
  - estorno antes do aprovar → `estornado`, e o aprovar seguinte não cria livro;
  - estorno ou contestação de **outro** `ref` em compra aprovada → só alerta (`estorno_outro_pagamento`), estado continua `aprovado`;
  - `reter` sem alerta → erro;
  - segunda compra aprovada em 24 h → `segunda_compra_24h`;
- alertas e acesso:
  - `compra_marcar_alerta` tira o alerta de `compras_para_conferir`;
  - `compra_tentar_acesso`: 6 tentativas e a 6ª devolve `acesso_falhou`; a 7ª, `pode = false`;
- `compras_para_conferir`:
  - acha pendente com Pix, `recusado` com Checkout, aprovado sem acesso e retido com alerta não enviado;
  - ignora `criado` sem cobrança e compra de outro ambiente;
  - ordena por `consultado_em` nulo primeiro;
- `servico_apagar_compras_vencidas`:
  - apaga `criado` de 91 dias e `criado` sem cobrança de 2 dias, com as tentativas;
  - mantém aprovada, retida e a de 89 dias com cobrança;
- apagar o livro deixa a compra com `book_id` nulo.

**RLS** (`rls.test.ts`):
- as 11 funções novas no array `chamadas` (`:299-310`);
- `payments` e `payment_attempts` na lista de `:275-289`;
- `reverter()` (`supabase/tests/banco.ts:26`) não muda: lê a pasta `supabase/reversao/` sozinha.

**Config** (`config-banco.test.ts`, tabela `it.each`):
- linhas `["preco_plano_centavos", config.PRECO_PLANO * 100]`, `["duracao_plano_meses", config.DURACAO_PLANO_MESES]`, `["max_compras_por_email_dia", …]`, `["max_cobrancas_hora", …]`, `["max_tentativas_acesso", …]`, `["dias_retencao_compra", …]`;
- o teste de frases (`:84-95`) pega os `raise exception 'compra_*'` sozinho; as frases vão em `lib/erros-banco.ts` (`compra_teto_email`, `compra_teto_global`, `compra_inexistente`, `compra_sem_responsavel`, `compra_acao_invalida`).

**Puras** (Vitest):
- `tokenConfere`: certo, anterior, errado, vazio, outro tamanho → falso sem lançar;
- `donoConfere`;
- `acaoDoAsaas`: todos os status, parcelas misturadas, `refunds` parcial, `RECEIVED_IN_CASH`, dica de recusa com parcela confirmada;
- `cpfValido`: válidos, dígito errado, 11 iguais;
- soma das parcelas em centavos: 155,67 + 155,67 + 155,66 = 46700;
- `mascararEmail`, `sugerirDominio`;
- chave × modo: `$aact_prod_` com `sandbox` → erro do zod;
- corpo do Checkout: `maxInstallmentCount: 3`, só `CREDIT_CARD`, `externalReference`, callbacks.

**Processar** (Asaas, banco e e-mail falsos):
- aviso e volta ao mesmo tempo → 1 livro e 1 e-mail;
- 3 avisos de parcelas do mesmo parcelamento → 1 livro, sem alerta;
- Pix cancelado (fora do ativo), mas pago → acha a compra pela tentativa; com a compra já aprovada pelo cartão → `pagamento_duplicado`;
- pagamento confirmado sem compra → alerta `pagamento_sem_compra`; pendente sem compra → nada;
- `externalReference` e Checkout de compras diferentes → retido;
- compra de outro ambiente → nada;
- `interestValue` > 0 → retido;
- e-mail do acesso falhou → a próxima chamada envia;
- e-mail do alerta falhou → o alerta continua pendente e sai na conferência;
- Pix de outra compra na URL → nada.

**Aviso** (`app/api/asaas/route.test.ts`):
- token errado → 401;
- token anterior → 200;
- configuração faltando → 200 e `erro_servidor`;
- corpo com campo desconhecido → 200;
- processamento que lança → 200 e `erro_servidor`;
- `lib/erros-servidor.test.ts` ganha um caso para `/api/asaas`.

**Log sem dado pessoal** (`lib/pagamento/asaas.test.ts`):
- erro HTTP do Asaas com nome e CPF no corpo, e resposta 200 malformada de `/customers` com `name` e `cpfCnpj`;
- nos dois, o `ErroAsaas` e o que foi registrado não contêm nome nem CPF.

**Rotas** (`lib/rotas.test.ts`): `/comprar/{uuid}` privada; `/comprar` pública.

**Alerta** (`lib/email/alerta.test.ts`, `modelos.test.ts`): 1 e-mail por admin e alerta. O modelo leva só o id da compra (ou do Asaas) e o tipo do alerta, sem e-mail nem nome do comprador.

**Telas** (Playwright, styleguide): `/comprar` (com e sem faixa de teste, com sugestão de domínio) e os 7 estados de `/comprar/[compra]`, a 390 px.

**Aceite** (produção com `ASAAS_MODO=sandbox` e `ASAAS_EMAILS_TESTE` só com os e-mails do Guilherme):
- Pix de teste confirmado por `POST /v3/sandbox/payment/{id}/confirm` (simulação, só no sandbox): a tela vira "Pronto" sozinha, e o e-mail chega em menos de 1 minuto;
- cartão de teste à vista e em 3x: 1 livro, `parcelas = 3`, valor somado 46700;
  - registrar o status de cada parcela logo depois da confirmação (premissa do `acaoDoAsaas`);
- cartão recusado no Checkout; voltar sem pagar; trocar de Pix para cartão e pagar o Pix antigo pelo painel → `pagamento_duplicado`;
- `/comprar` com um e-mail fora da lista → "A compra abre em breve.";
- link da compra em outra aba anônima → só o estado;
- aviso com token errado → 401;
- fila do webhook ativa no painel depois dos testes;
- antes de virar `producao`: livros de teste apagados pelo admin. As compras `sandbox` ficam (a conferência de produção as ignora).

## Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| Aviso falso criando livro | O token só autentica; o estado vem da API com a nossa chave. Sem o pagamento na nossa conta, nada acontece |
| Token do webhook vazado | Só provoca consultas, freadas a 1 a cada 5 s por compra; trocar com o token anterior aceito durante a troca |
| Fila do webhook pausada (15 falhas) | 200 sempre que o token confere, inclusive faltando configuração; conferência de 10 min; checar a fila no aceite |
| Volta forjada | A volta só dispara consulta à API (freio de 20 s); nada da URL vira estado |
| Pix ou Checkout antigo pago | `payment_attempts` + `externalReference` ligam à compra; o 2º pagamento vira alerta |
| Pagamento confirmado sem compra (resposta do Asaas perdida) | `externalReference`; se nem isso, alerta `pagamento_sem_compra` |
| Alerta que não sai | Marcado só depois do envio; a conferência reenvia |
| Acesso que não sai | 6 tentativas e alerta `acesso_falhou` |
| Pix pago muito depois | Pix cancelado em 48 h; conferência até 72 h |
| E-mail de outra pessoa digitado | Compra nova com dono próprio; teto conta só compras com cobrança |
| Compras falsas em massa | Firewall por IP; teto global de cobranças por hora com alerta; conferência ordenada por última consulta |
| Teste de cartões roubados | Cartão digitado no Checkout do Asaas, com o antifraude dele; teto global; contestação vira alerta |
| Compra de teste virando livro grátis | No sandbox, só os e-mails de `ASAAS_EMAILS_TESTE`; `ambiente` na compra |
| Chave do ambiente errado | Prefixo `$aact_prod_` ou `$aact_hmlg_` conferido contra `ASAAS_MODO` ao carregar |
| CPF ou nome em log | `ErroAsaas` sem corpo nem zod; teste dedicado; nada no Inngest nem em eventos |
| Asaas falando com o comprador (e cobrando por isso) | Todo cliente criado pela Ecoa com `notificationDisabled: true`, inclusive o do cartão |
| Vercel Hobby não permite uso comercial | T39: Pro antes do 1º cliente pagante |

## Alternativas consideradas

### A: Cartão na nossa página (API de cartão do Asaas)
O número do cartão passaria pelas funções da Vercel: escopo PCI e risco que uma empresa de 1 pessoa não deve carregar. Descartada.

### B: Tudo no Checkout do Asaas (Pix também)
Menos código, mas o Pix sairia da página, contra o pedido do Guilherme. Descartada; fica como plano B se o Pix na página der problema.

### C: Responder 500 quando o processamento falha
É o padrão de "o provedor repete". No Asaas, porém, 15 falhas seguidas pausam a fila e param todas as vendas. Descartada: 200 sempre e conferência de 10 min.

### D: Processar o aviso no Inngest
É o que o Asaas recomenda (guardar e responder rápido). Só que acrescenta uma peça no caminho quente, e o processamento leva ~2 s, bem abaixo dos 10 s. A conferência de 10 min fica como rede de segurança.

### E: Reaproveitar a compra aberta pelo e-mail (como no design anterior)
Entregaria a compra de uma pessoa a quem digitar o e-mail dela. Descartada pelo cookie do dono.

### F: Captcha
Atrito para o avô e uma dependência a mais. O teto global com alerta e o Firewall cobrem o abuso esperado; volta se aparecer.

### G: Aceite em Preview com banco separado
O Preview não tem banco (T57). Fica o aceite na produção, com a lista de e-mails de teste e o `ambiente` na compra.

### H: Guardar o CPF para reaproveitar
Facilitaria uma 2ª compra, mas é dado pessoal sem necessidade para a Ecoa. Descartada.

## Revisão (EGM, 1 rodada, 2 revisores em Sonnet)

**Código** (12 achados, todos aceitos):
- **`enviarAcesso`:** assinatura nova especificada, 3º parâmetro opcional.
- **Reuso:** o evento é o `plano_ativado` existente, com `origem: "compra"`, em vez de uma ação nova; `avisarAdminsDaCompra` reusa `adminsParaAvisar`, e o modelo vai em `modelos.ts` com teste.
- **Testes de banco:** `reverter()` não muda; linhas exatas de `config-banco.test.ts` com `PRECO_PLANO * 100`.
- **Tipos à mão:** em `tipos.ts`.
- **Padrões existentes:** `erro_servidor` no formato `{ rota, tipo, digest }`; retenção como passo novo da varredura (não existia); `lib/rotas.test.ts`; cron no array `funcoes`, com "só produção" vindo de `inngestAtendeAqui`.
- **Plano:** `Create` e `Modify` por arquivo.

**Segurança** (12 achados):
- Aceitos:
  1. pagamento órfão: `payment_attempts`, `externalReference` primeiro, e alerta `pagamento_sem_compra`;
  2. sandbox em produção: `ASAAS_EMAILS_TESTE`, coluna `ambiente`, prefixo da chave conferido;
  3. alerta marcado só depois de enviado (`alertas_enviados`) e `acesso_falhou` na 6ª tentativa;
  4. Pix cancelado em 48 h, conferência até 72 h incluindo `recusado`;
  5. cookie do dono no lugar do reaproveitamento por e-mail; teto só de compras com cobrança;
  6. em parte: teto global de cobranças por hora com alerta e conferência ordenada por última consulta (o captcha foi recusado, ver F);
  7. estorno ou contestação de outro `ref` não rebaixa a compra aprovada (o botão *Liberar* ficou para depois, em Não objetivos);
  8. o cliente do cartão também é criado pela Ecoa com notificações desligadas (a documentação confirmou que não há chave na conta) e `ErroAsaas` sanitizado, inclusive para `ZodError`;
  9. `on delete set null` e retenção apagando só o que não é mais pagável;
  10. token anterior aceito, 200 sem configuração e freio de 5 s no aviso;
  11. `RECEIVED_IN_CASH` retido, juros e multa conferidos, status das parcelas registrado no aceite;
  12. `unique (book_id)`, meio e parcelas validados e assinatura de `enviarAcesso`.
- Recusado:
  - o `check (aprovado → book_id)`, que conflitaria com `on delete set null` quando o cliente pede para apagar o livro; `unique (book_id)` e o `for update` garantem o 1 livro por compra.

## Pré-requisitos (passos do Guilherme)

1. Conta no Asaas aprovada (produção) e conta no sandbox (`sandbox.asaas.com`), cada uma com a sua chave de API.
2. Chave Pix cadastrada no sandbox e na produção (sem ela, o QR dá erro no sandbox).
3. Webhook no painel (*Integrações → Webhooks*):
   - URL `https://app.ecoa-memorias.com.br/api/asaas`;
   - versão 3, envio **não sequencial**;
   - token de autenticação: 32+ caracteres, sorteado;
   - eventos: `PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_OVERDUE`, `PAYMENT_REFUNDED`, `PAYMENT_PARTIALLY_REFUNDED`, `PAYMENT_REFUND_IN_PROGRESS`, `PAYMENT_RECEIVED_IN_CASH_UNDONE`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_CHARGEBACK_DISPUTE`, `PAYMENT_AWAITING_CHARGEBACK_REVERSAL`, `PAYMENT_REPROVED_BY_RISK_ANALYSIS`, `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED`, `CHECKOUT_PAID`.
4. Variáveis na Vercel (Production) e no `.env.local`.
5. Limite por IP no Firewall da Vercel para `POST` em `/comprar` e `/comprar/*`.
6. Vercel Pro antes da 1ª venda real (T39).
7. Com `ASAAS_MODO=producao`: botão *Comprar* da landing apontando para `https://app.ecoa-memorias.com.br/comprar`.

## Perguntas em aberto

1. **Host do Checkout no sandbox.** A documentação só mostra `https://asaas.com/checkoutSession/show?id=…`. O 1º teste confirma se no sandbox é `sandbox.asaas.com`; o código lê o host por `ASAAS_MODO`.
2. **Texto na fatura do cartão.** A API do Asaas não tem campo para isso; o nome que aparece vem do cadastro da conta. Conferir no painel se dá para deixar "ECOAMEMORIAS".
3. ~~Notificações padrão no painel.~~ Resolvida em 23/11: são por cliente; a Ecoa cria todos os clientes com `notificationDisabled: true`.

## Plano de implementação

1. **Banco.**
   - Create:
     - `supabase/migrations/20261130120000_compra_asaas.sql`;
     - `supabase/reversao/20261130120000_compra_asaas.down.sql`;
     - `supabase/tests/compra.test.ts`.
   - Modify, juntos (senão o teste fica vermelho):
     - `supabase/tests/rls.test.ts`;
     - `supabase/tests/config-banco.test.ts`;
     - `lib/erros-banco.ts`.
2. **Config e tipos.**
   - Modify `lib/config.ts`:
     - `MAX_COMPRAS_POR_EMAIL_DIA = 5`, `MAX_COBRANCAS_HORA = 30`, `MAX_TENTATIVAS_ACESSO = 6` e `DIAS_RETENCAO_COMPRA = 90`, com o comentário "espelhado no banco";
     - `MAX_PARCELAS_CARTAO = 3`, `MINUTOS_CHECKOUT = 60`, `HORAS_VALIDADE_PIX = 48`, `MINUTOS_COMPRA_ABERTA = 30`;
     - preço e duração já existem (`PRECO_PLANO`, `DURACAO_PLANO_MESES`).
   - Modify `lib/supabase/tipos.ts` **à mão** (padrão do `docs/mapa.md`): `Tables.payments`, `Tables.payment_attempts`, `Enums.pagamento_estado` e as 11 funções, com os `returns table`.
3. **Pagamento.**
   - Create:
     - `lib/env-pagamento.ts`;
     - `lib/pagamento/asaas.ts` (cliente e `ErroAsaas`);
     - `lib/pagamento/estado.ts` (puras: `acaoDoAsaas`, `tokenConfere`, `donoConfere`, `cpfValido`, `mascararEmail`, `sugerirDominio`, centavos);
     - `lib/pagamento/dono.ts` (cookie);
     - `lib/pagamento/processar.ts`;
     - os `*.test.ts`.
4. **Acesso, alertas e eventos.**
   - Modify:
     - `lib/acesso.ts`: assinatura nova de `enviarAcesso`;
     - `lib/email/alerta.ts`: `avisarAdminsDaCompra`;
     - `lib/email/modelos.ts`, com teste.
   - Sem ação nova de evento (`plano_ativado` com `origem`).
5. **Rotas e fila.**
   - Create `app/api/asaas/route.ts` (com teste) e `lib/inngest/compras.ts`.
   - Modify:
     - `lib/inngest/funcoes.ts`: array `funcoes` e passo `compras-vencidas` na varredura;
     - `proxy.ts`: `|api/asaas` no regex do `matcher` (`:149`) e o comentário de `:148`;
     - `lib/rotas.ts` e `lib/rotas.test.ts`;
     - `lib/erros-servidor.test.ts`.
6. **Telas.**
   - Create:
     - `app/comprar/page.tsx` e `acoes.ts`;
     - `app/comprar/[compra]/page.tsx` e `acoes.ts`;
     - `components/telas/tela-comprar.tsx` e `tela-compra.tsx`;
     - `lib/exemplos/prompt14.ts`.
   - Modify o registro do styleguide. O `scripts/inspecionar-telas.mjs` só muda se não descobrir as telas pelo styleguide, o que se confere na construção.
   - Depois, o gate de design.
7. **Admin.** Modify `app/admin/page.tsx` e a tela do admin, para a lista *Compras*.
8. **Documentos.**
   - Modify `docs/mapa.md`, `decisoes.md` e `decisoes-resumo.md`: P83, P84 e T60; P77 "substituída em parte por P83", P78 "substituída por P84", T58 "substituída por T60".
   - `compra-mercado-pago.md` ganha "Substituído por `compra-asaas.md`" no status.
9. **Fechamento.** Gate de fim de tarefa e aceite na produção com `ASAAS_MODO=sandbox`.
