-- As 4 funções-constante da compra (20261130120000) nasceram sem search_path fixo; o linter
-- do Supabase avisa (function_search_path_mutable). Sem risco real (só select de um número),
-- mas toda função do projeto fixa o search_path.
alter function privado.preco_plano_centavos() set search_path = '';
alter function privado.duracao_plano_meses() set search_path = '';
alter function privado.max_compras_por_email_dia() set search_path = '';
alter function privado.minutos_compra_aberta() set search_path = '';
