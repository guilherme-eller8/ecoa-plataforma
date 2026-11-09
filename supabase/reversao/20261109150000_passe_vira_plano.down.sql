-- Reverte 20261109150000_passe_vira_plano.sql (volta os nomes para "passe").
update public.events set acao = replace(acao, 'plano_', 'passe_') where acao like 'plano\_%';

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'vencer-planos';
  end if;
end $$;
drop function if exists privado.vencer_planos();
drop function if exists public.admin_listar_livros();
drop function if exists public.admin_renovar_plano(uuid, integer);
drop function if exists public.admin_ativar_plano(uuid, text, integer);

alter table public.books rename constraint books_plano_datas to books_passe_datas;
alter table public.books rename column plano_vence_em to passe_vence_em;
alter table public.books rename column plano_ativado_em to passe_ativado_em;
alter table public.books rename column plano_estado to passe_estado;
alter type public.plano_estado rename to passe_estado;

create or replace function privado.livro_editavel(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.books b
    where b.id = p_book and b.passe_estado = 'ativo' and b.passe_vence_em > now()
  )
$$;

create function public.admin_ativar_passe(p_responsavel uuid, p_autor_nome text, p_meses integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
begin
  if p_meses is null or p_meses not between 1 and 36 then
    raise exception 'meses fora do intervalo: %', p_meses;
  end if;
  insert into public.books (autor_nome, passe_estado, passe_ativado_em, passe_vence_em)
  values (nullif(btrim(p_autor_nome), ''), 'ativo', now(), now() + make_interval(months => p_meses))
  returning id into v_livro;
  insert into public.book_members (book_id, user_id, papel)
  values (v_livro, p_responsavel, 'responsavel');
  return v_livro;
end $$;

create function public.admin_renovar_passe(p_livro uuid, p_meses integer)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_vence timestamptz;
begin
  if p_meses is null or p_meses not between 1 and 36 then
    raise exception 'meses fora do intervalo: %', p_meses;
  end if;
  update public.books
  set passe_estado = 'ativo',
      passe_ativado_em = coalesce(passe_ativado_em, now()),
      passe_vence_em = greatest(now(), coalesce(passe_vence_em, now())) + make_interval(months => p_meses)
  where id = p_livro
  returning passe_vence_em into v_vence;
  if v_vence is null then
    raise exception 'livro não encontrado: %', p_livro;
  end if;
  return v_vence;
end $$;

create function public.admin_listar_livros()
returns table (
  id uuid,
  autor_nome text,
  passe_estado public.passe_estado,
  passe_vence_em timestamptz,
  criado_em timestamptz,
  responsavel_email text
)
language sql stable security definer set search_path = '' as $$
  select b.id, b.autor_nome, b.passe_estado, b.passe_vence_em, b.criado_em, u.email::text
  from public.books b
  left join public.book_members m on m.book_id = b.id and m.papel = 'responsavel'
  left join auth.users u on u.id = m.user_id
  order by b.criado_em desc
$$;

revoke all on function
  public.admin_ativar_passe(uuid, text, integer),
  public.admin_renovar_passe(uuid, integer),
  public.admin_listar_livros()
  from public, anon, authenticated;
grant execute on function
  public.admin_ativar_passe(uuid, text, integer),
  public.admin_renovar_passe(uuid, integer),
  public.admin_listar_livros()
  to service_role;

create function privado.vencer_passes() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_total integer;
begin
  with vencidos as (
    update public.books
    set passe_estado = 'somente_leitura'
    where passe_estado = 'ativo' and passe_vence_em <= now()
    returning id
  )
  insert into public.events (book_id, ator_tipo, acao)
  select id, 'sistema', 'passe_vencido' from vencidos;
  get diagnostics v_total = row_count;
  return v_total;
end $$;
revoke all on function privado.vencer_passes() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('vencer-passes', '0 9 * * *', 'select privado.vencer_passes()');
  end if;
end $$;
