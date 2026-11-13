-- 20261118120000_editor.sql
-- Prompt 8: editor de histórias, parte 1. Texto atual, versões, trava de edição, ano, fotos
-- da história e "Marcar como pronta". Design: docs/designs/editor-historias.md.
--
-- Regras deste arquivo:
-- * story_versions continua só insert (T36). O texto que muda a cada salvamento fica em
--   stories.texto; uma versão nova nasce quando a sessão de edição fecha (saiu, ficou 2 min
--   parado, outra pessoa assumiu), a cada 10 min de edição contínua, ao restaurar e ao marcar
--   como pronta. Nenhuma edição fica fora de uma versão por mais de 10 min.
-- * Toda escrita do texto passa por funções que conferem a trava no banco, não só na tela.
-- * porta_autor não recebe nenhum grant novo (o autor corrige textos no prompt 10).

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.trava_edicao_s() returns integer
language sql immutable set search_path = '' as $$ select 120 $$;            -- TRAVA_EDICAO_MIN = 2
create function privado.versao_a_cada_s() returns integer
language sql immutable set search_path = '' as $$ select 600 $$;            -- VERSAO_A_CADA_MIN = 10
create function privado.max_fotos_historia() returns integer
language sql immutable set search_path = '' as $$ select 4 $$;              -- MAX_FOTOS_HISTORIA
create function privado.max_paragrafos() returns integer
language sql immutable set search_path = '' as $$ select 300 $$;            -- MAX_PARAGRAFOS
create function privado.max_letras_paragrafo() returns integer
language sql immutable set search_path = '' as $$ select 6000 $$;           -- MAX_LETRAS_PARAGRAFO

-- ── 1. stories: texto atual, ano e "pronta" pela família ───────────────────
-- texto null = igual à última versão (ainda ninguém editou). texto_rev sobe a cada salvamento;
-- versao_rev é o texto_rev que já está guardado numa versão (texto_rev > versao_rev = pendente).
alter table public.stories
  add column texto jsonb check (texto is null or jsonb_typeof(texto) = 'object'),
  add column texto_marcacoes jsonb not null default '[]'::jsonb
    check (jsonb_typeof(texto_marcacoes) = 'array'),
  add column texto_rev integer not null default 0 check (texto_rev >= 0),
  add column versao_rev integer not null default 0 check (versao_rev >= 0),
  add column texto_por uuid references auth.users (id) on delete set null,
  add column texto_origem public.versao_origem,
  add column texto_em timestamptz,
  add column ano smallint check (ano is null or ano between 1850 and 2100),
  add column revisada_em timestamptz,
  add column revisada_por uuid references auth.users (id) on delete set null,
  add constraint stories_versao_rev check (versao_rev <= texto_rev);

grant select (texto, texto_marcacoes, texto_rev, versao_rev, texto_por, texto_origem, texto_em,
  ano, revisada_em, estrutura) on public.stories to authenticated;

-- Versão que veio de "Restaurar": aponta para a versão de origem.
alter table public.story_versions
  add column restaurada_de integer check (restaurada_de is null or restaurada_de >= 1);

-- ── 2. edit_locks ──────────────────────────────────────────────────────────
-- Uma trava por história. aba = a tela que edita: a mesma pessoa em dois navegadores também
-- vê a trava (e pode assumir). Ninguém lê a tabela direto: só por editar_historia.
create table public.edit_locks (
  story_id uuid primary key,
  book_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  aba uuid not null,
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  desde timestamptz not null default now(),
  expira_em timestamptz not null,
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete cascade
);
alter table public.edit_locks enable row level security;
revoke all on public.edit_locks from public, anon, authenticated, porta_autor, service_role;
grant all on public.edit_locks to service_role;
-- authenticated: nenhum grant. RLS ligada e sem política.

-- ── 3. story_photos (até 4 por história; legenda continua em photos) ───────
create table public.story_photos (
  story_id uuid not null,
  photo_id uuid not null,
  book_id uuid not null,
  ordem smallint not null default 1 check (ordem between 1 and 4),
  criado_em timestamptz not null default now(),
  primary key (story_id, photo_id),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete cascade,
  foreign key (book_id, photo_id) references public.photos (book_id, id) on delete cascade
);
create index story_photos_foto on public.story_photos (photo_id);

create function privado.cota_fotos_historia() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('fotos_historia:' || new.story_id::text, 0));
  if (select count(*) from public.story_photos where story_id = new.story_id)
     >= privado.max_fotos_historia() then
    raise exception 'cota_fotos_historia';
  end if;
  return new;
end $$;
create trigger story_photos_cota before insert on public.story_photos
  for each row execute function privado.cota_fotos_historia();

