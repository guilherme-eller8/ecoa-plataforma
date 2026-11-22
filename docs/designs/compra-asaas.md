# Compra do plano pelo Asaas (troca do Mercado Pago)

Status: **rascunho para aprovação** · 22/11/2026 · Substitui o provedor de `docs/designs/compra-mercado-pago.md` (prompt 14, parte 1). Tudo o que não está aqui continua como lá.

## Visão geral

O Guilherme vai operar no Asaas (22/11). A compra automática construída para o Mercado Pago passa para o **Asaas Checkout**, a página de pagamento hospedada do Asaas. A pessoa continua tocando em *Comprar* na landing, conferindo o e-mail em `/comprar` e pagando com Pix ou cartão parcelado numa página que não é nossa. O livro, o e-mail de acesso, a conferência de 30 min, os alertas e a lista do admin não mudam.

Dividir a compra entre irmãos **não** entra aqui (P79: teste manual antes). O split do Asaas divide o recebimento entre contas, não o pagamento entre pessoas.

## O que muda e o que fica

| Parte | Mercado Pago (hoje) | Asaas (proposta) |
| --- | --- | --- |
| Página de pagamento | Checkout Pro (`POST /checkout/preferences`) | Asaas Checkout (`POST /v3/checkouts`), Pix e cartão, à vista ou parcelado |
| Ligação com a compra | `external_reference` | `externalReference` = id da compra; o id do checkout fica guardado também |
| Aviso | assinatura HMAC (`x-signature`) | token fixo no cabeçalho `asaas-access-token`, comparado em tempo constante |
| Estado | sempre da API | sempre da API (`GET /v3/payments?externalReference=…`), nunca do corpo do aviso nem da URL de volta |
| Parcelado | 1 pagamento com o total | **N pagamentos** (1 por parcela) com o mesmo id de parcelamento; o "pagamento" da compra é o parcelamento |
| Validade da cobrança | 48 h | até 24 h (limite do checkout: 10 a 1.440 min) |
| Ambiente de teste | credencial de teste na produção | sandbox próprio (`api-sandbox.asaas.com`), escolhido por `ASAAS_AMBIENTE` |
| Contestação | tópico separado, sem a compra | é um status do pagamento: cai na mesma compra |
| Fica igual | — | `processarPagamento` (vira `processarCompra`), `compra_registrar`, 1 livro por compra, alerta 1 vez, acesso por coluna, `compras-conferir`, telas, admin |

## Decisões novas (para aprovar)

- **P80 Compra pelo Asaas Checkout.** Substitui em P77 só o provedor: Mercado Pago → Asaas Checkout (Pix e cartão até 12x, sem boleto). O resto de P77 fica (e-mail na Ecoa vira o responsável, volta com "Pronto", acesso por e-mail). Fatura: o nome configurado na conta Asaas.
- **P81 Parcelas no Asaas.** Substitui P78. O checkout deixa a pessoa escolher de 1x a 12x. Repassar os juros só a partir da 4x (P78) **não está documentado** no Asaas Checkout. Proposta: **até 12x sem juros**, a Ecoa paga a taxa do cartão e recebe mês a mês (sem antecipar). Se o painel permitir repassar a taxa, voltamos a P78 por configuração, sem código. *(decisão do Guilherme: ver Perguntas)*
- **T59 Pagamento no Asaas.** Substitui T58 no que é do provedor:
  - `ASAAS_API_KEY`, `ASAAS_WEBHOOK_TOKEN` (32 a 255 caracteres, nunca a chave da API) e `ASAAS_AMBIENTE` (`sandbox` ou `producao`; faixa "Modo de teste" no sandbox).
  - O aviso só é aceito com o token certo; o estado vem sempre da API. Um token vazado só faz o app consultar a API, nunca cria livro.
  - O aviso responde **200** em sucesso e quando não há nada a fazer. Falha passageira responde 500 (o Asaas repete), mas 15 falhas seguidas **pausam a fila**: a conferência de 30 min cobre, e o admin reativa a fila no painel.
  - A volta só consulta a API pela trava `compra_reservar_conferencia` (no máximo 1 vez a cada 10 s por compra).

