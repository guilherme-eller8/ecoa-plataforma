-- 20261121120000_mensagens_familia.sql
-- Prompt 12: mensagens da família para o livro. Design: docs/designs/mensagens-familia.md.
--
-- Regras deste arquivo:
-- * O link /m/{token} é só de escrita: quem tem o link cria a própria mensagem e não lê nada,
--   nem as mensagens dos outros, nem a lista. O rascunho fica preso ao aparelho (cookie da
--   rota /m, guardado como hash por livro) e só o servidor devolve a transcrição a ele.
-- * family_messages continua fechada para anon e porta_autor (política restritiva do prompt
--   10, intocada). O membro lê só mensagens enviadas do próprio livro, por colunas, sem o hash
--   do aparelho nem a transcrição bruta.
-- * Mensagem enviada nunca é apagada nem volta a rascunho, nem pela chave secreta. O texto que a
--   pessoa enviou (texto_enviado) e a transcrição (transcricao) são gravados uma vez. Só o
--   rascunho não enviado é apagado, pela limpeza (48 h).
-- * Nenhum grant novo para porta_autor.

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.max_mensagens_por_hora() returns integer
language sql immutable set search_path = '' as $$ select 20 $$;   -- MAX_MENSAGENS_POR_HORA, por livro
create function privado.max_mensagens_por_dia() returns integer
language sql immutable set search_path = '' as $$ select 40 $$;   -- MAX_MENSAGENS_POR_DIA, por livro
create function privado.max_mensagem_audio_s() returns integer
language sql immutable set search_path = '' as $$ select 310 $$;  -- MAX_MENSAGEM_AUDIO_MIN = 5, + 10 s
create function privado.max_mensagem_caracteres() returns integer
language sql immutable set search_path = '' as $$ select 6000 $$; -- MAX_MENSAGEM_CARACTERES
create function privado.max_transcricoes_por_mensagem() returns integer
language sql immutable set search_path = '' as $$ select 3 $$;    -- MAX_TRANSCRICOES_POR_MENSAGEM
create function privado.mensagem_rascunho_dura_h() returns integer
language sql immutable set search_path = '' as $$ select 48 $$;   -- MENSAGEM_RASCUNHO_DURA_H

-- A tabela nasceu vazia no prompt 10 e nada escreveu nela. As colunas novas são not null.
do $$ begin
  if exists (select 1 from public.family_messages) then
    raise exception 'family_messages_nao_vazia';
  end if;
end $$;

-- ── 1. Link de mensagens (um ativo por livro, como o da família) ───────────
-- Só o hash do token. O servidor deriva o token de id e chave_versao (HMAC, tipo "mensagem").
create table public.message_access (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  chave_versao smallint not null default 1 check (chave_versao between 1 and 99),
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null,
  revogado_em timestamptz,
  unique (book_id, id)
);
create unique index message_access_um_ativo on public.message_access (book_id) where revogado_em is null;
create trigger message_access_revogacao before update on public.message_access
  for each row execute function privado.revogacao_definitiva();

alter table public.message_access enable row level security;
revoke all on public.message_access from public, anon, authenticated, porta_autor, service_role;
grant all on public.message_access to service_role;
grant select (id, book_id, chave_versao, criado_em, criado_por, revogado_em)
  on public.message_access to authenticated;
create policy "membro lê" on public.message_access for select to authenticated
  using (privado.eh_membro(book_id));
create policy "sem login nunca lê" on public.message_access as restrictive
  for all to anon, porta_autor using (false) with check (false);

-- ── 2. As colunas de family_messages ───────────────────────────────────────
create type public.mensagem_estado as enum ('rascunho', 'enviada', 'arquivada');