alter table public.story_photos enable row level security;
revoke all on public.story_photos from public, anon, authenticated, porta_autor, service_role;
grant all on public.story_photos to service_role;
grant select, insert (story_id, photo_id, book_id, ordem), update (ordem), delete
  on public.story_photos to authenticated;
create policy "membro lê" on public.story_photos for select to authenticated
  using (privado.eh_membro(book_id));
create policy "membro liga com plano ativo" on public.story_photos for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
create policy "membro reordena com plano ativo" on public.story_photos for update to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id))
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
-- Tirar a foto da história não apaga a foto do acervo.
create policy "membro tira com plano ativo" on public.story_photos for delete to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id));

-- ── 4. Auxiliares ──────────────────────────────────────────────────────────
-- Formato aceito do texto: {titulo, ano?, paragrafos: [{id, texto, fontes, editado?}], lacunas?}.
create function privado.conteudo_valido(p jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare v_par jsonb; v_n integer;
begin
  if p is null or jsonb_typeof(p) <> 'object' or octet_length(p::text) > 400000 then return false; end if;
  if (p - array['titulo', 'ano', 'paragrafos', 'lacunas']) <> '{}'::jsonb then return false; end if;
  if coalesce(jsonb_typeof(p -> 'titulo'), '') <> 'string' or char_length(p ->> 'titulo') > 200 then
    return false;
  end if;
  if coalesce(jsonb_typeof(p -> 'ano'), 'null') not in ('null', 'number') then return false; end if;
  if jsonb_typeof(p -> 'ano') = 'number'
     and ((p ->> 'ano') !~ '^[0-9]{4}$' or (p ->> 'ano')::integer not between 1850 and 2100) then
    return false;
  end if;
  if coalesce(jsonb_typeof(p -> 'lacunas'), 'array') <> 'array' then return false; end if;
  if coalesce(jsonb_typeof(p -> 'paragrafos'), '') <> 'array' then return false; end if;
  v_n := jsonb_array_length(p -> 'paragrafos');
  if v_n < 1 or v_n > privado.max_paragrafos() then return false; end if;
  for v_par in select value from jsonb_array_elements(p -> 'paragrafos') loop
    if jsonb_typeof(v_par) <> 'object'
       or (v_par - array['id', 'texto', 'fontes', 'editado']) <> '{}'::jsonb
       or coalesce(jsonb_typeof(v_par -> 'texto'), '') <> 'string'
       or char_length(v_par ->> 'texto') > privado.max_letras_paragrafo()
       or coalesce(jsonb_typeof(v_par -> 'id'), '') <> 'string'
       or (v_par ->> 'id') !~ '^[a-z0-9-]{1,40}$'
       or coalesce(jsonb_typeof(v_par -> 'fontes'), '') <> 'array'
       or jsonb_array_length(v_par -> 'fontes') > 2000
       or exists (select 1 from jsonb_array_elements(v_par -> 'fontes') f
                  where jsonb_typeof(f) <> 'number' or f::text !~ '^[0-9]{1,6}$')
       or coalesce(jsonb_typeof(v_par -> 'editado'), 'boolean') <> 'boolean' then
      return false;
    end if;
  end loop;
  return true;
end $$;

create function privado.marcacoes_validas(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select p is not null and jsonb_typeof(p) = 'array' and jsonb_array_length(p) <= 500
     and octet_length(p::text) <= 200000
     and not exists (select 1 from jsonb_array_elements(p) m where jsonb_typeof(m) <> 'object')
$$;

-- Primeiro nome de quem está logado, para "Ana está editando". user_metadata vem do Google.
create function privado.primeiro_nome() returns text
language sql stable set search_path = '' as $$
  select coalesce(
    nullif(left(split_part(btrim(coalesce(
      auth.jwt() -> 'user_metadata' ->> 'full_name',
      auth.jwt() -> 'user_metadata' ->> 'name', '')), ' ', 1), 40), ''),
    'Alguém da família')
$$;

create function privado.origem_do_membro(p_book uuid) returns public.versao_origem
language sql stable security definer set search_path = '' as $$
  select case m.papel when 'responsavel' then 'responsavel'::public.versao_origem
                      else 'cofacilitador'::public.versao_origem end
  from public.book_members m
  where m.book_id = p_book and m.user_id = (select auth.uid())
$$;

-- Guarda o texto atual como versão, se houver mudança ainda não guardada. Quem chama já
-- travou a linha da história.
create function privado.guardar_versao(p_story uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.stories; v_num integer; v_tam text;
begin
  select * into v from public.stories s where s.id = p_story;
  if not found or v.texto is null or v.texto_rev <= v.versao_rev then return; end if;
  select coalesce(max(x.numero), 0) + 1, (array_agg(x.tamanho order by x.numero desc))[1]
    into v_num, v_tam
    from public.story_versions x where x.story_id = p_story;
  insert into public.story_versions (story_id, book_id, numero, origem, tamanho, conteudo, marcacoes, criado_por)
    values (p_story, v.book_id, v_num, coalesce(v.texto_origem, 'responsavel'), coalesce(v_tam, 'medio'),
            v.texto, v.texto_marcacoes, v.texto_por);
  update public.stories set versao_rev = texto_rev where id = p_story;
end $$;

-- ── 5. Funções do editor (membro logado) ───────────────────────────────────
-- Pega, renova ou só consulta a trava. Devolve se esta tela edita; senão, quem edita.
-- p_pegar = false: só consulta (quem está vendo espera a trava soltar sem pegar nada).
-- p_assumir = true: a mesma pessoa assume a edição que estava em outra tela dela.
create function public.editar_historia(p_story uuid, p_aba uuid, p_pegar boolean default true,
  p_assumir boolean default false)
returns table (editando boolean, outra_tela boolean, nome text)
language plpgsql security definer set search_path = '' as $$
declare
  v_eu uuid := (select auth.uid());
  v_livro uuid; v_estado public.story_estado; t public.edit_locks; v_tem boolean;
  v_minha boolean; v_ocupada boolean;
begin
  if v_eu is null or p_aba is null then raise exception 'sem_permissao'; end if;
  select s.book_id, s.estado into v_livro, v_estado from public.stories s where s.id = p_story for update;
  if not found or not privado.eh_membro(v_livro) then raise exception 'sem_permissao'; end if;
  select * into t from public.edit_locks l where l.story_id = p_story;
  v_tem := found;
  v_minha := v_tem and t.user_id = v_eu and t.aba = p_aba and t.expira_em > now();
  v_ocupada := v_tem and t.expira_em > now() and not v_minha;
  if v_ocupada and not (p_pegar and p_assumir and t.user_id = v_eu) then
    return query select false, t.user_id = v_eu, case when t.user_id = v_eu then null else t.nome end;
    return;
  end if;
  if not p_pegar then
    return query select v_minha, false, null::text;
    return;
  end if;
  if v_estado <> 'pronta' or not privado.livro_editavel(v_livro) then raise exception 'livro_fechado'; end if;
  -- A sessão anterior (de outra pessoa, de outra tela ou parada há 2 min) vira versão.
  if v_tem and not v_minha then perform privado.guardar_versao(p_story); end if;
  insert into public.edit_locks (story_id, book_id, user_id, aba, nome, desde, expira_em)
    values (p_story, v_livro, v_eu, p_aba, privado.primeiro_nome(), now(),
            now() + make_interval(secs => privado.trava_edicao_s()))
  on conflict (story_id) do update set
    user_id = excluded.user_id, aba = excluded.aba, nome = excluded.nome,
    desde = case when v_minha then public.edit_locks.desde else now() end,
    expira_em = excluded.expira_em;
  return query select true, false, null::text;
end $$;

-- Salvamento automático. p_rev = o texto_rev que a tela viu; diferente = outra tela salvou antes.
-- Devolve o texto_rev novo.
create function public.salvar_historia(p_story uuid, p_aba uuid, p_rev integer, p_conteudo jsonb,
  p_marcacoes jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare v public.stories; v_eu uuid := (select auth.uid()); v_ok boolean; v_desde timestamptz;
  v_ultima timestamptz;
begin
  select e.editando into v_ok from public.editar_historia(p_story, p_aba, true, false) e;
  if not v_ok then raise exception 'trava_de_outro'; end if;
  select * into v from public.stories s where s.id = p_story for update;
  if v.texto_rev <> p_rev then raise exception 'texto_desatualizado'; end if;
  if not privado.conteudo_valido(p_conteudo) or not privado.marcacoes_validas(p_marcacoes) then
    raise exception 'dados_invalidos';
  end if;
  -- Texto pendente de outra pessoa (sessão que não fechou): vira versão antes.
  if v.texto_por is distinct from v_eu then perform privado.guardar_versao(p_story); end if;
  update public.stories set
    texto = p_conteudo, texto_marcacoes = p_marcacoes, texto_rev = texto_rev + 1,
    texto_por = v_eu, texto_origem = privado.origem_do_membro(v.book_id), texto_em = now(),
    titulo = nullif(left(btrim(p_conteudo ->> 'titulo'), 200), ''),
    ano = (p_conteudo ->> 'ano')::smallint
  where id = p_story;
  -- Edição longa: uma versão a cada 10 min, contados do início da sessão ou da última versão.
  select l.desde into v_desde from public.edit_locks l where l.story_id = p_story;
  select max(x.criado_em) into v_ultima from public.story_versions x where x.story_id = p_story;
  if now() - greatest(v_desde, coalesce(v_ultima, v_desde))
     >= make_interval(secs => privado.versao_a_cada_s()) then
    perform privado.guardar_versao(p_story);
  end if;
  return v.texto_rev + 1;
end $$;

-- Saiu da tela: guarda a sessão como versão e solta a trava.
create function public.parar_de_editar(p_story uuid, p_aba uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_livro uuid;
begin
  select s.book_id into v_livro from public.stories s where s.id = p_story for update;
  if not found or not privado.eh_membro(v_livro) then raise exception 'sem_permissao'; end if;
  if exists (select 1 from public.edit_locks l where l.story_id = p_story
               and l.user_id = (select auth.uid()) and l.aba = p_aba) then
    perform privado.guardar_versao(p_story);
    delete from public.edit_locks l where l.story_id = p_story;
  end if;
end $$;

-- Restaurar: o texto atual vira versão (nada se perde) e a versão escolhida volta como uma
-- versão nova, com restaurada_de. Devolve o texto_rev novo.
create function public.restaurar_versao(p_story uuid, p_aba uuid, p_numero integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare v public.stories; r public.story_versions; v_eu uuid := (select auth.uid()); v_ok boolean;
  v_num integer; v_origem public.versao_origem;
begin
  select e.editando into v_ok from public.editar_historia(p_story, p_aba, true, false) e;
  if not v_ok then raise exception 'trava_de_outro'; end if;
  select * into r from public.story_versions x where x.story_id = p_story and x.numero = p_numero;
  if not found then raise exception 'dados_invalidos'; end if;
  perform privado.guardar_versao(p_story);
  select * into v from public.stories s where s.id = p_story for update;
  v_origem := privado.origem_do_membro(v.book_id);
  select coalesce(max(x.numero), 0) + 1 into v_num from public.story_versions x where x.story_id = p_story;
  insert into public.story_versions (story_id, book_id, numero, origem, tamanho, conteudo, marcacoes,
    criado_por, restaurada_de)
    values (p_story, v.book_id, v_num, v_origem, r.tamanho, r.conteudo, r.marcacoes, v_eu, p_numero);
  update public.stories set
    texto = r.conteudo, texto_marcacoes = r.marcacoes, texto_rev = texto_rev + 1,
    versao_rev = texto_rev + 1, texto_por = v_eu, texto_origem = v_origem, texto_em = now(),
    titulo = nullif(left(btrim(coalesce(r.conteudo ->> 'titulo', '')), 200), ''),
    ano = case when jsonb_typeof(r.conteudo -> 'ano') = 'number' then (r.conteudo ->> 'ano')::smallint end
  where id = p_story;
  return v.texto_rev + 1;
end $$;

-- Marcar como pronta (ou voltar a rascunho). Não exige a trava: quem revisou pode marcar mesmo
-- com outra pessoa na tela. O texto pendente vira versão, para "pronta" apontar para uma.
create function public.marcar_historia_pronta(p_story uuid, p_pronta boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_livro uuid; v_estado public.story_estado;
begin
  select s.book_id, s.estado into v_livro, v_estado from public.stories s where s.id = p_story for update;
  if not found or not privado.eh_membro(v_livro) then raise exception 'sem_permissao'; end if;
  if v_estado <> 'pronta' or not privado.livro_editavel(v_livro) then raise exception 'livro_fechado'; end if;
  if p_pronta then perform privado.guardar_versao(p_story); end if;
  update public.stories set
    revisada_em = case when p_pronta then coalesce(revisada_em, now()) end,
    revisada_por = case when p_pronta then coalesce(revisada_por, (select auth.uid())) end
  where id = p_story;
  return p_pronta;
end $$;

revoke all on function public.editar_historia(uuid, uuid, boolean, boolean),
  public.salvar_historia(uuid, uuid, integer, jsonb, jsonb),
  public.parar_de_editar(uuid, uuid),
  public.restaurar_versao(uuid, uuid, integer),
  public.marcar_historia_pronta(uuid, boolean)
  from public, anon, authenticated, porta_autor, service_role;
grant execute on function public.editar_historia(uuid, uuid, boolean, boolean),
  public.salvar_historia(uuid, uuid, integer, jsonb, jsonb),
  public.parar_de_editar(uuid, uuid),
  public.restaurar_versao(uuid, uuid, integer),
  public.marcar_historia_pronta(uuid, boolean)
  to authenticated;
revoke all on function privado.trava_edicao_s(), privado.versao_a_cada_s(), privado.max_fotos_historia(),
  privado.max_paragrafos(), privado.max_letras_paragrafo(), privado.conteudo_valido(jsonb),
  privado.marcacoes_validas(jsonb), privado.primeiro_nome(), privado.origem_do_membro(uuid),
  privado.guardar_versao(uuid), privado.cota_fotos_historia()
  from public;
