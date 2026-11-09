-- 20261109150000_passe_vira_plano.sql
-- Troca o nome "passe" por "plano" em todo o banco. Não muda regra nenhuma, só nomes.

-- 1. Tipo e colunas
alter type public.passe_estado rename to plano_estado;
alter table public.books rename column passe_estado to plano_estado;
alter table public.books rename column passe_ativado_em to plano_ativado_em;
alter table public.books rename column passe_vence_em to plano_vence_em;
alter table public.books rename constraint books_passe_datas to books_plano_datas;

-- 2. Regra de escrita (o corpo cita as colunas pelo nome, então é recriada)
create or replace function privado.livro_editavel(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.books b
    where b.id = p_book and b.plano_estado = 'ativo' and b.plano_vence_em > now()
  )
$$;

-- 3. Funções do admin com o nome novo
drop function public.admin_ativar_passe(uuid, text, integer);
drop function public.admin_renovar_passe(uuid, integer);
drop function public.admin_listar_livros();

create function public.admin_ativar_plano(p_responsavel uuid, p_autor_nome text, p_meses integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
begin
  if p_meses is null or p_meses not between 1 and 36 then
    raise exception 'meses fora do intervalo: %', p_meses;
  end if;
  insert into public.books (autor_nome, plano_estado, plano_ativado_em, plano_vence_em)
  values (nullif(btrim(p_autor_nome), ''), 'ativo', now(), now() + make_interval(months => p_meses))
  returning id into v_livro;
  insert into public.book_members (book_id, user_id, papel)
  values (v_livro, p_responsavel, 'responsavel');
  return v_livro;
end $$;

-- Renovar soma a partir do maior entre hoje e o vencimento atual: renovar cedo não perde dias.
create function public.admin_renovar_plano(p_livro uuid, p_meses integer)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_vence timestamptz;
begin
  if p_meses is null or p_meses not between 1 and 36 then
    raise exception 'meses fora do intervalo: %', p_meses;
  end if;
  update public.books
  set plano_estado = 'ativo',
      plano_ativado_em = coalesce(plano_ativado_em, now()),
      plano_vence_em = greatest(now(), coalesce(plano_vence_em, now())) + make_interval(months => p_meses)
  where id = p_livro
  returning plano_vence_em into v_vence;
  if v_vence is null then
    raise exception 'livro não encontrado: %', p_livro;
  end if;
  return v_vence;
end $$;

create function public.admin_listar_livros()
returns table (
  id uuid,
  autor_nome text,
  plano_estado public.plano_estado,
  plano_vence_em timestamptz,
  criado_em timestamptz,
  responsavel_email text
)
language sql stable security definer set search_path = '' as $$
  select b.id, b.autor_nome, b.plano_estado, b.plano_vence_em, b.criado_em, u.email::text
  from public.books b
  left join public.book_members m on m.book_id = b.id and m.papel = 'responsavel'
  left join auth.users u on u.id = m.user_id
  order by b.criado_em desc
$$;

revoke all on function
  public.admin_ativar_plano(uuid, text, integer),
  public.admin_renovar_plano(uuid, integer),
  public.admin_listar_livros()
  from public, anon, authenticated;
grant execute on function
  public.admin_ativar_plano(uuid, text, integer),
  public.admin_renovar_plano(uuid, integer),
  public.admin_listar_livros()
  to service_role;

-- 4. Job diário com o nome novo
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'vencer-passes';
  end if;
end $$;
drop function privado.vencer_passes();

create function privado.vencer_planos() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_total integer;
begin
  with vencidos as (
    update public.books
    set plano_estado = 'somente_leitura'
    where plano_estado = 'ativo' and plano_vence_em <= now()
    returning id
  )
  insert into public.events (book_id, ator_tipo, acao)
  select id, 'sistema', 'plano_vencido' from vencidos;
  get diagnostics v_total = row_count;
  return v_total;
end $$;
revoke all on function privado.vencer_planos() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('vencer-planos', '0 9 * * *', 'select privado.vencer_planos()');
  end if;
end $$;

-- 5. Eventos já gravados passam a usar o nome novo
update public.events set acao = replace(acao, 'passe_', 'plano_') where acao like 'passe\_%';
