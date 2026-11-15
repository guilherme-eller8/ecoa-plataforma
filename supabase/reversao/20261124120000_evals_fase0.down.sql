-- Reversão de evals_fase0: volta ai_usage ao que era. As colunas novas são só registro;
-- apagar não afeta nenhuma história, versão ou transcrição.
drop function public.admin_custos_por_livro();
alter table public.ai_usage
  drop constraint ai_usage_erro_so_na_falha,
  drop column detalhes,
  drop column ms_desde_envio,
  drop column erro_codigo;
