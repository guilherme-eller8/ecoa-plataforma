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
