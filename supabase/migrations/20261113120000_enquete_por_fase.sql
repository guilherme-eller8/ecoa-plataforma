-- 20261113120000_enquete_por_fase.sql
-- Enquete por fase da vida (P35): a família pode ver a lista inteira (150 do banco mais as
-- próprias e as sugestões) e marca até 2 por fase. A fase sai do banco_id ("infancia-03");
-- item sem banco_id (próprio ou sugestão da família) fica em "outras".

create or replace function privado.max_itens_enquete() returns integer
language sql immutable set search_path = '' as $$ select 200 $$;

-- Teto total por pessoa: 2 por fase × 9 categorias (8 fases + outras).
create or replace function privado.votos_por_pessoa() returns integer
language sql immutable set search_path = '' as $$ select 18 $$;

create function privado.votos_por_fase() returns integer
language sql immutable set search_path = '' as $$ select 2 $$;

create function privado.fase_do_item(p_banco_id text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(nullif(split_part(p_banco_id, '-', 1), ''), 'outras')
$$;

revoke all on function privado.votos_por_fase(), privado.fase_do_item(text)
  from public, anon, authenticated;

-- O que a página /f/[token] mostra: igual à anterior, com a fase de cada item e o limite por fase.
create or replace function public.familia_pagina(p_token text, p_aparelho text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_livro uuid := privado.livro_da_familia(p_token);
  v_hash text;
  v_enquete jsonb;
begin
  if v_livro is null then
    return null;
  end if;
  v_hash := privado.hash_aparelho(v_livro, p_aparelho);
  select jsonb_build_object(
    'id', p.id,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'texto', i.texto, 'tipo', i.tipo,
                                          'fase', privado.fase_do_item(i.banco_id))
                       order by i.ordem, i.id)
      from public.poll_items i where i.poll_id = p.id), '[]'::jsonb),
    'meus_votos', coalesce((
      select jsonb_agg(v.poll_item_id) from public.poll_votes v
      where v.poll_id = p.id and v.aparelho_hash = v_hash), '[]'::jsonb),
    'meu_nome', (
      select v.nome from public.poll_votes v
      where v.poll_id = p.id and v.aparelho_hash = v_hash limit 1)
  ) into v_enquete
  from public.polls p
  where p.book_id = v_livro and p.estado = 'aberta';

  return jsonb_build_object(
    'autor', (select coalesce(b.autor_apelido, b.autor_nome) from public.books b where b.id = v_livro),
    'aberto', privado.livro_editavel(v_livro),
    'votos_por_pessoa', privado.votos_por_pessoa(),
    'votos_por_fase', privado.votos_por_fase(),
    'enquete', v_enquete
  );
end $$;

-- Grava (ou troca) o conjunto de votos de um aparelho: igual à anterior, com até 2 por fase.
create or replace function public.familia_votar(p_token text, p_aparelho text, p_nome text, p_itens uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
  v_hash text;
  v_itens uuid[];
  v_enquete public.polls;
  v_votante uuid;
begin
  -- Tamanho da entrada antes de qualquer outra coisa.
  if p_itens is null or cardinality(p_itens) > privado.max_itens_enquete()
     or p_nome is null or octet_length(p_nome) > 320 then
    raise exception 'dados_invalidos';
  end if;
  v_livro := privado.livro_da_familia(p_token);
  if v_livro is null then
    raise exception 'link_invalido';
  end if;
  if not privado.livro_editavel(v_livro) then
    raise exception 'livro_fechado';
  end if;
  v_hash := privado.hash_aparelho(v_livro, p_aparelho);
  if v_hash is null or char_length(btrim(p_nome)) not between 1 and 80 then
    raise exception 'dados_invalidos';
  end if;
  v_itens := array(select distinct x from unnest(p_itens) x where x is not null);
  if cardinality(v_itens) not between 1 and privado.votos_por_pessoa() then
    raise exception 'quantidade_invalida';
  end if;

  -- Trava a enquete: votos, trocas e encerramento ficam em fila.
  select * into v_enquete from public.polls p
  where p.book_id = v_livro and p.estado = 'aberta'
  for update;
  if v_enquete.id is null then
    raise exception 'sem_enquete';
  end if;
  if exists (
    select 1 from unnest(v_itens) x
    where not exists (select 1 from public.poll_items i where i.id = x and i.poll_id = v_enquete.id)
  ) then
    raise exception 'item_invalido';
  end if;
  if exists (
    select 1 from public.poll_items i
    where i.poll_id = v_enquete.id and i.id = any (v_itens)
    group by privado.fase_do_item(i.banco_id)
    having count(*) > privado.votos_por_fase()
  ) then
    raise exception 'quantidade_invalida';
  end if;

  select v.votante into v_votante from public.poll_votes v
  where v.poll_id = v_enquete.id and v.aparelho_hash = v_hash limit 1;
  if v_votante is null and (
    select count(distinct v.votante) from public.poll_votes v where v.poll_id = v_enquete.id
  ) >= privado.max_votantes_por_enquete() then
    raise exception 'limite_votantes';
  end if;

  if v_enquete.trocas_desde < now() - interval '1 hour' then
    update public.polls set trocas_desde = now(), trocas = 1 where id = v_enquete.id;
  elsif v_enquete.trocas >= privado.max_trocas_voto_por_hora() then
    raise exception 'limite_por_hora';
  else
    update public.polls set trocas = trocas + 1 where id = v_enquete.id;
  end if;

  v_votante := coalesce(v_votante, gen_random_uuid());
  delete from public.poll_votes where poll_id = v_enquete.id and aparelho_hash = v_hash;
  insert into public.poll_votes (book_id, poll_id, poll_item_id, votante, aparelho_hash, nome)
  select v_livro, v_enquete.id, x, v_votante, v_hash, btrim(p_nome) from unnest(v_itens) x;
  return jsonb_build_object('votos', cardinality(v_itens), 'livro', v_livro, 'votante', v_votante);
end $$;
