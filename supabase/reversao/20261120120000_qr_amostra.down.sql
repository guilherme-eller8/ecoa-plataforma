-- Reversão de 20261120120000_qr_amostra.sql.
-- ATENÇÃO: depois da primeira página de amostra impressa (QR no papel), esta reversão nunca roda
-- em produção: apagaria os códigos que os livros apontam. Só vale para o ambiente de teste.

-- Trava: com QR criado (ou mensagem guardada), só roda com `set ecoa.reversao_destrutiva = 'sim'`.
do $$
begin
  if ((to_regclass('public.qr_codes') is not null and exists (select 1 from public.qr_codes))
      or (to_regclass('public.family_messages') is not null and exists (select 1 from public.family_messages)))
     and coalesce(current_setting('ecoa.reversao_destrutiva', true), '') <> 'sim' then
    raise exception 'reversao_com_qr: rode com ecoa.reversao_destrutiva = sim';
  end if;
end $$;

-- Os gatilhos de imutabilidade saem antes da tabela.
drop trigger if exists qr_codes_sem_truncate on public.qr_codes;
drop trigger if exists qr_codes_imutavel on public.qr_codes;
drop function if exists public.servico_ouvir_qr(text, text);
drop function if exists public.servico_qr_audio_pronto(text, text, text);
drop function if exists public.criar_qr(uuid, text);
drop function if exists privado.fonte_audio_da_historia(uuid);
drop table if exists public.qr_consultas;
drop table if exists public.qr_codes;
drop function if exists privado.qr_sem_truncate();
drop function if exists privado.qr_imutavel();
drop table if exists public.family_messages;
drop function if exists privado.qr_audio_espera_s();
drop function if exists privado.qr_consultas_por_minuto();