## Plano técnico

### Criar a cobrança (`iniciarCompra`)

`POST {base}/v3/checkouts` com `access_token` no cabeçalho:

- `billingTypes: ["PIX", "CREDIT_CARD"]`, `chargeTypes: ["DETACHED", "INSTALLMENT"]`, `installment.maxInstallmentCount: 12`;
- `items`: 1 × "Plano anual Ecoa Memórias", valor da compra;
- `externalReference` = id da compra;
- `callback`: `successUrl` = `/comprar/pronto/{compra}`, `cancelUrl` e `expiredUrl` = `/comprar/pronto/{compra}?volta=cancelou`;
- `minutesToExpire: 1440`;
- e-mail digitado como dado pré-preenchido, se o Asaas aceitar só o e-mail (ver Perguntas).

O checkout cancelado ou vencido não abre de novo. Por isso a compra aberta só é reaproveitada por 2 min (duplo toque). *Tentar de novo* leva a `/comprar`, que cria outra compra; o teto de 5 por e-mail por dia continua.

### Processar (`lib/pagamento/processar.ts`)

Uma função, `processarCompra(compra)`, chamada pelo aviso, pela volta e pela conferência:

1. `GET /v3/payments?externalReference={compra}`. Os pagamentos achados são agrupados pelo id do parcelamento (sem parcelamento, cada um é um grupo).
2. Status de cada grupo por `acaoDoStatus` (puro, testado):
   - `CONFIRMED`, `RECEIVED`, `RECEIVED_IN_CASH` → aprovar;
   - `PENDING`, `AWAITING_RISK_ANALYSIS` → pendente;
   - `OVERDUE` → recusado;
   - `REFUNDED`, `REFUND_REQUESTED`, `REFUND_IN_PROGRESS`, `CHARGEBACK_REQUESTED`, `CHARGEBACK_DISPUTE`, `AWAITING_CHARGEBACK_REVERSAL` → estorno;
   - outro → nada, com log.
   Num parcelamento, vale o status mais grave das parcelas (estorno > aprovar > pendente > recusado).
3. Aprovar: a soma das parcelas em centavos precisa ser **igual ou maior** que o valor da compra (o maior cobre um repasse de taxa que o painel faça). Menor → `reter` com `valor_diferente`. Depois, conta pelo e-mail e `compra_registrar` com o id do parcelamento (ou do pagamento) como `p_pagamento`.
4. Acesso, evento e alerta como hoje.

O aviso (`/api/mercadopago` vira `/api/asaas`) confere o token e lê só a referência: `payment.externalReference` (ou `checkout.externalReference`) do corpo, que precisa ser um uuid de compra existente. O estado vem do passo 1. Corpo sem referência → 200 e nada.

### Banco

Troca de nomes (`mp_*` sai), a trava da volta e a reaproveitada de 2 min. `payments` está vazia (22/11). Sem política nova: tudo pela chave secreta.

## SQL de subida

`supabase/migrations/20261202120000_compra_asaas.sql`

