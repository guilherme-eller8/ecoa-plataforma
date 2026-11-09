-- 20261109120100_job_vencer_passes.sql
-- Todo dia às 06:00 de Brasília (09:00 UTC), passes vencidos viram somente leitura.

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

-- O pg_cron existe no Supabase e não existe no PGlite dos testes.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.schedule('vencer-passes', '0 9 * * *', 'select privado.vencer_passes()');
  end if;
end $$;
