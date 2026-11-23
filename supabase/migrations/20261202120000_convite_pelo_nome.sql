-- Convite pelo nome (P81, T59): o convidado define o próprio e-mail pelo link.

-- 1. Tabela
alter table public.book_invites alter column email drop not null;
alter table public.book_invites drop constraint book_invites_email_check;
alter table public.book_invites
  add constraint book_invites_email_check check (
    email is null or (email = lower(btrim(email)) and char_length(email) between 6 and 254
                      and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')),
  add column nome text check (nome is null or (nome = btrim(nome) and char_length(nome) between 1 and 30)),
  add column email_trocas smallint not null default 0 check (email_trocas between 0 and 10),
  add column email_definido_em timestamptz,
  add column dono_hash text check (dono_hash is null or dono_hash ~ '^[0-9a-f]{64}$'),
  add constraint book_invites_quem check (email is not null or nome is not null),
  add constraint book_invites_aceito_com_email check (aceito_em is null or email is not null);
create index book_invites_email_definido on public.book_invites (email, email_definido_em desc)
  where email_definido_em is not null;

-- O responsável lê nome e quando foi definido; dono_hash e email_trocas, nunca.
grant select (nome, email_definido_em) on public.book_invites to authenticated;

create function privado.convite_trocas_email() returns smallint
language sql immutable set search_path = '' as $$ select 3::smallint $$;

-- 2. Aceitar: e-mail nulo não pode passar (antes, `<>` com NULL não disparava).
create or replace function public.aceitar_convite(p_convite uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  i record;
  v_email text;
begin
  select lower(u.email) into v_email from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
  if v_email is null then raise exception 'sem_permissao'; end if;
  select * into i from public.book_invites x where x.id = p_convite;
  if i.id is null or i.email is distinct from v_email then raise exception 'convite_invalido'; end if;
  perform 1 from public.books b where b.id = i.book_id for update;
  select * into i from public.book_invites x where x.id = p_convite for update;
  if i.email is distinct from v_email then raise exception 'convite_invalido'; end if;
  if i.aceito_em is not null and i.aceito_por = (select auth.uid()) then return i.book_id; end if;
  if not privado.convite_valido(i.id) then raise exception 'convite_invalido'; end if;
  if not privado.livro_editavel(i.book_id) then raise exception 'livro_fechado'; end if;
  if not exists (select 1 from public.book_members m
                 where m.book_id = i.book_id and m.user_id = (select auth.uid())) then
    if (select count(*) from public.book_members m
        where m.book_id = i.book_id and m.papel = 'cofacilitador') >= privado.max_cofacilitadores() then
      raise exception 'limite_cofacilitadores';
    end if;
    insert into public.book_members (book_id, user_id, papel)
    values (i.book_id, (select auth.uid()), 'cofacilitador');
    insert into public.events (book_id, ator_tipo, ator_id, acao, detalhes)
    values (i.book_id, 'cofacilitador', (select auth.uid()), 'convite_aceito',
            jsonb_build_object('convite_id', i.id));
  end if;
  update public.book_invites set aceito_em = now(), aceito_por = (select auth.uid()) where id = i.id;
  return i.book_id;
end $$;

-- 3. Criar pelo nome: as regras de conferir_convite sem as do e-mail.
create function privado.conferir_convite_nome(p_livro uuid, p_usuario uuid, p_nome text) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.book_members m
                 where m.book_id = p_livro and m.user_id = p_usuario and m.papel = 'responsavel') then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then raise exception 'livro_fechado'; end if;
  if p_nome is null or p_nome <> btrim(p_nome) or char_length(p_nome) not between 1 and 30 then
    raise exception 'dados_invalidos';
  end if;
  if (select count(*) from public.book_invites i
      where i.book_id = p_livro and i.criado_em > now() - interval '24 hours') >= privado.max_convites_dia()
     or (select count(*) from public.book_invites i
         where i.criado_por = p_usuario and i.criado_em > now() - interval '24 hours') >= privado.max_convites_dia() then
    raise exception 'limite_convites';
  end if;
  if (select count(*) from public.book_members m where m.book_id = p_livro and m.papel = 'cofacilitador')
     + (select count(*) from public.book_invites i where i.book_id = p_livro
          and i.aceito_em is null and i.revogado_em is null and i.expira_em > now())
     >= privado.max_cofacilitadores() then
    raise exception 'limite_cofacilitadores';
  end if;
end $$;

create function public.servico_criar_convite_nome(
  p_livro uuid, p_usuario uuid, p_id uuid, p_nome text, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.books b where b.id = p_livro for update;
  perform privado.conferir_convite_nome(p_livro, p_usuario, p_nome);
  insert into public.book_invites (id, book_id, nome, token_hash, chave_versao, criado_por, expira_em)
  values (p_id, p_livro, p_nome, p_token_hash, p_chave_versao, p_usuario,
          now() + make_interval(days => privado.convite_validade_dias()));
end $$;

-- 4. O convidado define (ou corrige) o próprio e-mail.
-- Devolve 'definir' | 'mesmo' | 'ignorar'; 'ignorar' cobre quem já está no livro.
create function privado.conferir_email_convite(p_convite uuid, p_email text, p_dono_hash text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  i public.book_invites;
begin
  select * into i from public.book_invites x where x.id = p_convite;
  if i.id is null or i.nome is null or not privado.convite_valido(i.id) then
    raise exception 'convite_invalido';
  end if;
  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     or char_length(p_email) not between 6 and 254 then
    raise exception 'dados_invalidos';
  end if;
  if i.email = p_email then return 'mesmo'; end if;
  if i.email is not null then  -- correção: só o aparelho dono, até o limite
    if p_dono_hash is null or i.dono_hash is distinct from p_dono_hash then
      raise exception 'convite_em_uso';
    end if;
    if i.email_trocas >= privado.convite_trocas_email() then raise exception 'limite_trocas_email'; end if;
  end if;
  if exists (select 1 from public.book_members m join auth.users u on u.id = m.user_id
             where m.book_id = i.book_id and lower(u.email) = p_email) then
    return 'ignorar';
  end if;
  if (select count(*) from public.book_invites x
      where x.email = p_email and x.email_definido_em > now() - interval '24 hours')
     >= privado.max_convites_por_email_dia() then
    raise exception 'limite_convites';
  end if;
  return 'definir';
end $$;

create function public.servico_pode_definir_email(p_token_hash text, p_email text, p_dono_hash text)
returns text language plpgsql stable security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'convite_invalido'; end if;
  select x.id into v_id from public.book_invites x where x.token_hash = p_token_hash;
  return privado.conferir_email_convite(v_id, lower(btrim(p_email)), p_dono_hash);
end $$;

-- Grava o e-mail. Na primeira definição, p_dono_hash vira o dono; nas correções, tem de bater.
create function privado.gravar_email_convite(p_convite uuid, p_email text, p_dono_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  i public.book_invites;
  v_r text;
begin
  select * into i from public.book_invites x where x.id = p_convite;
  v_r := privado.conferir_email_convite(i.id, p_email, p_dono_hash);
  if v_r <> 'definir' then return v_r; end if;
  -- O pendente mais antigo do mesmo e-mail no mesmo livro cai: vale o mais novo.
  update public.book_invites set revogado_em = now()
  where book_id = i.book_id and id <> i.id and email = p_email and aceito_em is null and revogado_em is null;
  update public.book_invites
  set email = p_email,
      email_definido_em = now(),
      email_trocas = email_trocas + case when i.email is null then 0 else 1 end,
      dono_hash = coalesce(i.dono_hash, p_dono_hash)
  where id = i.id;
  insert into public.events (book_id, ator_tipo, ator_id, acao, detalhes)
  values (i.book_id, 'sistema', null, 'convite_email_definido', jsonb_build_object('convite_id', i.id));
  return 'definir';
end $$;

create function public.servico_definir_email_convite(p_token_hash text, p_email text, p_dono_hash text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  i public.book_invites;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'convite_invalido'; end if;
  if p_dono_hash is null or p_dono_hash !~ '^[0-9a-f]{64}$' then raise exception 'dados_invalidos'; end if;
  select * into i from public.book_invites x where x.token_hash = p_token_hash;
  if i.id is null then raise exception 'convite_invalido'; end if;
  perform 1 from public.books b where b.id = i.book_id for update;
  perform 1 from public.book_invites x where x.id = i.id for update;
  return privado.gravar_email_convite(i.id, lower(btrim(p_email)), p_dono_hash);
end $$;

-- 5. Com sessão: define (se preciso) e aceita na mesma transação. O e-mail vem da sessão.
create function public.definir_e_aceitar_convite(p_token_hash text, p_dono_hash text default null)
returns table (livro_id uuid, definiu boolean)  -- sem `book_id`: OUT params colidem com colunas
language plpgsql security definer set search_path = '' as $$
declare
  i public.book_invites;
  v_email text;
  v_r text;
begin
  select lower(u.email) into v_email from auth.users u
  where u.id = (select auth.uid()) and u.email_confirmed_at is not null;
  if v_email is null then raise exception 'sem_permissao'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'convite_invalido'; end if;
  select * into i from public.book_invites x where x.token_hash = p_token_hash;
  if i.id is null then raise exception 'convite_invalido'; end if;
  perform 1 from public.books b where b.id = i.book_id for update;
  perform 1 from public.book_invites x where x.id = i.id for update;
  v_r := 'mesmo';
  if i.nome is not null and i.email is distinct from v_email then
    v_r := privado.gravar_email_convite(i.id, v_email, p_dono_hash);
    if v_r = 'ignorar' then  -- já é membro: nada a aceitar
      return query select i.book_id, false;
      return;
    end if;
  end if;
  return query select public.aceitar_convite(i.id), v_r = 'definir';
end $$;

-- 6. Leitura da página: muda o retorno, então drop e create.
drop function public.servico_ler_convite(text);
create function public.servico_ler_convite(p_token_hash text, p_dono_hash text default null)
returns table (convite_id uuid, book_id uuid, email text, nome text, autor text, criado_por uuid,
               estado text, email_definido boolean, trocas_restantes smallint, e_dono boolean)
language sql stable security definer set search_path = '' as $$
  select i.id, i.book_id, i.email, i.nome, coalesce(nullif(btrim(b.autor_apelido), ''), b.autor_nome),
         i.criado_por,
         case when i.aceito_em is not null then 'aceito'
              when privado.convite_valido(i.id) then 'pendente'
              else 'vencido' end,
         i.email is not null,
         greatest(privado.convite_trocas_email() - i.email_trocas, 0)::smallint,
         i.dono_hash is not null and p_dono_hash is not null and i.dono_hash = p_dono_hash
  from public.book_invites i join public.books b on b.id = i.book_id
  where p_token_hash ~ '^[0-9a-f]{64}$' and i.token_hash = p_token_hash
$$;

-- 7. Privilégios
revoke all on function privado.convite_trocas_email(), privado.conferir_convite_nome(uuid, uuid, text),
  privado.conferir_email_convite(uuid, text, text), privado.gravar_email_convite(uuid, text, text)
from public, anon, authenticated;
revoke all on function public.servico_criar_convite_nome(uuid, uuid, uuid, text, text, smallint),
  public.servico_pode_definir_email(text, text, text), public.servico_definir_email_convite(text, text, text),
  public.servico_ler_convite(text, text), public.definir_e_aceitar_convite(text, text)
from public, anon, authenticated;
grant execute on function public.servico_criar_convite_nome(uuid, uuid, uuid, text, text, smallint),
  public.servico_pode_definir_email(text, text, text), public.servico_definir_email_convite(text, text, text),
  public.servico_ler_convite(text, text)
to service_role;
grant execute on function public.definir_e_aceitar_convite(text, text) to authenticated;
-- Convite por e-mail pelo responsável sai de uso (P81).
revoke execute on function public.servico_pode_convidar(uuid, uuid, text),
  public.servico_criar_convite(uuid, uuid, uuid, text, text, smallint)
from service_role;
