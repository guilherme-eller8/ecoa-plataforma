-- 20261115120000_pipeline.sql
-- Prompt 6: histórias, transcrições, versões, custo, memória do livro, glossário e
-- consentimento para a IA. stories e story_recordings saíram do prompt 5 (P36).
--
-- Regras deste arquivo:
-- * Quem cria e move a história é o pipeline, por funções servico_* com guarda de estado.
-- * Nenhum texto do áudio passa pelo Inngest: o rascunho fica em stories.rascunho (só servidor).
-- * Transcrição e versões são só insert. Nem a chave secreta altera, apaga ou trunca.
-- * porta_autor não recebe nenhum grant novo.

create type public.story_estado as enum ('ouvindo', 'escrevendo', 'pronta', 'falhou');
create type public.versao_origem as enum ('ia', 'responsavel', 'cofacilitador', 'autor');
create type public.glossario_tipo as enum ('pessoa', 'lugar');
create type public.glossario_estado as enum ('sugerido', 'aceito', 'recusado');

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.max_historia_s() returns integer
language sql immutable set search_path = '' as $$ select 1800 $$;           -- MAX_HISTORIA_MIN = 30
create function privado.max_minutos_ia_por_dia() returns integer
language sql immutable set search_path = '' as $$ select 240 $$;            -- MAX_MINUTOS_IA_DIA
create function privado.max_nomes_glossario() returns integer
language sql immutable set search_path = '' as $$ select 300 $$;            -- MAX_NOMES_GLOSSARIO
create function privado.max_nomes_por_historia() returns integer
language sql immutable set search_path = '' as $$ select 10 $$;             -- MAX_NOMES_POR_HISTORIA
create function privado.consentimento_ia_versao() returns smallint
language sql immutable set search_path = '' as $$ select 1::smallint $$;    -- CONSENTIMENTO_IA_VERSAO

-- ── 1. Consentimento do responsável para o processamento com IA (D9) ───────
alter table public.books
  add column ia_consentimento_em timestamptz,
  add column ia_consentimento_por uuid references auth.users (id) on delete set null,
  add column ia_consentimento_versao smallint check (ia_consentimento_versao between 1 and 99),
  add constraint books_ia_consentimento check ((ia_consentimento_em is null) = (ia_consentimento_versao is null));

create function public.consentir_processamento_ia(p_book uuid, p_versao smallint) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if p_versao is distinct from privado.consentimento_ia_versao() then return false; end if;
  if not exists (select 1 from public.book_members m where m.book_id = p_book
                   and m.user_id = (select auth.uid()) and m.papel = 'responsavel')
     or not privado.livro_editavel(p_book) then
    raise exception 'sem_permissao';
  end if;
  update public.books set ia_consentimento_em = now(), ia_consentimento_por = (select auth.uid()),
    ia_consentimento_versao = p_versao
  where id = p_book;
  return true;
end $$;

-- ── 2. stories ─────────────────────────────────────────────────────────────
create table public.stories (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  prompt_id uuid,
  titulo text check (titulo is null or char_length(btrim(titulo)) between 1 and 200),
  estado public.story_estado not null default 'ouvindo',
  estrutura jsonb check (estrutura is null or jsonb_typeof(estrutura) = 'object'), -- base original (T11)
  rascunho jsonb check (rascunho is null or jsonb_typeof(rascunho) = 'object'),    -- edição entre passos; só servidor
  erro_etapa text check (erro_etapa is null or erro_etapa ~ '^[a-z_]{2,30}$'),     -- só admin
  erro text check (erro is null or erro ~ '^[a-z_]{2,40}$'),                       -- código fixo, nunca texto do áudio
  vista_em timestamptz,
  pronta_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (book_id, id),
  foreign key (book_id, prompt_id) references public.prompts (book_id, id) on delete set null (prompt_id),
  constraint stories_pronta check ((estado = 'pronta') = (pronta_em is not null)),
  constraint stories_vista_so_pronta check (vista_em is null or pronta_em is not null),
  constraint stories_erro_so_falhou check ((estado = 'falhou') = (erro_etapa is not null))
);
create index stories_livro_data on public.stories (book_id, criado_em desc);
create index stories_em_andamento on public.stories (atualizado_em) where estado in ('ouvindo', 'escrevendo');
create trigger stories_atualizado_em before update on public.stories
  for each row execute function privado.tocar_atualizado_em();