alter table public.family_messages
  add column access_id uuid not null,
  add column aparelho_hash text not null check (aparelho_hash ~ '^[0-9a-f]{64}$'),
  add column nome text not null check (char_length(btrim(nome)) between 1 and 80),
  add column relacao text not null check (char_length(btrim(relacao)) between 1 and 60),
  add column estado public.mensagem_estado not null default 'rascunho',
  add column audio_caminho text unique,
  add column audio_recebido_em timestamptz,
  add column duracao_s integer check (duracao_s is null or duracao_s between 1 and 310),
  add column foto_caminho text unique,
  add column foto_recebida_em timestamptz,
  add column transcricao text check (transcricao is null or char_length(transcricao) <= 12000),
  add column transcricao_tentativas smallint not null default 0 check (transcricao_tentativas between 0 and 3),
  add column transcricao_pedida_em timestamptz,
  add column texto text check (texto is null or char_length(btrim(texto)) between 1 and 6000),
  add column texto_enviado text check (texto_enviado is null or char_length(texto_enviado) <= 6000),
  add column consentimento_em timestamptz not null,
  add column consentimento_versao smallint not null check (consentimento_versao between 1 and 99),
  add column enviada_em timestamptz,
  add column no_livro boolean not null default false,
  add column no_livro_em timestamptz,
  add column no_livro_por uuid references auth.users (id) on delete set null,
  add column editado_em timestamptz,
  add column editado_por uuid references auth.users (id) on delete set null,
  add constraint family_messages_link_do_livro
    foreign key (book_id, access_id) references public.message_access (book_id, id) on delete restrict,
  add constraint family_messages_audio_do_livro check (audio_caminho is null
    or audio_caminho ~ ('^livros/' || book_id::text || '/mensagens/' || id::text || '\.(webm|m4a|ogg)$')),
  add constraint family_messages_foto_do_livro check (foto_caminho is null
    or foto_caminho = ('livros/' || book_id::text || '/mensagens/' || id::text || '-foto.jpg')),
  add constraint family_messages_audio_recebido check (audio_recebido_em is null
    or (audio_caminho is not null and duracao_s is not null)),
  add constraint family_messages_foto_recebida check (foto_recebida_em is null or foto_caminho is not null),
  add constraint family_messages_transcricao_tem_audio check (transcricao is null or audio_recebido_em is not null),
  -- Enviada: tem data, tem texto ou áudio, e nada pela metade (áudio e foto chegaram).
  add constraint family_messages_enviada_completa check (estado = 'rascunho' or (
    enviada_em is not null
    and (texto is not null or audio_recebido_em is not null)
    and (audio_caminho is null or audio_recebido_em is not null)
    and (foto_caminho is null or foto_recebida_em is not null))),
  add constraint family_messages_rascunho_sem_livro check (estado <> 'rascunho' or (
    enviada_em is null and texto is null and texto_enviado is null)),
  add constraint family_messages_no_livro check (not no_livro or (estado = 'enviada' and texto is not null));

create index family_messages_livro_estado on public.family_messages (book_id, estado, enviada_em desc);
create index family_messages_rascunhos on public.family_messages (criado_em) where estado = 'rascunho';

-- Regras que nem a chave secreta fura: o que a pessoa mandou não muda; enviada não some.
create function privado.mensagem_regras() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.estado = 'rascunho' then return old; end if;
    raise exception 'mensagem_imutavel';
  end if;
  if new.id <> old.id or new.book_id <> old.book_id or new.access_id <> old.access_id
     or new.aparelho_hash <> old.aparelho_hash or new.nome <> old.nome or new.relacao <> old.relacao
     or new.criado_em <> old.criado_em or new.consentimento_em <> old.consentimento_em
     or new.consentimento_versao <> old.consentimento_versao
     or new.audio_caminho is distinct from old.audio_caminho
     or (old.audio_recebido_em is not null and new.audio_recebido_em is distinct from old.audio_recebido_em)
     or (old.duracao_s is not null and new.duracao_s is distinct from old.duracao_s)
     or (old.transcricao is not null and new.transcricao is distinct from old.transcricao)
     or (old.texto_enviado is not null and new.texto_enviado is distinct from old.texto_enviado)
     or (old.enviada_em is not null and new.enviada_em is distinct from old.enviada_em)
     or (old.estado <> 'rascunho' and new.estado = 'rascunho')
     or (old.foto_recebida_em is not null and new.foto_recebida_em is distinct from old.foto_recebida_em)
     -- A foto que não chegou cai no envio; depois disso o caminho não muda.
     or (new.foto_caminho is distinct from old.foto_caminho
         and not (old.estado = 'rascunho' and old.foto_recebida_em is null and new.foto_caminho is null)) then
    raise exception 'mensagem_imutavel';
  end if;
  return new;
end $$;
create function privado.mensagem_sem_truncate() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'mensagem_imutavel';
end $$;
create trigger family_messages_regras before update or delete on public.family_messages
  for each row execute function privado.mensagem_regras();
create trigger family_messages_sem_truncate before truncate on public.family_messages
  for each statement execute function privado.mensagem_sem_truncate();

