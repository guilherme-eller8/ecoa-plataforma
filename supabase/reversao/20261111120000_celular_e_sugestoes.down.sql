-- Reverte 20261111120000_celular_e_sugestoes.sql.
-- ATENÇÃO: apaga o celular dos autores e o tipo das sugestões (todas voltam a ser causos).

drop function if exists public.familia_enviar_causo(text, text, text, text, boolean, smallint, public.prompt_tipo);

-- Versão anterior, idêntica à de 20261110120000.
create function public.familia_enviar_causo(
  p_token text, p_nome text, p_texto text, p_audio_tipo text,
  p_consentimento boolean, p_consentimento_versao smallint
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
  v_id uuid := gen_random_uuid();
  v_caminho text;
begin
  if p_nome is null or octet_length(p_nome) > 320
     or (p_texto is not null and octet_length(p_texto) > 8000)
     or (p_audio_tipo is not null and p_audio_tipo not in ('webm', 'm4a', 'ogg'))
     or ((nullif(btrim(coalesce(p_texto, '')), '') is null) = (p_audio_tipo is null)) -- um ou outro
     or char_length(btrim(p_nome)) not between 1 and 80
     or (p_texto is not null and char_length(btrim(p_texto)) > 2000)
     or p_consentimento_versao is null or p_consentimento_versao not between 1 and 99 then
    raise exception 'dados_invalidos';
  end if;
  if p_consentimento is not true then
    raise exception 'sem_consentimento';
  end if;
  v_livro := privado.livro_da_familia(p_token);
  if v_livro is null then
    raise exception 'link_invalido';
  end if;
  if not privado.livro_editavel(v_livro) then
    raise exception 'livro_fechado';
  end if;

  -- Uma fila por livro: a contagem e o insert não correm em paralelo.
  perform pg_advisory_xact_lock(hashtextextended('causos:' || v_livro::text, 0));
  if (select count(*) from public.causos c
      where c.book_id = v_livro and c.criado_em > now() - interval '1 hour') >= privado.max_causos_por_hora()
     or (select count(*) from public.causos c
      where c.book_id = v_livro and c.criado_em > now() - interval '1 day') >= privado.max_causos_por_dia() then
    raise exception 'limite_causos';
  end if;

  if p_audio_tipo is not null then
    v_caminho := 'livros/' || v_livro::text || '/causos/' || v_id::text || '.' || p_audio_tipo;
  end if;
  insert into public.causos (id, book_id, nome, texto, audio_caminho, consentimento_em, consentimento_versao)
  values (v_id, v_livro, btrim(p_nome), nullif(btrim(p_texto), ''), v_caminho, now(), p_consentimento_versao);
  return jsonb_build_object('id', v_id, 'livro', v_livro, 'audio_caminho', v_caminho);
end $$;

revoke all on function public.familia_enviar_causo(text, text, text, text, boolean, smallint)
  from public, anon, authenticated;
grant execute on function public.familia_enviar_causo(text, text, text, text, boolean, smallint)
  to anon, service_role;

alter table public.causos drop column if exists tipo;
alter table public.books drop column if exists autor_celular;