```sql
-- Compra pelo Asaas no lugar do Mercado Pago (P80, T59). payments estava vazia em 22/11.
-- Nomes de coluna sem o "mp_"; conferência da volta com trava no banco; compra aberta reaproveitada
-- só por 2 min (o checkout do Asaas cancelado ou vencido não serve de novo).

alter table public.payments rename column mp_preferencia_id to asaas_checkout_id;
alter table public.payments rename column mp_link to link_pagamento;
alter table public.payments rename column mp_pagamento_id to asaas_pagamento_id;
alter table public.payments rename constraint payments_mp_pagamento_id_key to payments_asaas_pagamento_id_key;
-- Última consulta à API pela volta: a URL não vira amplificador de chamadas.
alter table public.payments add column conferido_em timestamptz;

create or replace function privado.minutos_compra_aberta() returns integer
language sql immutable set search_path = '' as $$ select 2 $$;

drop function public.compras_para_conferir();
drop function public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text);
drop function public.compra_guardar_preferencia(uuid, text, text);
drop function public.compra_criar(text);

create function public.compra_criar(p_email text)
returns table (id uuid, link_pagamento text)
language plpgsql security definer set search_path = '' as $$
declare
  v_email text := lower(btrim(p_email));
  v_canonico text := privado.email_canonico(lower(btrim(p_email)));
  v_id uuid;
begin
  -- Uma compra por vez para o mesmo e-mail canônico: o teto não fura sob concorrência.
  perform pg_advisory_xact_lock(hashtext('compra:' || v_canonico));

  -- Duplo toque: devolve a compra que acabou de abrir, em vez de outra.
  return query
    select p.id, p.link_pagamento from public.payments p
    where p.email = v_email and p.estado = 'criado' and p.link_pagamento is not null
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

create function public.compra_guardar_checkout(p_compra uuid, p_checkout text, p_link text)
returns void language sql security definer set search_path = '' as $$
  update public.payments
  set asaas_checkout_id = p_checkout, link_pagamento = p_link, atualizado_em = now()
  where id = p_compra and asaas_checkout_id is null
$$;

-- A volta só consulta a API se ninguém consultou esta compra nos últimos p_intervalo_s.
create function public.compra_reservar_conferencia(p_compra uuid, p_intervalo_s integer)
returns boolean language sql security definer set search_path = '' as $$
  with r as (
    update public.payments set conferido_em = now()
    where id = p_compra
      and estado in ('criado', 'pendente', 'recusado')
      and (conferido_em is null or conferido_em < now() - make_interval(secs => p_intervalo_s))
    returning 1
  )
  select exists (select 1 from r)
$$;

-- Igual a 20261130120000, com p_pagamento (id do parcelamento no cartão parcelado, senão o
-- id do pagamento) no lugar de p_mp_pagamento.
create function public.compra_registrar(
  p_compra uuid,
  p_pagamento text,
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
      v_alerta := case when v.asaas_pagamento_id is distinct from p_pagamento
                       then 'pagamento_duplicado' end;
    elsif p_valor_centavos is distinct from v.valor_centavos then
      update public.payments set estado = 'retido', asaas_pagamento_id = p_pagamento,
        atualizado_em = now() where id = p_compra;
      v_alerta := 'valor_diferente';
    else
      if p_responsavel is null then
        raise exception 'compra_sem_responsavel';
      end if;
      v_livro := public.admin_ativar_plano(p_responsavel, null, privado.duracao_plano_meses());
      update public.payments
      set estado = 'aprovado', asaas_pagamento_id = p_pagamento, meio = p_meio,
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
    if v.estado <> 'estornado' and (v.asaas_pagamento_id is null or v.asaas_pagamento_id = p_pagamento) then
      update public.payments set estado = 'estornado', asaas_pagamento_id = p_pagamento,
        atualizado_em = now() where id = p_compra;
      v_alerta := 'estorno';
    end if;

  elsif p_acao = 'reter' then
    if p_alerta is null then
      raise exception 'compra_acao_invalida';
    end if;
    if v.estado not in ('retido', 'estornado') then
      update public.payments set estado = 'retido',
        asaas_pagamento_id = coalesce(v.asaas_pagamento_id, p_pagamento), atualizado_em = now()
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

create function public.compras_para_conferir()
returns table (id uuid, estado public.pagamento_estado)
language sql stable security definer set search_path = '' as $$
  select id, estado from public.payments
  where (estado in ('criado', 'pendente') and asaas_checkout_id is not null
         and criado_em between now() - interval '48 hours' and now() - interval '15 minutes')
     or (estado = 'aprovado' and acesso_enviado_em is null)
  order by criado_em
  limit 100
$$;

revoke all on function
  public.compra_criar(text),
  public.compra_guardar_checkout(uuid, text, text),
  public.compra_reservar_conferencia(uuid, integer),
  public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text),
  public.compras_para_conferir()
  from public, anon, authenticated;
grant execute on function
  public.compra_criar(text),
  public.compra_guardar_checkout(uuid, text, text),
  public.compra_reservar_conferencia(uuid, integer),
  public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text),
  public.compras_para_conferir()
  to service_role;
```

