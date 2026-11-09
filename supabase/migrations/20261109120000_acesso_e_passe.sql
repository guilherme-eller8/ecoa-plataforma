-- 20261109120000_acesso_e_passe.sql
-- Livros, membros, link do autor e registro de eventos, com RLS.
-- Admin não lê pelo banco com a própria sessão: o servidor confere o papel e usa a chave secreta.

-- Funções auxiliares ficam fora do schema exposto pela API.
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated, service_role;
-- Função nova nasce sem EXECUTE para PUBLIC (padrão do Postgres). O ajuste por schema não
-- consegue tirar o padrão global, por isso a revogação é global para o dono das migrations.
-- Em public, o Supabase continua concedendo a anon/authenticated: cada função revoga à mão.
alter default privileges revoke execute on functions from public;

create type public.passe_estado as enum ('pendente', 'ativo', 'somente_leitura');
create type public.papel_membro as enum ('responsavel', 'cofacilitador');
create type public.ator_tipo as enum ('responsavel', 'cofacilitador', 'autor', 'familia', 'admin', 'sistema');

create table public.books (
  id uuid primary key default gen_random_uuid(),
  autor_nome text check (autor_nome is null or char_length(btrim(autor_nome)) between 1 and 120),
  passe_estado public.passe_estado not null default 'pendente',
  passe_ativado_em timestamptz,
  passe_vence_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint books_passe_datas check (
    passe_estado = 'pendente'
    or (passe_ativado_em is not null and passe_vence_em > passe_ativado_em)
  )
);

create table public.book_members (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  papel public.papel_membro not null,
  criado_em timestamptz not null default now(),
  unique (book_id, user_id)
);
create unique index book_members_um_responsavel on public.book_members (book_id) where papel = 'responsavel';
create index book_members_usuario on public.book_members (user_id);

create table public.author_access (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null,
  revogado_em timestamptz
);
create unique index author_access_um_ativo on public.author_access (book_id) where revogado_em is null;

-- detalhes: só ids e números. Nunca e-mail, nome ou texto livre.
create table public.events (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  book_id uuid references public.books (id) on delete set null,
  ator_tipo public.ator_tipo not null,
  ator_id uuid,
  acao text not null check (acao ~ '^[a-z_]{2,40}$'),
  detalhes jsonb not null default '{}'::jsonb
);
create index events_livro_data on public.events (book_id, criado_em desc);
create index events_ator_data on public.events (ator_id, criado_em desc);

-- atualizado_em automático
create function privado.tocar_atualizado_em() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end $$;
create trigger books_atualizado_em before update on public.books
  for each row execute function privado.tocar_atualizado_em();

create function privado.eh_membro(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.book_members m
    where m.book_id = p_book and m.user_id = (select auth.uid())
  )
$$;

-- Ativo e dentro do prazo. Vale mesmo se o job diário atrasar.
-- Toda escrita feita com a chave secreta precisa chamar esta função explicitamente.
create function privado.livro_editavel(p_book uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.books b
    where b.id = p_book and b.passe_estado = 'ativo' and b.passe_vence_em > now()
  )
$$;

revoke all on all functions in schema privado from public;
grant execute on function privado.eh_membro(uuid), privado.livro_editavel(uuid) to authenticated, service_role;

-- RLS em toda tabela
alter table public.books enable row level security;
alter table public.book_members enable row level security;
alter table public.author_access enable row level security;
alter table public.events enable row level security;

-- O Supabase concede tudo a anon/authenticated por padrão. Aqui só o necessário.
revoke all on public.books, public.book_members, public.author_access, public.events from anon, authenticated;
grant select on public.books to authenticated;
grant update (autor_nome) on public.books to authenticated;
grant select on public.book_members to authenticated;
grant select (id, book_id, criado_em, criado_por, revogado_em) on public.author_access to authenticated;
grant all on public.books, public.book_members, public.author_access, public.events to service_role;
-- events: nenhuma permissão para anon/authenticated. Só o servidor lê e grava.

create policy "membro lê o livro" on public.books
  for select to authenticated
  using (privado.eh_membro(id));

create policy "membro edita o livro com passe ativo" on public.books
  for update to authenticated
  using (privado.eh_membro(id) and privado.livro_editavel(id))
  with check (privado.eh_membro(id) and privado.livro_editavel(id));

create policy "membro lê os membros do livro" on public.book_members
  for select to authenticated
  using (privado.eh_membro(book_id));

create policy "membro lê o link do autor do livro" on public.author_access
  for select to authenticated
  using (privado.eh_membro(book_id));

-- Operações do admin: atômicas, só pelo servidor (service_role).
create function public.admin_ativar_passe(p_responsavel uuid, p_autor_nome text, p_meses integer)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
begin
  if p_meses is null or p_meses not between 1 and 36 then
    raise exception 'meses fora do intervalo: %', p_meses;
  end if;
  insert into public.books (autor_nome, passe_estado, passe_ativado_em, passe_vence_em)
  values (nullif(btrim(p_autor_nome), ''), 'ativo', now(), now() + make_interval(months => p_meses))
  returning id into v_livro;
  insert into public.book_members (book_id, user_id, papel)
  values (v_livro, p_responsavel, 'responsavel');
  return v_livro;
end $$;

-- Renovar soma a partir do maior entre hoje e o vencimento atual: renovar cedo não perde dias.
create function public.admin_renovar_passe(p_livro uuid, p_meses integer)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_vence timestamptz;
begin
  if p_meses is null or p_meses not between 1 and 36 then
    raise exception 'meses fora do intervalo: %', p_meses;
  end if;
  update public.books
  set passe_estado = 'ativo',
      passe_ativado_em = coalesce(passe_ativado_em, now()),
      passe_vence_em = greatest(now(), coalesce(passe_vence_em, now())) + make_interval(months => p_meses)
  where id = p_livro
  returning passe_vence_em into v_vence;
  if v_vence is null then
    raise exception 'livro não encontrado: %', p_livro;
  end if;
  return v_vence;
end $$;

-- Troca o responsável (e-mail digitado errado na ativação).
create function public.admin_trocar_responsavel(p_livro uuid, p_novo uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.book_members where book_id = p_livro and papel = 'responsavel';
  insert into public.book_members (book_id, user_id, papel) values (p_livro, p_novo, 'responsavel')
  on conflict (book_id, user_id) do update set papel = 'responsavel';
end $$;

create function public.admin_usuario_por_email(p_email text)
returns uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u where lower(u.email) = lower(btrim(p_email)) limit 1
$$;

create function public.admin_listar_livros()
returns table (
  id uuid,
  autor_nome text,
  passe_estado public.passe_estado,
  passe_vence_em timestamptz,
  criado_em timestamptz,
  responsavel_email text
)
language sql stable security definer set search_path = '' as $$
  select b.id, b.autor_nome, b.passe_estado, b.passe_vence_em, b.criado_em, u.email::text
  from public.books b
  left join public.book_members m on m.book_id = b.id and m.papel = 'responsavel'
  left join auth.users u on u.id = m.user_id
  order by b.criado_em desc
$$;

revoke all on function
  public.admin_ativar_passe(uuid, text, integer),
  public.admin_renovar_passe(uuid, integer),
  public.admin_trocar_responsavel(uuid, uuid),
  public.admin_usuario_por_email(text),
  public.admin_listar_livros()
  from public, anon, authenticated;
grant execute on function
  public.admin_ativar_passe(uuid, text, integer),
  public.admin_renovar_passe(uuid, integer),
  public.admin_trocar_responsavel(uuid, uuid),
  public.admin_usuario_por_email(text),
  public.admin_listar_livros()
  to service_role;
