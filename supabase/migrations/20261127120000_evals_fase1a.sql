-- Evals, fase 1A (T54, docs/designs/evals.md): custo, tempo e cotas somados no banco.
-- Só funções de leitura, sem tabela nova. Todas security definer, só para service_role (a
-- chave secreta, no servidor do admin), no padrão de admin_custos_por_livro. Devolvem só ids,
-- números, datas e os nomes fixos de etapa e modelo: nenhuma coluna de texto da fala.
-- Por que no banco: a API devolve no máximo max_rows linhas (1.000 no padrão do Supabase),
-- qualquer que seja o .limit(); somar linhas no servidor ficaria abaixo do real sem erro.

-- 1. Uso por dia (fuso de Brasília), etapa e modelo.
create function public.admin_uso_por_dia(p_desde date, p_ate date)
returns table (
  dia date,
  etapa text,
  modelo text,
  chamadas bigint,
  falhas bigint,
  repetidas bigint,
  custo_usd numeric,
  custo_falhas_usd numeric,
  minutos_audio numeric,
  tokens_entrada bigint,
  tokens_saida bigint,
  tokens_cache_lido bigint,
  tokens_cache_gravado bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_desde is null or p_ate is null or p_ate < p_desde or p_ate - p_desde > 400 then
    raise exception 'dados_invalidos';
  end if;
  return query
  select
    (u.criado_em at time zone 'America/Sao_Paulo')::date,
    u.etapa,
    u.modelo,
    count(*),
    count(*) filter (where not u.ok),
    -- A repetição de uma chamada que deu certo já está somada na linha (uso acumula as tentativas).
    count(*) filter (where u.tentativa > 1),
    coalesce(sum(u.custo_usd), 0),
    coalesce(sum(u.custo_usd) filter (where not u.ok), 0),
    coalesce(sum(u.minutos_audio), 0),
    coalesce(sum(u.tokens_entrada), 0)::bigint,
    coalesce(sum(u.tokens_saida), 0)::bigint,
    coalesce(sum(u.tokens_cache_lido), 0)::bigint,
    coalesce(sum(u.tokens_cache_gravado), 0)::bigint
  from public.ai_usage u
  where u.criado_em >= (p_desde::timestamp at time zone 'America/Sao_Paulo')
    and u.criado_em < ((p_ate + 1)::timestamp at time zone 'America/Sao_Paulo')
  group by 1, 2, 3;
end $$;

-- 2. Primeira palavra (ms_desde_envio da etapa editar) por faixa de duração do áudio da história.
--    p_faixas_min: limites em minutos, em ordem (vêm de lib/config.ts). A faixa 0 fica abaixo do
--    1º limite. Esperas acima de p_parada_ms contam à parte ("fila parada") e saem dos percentis.
create function public.admin_primeira_palavra(
  p_desde timestamptz,
  p_faixas_min numeric[],
  p_parada_ms integer
)
returns table (
  faixa integer,
  esperas bigint,
  p50_ms integer,
  p95_ms integer,
  paradas bigint
)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_desde is null or p_parada_ms is null or p_parada_ms <= 0
     or p_faixas_min is null or cardinality(p_faixas_min) not between 1 and 10
     or exists (select 1 from unnest(p_faixas_min) with ordinality a(v, i)
                where v is null or v <= 0
                   or (i > 1 and v <= p_faixas_min[i - 1])) then
    raise exception 'dados_invalidos';
  end if;
  return query
  with esperas as (
    select
      e.ms_desde_envio as ms,
      width_bucket(
        coalesce((select sum(t.minutos_audio) from public.ai_usage t
                  where t.story_id = e.story_id and t.etapa = 'transcrever' and t.ok), 0),
        p_faixas_min
      ) as f
    from public.ai_usage e
    where e.etapa = 'editar'
      and e.ok
      and e.ms_desde_envio is not null
      and e.story_id is not null
      and e.criado_em >= p_desde
  )
  select
    e.f,
    count(*) filter (where e.ms <= p_parada_ms),
    (percentile_cont(0.5) within group (order by e.ms) filter (where e.ms <= p_parada_ms))::integer,
    (percentile_cont(0.95) within group (order by e.ms) filter (where e.ms <= p_parada_ms))::integer,
    count(*) filter (where e.ms > p_parada_ms)
  from esperas e
  group by e.f;
end $$;

-- 3. Livros perto do teto diário de IA (P54: pedidos; T38: minutos), nas últimas 24 h.
--    Usa as mesmas contas e os mesmos tetos que o banco confere ao recusar.
create function public.admin_cotas_24h(p_fracao numeric)
returns table (book_id uuid, pedidos integer, minutos numeric)
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_fracao is null or p_fracao <= 0 or p_fracao > 1 then
    raise exception 'dados_invalidos';
  end if;
  return query
  with livros as (
    select p.book_id from public.story_proposals p
      where p.pedida_em > now() - interval '24 hours'
    union
    select u.book_id from public.ai_usage u
      where u.etapa = 'transcrever' and u.criado_em > now() - interval '24 hours'
  ), contas as (
    select
      l.book_id,
      privado.propostas_hoje(l.book_id) as pedidos,
      (select coalesce(sum(u.minutos_audio), 0) from public.ai_usage u
        where u.book_id = l.book_id and u.etapa = 'transcrever'
          and u.criado_em > now() - interval '24 hours') as minutos
    from livros l
  )
  select c.book_id, c.pedidos, c.minutos
  from contas c
  where c.pedidos >= p_fracao * privado.max_propostas_dia()
     or c.minutos >= p_fracao * privado.max_minutos_ia_por_dia();
end $$;

revoke all on function public.admin_uso_por_dia(date, date) from public, anon, authenticated;
revoke all on function public.admin_primeira_palavra(timestamptz, numeric[], integer)
  from public, anon, authenticated;
revoke all on function public.admin_cotas_24h(numeric) from public, anon, authenticated;
grant execute on function public.admin_uso_por_dia(date, date) to service_role;
grant execute on function public.admin_primeira_palavra(timestamptz, numeric[], integer)
  to service_role;
grant execute on function public.admin_cotas_24h(numeric) to service_role;