## SQL de reversão

`supabase/reversao/20261202120000_compra_asaas.down.sql` (sobe as funções de 20261130 de novo; exportar `payments` antes, se tiver linha)

```sql
-- Volta a 20261130120000 (Mercado Pago). Só com payments vazia ou exportada antes.
drop function public.compras_para_conferir();
drop function public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text);
drop function public.compra_reservar_conferencia(uuid, integer);
drop function public.compra_guardar_checkout(uuid, text, text);
drop function public.compra_criar(text);

alter table public.payments drop column conferido_em;
alter table public.payments rename constraint payments_asaas_pagamento_id_key to payments_mp_pagamento_id_key;
alter table public.payments rename column asaas_pagamento_id to mp_pagamento_id;
alter table public.payments rename column link_pagamento to mp_link;
alter table public.payments rename column asaas_checkout_id to mp_preferencia_id;

create or replace function privado.minutos_compra_aberta() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;

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
  public.compras_para_conferir()
  from public, anon, authenticated;
grant execute on function
  public.compra_criar(text),
  public.compra_guardar_preferencia(uuid, text, text),
  public.compra_registrar(uuid, text, text, integer, text, integer, uuid, text),
  public.compras_para_conferir()
  to service_role;
```

## Testes

- **Banco:** `compra.test.ts` com os nomes novos; `compra_reservar_conferencia` (2ª chamada em 10 s = falso; estado final = falso); reaproveitada só por 2 min; `rls.test.ts` e `config-banco.test.ts` com a função nova e `minutos_compra_aberta = 2`.
- **Puras:** `acaoDoStatus` (todos os status), agrupar parcelas e somar centavos, status mais grave do parcelamento, `tokenConfere` (certo, errado, vazio, de outro tamanho), corpo do checkout.
- **Processar** com Asaas, banco e e-mail falsos: aviso e volta juntos (1 livro, 1 e-mail); 3x com 3 pagamentos → 1 livro; soma menor → retido; estorno de 1 parcela → estornado e alerta.
- **Aceite no sandbox:** Pix, cartão à vista, cartão em 3x e em 12x, cancelar no checkout, aviso com token errado → 401.

## Riscos

| Risco | Mitigação |
| --- | --- |
| Token do aviso vazar (não é assinatura) | Estado só da API; token só no servidor; trocar no painel e na Vercel |
| Pagamentos do checkout sem `externalReference` | **Spike no sandbox antes de construir** (ver Perguntas); plano B: guardar o id do checkout e buscar por ele |
| Fila do aviso pausada após 15 falhas | Conferência de 30 min; 500 só em falha passageira; o Asaas avisa a pausa por e-mail |
| Parcela estornada depois de aprovada | Status mais grave do grupo → estorno e alerta; o admin decide |

## Perguntas em aberto

1. **Parcelas (P81):** até 12x sem juros (Ecoa paga a taxa, recebe mês a mês) ou limitar a 6x? Ou existe no painel a opção de repassar a taxa no checkout?
2. **Spike no sandbox (30 min, antes de construir):** criar a conta sandbox e me passar a chave pelo formulário seguro desta sessão (`request_credential`, host `api-sandbox.asaas.com`). Com ela confirmo 4 pontos que a documentação não fecha:
   - os pagamentos herdam o `externalReference` do checkout;
   - o checkout aceita só o e-mail pré-preenchido;
   - como chega o cartão recusado;
   - o corpo de `CHECKOUT_PAID`.

## Alternativas consideradas

- **Cobrança direta (`POST /v3/payments`, tipo indefinido):** exige criar o cliente antes (CPF provável), não deixa a pessoa escolher o número de parcelas e abre boleto. Descartada.
- **Link de pagamento:** não liga o pagamento à compra de forma confiável e não manda a pessoa de volta. Descartada.
- **Manter o Mercado Pago:** o Guilherme vai operar no Asaas; duas contas é custo sem ganho.
