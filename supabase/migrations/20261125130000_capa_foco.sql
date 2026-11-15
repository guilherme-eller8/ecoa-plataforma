-- Foco da foto da capa (pedido do Guilherme, 15/11/2026): a pessoa escolhe que parte da foto
-- aparece no retângulo da capa. 0 a 100 (% da foto), 50/50 = centro (o que já era).
-- Mexe em book_layouts (mesma RLS: só membro lê, escrita só por montagem_salvar), em
-- montagem_salvar (assinatura nova) e no conteúdo congelado, que passa a levar o foco.

alter table public.book_layouts
  add column capa_foco_x smallint not null default 50 check (capa_foco_x between 0 and 100),
  add column capa_foco_y smallint not null default 50 check (capa_foco_y between 0 and 100);

-- A função antiga some: a nova leva o foco (o grant vai para a assinatura nova).
drop function public.montagem_salvar(uuid, integer, text, text, text, uuid, text, uuid[], uuid[], uuid[]);

create function public.montagem_salvar(
  p_book uuid, p_rev integer, p_titulo text, p_subtitulo text, p_dedicatoria text,
  p_capa_foto uuid, p_capa_cor text, p_ordem_historias uuid[], p_ordem_mensagens uuid[], p_fora uuid[],
  p_capa_foco_x smallint, p_capa_foco_y smallint)
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_rev integer;
  v_max integer := privado.max_itens_livro();
begin
  perform privado.membro_editando(p_book);
  if p_rev is null or p_capa_foco_x is null or p_capa_foco_y is null
     or p_capa_foco_x not between 0 and 100 or p_capa_foco_y not between 0 and 100
     or p_ordem_historias is null or p_ordem_mensagens is null or p_fora is null
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
                                     capa_foco_x, capa_foco_y,
                                     ordem_historias, ordem_mensagens, fora, atualizado_por)
    values (p_book, nullif(btrim(p_titulo), ''), nullif(btrim(p_subtitulo), ''),
            nullif(btrim(p_dedicatoria), ''), p_capa_foto, p_capa_cor,
            p_capa_foco_x, p_capa_foco_y,
            p_ordem_historias, p_ordem_mensagens, p_fora, (select auth.uid()))
    on conflict (book_id) do nothing
    returning lo.rev into v_rev;
  else
    update public.book_layouts lo set
      titulo = nullif(btrim(p_titulo), ''), subtitulo = nullif(btrim(p_subtitulo), ''),
      dedicatoria = nullif(btrim(p_dedicatoria), ''), capa_foto_id = p_capa_foto, capa_cor = p_capa_cor,
      capa_foco_x = p_capa_foco_x, capa_foco_y = p_capa_foco_y,
      ordem_historias = p_ordem_historias, ordem_mensagens = p_ordem_mensagens, fora = p_fora,
      rev = lo.rev + 1, atualizado_em = now(), atualizado_por = (select auth.uid())
    where lo.book_id = p_book and lo.rev = p_rev
    returning lo.rev into v_rev;
  end if;
  if v_rev is null then raise exception 'montagem_mudou'; end if;
  return v_rev;
end $$;

revoke all on function public.montagem_salvar(uuid, integer, text, text, text, uuid, text, uuid[], uuid[], uuid[], smallint, smallint) from public, anon, authenticated, porta_autor, service_role;
grant execute on function public.montagem_salvar(uuid, integer, text, text, text, uuid, text, uuid[], uuid[], uuid[], smallint, smallint) to authenticated;

-- O conteúdo congelado na publicação (e o hash que a pessoa conferiu) passa a incluir o foco.
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