-- ── 3. story_recordings ────────────────────────────────────────────────────
-- Ids de segmento contínuos por história: a gravação de ordem N começa em segmento_inicial.
-- Uma gravação pode, a partir do prompt 7, alimentar mais de uma história.
create table public.story_recordings (
  story_id uuid not null,
  recording_id uuid not null,
  book_id uuid not null,
  ordem smallint not null check (ordem between 1 and 100),
  segmento_inicial integer not null default 1 check (segmento_inicial >= 1),
  primary key (story_id, recording_id),
  unique (story_id, ordem),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict,
  foreign key (book_id, recording_id) references public.recordings (book_id, id) on delete restrict
);
create index story_recordings_gravacao on public.story_recordings (recording_id);

-- ── 4. transcripts (só insert) ─────────────────────────────────────────────
create table public.transcripts (
  recording_id uuid primary key,
  book_id uuid not null,
  provedor text not null check (provedor ~ '^[a-z0-9_-]{2,30}$'),
  modelo text not null check (char_length(modelo) between 1 and 60),
  segmentos jsonb not null check (jsonb_typeof(segmentos) = 'array'), -- Segmento[] de lib/ai/schemas.ts
  palavras jsonb not null check (jsonb_typeof(palavras) = 'array'),   -- Palavra[]
  minutos numeric(7, 2) not null check (minutos >= 0),
  criado_em timestamptz not null default now(),
  foreign key (book_id, recording_id) references public.recordings (book_id, id) on delete restrict
);
create index transcripts_livro on public.transcripts (book_id);

-- ── 5. story_versions (só insert; a versão da IA nunca muda, T31) ──────────
create table public.story_versions (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null,
  book_id uuid not null,
  numero integer not null check (numero >= 1),
  origem public.versao_origem not null,
  tamanho text not null check (tamanho in ('resumido', 'medio', 'detalhado')),
  conteudo jsonb not null check (jsonb_typeof(conteudo) = 'object'), -- {titulo, paragrafos: [{texto, fontes}], lacunas}
  marcacoes jsonb not null default '[]'::jsonb check (jsonb_typeof(marcacoes) = 'array'),
  modelos jsonb check (modelos is null or jsonb_typeof(modelos) = 'object'),           -- {transcricao, rapido, capaz}
  hash_prompts jsonb check (hash_prompts is null or jsonb_typeof(hash_prompts) = 'object'), -- nome → hash
  criado_por uuid references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (story_id, numero),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict,
  constraint versao_ia_sem_pessoa check (origem <> 'ia' or criado_por is null)
);

-- A única mudança aceita: criado_por virar null quando o usuário é apagado (LGPD).
create function privado.versao_imutavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.criado_por is null
     and (to_jsonb(new) - 'criado_por') = (to_jsonb(old) - 'criado_por') then
    return new;
  end if;
  raise exception 'versao_imutavel';
end $$;
create function privado.so_insert() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'versao_imutavel';
end $$;
create trigger story_versions_imutavel before update or delete on public.story_versions
  for each row execute function privado.versao_imutavel();
create trigger story_versions_sem_truncate before truncate on public.story_versions
  for each statement execute function privado.so_insert();
create trigger transcripts_imutavel before update or delete on public.transcripts
  for each row execute function privado.so_insert();
create trigger transcripts_sem_truncate before truncate on public.transcripts
  for each statement execute function privado.so_insert();

-- ── 6. ai_usage (só o admin, pela chave secreta) ───────────────────────────
create table public.ai_usage (
  id bigint generated always as identity primary key,
  book_id uuid not null references public.books (id) on delete restrict,
  story_id uuid,
  recording_id uuid,
  etapa text not null check (etapa ~ '^[a-z_]{2,30}$'),
  provedor text not null check (provedor ~ '^[a-z0-9_-]{2,30}$'),
  modelo text not null check (char_length(modelo) between 1 and 60),
  tentativa smallint not null default 1 check (tentativa between 1 and 20),
  ok boolean not null,
  tokens_entrada integer not null default 0 check (tokens_entrada >= 0),
  tokens_saida integer not null default 0 check (tokens_saida >= 0),
  tokens_cache_lido integer not null default 0 check (tokens_cache_lido >= 0),
  tokens_cache_gravado integer not null default 0 check (tokens_cache_gravado >= 0),
  minutos_audio numeric(7, 2) check (minutos_audio is null or minutos_audio >= 0),
  custo_usd numeric(10, 6) not null check (custo_usd >= 0),
  ms integer check (ms is null or ms >= 0),
  ms_primeira_palavra integer check (ms_primeira_palavra is null or ms_primeira_palavra >= 0),
  id_requisicao text check (id_requisicao is null or char_length(id_requisicao) <= 120),
  criado_em timestamptz not null default now(),
  constraint ai_usage_tem_origem check (story_id is not null or recording_id is not null),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict,
  foreign key (book_id, recording_id) references public.recordings (book_id, id) on delete restrict
);
create index ai_usage_livro_data on public.ai_usage (book_id, criado_em desc);

