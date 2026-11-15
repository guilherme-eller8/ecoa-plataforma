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
