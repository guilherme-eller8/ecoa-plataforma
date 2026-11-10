-- Reverte 20261109120100_job_vencer_passes.sql
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'vencer-passes';
  end if;
end $$;
drop function if exists privado.vencer_passes();
-- A extensão pg_cron fica instalada: outras rotinas podem usá-la.