-- O membro lê as enviadas e arquivadas do próprio livro, sem o aparelho nem a transcrição bruta.
-- A política restritiva do prompt 10 ("sem login nunca lê") continua valendo.
grant select (id, book_id, nome, relacao, estado, audio_caminho, audio_recebido_em, duracao_s,
              foto_caminho, foto_recebida_em, texto, texto_enviado, enviada_em, no_livro,
              no_livro_em, editado_em, criado_em)
  on public.family_messages to authenticated;
create policy "membro lê enviadas" on public.family_messages for select to authenticated
  using (estado <> 'rascunho' and privado.eh_membro(book_id));

-- ── 3. Auxiliares ──────────────────────────────────────────────────────────
create function privado.link_da_mensagem(p_token text)
returns table (acesso uuid, livro uuid)
language sql stable security definer set search_path = '' as $$
  select a.id, a.book_id from public.message_access a
  where p_token is not null and octet_length(p_token) between 16 and 128
    and a.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and a.revogado_em is null
$$;

-- O rascunho do aparelho, do link do token, ainda dentro do prazo. Trava a linha.
create function privado.rascunho_do_aparelho(p_token text, p_aparelho text, p_id uuid)
returns public.family_messages
language plpgsql security definer set search_path = '' as $$
declare
  l record;
  m public.family_messages;
begin
  select * into l from privado.link_da_mensagem(p_token);
  if l.livro is null then raise exception 'link_invalido'; end if;
  select * into m from public.family_messages f
  where f.id = p_id and f.book_id = l.livro and f.access_id = l.acesso
    and f.aparelho_hash = privado.hash_aparelho(l.livro, p_aparelho)
    and f.estado = 'rascunho'
    and f.criado_em > now() - make_interval(hours => privado.mensagem_rascunho_dura_h())
  for update;
  if m.id is null then raise exception 'mensagem_nao_encontrada'; end if;
  return m;
end $$;

