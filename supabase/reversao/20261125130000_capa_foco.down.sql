-- Reversão de capa_foco: volta montagem_salvar e o conteúdo congelado ao que eram.
-- O foco escolhido some (a capa volta a centralizar a foto); nada mais é afetado.
drop function public.montagem_salvar(uuid, integer, text, text, text, uuid, text, uuid[], uuid[], uuid[], smallint, smallint);

create function public.montagem_salvar(
  p_book uuid, p_rev integer, p_titulo text, p_subtitulo text, p_dedicatoria text,
  p_capa_foto uuid, p_capa_cor text, p_ordem_historias uuid[], p_ordem_mensagens uuid[], p_fora uuid[])
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_rev integer;
  v_max integer := privado.max_itens_livro();
begin
  perform privado.membro_editando(p_book);
  if p_rev is null or p_ordem_historias is null or p_ordem_mensagens is null or p_fora is null
     or not (coalesce(p_capa_cor, '') = any (privado.capa_cores()))
     or cardinality(p_ordem_historias) > v_max or cardinality(p_ordem_mensagens) > v_max
     or cardinality(p_fora) > v_max
     or char_length(btrim(coalesce(p_titulo, ''))) > 90
     or char_length(btrim(coalesce(p_subtitulo, ''))) > 120
     or char_length(btrim(coalesce(p_dedicatoria, ''))) > 600
     or exists (select 1 from unnest(p_ordem_historias || p_fora) i
                where not exists (select 1 from public.stories s where s.id = i and s.book_id = p_book))
     or exists (select 1 from unnest(p_ordem_mensagens) i
                where not exists (select 1 from public.family_messages f
                                  where f.id = i and f.book_id = p_book and f.estado <> 'rascunho'))
     or (p_capa_foto is not null
         and not exists (select 1 from public.photos ph where ph.id = p_capa_foto and ph.book_id = p_book)) then
    raise exception 'dados_invalidos';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('publicar:' || p_book::text, 0));
  if p_rev = 0 then
    insert into public.book_layouts as lo (book_id, titulo, subtitulo, dedicatoria, capa_foto_id, capa_cor,
                                     ordem_historias, ordem_mensagens, fora, atualizado_por)
    values (p_book, nullif(btrim(p_titulo), ''), nullif(btrim(p_subtitulo), ''),
            nullif(btrim(p_dedicatoria), ''), p_capa_foto, p_capa_cor,
            p_ordem_historias, p_ordem_mensagens, p_fora, (select auth.uid()))
    on conflict (book_id) do nothing
    returning lo.rev into v_rev;
  else
    update public.book_layouts lo set
      titulo = nullif(btrim(p_titulo), ''), subtitulo = nullif(btrim(p_subtitulo), ''),
      dedicatoria = nullif(btrim(p_dedicatoria), ''), capa_foto_id = p_capa_foto, capa_cor = p_capa_cor,
      ordem_historias = p_ordem_historias, ordem_mensagens = p_ordem_mensagens, fora = p_fora,
      rev = lo.rev + 1, atualizado_em = now(), atualizado_por = (select auth.uid())
    where lo.book_id = p_book and lo.rev = p_rev
    returning lo.rev into v_rev;
  end if;
  if v_rev is null then raise exception 'montagem_mudou'; end if;
  return v_rev;
end $$;

revoke all on function public.montagem_salvar(uuid, integer, text, text, text, uuid, text, uuid[], uuid[], uuid[]) from public, anon, authenticated, porta_autor, service_role;
grant execute on function public.montagem_salvar(uuid, integer, text, text, text, uuid, text, uuid[], uuid[], uuid[]) to authenticated;

