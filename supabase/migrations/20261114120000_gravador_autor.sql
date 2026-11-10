-- 20261114120000_gravador_autor.sql
-- Prompt 5: gravador, link do autor e modo conversa. Estende recordings (5A); nunca recria.
-- stories e story_recordings ficam para o prompt 6 (decisão D1).
--
-- Regras deste arquivo:
-- * Toda função que recebe o token do autor tem dono porta_autor: o que ele não tem grant
--   (causos, enquete, family_access, family_messages) nenhuma função do autor alcança.
-- * Depois de validar o token, a função fixa ecoa.livro na transação; as políticas de
--   porta_autor só abrem linhas desse livro. Sem token válido, nada aparece.

-- ── 0. Permissão para transferir o dono (Supabase: postgres não é superusuário) ──
grant porta_autor to current_user with set true;
grant create on schema public, privado to porta_autor;

-- ── 1. Números de negócio (espelham lib/config.ts; config-banco.test.ts confere) ──
create function privado.max_gravacoes_autor_por_dia() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;
create function privado.max_bytes_autor_por_dia() returns bigint
language sql immutable set search_path = '' as $$ select 314572800::bigint $$;  -- 300 MB
create function privado.max_gravacao_s() returns integer
language sql immutable set search_path = '' as $$ select 1800 $$;              -- MAX_GRAVACAO_MIN = 30

-- ── 2. Link do autor: versão do segredo, como o da família (T25) ───────────
alter table public.author_access
  add column chave_versao smallint not null default 1 check (chave_versao between 1 and 99);
create trigger author_access_revogacao before update on public.author_access
  for each row execute function privado.revogacao_definitiva();
grant select (chave_versao) on public.author_access to authenticated;

-- ── 3. Consentimento do autor (LGPD): vale para o livro, não para o link ───
alter table public.books
  add column autor_consentimento_em timestamptz,
  add column autor_consentimento_versao smallint
    check (autor_consentimento_versao is null or autor_consentimento_versao between 1 and 99),
  add constraint books_consentimento_completo
    check ((autor_consentimento_em is null) = (autor_consentimento_versao is null));
-- authenticated já lê books inteiro; o update continua só nas colunas concedidas antes.

-- ── 4. Quem sugeriu, copiado do causo (o autor nunca lê causos: T5) ────────
alter table public.prompts
  add column sugestao_nome text check (sugestao_nome is null or char_length(sugestao_nome) between 1 and 80),
  add column sugestao_audio_caminho text check (
    sugestao_audio_caminho is null
    or sugestao_audio_caminho ~ ('^livros/' || book_id::text || '/causos/[0-9a-f-]{36}\.(webm|m4a|ogg)$'));

create function privado.copiar_sugestao() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.causo_id is null then
    new.sugestao_nome := null;
    new.sugestao_audio_caminho := null;
  elsif tg_op = 'INSERT' or new.causo_id is distinct from old.causo_id then
    select c.nome, case when c.audio_recebido_em is not null then c.audio_caminho end
      into new.sugestao_nome, new.sugestao_audio_caminho
    from public.causos c where c.book_id = new.book_id and c.id = new.causo_id;
  end if;
  return new;
end $$;
create trigger prompts_copiar_sugestao before insert or update of causo_id on public.prompts
  for each row execute function privado.copiar_sugestao();
-- Quem está logado não escreve estas colunas: os grants de insert e update são por coluna e não as incluem.

update public.prompts p set sugestao_nome = c.nome,
  sugestao_audio_caminho = case when c.audio_recebido_em is not null then c.audio_caminho end
from public.causos c where c.book_id = p.book_id and c.id = p.causo_id;

-- ── 5. recordings: quem gravou pelo link, lote e conversa em partes ────────
alter table public.recordings
  add column author_access_id uuid references public.author_access (id) on delete restrict,
  add column lote_id uuid,
  add constraint recordings_autor_tem_link
    check ((origem in ('autor', 'livre')) = (author_access_id is not null)),
  add constraint recordings_lote_tem_id check (origem <> 'lote' or lote_id is not null),
  add constraint recordings_lote_so_em_lote_ou_conversa check (lote_id is null or origem in ('lote', 'conversa'));
-- As 3 linhas de produção são 'upload', sem link e sem lote: passam nas três regras.

