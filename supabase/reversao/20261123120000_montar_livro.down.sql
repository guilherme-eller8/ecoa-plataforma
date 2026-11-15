-- Reversão de 20261123120000_montar_livro.sql.
-- ATENÇÃO: com versão publicada ou QR de mensagem, apagaria livros congelados e códigos impressos.
-- Antes de forçar: esvazie o bucket 'exportacoes' e apague do bucket 'qr' os recortes dos QR de
-- mensagem (o Supabase não apaga bucket com arquivos; a reversão não mexe em Storage).

-- Trava: com publicação ou QR de mensagem, só roda com `set ecoa.reversao_destrutiva = 'sim'`.
do $$
begin
  if ((to_regclass('public.book_exports') is not null and exists (select 1 from public.book_exports))
      or (to_regclass('public.book_layouts') is not null and exists (select 1 from public.book_layouts))
      or exists (select 1 from public.qr_codes where message_id is not null))
     and coalesce(current_setting('ecoa.reversao_destrutiva', true), '') <> 'sim' then
    raise exception 'reversao_com_publicacoes: rode com ecoa.reversao_destrutiva = sim';
  end if;
end $$;


drop function if exists public.servico_export_falhou(uuid, text);
drop function if exists public.servico_export_pronto(uuid, jsonb, integer, numeric, text, bigint, bigint, integer);
drop function if exists public.servico_export_conteudo(uuid);
drop function if exists public.publicar_livro(uuid, text);
drop table if exists public.book_exports;
drop function if exists privado.export_imutavel();
drop function if exists privado.export_sem_truncate();
drop type if exists public.export_estado;

drop function if exists public.montagem_salvar(uuid, integer, text, text, text, uuid, text, uuid[], uuid[], uuid[]);
drop function if exists public.montagem_conteudo(uuid);
drop function if exists public.montagem_reservar_uso(uuid);
drop table if exists public.montagem_usos;
drop function if exists privado.hash_conteudo(jsonb);
drop function if exists privado.conteudo_do_livro(uuid, boolean);
drop table if exists public.book_layouts;

-- QR de mensagem: sai (o gatilho de imutável fica desligado só aqui).
alter table public.qr_codes disable trigger qr_codes_imutavel;
delete from public.qr_codes where message_id is not null;
alter table public.qr_codes enable trigger qr_codes_imutavel;
alter table public.qr_codes
  drop constraint if exists qr_codes_mensagem_fk,
  drop constraint if exists qr_codes_um_dono,
  drop column if exists message_id,
  alter column story_id set not null;

-- As funções voltam ao texto dos prompts 10 e 12.
create or replace function privado.qr_imutavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE'
     and new.codigo = old.codigo and new.book_id = old.book_id and new.story_id = old.story_id
     and new.criado_em = old.criado_em
     and (new.criado_por is not distinct from old.criado_por or new.criado_por is null) then
    return new;
  end if;
  raise exception 'qr_imutavel';
end $$;
create or replace function privado.qr_reservar_audio(p_codigo text) returns boolean
language plpgsql volatile security definer set search_path = '' as $$
declare
  q record;
begin
  select * into q from public.qr_codes x where x.codigo = p_codigo for update;
  if q.codigo is null or q.desativado_em is not null then return false; end if;
  if q.audio_fonte is not distinct from privado.fonte_audio_da_historia(q.story_id) then return false; end if;
  if q.audio_pedido_em is not null
     and q.audio_pedido_em > now() - make_interval(secs => privado.qr_audio_espera_s()) then
    return false;
  end if;
  update public.qr_codes set audio_pedido_em = now() where codigo = p_codigo;
  return true;
end $$;

-- ── 7. Criar o QR de uma história (membro, plano ativo, história marcada como pronta) ──
-- Já existe: devolve o mesmo (o evento qr_criado é registrado pelo servidor). audio_pronto diz se o PDF já pode sair (o player tocaria agora).
create or replace function public.criar_qr(p_story uuid)
returns table (codigo text, audio_pronto boolean, pedir_audio boolean)
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  q record;
  v_codigo text;