-- ── 7. book_context (memória do livro; só o pipeline) ───────────────────────
create table public.book_context (
  story_id uuid primary key,
  book_id uuid not null,
  resumo text not null check (char_length(btrim(resumo)) between 1 and 600),
  temas text[] not null default '{}' check (cardinality(temas) <= 8),
  atualizado_em timestamptz not null default now(),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict
);
create index book_context_livro on public.book_context (book_id);

-- ── 8. glossary_entries ────────────────────────────────────────────────────
create function privado.apelidos_validos(p text[]) returns boolean
language sql immutable set search_path = '' as $$
  select cardinality(p) <= 10
     and not exists (select 1 from unnest(p) a where a is null or char_length(btrim(a)) not between 1 and 80)
$$;

create table public.glossary_entries (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete restrict,
  tipo public.glossario_tipo not null,
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  chave text generated always as (lower(btrim(nome))) stored,
  apelidos text[] not null default '{}' check (privado.apelidos_validos(apelidos)),
  observacao text check (observacao is null or char_length(observacao) <= 200),
  estado public.glossario_estado not null default 'sugerido',
  origem_story_id uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (book_id, tipo, chave),
  foreign key (book_id, origem_story_id) references public.stories (book_id, id)
    on delete set null (origem_story_id)
);
create trigger glossary_entries_atualizado_em before update on public.glossary_entries
  for each row execute function privado.tocar_atualizado_em();

-- Recusados não contam. O lock evita estourar a cota com inserts paralelos.
create function privado.cota_do_glossario() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('glossario:' || new.book_id::text, 0));
  if (select count(*) from public.glossary_entries
      where book_id = new.book_id and estado in ('sugerido', 'aceito')) >= privado.max_nomes_glossario() then
    raise exception 'glossario_cheio';
  end if;
  return new;
end $$;
create trigger glossary_entries_cota before insert on public.glossary_entries
  for each row execute function privado.cota_do_glossario();

-- ── 9. RLS e privilégios ───────────────────────────────────────────────────
alter table public.stories enable row level security;
alter table public.story_recordings enable row level security;
alter table public.transcripts enable row level security;
alter table public.story_versions enable row level security;
alter table public.ai_usage enable row level security;
alter table public.book_context enable row level security;
alter table public.glossary_entries enable row level security;

revoke all on public.stories, public.story_recordings, public.transcripts, public.story_versions,
  public.ai_usage, public.book_context, public.glossary_entries
  from public, anon, authenticated, porta_autor, service_role;
grant all on public.stories, public.story_recordings, public.ai_usage, public.book_context,
  public.glossary_entries to service_role;
grant select, insert on public.transcripts, public.story_versions to service_role; -- sem update, delete nem truncate

-- Membro lê as histórias do livro, sem o rascunho e sem o erro técnico.
grant select (id, book_id, prompt_id, titulo, estado, vista_em, pronta_em, criado_em, atualizado_em)
  on public.stories to authenticated;
create policy "membro lê" on public.stories for select to authenticated
  using (privado.eh_membro(book_id));

grant select on public.story_recordings, public.transcripts, public.story_versions to authenticated;
create policy "membro lê" on public.story_recordings for select to authenticated
  using (privado.eh_membro(book_id));
create policy "membro lê" on public.transcripts for select to authenticated
  using (privado.eh_membro(book_id));
create policy "membro lê" on public.story_versions for select to authenticated
  using (privado.eh_membro(book_id));
-- ai_usage e book_context: nenhum grant para quem está logado. RLS ligada e sem política.