grant select (author_access_id, lote_id), insert (lote_id) on public.recordings to authenticated;
drop policy "membro cria com plano ativo" on public.recordings;
create policy "membro cria com plano ativo" on public.recordings for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id)
              and upload = 'enviando' and origem in ('upload', 'lote', 'conversa'));

-- Sem internet por dias: a janela de confirmação passa de 24 h para 7 dias.
create or replace function public.servico_confirmar_audio(p_id uuid, p_tamanho_bytes bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.recordings;
begin
  update public.recordings r set upload = 'recebido', recebido_em = now()
  where r.id = p_id and r.upload = 'enviando' and r.tamanho_bytes = p_tamanho_bytes
    and r.criado_em > now() - interval '7 days'
  returning * into v;
  if not found then return false; end if;
  if v.prompt_id is not null then
    update public.prompts set estado = 'respondida'
    where book_id = v.book_id and id = v.prompt_id and estado in ('para_enviar', 'enviada');
  end if;
  return true;
end $$;

-- ── 6. Privilégios e políticas de porta_autor ──────────────────────────────
create function privado.livro_do_autor_atual() returns uuid
language sql stable set search_path = '' as $$
  select nullif(current_setting('ecoa.livro', true), '')::uuid
$$;

grant usage on schema public, privado to porta_autor;
grant execute on function privado.livro_editavel(uuid), privado.livro_do_autor_atual(),
  privado.max_gravacoes_autor_por_dia(), privado.max_bytes_autor_por_dia(),
  privado.max_gravacao_s(), privado.max_audio_bytes() to porta_autor;
grant select (id, book_id, token_hash, revogado_em) on public.author_access to porta_autor;
grant select (id, autor_nome, autor_apelido, autor_consentimento_em),
  update (autor_consentimento_em, autor_consentimento_versao) on public.books to porta_autor;
grant select (id, book_id, tipo, texto, estado, photo_id, sugestao_nome, sugestao_audio_caminho,
  enviada_em, ordem) on public.prompts to porta_autor;
grant select (id, book_id, caminho) on public.photos to porta_autor;
grant select (id, book_id, origem, upload, caminho, tamanho_bytes, criado_em, author_access_id),
  insert (id, book_id, origem, prompt_id, nome_arquivo, caminho, content_type, tamanho_bytes,
  duracao_s, author_access_id, criado_por) on public.recordings to porta_autor;

-- A busca pelo hash é a própria autenticação: é a única política sem filtro de livro.
create policy "porta do autor" on public.author_access for select to porta_autor using (true);
create policy "porta do autor" on public.books for select to porta_autor
  using (id = privado.livro_do_autor_atual());
create policy "porta do autor consente" on public.books for update to porta_autor
  using (id = privado.livro_do_autor_atual()) with check (id = privado.livro_do_autor_atual());
create policy "porta do autor" on public.prompts for select to porta_autor
  using (book_id = privado.livro_do_autor_atual() and estado = 'enviada');
create policy "porta do autor" on public.photos for select to porta_autor
  using (book_id = privado.livro_do_autor_atual());
create policy "porta do autor" on public.recordings for select to porta_autor
  using (book_id = privado.livro_do_autor_atual() and author_access_id is not null);
create policy "porta do autor grava" on public.recordings for insert to porta_autor
  with check (book_id = privado.livro_do_autor_atual() and author_access_id is not null
              and upload = 'enviando' and origem in ('autor', 'livre'));

-- ── 7. Portas do autor ─────────────────────────────────────────────────────
-- Valida o token e fixa o livro na transação. Sem linha = link inválido ou trocado.
create function privado.acesso_do_autor(p_token text) returns table (acesso_id uuid, livro_id uuid)
language plpgsql security definer set search_path = '' as $$
declare v_acesso uuid; v_livro uuid;
begin
  if p_token is null or octet_length(p_token) not between 16 and 128 then return; end if;
  select a.id, a.book_id into v_acesso, v_livro from public.author_access a
  where a.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex') and a.revogado_em is null;
  if v_acesso is null then return; end if;
  perform set_config('ecoa.livro', v_livro::text, true);
  acesso_id := v_acesso; livro_id := v_livro;
  return next;
end $$;

-- O que /a/[token] mostra. null = link inválido ou trocado.
create function public.autor_pagina(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_livro uuid; b record;
begin
  select livro_id into v_livro from privado.acesso_do_autor(p_token);
  if v_livro is null then return null; end if;
  select autor_nome, autor_apelido, autor_consentimento_em into b from public.books where id = v_livro;
  return jsonb_build_object(
    'nome', coalesce(b.autor_apelido, b.autor_nome),
    'consentiu', b.autor_consentimento_em is not null,
    'aberto', privado.livro_editavel(v_livro),
    'perguntas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'tipo', p.tipo, 'texto', p.texto,
        'foto', f.caminho, 'sugestao_nome', p.sugestao_nome, 'sugestao_audio', p.sugestao_audio_caminho)
        order by p.enviada_em desc, p.ordem)
      from public.prompts p left join public.photos f on f.book_id = p.book_id and f.id = p.photo_id
      where p.book_id = v_livro and p.estado = 'enviada'), '[]'::jsonb));