begin
  perform pg_advisory_xact_lock(hashtextextended('qr:' || p_story::text, 0));
  select st.id, st.book_id, st.estado, st.revisada_em into s from public.stories st where st.id = p_story;
  if s.id is null or not privado.eh_membro(s.book_id) then raise exception 'sem_permissao'; end if;
  if not privado.livro_editavel(s.book_id) then raise exception 'sem_permissao'; end if;
  if s.estado <> 'pronta' or s.revisada_em is null then raise exception 'historia_nao_pronta'; end if;
  if not exists (select 1 from public.story_recordings sr where sr.story_id = p_story
                   and not (sr.recording_id = any (privado.audios_fora_do_texto(p_story)))) then
    raise exception 'historia_sem_audio';
  end if;
  -- Gravação usada inteira (segmentos nulo) que também alimenta outra história: o recorte
  -- levaria a outra junto. Não acontece pelos fluxos de hoje; o banco garante.
  if exists (select 1 from public.story_recordings sr
             where sr.story_id = p_story and sr.segmentos is null
               and exists (select 1 from public.story_recordings o
                           where o.recording_id = sr.recording_id and o.story_id <> p_story)) then
    raise exception 'historia_audio_compartilhado';
  end if;

  select * into q from public.qr_codes x where x.story_id = p_story;
  if q.codigo is null then
    for i in 1..5 loop
      v_codigo := privado.qr_sortear_codigo();
      begin
        insert into public.qr_codes (codigo, book_id, story_id, criado_por)
          values (v_codigo, s.book_id, p_story, (select auth.uid()));
        exit;
      exception when unique_violation then
        if i = 5 then raise exception 'qr_colisao'; end if;
      end;
    end loop;
    select * into q from public.qr_codes x where x.codigo = v_codigo;
  end if;
  if q.desativado_em is not null then raise exception 'qr_desativado'; end if;

  return query select q.codigo,
    q.audio_fonte is not distinct from privado.fonte_audio_da_historia(p_story) and q.audio_caminho is not null,
    privado.qr_reservar_audio(q.codigo);
end $$;

-- ── 9. Recorte pronto (só o servidor, ao fim do job) ───────────────────────
-- Mesmo lock de criar_qr. Só aceita a fonte de agora e uma duração que caiba na fala da história.
-- Devolve o caminho anterior, para o servidor apagar o arquivo velho do bucket qr.
create or replace function public.servico_qr_audio_pronto(p_codigo text, p_caminho text, p_fonte text,
                                               p_duracao_s numeric)
returns table (gravado boolean, anterior text)
language plpgsql security definer set search_path = '' as $$
declare
  q record;
begin
  select * into q from public.qr_codes x where x.codigo = p_codigo;
  if q.codigo is null then raise exception 'qr_nao_encontrado'; end if;
  perform pg_advisory_xact_lock(hashtextextended('qr:' || q.story_id::text, 0));
  select * into q from public.qr_codes x where x.codigo = p_codigo for update;
  if p_fonte is distinct from privado.fonte_audio_da_historia(q.story_id) then
    return query select false, null::text;
    return;
  end if;
  if p_duracao_s is null or p_duracao_s <= 0
     or p_duracao_s > privado.fala_da_historia_s(q.story_id) + privado.qr_folga_recorte_s() then
    raise exception 'qr_recorte_longo';
  end if;
  update public.qr_codes set audio_caminho = p_caminho, audio_fonte = p_fonte,
    audio_duracao_s = p_duracao_s, audio_pronto_em = now(), audio_pedido_em = null
  where codigo = p_codigo;
  return query select true, case when q.audio_caminho is distinct from p_caminho then q.audio_caminho end;
end $$;