-- ── 4. Portas do link (anon) ───────────────────────────────────────────────
-- O que a página /m/[token] mostra. null = link inválido ou revogado. Nada além do apelido.
create function public.mensagem_pagina(p_token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  l record;
begin
  select * into l from privado.link_da_mensagem(p_token);
  if l.livro is null then return null; end if;
  return jsonb_build_object(
    'autor', (select coalesce(b.autor_apelido, b.autor_nome) from public.books b where b.id = l.livro),
    'aberto', privado.livro_editavel(l.livro));
end $$;

-- Cria o rascunho. Com áudio ou foto, devolve os caminhos fixos que o servidor vai assinar.
create function public.mensagem_criar(
  p_token text, p_aparelho text, p_nome text, p_relacao text, p_audio_tipo text, p_foto boolean,
  p_consentimento boolean, p_consentimento_versao smallint
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  l record;
  v_hash text;
  v_id uuid := gen_random_uuid();
  v_audio text;
  v_foto text;
begin
  if p_nome is null or p_relacao is null or octet_length(p_nome) > 320 or octet_length(p_relacao) > 240
     or char_length(btrim(p_nome)) not between 1 and 80
     or char_length(btrim(p_relacao)) not between 1 and 60
     or (p_audio_tipo is not null and p_audio_tipo not in ('webm', 'm4a', 'ogg'))
     or p_foto is null
     or p_consentimento_versao is null or p_consentimento_versao not between 1 and 99 then
    raise exception 'dados_invalidos';
  end if;
  if p_consentimento is not true then raise exception 'sem_consentimento'; end if;
  select * into l from privado.link_da_mensagem(p_token);
  if l.livro is null then raise exception 'link_invalido'; end if;
  v_hash := privado.hash_aparelho(l.livro, p_aparelho);
  if v_hash is null then raise exception 'dados_invalidos'; end if;
  if not privado.livro_editavel(l.livro) then raise exception 'livro_fechado'; end if;

  -- Uma fila por livro: a contagem e o insert não correm em paralelo. Rascunhos contam.
  perform pg_advisory_xact_lock(hashtextextended('mensagens:' || l.livro::text, 0));
  if (select count(*) from public.family_messages f
      where f.book_id = l.livro and f.criado_em > now() - interval '1 hour') >= privado.max_mensagens_por_hora()
     or (select count(*) from public.family_messages f
      where f.book_id = l.livro and f.criado_em > now() - interval '1 day') >= privado.max_mensagens_por_dia() then
    raise exception 'limite_mensagens';
  end if;

  if p_audio_tipo is not null then
    v_audio := 'livros/' || l.livro::text || '/mensagens/' || v_id::text || '.' || p_audio_tipo;
  end if;
  if p_foto then
    v_foto := 'livros/' || l.livro::text || '/mensagens/' || v_id::text || '-foto.jpg';
  end if;
  insert into public.family_messages (id, book_id, access_id, aparelho_hash, nome, relacao,
    audio_caminho, foto_caminho, consentimento_em, consentimento_versao)
  values (v_id, l.livro, l.acesso, v_hash, btrim(p_nome), btrim(p_relacao), v_audio, v_foto,
    now(), p_consentimento_versao);
  return jsonb_build_object('id', v_id, 'livro', l.livro, 'audio_caminho', v_audio, 'foto_caminho', v_foto);
end $$;

-- Envia o rascunho do aparelho. Sem texto só se houver áudio. A foto que não chegou cai.
-- Devolve {livro, audio, foto, alterou}: alterou = a pessoa mexeu na transcrição (métrica).
create function public.mensagem_enviar(p_token text, p_aparelho text, p_id uuid, p_texto text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  m public.family_messages;
  v_texto text := nullif(btrim(coalesce(p_texto, '')), '');
begin
  if p_id is null or (p_texto is not null and octet_length(p_texto) > 24000)
     or (v_texto is not null and char_length(v_texto) > privado.max_mensagem_caracteres()) then
    raise exception 'dados_invalidos';
  end if;
  m := privado.rascunho_do_aparelho(p_token, p_aparelho, p_id);
  if not privado.livro_editavel(m.book_id) then raise exception 'livro_fechado'; end if;
  if m.audio_caminho is not null and m.audio_recebido_em is null then raise exception 'audio_nao_chegou'; end if;
  if v_texto is null and m.audio_caminho is null then raise exception 'mensagem_sem_texto'; end if;

  update public.family_messages f
  set estado = 'enviada', enviada_em = now(), texto = v_texto, texto_enviado = v_texto,
      foto_caminho = case when f.foto_recebida_em is null then null else f.foto_caminho end
  where f.id = m.id;
  return jsonb_build_object('id', m.id, 'livro', m.book_id,
    'audio', m.audio_caminho is not null,
    'foto', m.foto_recebida_em is not null,
    'alterou', m.transcricao is not null and v_texto is distinct from m.transcricao);
end $$;

-- ── 5. Funções do servidor (chave secreta), que ainda conferem token e aparelho ──
-- Caminho para assinar o upload: só rascunho do aparelho, arquivo ainda não recebido, até 30 min.
create function public.servico_caminho_mensagem(p_token text, p_aparelho text, p_id uuid, p_tipo text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  m public.family_messages;
begin
  if p_tipo not in ('audio', 'foto') then raise exception 'dados_invalidos'; end if;
  m := privado.rascunho_do_aparelho(p_token, p_aparelho, p_id);
  if m.criado_em <= now() - interval '30 minutes' then return null; end if;
  if p_tipo = 'audio' and m.audio_recebido_em is null then return m.audio_caminho; end if;
  if p_tipo = 'foto' and m.foto_recebida_em is null then return m.foto_caminho; end if;
  return null;
end $$;

-- O servidor chama depois de conferir que o arquivo existe no Storage e o tamanho.
create function public.servico_confirmar_audio_mensagem(p_token text, p_aparelho text, p_id uuid, p_duracao_s integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  m public.family_messages;
begin
  if p_duracao_s is null or p_duracao_s not between 1 and privado.max_mensagem_audio_s() then
    raise exception 'dados_invalidos';
  end if;
  m := privado.rascunho_do_aparelho(p_token, p_aparelho, p_id);
  if m.audio_caminho is null or m.audio_recebido_em is not null
     or m.criado_em <= now() - interval '30 minutes' then
    return false;
  end if;
  update public.family_messages set audio_recebido_em = now(), duracao_s = p_duracao_s where id = m.id;
  return true;
end $$;

create function public.servico_confirmar_foto_mensagem(p_token text, p_aparelho text, p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  m public.family_messages;
begin
  m := privado.rascunho_do_aparelho(p_token, p_aparelho, p_id);
  if m.foto_caminho is null or m.foto_recebida_em is not null
     or m.criado_em <= now() - interval '30 minutes' then
    return false;
  end if;
  update public.family_messages set foto_recebida_em = now() where id = m.id;
  return true;
end $$;

-- Antes de chamar o transcritor. Já transcrita: devolve o texto ao mesmo aparelho (resposta
-- perdida na rede). Senão reserva por 2 min e conta a tentativa (no máximo 3 por mensagem).
-- Devolve {texto} ou {caminho}; {espera: true} se outra chamada está transcrevendo agora.
create function public.servico_mensagem_reservar_transcricao(p_token text, p_aparelho text, p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  m public.family_messages;
begin
  m := privado.rascunho_do_aparelho(p_token, p_aparelho, p_id);
  if m.audio_recebido_em is null then raise exception 'audio_nao_chegou'; end if;
  if m.transcricao is not null then return jsonb_build_object('texto', m.transcricao); end if;
  if m.transcricao_pedida_em > now() - interval '2 minutes' then
    return jsonb_build_object('espera', true);
  end if;
  if m.transcricao_tentativas >= privado.max_transcricoes_por_mensagem() then
    raise exception 'limite_transcricao';
  end if;
  update public.family_messages
  set transcricao_tentativas = transcricao_tentativas + 1, transcricao_pedida_em = now()
  where id = m.id;
  return jsonb_build_object('caminho', m.audio_caminho, 'livro', m.book_id);
end $$;

-- Grava a transcrição uma vez (a primeira que chega). false = já havia uma.
create function public.servico_mensagem_transcrita(p_token text, p_aparelho text, p_id uuid, p_texto text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  m public.family_messages;
begin
  if p_texto is null or char_length(p_texto) > 12000 then raise exception 'dados_invalidos'; end if;
  m := privado.rascunho_do_aparelho(p_token, p_aparelho, p_id);
  if m.transcricao is not null or m.audio_recebido_em is null then return false; end if;
  update public.family_messages set transcricao = p_texto, transcricao_pedida_em = null where id = m.id;
  return true;
end $$;

-- A transcrição falhou: libera a reserva para a próxima tentativa (que ainda conta).
create function public.servico_mensagem_transcricao_falhou(p_token text, p_aparelho text, p_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  m public.family_messages;
begin
  m := privado.rascunho_do_aparelho(p_token, p_aparelho, p_id);
  update public.family_messages set transcricao_pedida_em = null where id = m.id and transcricao is null;
end $$;

-- Gera ou troca o link de mensagens. Revoga o ativo e cria o novo na mesma transação.
create function public.servico_trocar_link_mensagem(
  p_livro uuid, p_usuario uuid, p_id uuid, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.book_members m where m.book_id = p_livro and m.user_id = p_usuario) then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then raise exception 'livro_fechado'; end if;
  update public.message_access set revogado_em = now() where book_id = p_livro and revogado_em is null;
  insert into public.message_access (id, book_id, token_hash, chave_versao, criado_por)
  values (p_id, p_livro, p_token_hash, p_chave_versao, p_usuario);
end $$;

-- Limpeza (varredura do Inngest): rascunhos vencidos. O job apaga os arquivos e depois as linhas.
create function public.servico_mensagem_rascunhos_vencidos(p_limite integer)
returns table (id uuid, audio_caminho text, foto_caminho text)
language sql stable security definer set search_path = '' as $$
  select f.id, f.audio_caminho, f.foto_caminho from public.family_messages f
  where f.estado = 'rascunho'
    and f.criado_em <= now() - make_interval(hours => privado.mensagem_rascunho_dura_h())
  order by f.criado_em
  limit least(greatest(coalesce(p_limite, 100), 1), 500)
$$;

create function public.servico_mensagem_apagar_rascunhos(p_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v integer;
begin
  delete from public.family_messages f
  where f.id = any (coalesce(p_ids, '{}')) and f.estado = 'rascunho'
    and f.criado_em <= now() - make_interval(hours => privado.mensagem_rascunho_dura_h());
  get diagnostics v = row_count;
  return v;
end $$;

-- ── 6. Ações dos membros (conferem membro e plano ativo) ───────────────────
create function public.mensagem_editar(p_id uuid, p_texto text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
  v_texto text := nullif(btrim(coalesce(p_texto, '')), '');
begin
  if p_texto is not null and octet_length(p_texto) > 24000 then raise exception 'dados_invalidos'; end if;
  if v_texto is null then raise exception 'mensagem_sem_texto'; end if;
  if char_length(v_texto) > privado.max_mensagem_caracteres() then raise exception 'dados_invalidos'; end if;
  select f.book_id into v_livro from public.family_messages f where f.id = p_id and f.estado = 'enviada';
  perform privado.membro_editando(v_livro);
  update public.family_messages
  set texto = v_texto, editado_em = now(), editado_por = (select auth.uid())
  where id = p_id and texto is distinct from v_texto;
end $$;

create function public.mensagem_no_livro(p_id uuid, p_incluir boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  m record;
begin
  if p_incluir is null then raise exception 'dados_invalidos'; end if;
  select f.book_id, f.texto into m from public.family_messages f where f.id = p_id and f.estado = 'enviada';
  perform privado.membro_editando(m.book_id);
  if p_incluir and m.texto is null then raise exception 'mensagem_sem_texto'; end if;
  update public.family_messages
  set no_livro = p_incluir, no_livro_em = now(), no_livro_por = (select auth.uid())
  where id = p_id and no_livro <> p_incluir;
end $$;

-- Arquivar tira da lista e do livro. A mensagem e o áudio ficam guardados.
create function public.mensagem_arquivar(p_id uuid, p_arquivar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
begin
  if p_arquivar is null then raise exception 'dados_invalidos'; end if;
  select f.book_id into v_livro from public.family_messages f
  where f.id = p_id and f.estado in ('enviada', 'arquivada');
  perform privado.membro_editando(v_livro);
  update public.family_messages
  set estado = case when p_arquivar then 'arquivada' else 'enviada' end::public.mensagem_estado,
      no_livro = case when p_arquivar then false else no_livro end
  where id = p_id;
end $$;

-- ── 7. Quem executa o quê ──────────────────────────────────────────────────
revoke all on function
  public.mensagem_pagina(text),
  public.mensagem_criar(text, text, text, text, text, boolean, boolean, smallint),
  public.mensagem_enviar(text, text, uuid, text),
  public.servico_caminho_mensagem(text, text, uuid, text),
  public.servico_confirmar_audio_mensagem(text, text, uuid, integer),
  public.servico_confirmar_foto_mensagem(text, text, uuid),
  public.servico_mensagem_reservar_transcricao(text, text, uuid),
  public.servico_mensagem_transcrita(text, text, uuid, text),
  public.servico_mensagem_transcricao_falhou(text, text, uuid),
  public.servico_trocar_link_mensagem(uuid, uuid, uuid, text, smallint),
  public.servico_mensagem_rascunhos_vencidos(integer),
  public.servico_mensagem_apagar_rascunhos(uuid[]),
  public.mensagem_editar(uuid, text),
  public.mensagem_no_livro(uuid, boolean),
  public.mensagem_arquivar(uuid, boolean)
  from public, anon, authenticated;
grant execute on function
  public.mensagem_pagina(text),
  public.mensagem_criar(text, text, text, text, text, boolean, boolean, smallint),
  public.mensagem_enviar(text, text, uuid, text)
  to anon, service_role;
grant execute on function
  public.servico_caminho_mensagem(text, text, uuid, text),
  public.servico_confirmar_audio_mensagem(text, text, uuid, integer),
  public.servico_confirmar_foto_mensagem(text, text, uuid),
  public.servico_mensagem_reservar_transcricao(text, text, uuid),
  public.servico_mensagem_transcrita(text, text, uuid, text),
  public.servico_mensagem_transcricao_falhou(text, text, uuid),
  public.servico_trocar_link_mensagem(uuid, uuid, uuid, text, smallint),
  public.servico_mensagem_rascunhos_vencidos(integer),
  public.servico_mensagem_apagar_rascunhos(uuid[])
  to service_role;
grant execute on function
  public.mensagem_editar(uuid, text),
  public.mensagem_no_livro(uuid, boolean),
  public.mensagem_arquivar(uuid, boolean)
  to authenticated, service_role;
revoke all on function
  privado.max_mensagens_por_hora(), privado.max_mensagens_por_dia(), privado.max_mensagem_audio_s(),
  privado.max_mensagem_caracteres(), privado.max_transcricoes_por_mensagem(),
  privado.mensagem_rascunho_dura_h(), privado.mensagem_regras(), privado.mensagem_sem_truncate(),
  privado.link_da_mensagem(text), privado.rascunho_do_aparelho(text, text, uuid)
  from public, anon, authenticated;

-- ── 8. Storage (pulado nos testes com PGlite) ──────────────────────────────
-- Bucket privado, sem políticas em storage.objects: só URLs assinadas pelo servidor.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('mensagens', 'mensagens', false, 8388608,
              array['audio/webm', 'audio/mp4', 'audio/ogg', 'image/jpeg'])
    on conflict (id) do nothing;
  end if;
end $$;