end $$;

create function public.autor_consentir(p_token text, p_versao smallint) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_livro uuid;
begin
  select livro_id into v_livro from privado.acesso_do_autor(p_token);
  if v_livro is null or p_versao is null or p_versao not between 1 and 99 then return false; end if;
  update public.books set autor_consentimento_em = now(), autor_consentimento_versao = p_versao
  where id = v_livro and autor_consentimento_em is null;
  return true;
end $$;

-- Cria a linha "enviando" com caminho fixo. O id vem do aparelho (o mesmo da gravação local):
-- repetir depois de uma queda de rede devolve a mesma linha; linha vencida pede id novo.
create function public.autor_preparar_gravacao(
  p_token text, p_id uuid, p_prompt uuid, p_ext text, p_tamanho_bytes bigint, p_duracao_s integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_acesso uuid; v_livro uuid; v_caminho text; v record;
begin
  select acesso_id, livro_id into v_acesso, v_livro from privado.acesso_do_autor(p_token);
  if v_livro is null then raise exception 'link_invalido'; end if;
  if p_id is null or p_ext is null or p_ext not in ('webm', 'm4a')
     or p_duracao_s is null or p_duracao_s not between 1 and privado.max_gravacao_s() + 60
     or p_tamanho_bytes is null or p_tamanho_bytes not between 1 and privado.max_audio_bytes()
     or p_tamanho_bytes > p_duracao_s::bigint * 20000 + 65536 then   -- até 160 kbps
    raise exception 'dados_invalidos';
  end if;
  if not exists (select 1 from public.books where id = v_livro and autor_consentimento_em is not null) then
    raise exception 'sem_consentimento';
  end if;
  if not privado.livro_editavel(v_livro) then raise exception 'livro_fechado'; end if;

  -- Uma fila por livro: a busca, os tetos e o insert não correm em paralelo.
  perform pg_advisory_xact_lock(hashtextextended('gravacoes_autor:' || v_livro::text, 0));

  -- A política só mostra gravações do autor deste livro; um id de outro livro não aparece
  -- aqui e cai no unique_violation do insert, tratado no fim.
  select r.upload, r.caminho, r.criado_em into v from public.recordings r
  where r.id = p_id and r.book_id = v_livro and r.author_access_id is not null;
  if found then
    if v.upload = 'recebido' then
      return jsonb_build_object('id', p_id, 'caminho', v.caminho, 'recebida', true);
    end if;
    if v.criado_em <= now() - interval '7 days' then raise exception 'gravacao_expirada'; end if;
    return jsonb_build_object('id', p_id, 'caminho', v.caminho, 'recebida', false);
  end if;

  if p_prompt is not null and not exists (
    select 1 from public.prompts where book_id = v_livro and id = p_prompt and estado = 'enviada') then
    raise exception 'pergunta_invalida';
  end if;
  if (select count(*) from public.recordings r where r.book_id = v_livro and r.author_access_id is not null
      and r.criado_em > now() - interval '1 day') >= privado.max_gravacoes_autor_por_dia()
     or (select coalesce(sum(r.tamanho_bytes), 0) from public.recordings r where r.book_id = v_livro
      and r.author_access_id is not null and r.criado_em > now() - interval '1 day')
        + p_tamanho_bytes > privado.max_bytes_autor_por_dia()
     or (select count(*) from public.recordings r where r.book_id = v_livro and r.author_access_id is not null
      and r.upload = 'enviando' and r.criado_em > now() - interval '7 days') >= 5 then
    raise exception 'limite_gravacoes';
  end if;

  v_caminho := 'livros/' || v_livro::text || '/audios/' || p_id::text || '.' || p_ext;
  insert into public.recordings (id, book_id, origem, prompt_id, nome_arquivo, caminho, content_type,
    tamanho_bytes, duracao_s, author_access_id, criado_por)
  values (p_id, v_livro, (case when p_prompt is null then 'livre' else 'autor' end)::public.recording_origem,
    p_prompt, 'gravacao.' || p_ext, v_caminho,
    case p_ext when 'm4a' then 'audio/mp4' else 'audio/webm' end,
    p_tamanho_bytes, p_duracao_s, v_acesso, null);
  return jsonb_build_object('id', p_id, 'caminho', v_caminho, 'recebida', false);
exception when unique_violation then
  raise exception 'dados_invalidos';
end $$;

-- Só o servidor: caminho a assinar, só se a gravação for do livro do token.
create function public.servico_caminho_gravacao_autor(p_token text, p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare v_livro uuid; v_caminho text;
begin
  select livro_id into v_livro from privado.acesso_do_autor(p_token);
  if v_livro is null then return null; end if;
  select r.caminho into v_caminho from public.recordings r
  where r.id = p_id and r.book_id = v_livro and r.author_access_id is not null
    and r.upload = 'enviando' and r.criado_em > now() - interval '7 days';
  return v_caminho;
end $$;

-- Só o servidor, depois de conferir o objeto no Storage. Confere o token antes de confirmar.
-- Dono postgres (não porta_autor): marca a pergunta como respondida, o que o autor não faz direto.
create function public.servico_confirmar_gravacao_autor(p_token text, p_id uuid, p_tamanho_bytes bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v_livro uuid;
begin
  select livro_id into v_livro from privado.acesso_do_autor(p_token);
  if v_livro is null or not exists (
    select 1 from public.recordings r where r.id = p_id and r.book_id = v_livro and r.author_access_id is not null) then
    return false;
  end if;
  return public.servico_confirmar_audio(p_id, p_tamanho_bytes);
end $$;

-- Gera ou troca o link do autor (servidor, depois de conferir o membro). O antigo para na hora.
create function public.servico_trocar_link_autor(
  p_livro uuid, p_usuario uuid, p_id uuid, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.book_members m where m.book_id = p_livro and m.user_id = p_usuario) then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then raise exception 'livro_fechado'; end if;
  update public.author_access set revogado_em = now() where book_id = p_livro and revogado_em is null;
  insert into public.author_access (id, book_id, token_hash, chave_versao, criado_por)
  values (p_id, p_livro, p_token_hash, p_chave_versao, p_usuario);
end $$;

-- ── 8. Donos e execução ────────────────────────────────────────────────────
alter function privado.acesso_do_autor(text) owner to porta_autor;
alter function public.autor_pagina(text) owner to porta_autor;
alter function public.autor_consentir(text, smallint) owner to porta_autor;
alter function public.autor_preparar_gravacao(text, uuid, uuid, text, bigint, integer) owner to porta_autor;
alter function public.servico_caminho_gravacao_autor(text, uuid) owner to porta_autor;
revoke create on schema public, privado from porta_autor;

revoke all on function privado.acesso_do_autor(text), public.autor_pagina(text),
  public.autor_consentir(text, smallint),
  public.autor_preparar_gravacao(text, uuid, uuid, text, bigint, integer),
  public.servico_caminho_gravacao_autor(text, uuid),
  public.servico_confirmar_gravacao_autor(text, uuid, bigint),
  public.servico_trocar_link_autor(uuid, uuid, uuid, text, smallint)
  from public, anon, authenticated;
grant execute on function privado.acesso_do_autor(text) to porta_autor;
grant execute on function public.autor_pagina(text), public.autor_consentir(text, smallint),
  public.autor_preparar_gravacao(text, uuid, uuid, text, bigint, integer) to anon;
grant execute on function public.servico_caminho_gravacao_autor(text, uuid),
  public.servico_confirmar_gravacao_autor(text, uuid, bigint),
  public.servico_trocar_link_autor(uuid, uuid, uuid, text, smallint) to service_role;