-- ── 10. O player. Funciona com o plano vencido (P4) ───────────────────────
-- estado: ok | preparando | desativado | nao_encontrado | limite. Nunca devolve texto da história.
-- Recorte velho (a história mudou depois dele): preparando, nunca o áudio velho. pedir_audio = true
-- quando esta consulta reservou o pedido do recorte novo.
create or replace function public.servico_ouvir_qr(p_codigo text, p_chave text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_10min timestamptz := date_bin('10 minutes', now(), timestamptz '2026-01-01');
  v_min timestamptz := date_trunc('minute', now());
  v_global constant text := repeat('0', 64);
  v_achou boolean := false;
  q record;
  s record;
begin
  if p_chave is null or p_chave !~ '^[0-9a-f]{64}$' or p_chave = v_global then
    raise exception 'chave_invalida';
  end if;
  -- Quem já errou demais não consulta mais nada nesta janela.
  if coalesce((select n from public.qr_consultas
               where chave = p_chave and tipo = 'erro' and janela = v_10min), 0) >= privado.qr_erros_por_chave()
     or coalesce((select n from public.qr_consultas
                  where chave = v_global and tipo = 'erro' and janela = v_10min), 0) >= privado.qr_erros_global() then
    return jsonb_build_object('estado', 'limite');
  end if;

  if p_codigo is not null and p_codigo ~ '^[2-9A-HJKMNP-Z]{8}$' then
    select * into q from public.qr_codes x where x.codigo = p_codigo;
    v_achou := found;
  end if;
  if not v_achou then
    perform privado.qr_contar(p_chave, 'erro', v_10min);
    perform privado.qr_contar(v_global, 'erro', v_10min);
    return jsonb_build_object('estado', 'nao_encontrado');
  end if;

  if privado.qr_contar(p_chave, 'acerto', v_min) > privado.qr_acertos_por_minuto() then
    return jsonb_build_object('estado', 'limite');
  end if;
  if q.desativado_em is not null then return jsonb_build_object('estado', 'desativado'); end if;
  if q.audio_caminho is null
     or q.audio_fonte is distinct from privado.fonte_audio_da_historia(q.story_id) then
    return jsonb_build_object('estado', 'preparando', 'pedir_audio', privado.qr_reservar_audio(q.codigo));
  end if;

  select st.titulo, st.ano into s from public.stories st where st.id = q.story_id;
  return jsonb_build_object('estado', 'ok', 'titulo', s.titulo, 'ano', s.ano,
    'audio_caminho', q.audio_caminho);
end $$;

-- ── 11. "Ouvir" tocado: 1 evento por código, rede e hora (a métrica do prompt) ──
create or replace function public.servico_qr_tocou(p_codigo text, p_chave text)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  q record;
begin
  if p_chave is null or p_chave !~ '^[0-9a-f]{64}$' then raise exception 'chave_invalida'; end if;
  select * into q from public.qr_codes x where x.codigo = p_codigo and x.desativado_em is null;
  if q.codigo is null then return false; end if;
  if privado.qr_contar(encode(sha256(convert_to(p_chave || ':' || q.codigo, 'utf8')), 'hex'), 'tocou',
                       date_trunc('hour', now())) > 1 then
    return false;
  end if;
  insert into public.events (book_id, ator_tipo, acao, detalhes)
    values (q.book_id, 'familia', 'qr_tocou', jsonb_build_object('story_id', q.story_id));
  return true;
end $$;

-- ── 12. O que o recorte usa (só o servidor, no job): a fonte e as gravações, na ordem ──
-- segmentos nulo = a gravação inteira. Nenhum texto sai daqui (T36); os tempos vêm de transcripts.
create or replace function public.servico_qr_trechos(p_codigo text)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  q record;
begin
  select * into q from public.qr_codes x where x.codigo = p_codigo;
  if q.codigo is null then raise exception 'qr_nao_encontrado'; end if;
  return jsonb_build_object(
    'book_id', q.book_id,
    'fonte', privado.fonte_audio_da_historia(q.story_id),
    'desativado', q.desativado_em is not null,
    'gravacoes', coalesce((
      select jsonb_agg(jsonb_build_object('recording_id', r.id, 'caminho', r.caminho,
               'content_type', r.content_type, 'duracao_s', r.duracao_s, 'segmentos', sr.segmentos)
             order by sr.ordem)
      from public.story_recordings sr join public.recordings r on r.id = sr.recording_id
      where sr.story_id = q.story_id
        and not (sr.recording_id = any (privado.audios_fora_do_texto(q.story_id)))), '[]'::jsonb));
end $$;

create or replace function public.mensagem_apagar(p_id uuid)
returns table (audio_caminho text, foto_caminho text)
language plpgsql security definer set search_path = '' as $$
declare
  m record;
begin
  select f.id, f.book_id, f.audio_caminho, f.foto_caminho into m
  from public.family_messages f where f.id = p_id and f.estado = 'arquivada';
  if m.id is null or not exists (
       select 1 from public.book_members b
       where b.book_id = m.book_id and b.user_id = (select auth.uid()) and b.papel = 'responsavel') then
    raise exception 'sem_permissao';
  end if;
  perform set_config('ecoa.apagar_mensagem', m.id::text, true);
  delete from public.family_messages f where f.id = m.id;
  perform set_config('ecoa.apagar_mensagem', '', true);
  return query select m.audio_caminho, m.foto_caminho;
end $$;

drop function if exists privado.historia_aceita_qr(uuid);
drop function if exists privado.qr_inserir(uuid, uuid, uuid);
drop function if exists privado.qr_duracao_max_s(uuid, uuid);
drop function if exists privado.fonte_audio_do_qr(uuid, uuid);
drop function if exists privado.fonte_audio_da_mensagem(uuid);

create or replace function privado.palavras_por_pagina() returns integer
language sql immutable set search_path = '' as $$ select 320 $$;
drop function if exists privado.capa_cores();
drop function if exists privado.publicacao_expira_s();
drop function if exists privado.max_publicacoes_dia();
drop function if exists privado.max_itens_livro();
drop function if exists privado.max_usos_montagem_minuto();
-- O bucket sai por último (só sai vazio).
do $$
begin
  if to_regclass('storage.buckets') is not null then
    delete from storage.buckets where id = 'exportacoes';
  end if;
end $$;

