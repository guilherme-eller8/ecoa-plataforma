-- Reversão de evals_fase1a: só funções de leitura; apagar não toca em nenhum dado.
drop function public.admin_cotas_24h(numeric);
drop function public.admin_primeira_palavra(timestamptz, numeric[], integer);
drop function public.admin_uso_por_dia(date, date);
