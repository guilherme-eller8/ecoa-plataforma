-- Reverter o app antes. Apaga os convites pelo nome que não chegaram a ter e-mail
-- (pendentes, vencidos ou cancelados); os aceitos ficam, sem o nome.
grant execute on function public.servico_pode_convidar(uuid, uuid, text),
  public.servico_criar_convite(uuid, uuid, uuid, text, text, smallint)
to service_role;

drop function public.servico_ler_convite(text, text);
create function public.servico_ler_convite(p_token_hash text)
returns table (convite_id uuid, book_id uuid, email text, autor text, criado_por uuid, estado text)
language sql stable security definer set search_path = '' as $$
  select i.id, i.book_id, i.email, coalesce(nullif(btrim(b.autor_apelido), ''), b.autor_nome),
         i.criado_por,
         case when i.aceito_em is not null then 'aceito'
              when privado.convite_valido(i.id) then 'pendente'
              else 'vencido' end
  from public.book_invites i join public.books b on b.id = i.book_id
  where p_token_hash ~ '^[0-9a-f]{64}$' and i.token_hash = p_token_hash
$$;
revoke all on function public.servico_ler_convite(text) from public, anon, authenticated;
grant execute on function public.servico_ler_convite(text) to service_role;

drop function public.definir_e_aceitar_convite(text, text);
drop function public.servico_definir_email_convite(text, text, text);
drop function privado.gravar_email_convite(uuid, text, text);
drop function public.servico_pode_definir_email(text, text, text);
drop function privado.conferir_email_convite(uuid, text, text);
drop function public.servico_criar_convite_nome(uuid, uuid, uuid, text, text, smallint);
drop function privado.conferir_convite_nome(uuid, uuid, text);
drop function privado.convite_trocas_email();

-- aceitar_convite volta ao texto de 20261121120000_cofacilitadores.sql.
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
  if i.id is null or i.email <> v_email then raise exception 'convite_invalido'; end if;
  perform 1 from public.books b where b.id = i.book_id for update;
  select * into i from public.book_invites x where x.id = p_convite for update;
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

delete from public.events where acao = 'convite_email_definido';
delete from public.book_invites where email is null;
drop index public.book_invites_email_definido;
revoke select (nome, email_definido_em) on public.book_invites from authenticated;
alter table public.book_invites
  drop constraint book_invites_aceito_com_email,
  drop constraint book_invites_quem,
  drop column dono_hash,
  drop column email_definido_em,
  drop column email_trocas,
  drop column nome;
alter table public.book_invites drop constraint book_invites_email_check;
alter table public.book_invites
  add constraint book_invites_email_check check (email = lower(btrim(email)) and char_length(email) between 6 and 254
                                                 and email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');
alter table public.book_invites alter column email set not null;
