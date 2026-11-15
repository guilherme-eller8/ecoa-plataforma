-- Reversão de arquivar_historia: as histórias arquivadas voltam às listas e à montagem.
-- Nada é apagado.
create or replace function privado.conteudo_do_livro(p_book uuid, p_so_incluidas boolean) returns jsonb
language sql stable security definer set search_path = '' as $$
  with l as (
    select b.id, coalesce(b.autor_nome, b.autor_apelido) as autor, lo.titulo, lo.subtitulo,
           lo.dedicatoria, coalesce(lo.capa_cor, 'terracota') as capa_cor, lo.capa_foto_id,
           coalesce(lo.capa_foco_x, 50) as capa_foco_x, coalesce(lo.capa_foco_y, 50) as capa_foco_y,
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
      'capa_foto', (select jsonb_build_object('caminho', ph.caminho, 'largura', ph.largura, 'altura', ph.altura,
                                         'foco_x', l.capa_foco_x, 'foco_y', l.capa_foco_y)
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

drop function public.historia_arquivar(uuid, uuid, boolean);
alter table public.stories drop column arquivada_em;
