-- 20261111120000_celular_e_sugestoes.sql
-- Depois do aceite do prompt 4: celular do autor (WhatsApp direto) e sugestão de pergunta pela família.

-- Celular do autor, opcional, em formato internacional (+5531999998888). Dado pessoal:
-- só membros do livro leem; as portas da família nunca devolvem.
alter table public.books add column autor_celular text
  check (autor_celular is null or autor_celular ~ '^\+[1-9][0-9]{9,14}$');
grant update (autor_celular) on public.books to authenticated;

-- A família sugere pergunta ou causo; a mesma tabela, com o tipo.
alter table public.causos add column tipo public.prompt_tipo not null default 'causo';
grant select (tipo) on public.causos to authenticated;

-- familia_enviar_causo ganha p_tipo (padrão 'causo'). O resto é igual à versão de 20261110120000.
drop function public.familia_enviar_causo(text, text, text, text, boolean, smallint);

-- Recebe uma sugestão (pergunta ou causo) exatamente como a pessoa enviou. Com áudio
-- (p_audio_tipo), devolve o caminho fixo onde o servidor vai autorizar o upload; a sugestão
-- só aparece depois da confirmação (servico_confirmar_audio_causo).
create function public.familia_enviar_causo(
  p_token text, p_nome text, p_texto text, p_audio_tipo text,
  p_consentimento boolean, p_consentimento_versao smallint,
  p_tipo public.prompt_tipo default 'causo'
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
     or p_consentimento_versao is null or p_consentimento_versao not between 1 and 99
     or p_tipo is null then
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
  insert into public.causos (id, book_id, nome, texto, audio_caminho, consentimento_em, consentimento_versao, tipo)
  values (v_id, v_livro, btrim(p_nome), nullif(btrim(p_texto), ''), v_caminho, now(), p_consentimento_versao, p_tipo);
  return jsonb_build_object('id', v_id, 'livro', v_livro, 'audio_caminho', v_caminho);
end $$;

revoke all on function public.familia_enviar_causo(text, text, text, text, boolean, smallint, public.prompt_tipo)
  from public, anon, authenticated;
grant execute on function public.familia_enviar_causo(text, text, text, text, boolean, smallint, public.prompt_tipo)
  to anon, service_role;