create or replace function privado.conteudo_do_livro(p_book uuid, p_so_incluidas boolean) returns jsonb
language sql stable security definer set search_path = '' as $$
  with l as (
    select b.id, coalesce(b.autor_nome, b.autor_apelido) as autor, lo.titulo, lo.subtitulo,
           lo.dedicatoria, coalesce(lo.capa_cor, 'terracota') as capa_cor, lo.capa_foto_id,
           coalesce(lo.ordem_historias, '{}') as oh, coalesce(lo.ordem_mensagens, '{}') as om,
           coalesce(lo.fora, '{}') as fora, coalesce(lo.rev, 0) as rev
    from public.books b left join public.book_layouts lo on lo.book_id = b.id
    where b.id = p_book
  ),
  h as (
    select st.id, st.titulo, st.ano, st.revisada_em is not null as revisada,
           not (st.id = any (l.fora)) as incluida,
           privado.palavras_do_texto(st.texto) as palavras,
           coalesce((select jsonb_agg(p ->> 'texto' order by o)
                     from jsonb_array_elements(coalesce(st.texto -> 'paragrafos', '[]')) with ordinality as t(p, o)
                     where btrim(coalesce(p ->> 'texto', '')) <> ''), '[]') as paragrafos,
           coalesce((select jsonb_agg(jsonb_build_object('caminho', ph.caminho, 'largura', ph.largura,
                                                         'altura', ph.altura) order by sp.ordem)
                     from public.story_photos sp join public.photos ph on ph.id = sp.photo_id
                     where sp.story_id = st.id), '[]') as fotos,
           -- ligado = vai impresso: não desligado e com áudio que o recorte aceita (Q10).
           (select jsonb_build_object('codigo', q.codigo,
                     'ligado', q.desativado_em is null and privado.historia_aceita_qr(st.id))
            from public.qr_codes q where q.story_id = st.id) as qr,
           array_position(l.oh, st.id) as pos, st.criado_em
    from public.stories st, l
    where st.book_id = p_book and st.estado = 'pronta' and st.texto is not null
  ),
  m as (
    select f.id, f.nome, f.relacao, f.no_livro as incluida, f.texto,
           case when f.foto_recebida_em is not null then f.foto_caminho end as foto_caminho,
           -- Com áudio = chegou, não foi recusado e foi transcrito (a transcrição conferiu o teto).
           f.audio_caminho is not null and f.audio_recebido_em is not null and not f.audio_recusado
             and f.transcricao is not null as com_audio,
           (select jsonb_build_object('codigo', q.codigo, 'ligado', q.desativado_em is null
                     and f.audio_recebido_em is not null and not f.audio_recusado and f.transcricao is not null)
            from public.qr_codes q where q.message_id = f.id) as qr,
           array_position(l.om, f.id) as pos, f.enviada_em
    from public.family_messages f, l
    where f.book_id = p_book and f.estado = 'enviada'
  )
  select jsonb_build_object(
    'livro', jsonb_build_object(
      'titulo', l.titulo, 'subtitulo', l.subtitulo, 'dedicatoria', l.dedicatoria, 'autor', l.autor,
      'capa_cor', l.capa_cor, 'rev', l.rev,
      'capa_foto', (select jsonb_build_object('caminho', ph.caminho, 'largura', ph.largura, 'altura', ph.altura)
                    from public.photos ph where ph.id = l.capa_foto_id and ph.book_id = p_book)),
    'historias', coalesce((select jsonb_agg(jsonb_build_object(
        'id', h.id, 'titulo', h.titulo, 'ano', h.ano, 'revisada', h.revisada, 'incluida', h.incluida,
        'palavras', h.palavras, 'paragrafos', h.paragrafos, 'fotos', h.fotos, 'qr', h.qr)
        order by h.pos nulls last, h.criado_em, h.id)
      from h where h.incluida or not p_so_incluidas), '[]'),
    'mensagens', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'nome', m.nome, 'relacao', m.relacao, 'incluida', m.incluida, 'texto', m.texto,
        'foto', m.foto_caminho, 'com_audio', m.com_audio, 'qr', m.qr)
        order by m.pos nulls last, m.enviada_em, m.id)
      from m where m.incluida or not p_so_incluidas), '[]'))
  from l
$$;

alter table public.book_layouts drop column capa_foco_x, drop column capa_foco_y;