-- Glossário: membro lê, acrescenta (já aceito) e ajusta com o plano ativo. Não apaga: recusa.
grant select (id, book_id, tipo, nome, apelidos, observacao, estado, origem_story_id, criado_em, atualizado_em),
  insert (book_id, tipo, nome, apelidos, observacao, estado),
  update (nome, apelidos, observacao, estado)
  on public.glossary_entries to authenticated;
create policy "membro lê" on public.glossary_entries for select to authenticated
  using (privado.eh_membro(book_id));
create policy "membro acrescenta" on public.glossary_entries for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id) and estado = 'aceito');
create policy "membro ajusta" on public.glossary_entries for update to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id))
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
grant execute on function privado.apelidos_validos(text[]) to authenticated, service_role;

-- ── 10. Funções do pipeline (só o servidor) ────────────────────────────────
-- Cria (ou devolve) a história de uma gravação avulsa. Nunca recebe book_id de fora.
-- historia null = não processar agora; motivo diz por quê (aparece no admin e no cartão).
create function public.servico_iniciar_historia(p_recording uuid)
returns table (historia uuid, estado public.story_estado, motivo text)
language plpgsql security definer set search_path = '' as $$
declare v public.recordings; v_story uuid; v_estado public.story_estado; v_min numeric;
begin
  select * into v from public.recordings r where r.id = p_recording for update;
  if not found or v.upload <> 'recebido' then
    return query select null::uuid, null::public.story_estado, 'nao_recebido'; return;
  end if;
  select sr.story_id, s.estado into v_story, v_estado
    from public.story_recordings sr join public.stories s on s.id = sr.story_id
    where sr.recording_id = p_recording order by sr.ordem limit 1;
  if found then  -- já existe: quem chamou decide (pronta/falhou = parar; em andamento = seguir)
    return query select v_story, v_estado, null::text; return;
  end if;
  if v.lote_id is not null or v.origem not in ('autor', 'livre', 'upload') then
    return query select null::uuid, null::public.story_estado, 'divisao'; return;
  end if;
  if v.duracao_s is null then
    return query select null::uuid, null::public.story_estado, 'sem_duracao'; return;
  end if;
  if v.duracao_s > privado.max_historia_s() then
    return query select null::uuid, null::public.story_estado, 'longa'; return;
  end if;
  if not privado.livro_editavel(v.book_id) then
    return query select null::uuid, null::public.story_estado, 'livro_fechado'; return;
  end if;
  if not exists (select 1 from public.books b where b.id = v.book_id
                   and b.ia_consentimento_versao >= privado.consentimento_ia_versao()) then
    return query select null::uuid, null::public.story_estado, 'sem_consentimento'; return;
  end if;
  select coalesce(sum(u.minutos_audio), 0) into v_min from public.ai_usage u
    where u.book_id = v.book_id and u.etapa = 'transcrever' and u.criado_em > now() - interval '24 hours';
  if v_min + v.duracao_s / 60.0 > privado.max_minutos_ia_por_dia() then
    return query select null::uuid, null::public.story_estado, 'cota_diaria'; return;
  end if;
  insert into public.stories (book_id, prompt_id) values (v.book_id, v.prompt_id) returning id into v_story;
  insert into public.story_recordings (story_id, recording_id, book_id, ordem)
    values (v_story, p_recording, v.book_id, 1);
  return query select v_story, 'ouvindo'::public.story_estado, null::text;
end $$;

-- Transições permitidas: ouvindo → escrevendo; ouvindo|escrevendo → falhou; falhou → ouvindo.
-- Devolve false se a história não estava num estado de origem válido (nada muda).
create function public.servico_mudar_etapa(p_story uuid, p_para public.story_estado, p_erro_etapa text default null, p_erro text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_para = 'escrevendo' then
    update public.stories set estado = 'escrevendo' where id = p_story and estado = 'ouvindo';
  elsif p_para = 'falhou' then
    update public.stories set estado = 'falhou', erro_etapa = coalesce(p_erro_etapa, 'desconhecida'),
      erro = coalesce(p_erro, 'erro_inesperado'), rascunho = null
    where id = p_story and estado in ('ouvindo', 'escrevendo');
  elsif p_para = 'ouvindo' then
    update public.stories set estado = 'ouvindo', erro_etapa = null, erro = null
    where id = p_story and estado = 'falhou';
  else
    return false;  -- pronta só por servico_concluir_historia
  end if;
  return found;
end $$;

-- Grava a versão 1 (IA) a partir do rascunho guardado no banco e marca tudo como pronto.
create function public.servico_concluir_historia(p_story uuid, p_tamanho text, p_modelos jsonb, p_hash jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.stories; v_titulo text;
begin
  select * into v from public.stories s where s.id = p_story for update;
  if not found then return false; end if;
  if v.estado = 'pronta' then return true; end if;
  if v.estado <> 'escrevendo' or v.rascunho is null or v.rascunho -> 'edicao' is null then return false; end if;
  v_titulo := nullif(left(btrim(coalesce(v.rascunho -> 'edicao' ->> 'titulo', '')), 200), '');
  insert into public.story_versions (story_id, book_id, numero, origem, tamanho, conteudo, marcacoes, modelos, hash_prompts)
    values (p_story, v.book_id, 1, 'ia', p_tamanho, v.rascunho -> 'edicao',
            coalesce(v.rascunho -> 'marcacoes', '[]'::jsonb), p_modelos, p_hash)
    on conflict (story_id, numero) do nothing;
  update public.stories
    set estado = 'pronta', titulo = v_titulo, pronta_em = now(), rascunho = null
    where id = p_story;
  update public.recordings r set processado_em = now()
    from public.story_recordings sr
    where sr.story_id = p_story and r.id = sr.recording_id and r.processado_em is null;
  return true;
end $$;

-- Sugestões de nomes: no máximo 10 por história, saneadas, sem lançar erro (descarta o excesso).
create function public.servico_sugerir_nomes(p_story uuid, p_nomes jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare v_livro uuid; v_item jsonb; v_nome text; v_tipo text; v_n integer := 0;
begin
  select s.book_id into v_livro from public.stories s where s.id = p_story;
  if v_livro is null or jsonb_typeof(p_nomes) <> 'array' then return 0; end if;
  for v_item in select value from jsonb_array_elements(p_nomes) limit privado.max_nomes_por_historia() loop
    v_nome := left(btrim(coalesce(v_item ->> 'nome', '')), 80);
    v_tipo := v_item ->> 'tipo';
    continue when v_nome = '' or v_tipo not in ('pessoa', 'lugar');
    begin
      insert into public.glossary_entries (book_id, tipo, nome, origem_story_id)
        values (v_livro, v_tipo::public.glossario_tipo, v_nome, p_story)
        on conflict (book_id, tipo, chave) do nothing;
      if found then v_n := v_n + 1; end if;
    exception when raise_exception then
      exit;  -- glossario_cheio: para sem derrubar o passo
    end;
  end loop;
  return v_n;
end $$;

-- O navegador marca que alguém viu a história pronta (decide o e-mail, D4).
create function public.marcar_historia_vista(p_story uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.stories s set vista_em = now()
  where s.id = p_story and s.estado = 'pronta' and s.vista_em is null
    and privado.eh_membro(s.book_id);
end $$;

revoke all on function public.servico_iniciar_historia(uuid),
  public.servico_mudar_etapa(uuid, public.story_estado, text, text),
  public.servico_concluir_historia(uuid, text, jsonb, jsonb),
  public.servico_sugerir_nomes(uuid, jsonb),
  public.marcar_historia_vista(uuid),
  public.consentir_processamento_ia(uuid, smallint)
  from public, anon, authenticated, porta_autor;
grant execute on function public.servico_iniciar_historia(uuid),
  public.servico_mudar_etapa(uuid, public.story_estado, text, text),
  public.servico_concluir_historia(uuid, text, jsonb, jsonb),
  public.servico_sugerir_nomes(uuid, jsonb) to service_role;
grant execute on function public.marcar_historia_vista(uuid),
  public.consentir_processamento_ia(uuid, smallint) to authenticated;

-- ── 11. Realtime: canal privado livro:{id}, só leitura e só para membros ───
-- Sem política de insert: só o servidor (chave secreta) publica. O case garante que o
-- cast para uuid só acontece com o tópico já validado (nega sem erro).
create policy "membro ouve o canal do livro" on realtime.messages for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and case
      when (select realtime.topic()) ~ '^livro:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then privado.eh_membro(substring((select realtime.topic()) from 7)::uuid)
      else false
    end
  );
