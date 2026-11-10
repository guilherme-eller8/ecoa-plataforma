# Gravador, área do autor e modo conversa (prompt 5)

Status: rascunho v2 para aprovação, revisado por 2 revisores (T28) · 2026-11-10 · PRD: M4 (sem divisão), M7 (só gravar), M11 (primeira abertura do autor), Design e experiência · Decisões: P2, P8, P12, P26, P27, P33, T5, T6, T15, T16, T25, T27, T28

Relatórios: `gravador-autor-conversa/critic_report.md` (segurança) e `gravador-autor-conversa/codebase_details_report.md` (código). A seção 11 mostra o que mudou por causa de cada um.

## 1. Problema, hipótese e o que está em jogo

A ceia de Natal é o primeiro teste real (P24, P28). Se a gravação da conversa se perder, a família perde a voz do avô e a Ecoa perde o cliente. O gravador é o maior risco técnico do produto no celular.

- **Hipótese 1 (ceia):** o filho grava a conversa no próprio celular, com pergunta no topo ou sem pergunta, e nada se perde, mesmo com sinal ruim e mesmo passando de 1 hora.
- **Hipótese 2 (autor sozinho):** o autor, pelo link do WhatsApp, grava pelo menos 1 resposta sem ajuda.
- **Sinais de sucesso:** o roteiro de aceite passa no iPhone e no Android; nos 2 parceiros de design, 1 gravação do autor pelo link em até 7 dias depois do envio.
- **Critério de morte da hipótese 2:** se nenhum dos 2 autores grava sozinho em 7 dias, a área do autor para aqui, e o esforço vai para o modo conversa (o filho grava ao lado). As telas do prompt 10 só começam depois desse sinal.
- **Evidência que ainda não temos:** nenhum autor real abriu um link pessoal. Hoje a hipótese 2 é suposição.

## 2. Escopo

**Entra:**
- gravador único, para o autor e para o modo conversa:
  - gravar, pausar, retomar, ouvir, regravar, vibração ao iniciar;
  - até 30 min por gravação; no modo conversa, a gravação continua em partes de 30 min até alguém tocar em parar;
- pedaços salvos no IndexedDB durante a gravação e envio TUS retomável depois de *Enviar*;
- recuperação: a gravação interrompida (aba fechada, bateria, ligação) reaparece na próxima abertura, pronta para enviar;
- link pessoal do autor em `/a/[token]`, derivado por HMAC (T25), com troca de link;
- área do autor:
  - primeira abertura com consentimento;
  - "Olá, [apelido]";
  - perguntas enviadas a ele, com foto e o áudio de quem sugeriu;
  - *Contar uma história*;
- *Nova história* do responsável com *Gravar conversa* e *Subir áudios*;
- PWA instalável com `share_target`, para o Android receber áudios do WhatsApp;
- link real do autor no kit de início e em *Enviar ao autor*.

**Não entra:**
- IA, transcrição e divisão em histórias (prompts 6 e 7);
- *Minhas histórias* e *Meu livro* do autor (prompt 10);
- apagar ou editar áudio;
- cópia .m4a para iPhone antigo (prompt 6);
- limite por IP: a família também não tem; os limites ficam no SQL.

## 3. Decisões que preciso de você

| # | Pergunta | Recomendo | Por quê |
| --- | --- | --- | --- |
| D1 | O prompt pede `stories` e `story_recordings` agora. Criar já? | **Adiar para o prompt 6.** Nesta etapa toda gravação fica em `recordings`, "aguardando processamento", como no 5A | P27: quem decide se 1 gravação vira 1 ou 4 histórias é a IA, não a porta de entrada. Criar a tabela agora, sem ninguém escrever nela, é schema morto que o prompt 6 vai alterar de novo. Nenhuma tela do prompt 5 lê história |
| D2 | O prompt pede upload de até 100 MB | **Manter 50 MB** (T27; o PRD M4 já diz 50) | 30 min a 48 kbps dá cerca de 11 MB. 100 MB só no plano Pro |
| D3 | Quais perguntas o autor vê? | **Só as enviadas a ele** (estado `enviada`) | P33: a lista é a base do livro, e o filho pode querer perguntar ao vivo na ceia. *Enviar ao autor* passa a ser o gesto que libera a pergunta para ele |
| D4 | O que acontece com a gravação interrompida (aba fechada, bateria)? | **Reaparece com 1 botão *Enviar*; não sobe sozinha** | O autor pode não querer mandar um pedaço cortado. Com 1 toque, nada se perde |
| D5 | O que fazer quando a conversa passa de 30 min? | **Continuar sozinho em partes de 30 min**, ligadas pelo mesmo `lote_id`, sem parar o microfone. O autor continua com teto de 30 min | Na ceia ninguém olha o celular. Cortar aos 30 min perderia a segunda metade da conversa |
| D6 | Ordem de entrega dentro da sessão | **A → B → C**, com commit por fase. Se o tempo acabar, C vira uma sessão curta | A (gravador + modo conversa) é o caminho da ceia; B (autor) depende de uma hipótese sem evidência; C (PWA) só serve ao Android |

**Fases de entrega:**
- **A.** Migration, gravador resiliente e modo conversa: é o que a ceia precisa.
- **B.** Link e área do autor, kit e *Enviar ao autor*.
- **C.** PWA e `share_target`.

## 4. Fatos que moldam o desenho

| Fato | Consequência |
| --- | --- |
| A produção tem 3 linhas em `recordings` (todas `upload`) e 0 em `author_access`. A migration `20261113120000_enquete_por_fase` está aplicada, mas fora do histórico do Supabase | Só `alter`, nunca recriar. Não reaplicar a de enquete por fase. A nova é `20261114120000` |
| **Conferido no banco real:** `postgres` não é superusuário e tem `porta_autor` com `admin_option`, mas sem `set_option`; `porta_autor` não tem `CREATE` em `public` nem em `privado`. O PGlite dos testes roda como superusuário e esconde isso | A migration concede `SET` e `CREATE` só pelo tempo de transferir o dono das funções, e depois revoga o `CREATE` |
| `author_access` não tem `chave_versao` | Coluna nova com default 1, para derivar o link por HMAC como o da família (T25) |
| T5: `porta_autor` não tem privilégio em `causos`, e o teste `autor-isolamento` prova isso | O nome e o áudio de quem sugeriu são copiados para `prompts` quando o causo vira pergunta. O autor lê só `prompts` |
| O Safari grava em `audio/mp4` (AAC); Chrome e Firefox, em `audio/webm;codecs=opus`. O bucket `audios` aceita os dois | Extensão `.m4a` ou `.webm`, conforme o navegador. O núcleo do gravador não usa mais o fallback `ogg` |
| `MediaRecorder.start(1000)` entrega 1 pedaço por segundo, e os pedaços concatenados formam um arquivo válido | Cada pedaço vai para o IndexedDB na hora, e uma gravação cortada no meio continua tocável |
| No iPhone, a tela apagando ou a troca de app suspende o microfone, e o Wake Lock cai quando a página fica oculta | Wake Lock durante a gravação, pedido de novo ao voltar. Página oculta: pausa e salva; ao voltar, mostra *Continuar* |
| O Safari apaga o IndexedDB de site não instalado depois de 7 dias sem uso | O envio começa logo depois de *Enviar*, e `navigator.storage.persist()` é pedido. Só perde se o aparelho ficar 7 dias sem internet |
| O token de upload assinado pelo Supabase expira em 2 h | Cada retomada pede um token novo (`reassinarAudio` para o responsável, `assinarGravacao` para o autor) |
| O plano grátis do Supabase tem 1 GB de storage no total | Cerca de 90 gravações de 30 min, somando todas as famílias. Ver Riscos |
| A família já usa "função com token, caminho fixo no banco, upload assinado pelo servidor"; `proxy.ts` desvia `/f/` sem sessão, com `Referrer-Policy: no-referrer` | O autor segue o mesmo padrão. `/a/` entra no mesmo desvio do `proxy.ts`. Nenhuma política em `storage.objects` |

## 5. Banco de dados

**Subida:** `supabase/migrations/20261114120000_gravador_autor.sql`

```sql
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

  -- Busca sem RLS de livro: um id de outro livro precisa dar dados_invalidos, não 23505.
  if exists (select 1 from public.recordings r where r.id = p_id) then
    select r.upload, r.caminho, r.criado_em into v from public.recordings r
    where r.id = p_id and r.book_id = v_livro and r.author_access_id is not null;
    if not found then raise exception 'dados_invalidos'; end if;
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
```

**Reversão:** `supabase/reversao/20261114120000_gravador_autor.down.sql`, em duas partes.

```sql
-- Parte A, sempre segura: tira funções, políticas e privilégios do autor e devolve as regras do 5A.
-- Não toca em colunas nem em dados. Nenhum áudio é apagado em nenhum caso.
drop function if exists public.servico_trocar_link_autor(uuid, uuid, uuid, text, smallint);
drop function if exists public.servico_confirmar_gravacao_autor(text, uuid, bigint);
drop function if exists public.servico_caminho_gravacao_autor(text, uuid);
drop function if exists public.autor_preparar_gravacao(text, uuid, uuid, text, bigint, integer);
drop function if exists public.autor_consentir(text, smallint);
drop function if exists public.autor_pagina(text);
drop function if exists privado.acesso_do_autor(text);

drop policy if exists "porta do autor grava" on public.recordings;
drop policy if exists "porta do autor" on public.recordings;
drop policy if exists "porta do autor" on public.photos;
drop policy if exists "porta do autor" on public.prompts;
drop policy if exists "porta do autor consente" on public.books;
drop policy if exists "porta do autor" on public.books;
drop policy if exists "porta do autor" on public.author_access;
revoke all on public.author_access, public.books, public.prompts, public.photos, public.recordings from porta_autor;
revoke execute on function privado.livro_editavel(uuid), privado.max_audio_bytes() from porta_autor;
drop function if exists privado.livro_do_autor_atual();
drop function if exists privado.max_gravacao_s();
drop function if exists privado.max_bytes_autor_por_dia();
drop function if exists privado.max_gravacoes_autor_por_dia();
revoke usage on schema public, privado from porta_autor;

create or replace function public.servico_confirmar_audio(p_id uuid, p_tamanho_bytes bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
declare v public.recordings;
begin
  update public.recordings r set upload = 'recebido', recebido_em = now()
  where r.id = p_id and r.upload = 'enviando' and r.tamanho_bytes = p_tamanho_bytes
    and r.criado_em > now() - interval '24 hours'
  returning * into v;
  if not found then return false; end if;
  if v.prompt_id is not null then
    update public.prompts set estado = 'respondida'
    where book_id = v.book_id and id = v.prompt_id and estado in ('para_enviar', 'enviada');
  end if;
  return true;
end $$;

drop policy "membro cria com plano ativo" on public.recordings;
create policy "membro cria com plano ativo" on public.recordings for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id)
              and upload = 'enviando' and origem = 'upload');

drop trigger if exists prompts_copiar_sugestao on public.prompts;
drop function if exists privado.copiar_sugestao();
drop trigger if exists author_access_revogacao on public.author_access;

-- Parte B, só sem dados do prompt 5: tira as colunas. Com dados, avisa e mantém
-- (consentimento é prova de LGPD; gravação do autor e chave_versao > 1 não podem sumir).
do $$ begin
  if exists (select 1 from public.recordings where author_access_id is not null or lote_id is not null
               or origem in ('lote', 'conversa'))
     or exists (select 1 from public.books where autor_consentimento_em is not null)
     or exists (select 1 from public.author_access where chave_versao > 1) then
    raise notice 'Há dados do prompt 5: colunas mantidas. Reversão das colunas só à mão.';
    return;
  end if;
  alter table public.recordings drop constraint recordings_lote_so_em_lote_ou_conversa,
    drop constraint recordings_lote_tem_id, drop constraint recordings_autor_tem_link,
    drop column lote_id, drop column author_access_id;
  alter table public.prompts drop column sugestao_audio_caminho, drop column sugestao_nome;
  alter table public.books drop constraint books_consentimento_completo,
    drop column autor_consentimento_versao, drop column autor_consentimento_em;
  alter table public.author_access drop column chave_versao;
end $$;
```

**Por que assim:**
- **Dono `porta_autor` e livro fixado na transação:** a defesa tem duas camadas. Privilégio: o autor não tem grant em nada da família (T5). Política: mesmo com bug numa função futura, `porta_autor` só vê linhas do livro cujo token foi validado.
- **`SET` e `CREATE` concedidos na própria migration:** sem eles, o `alter function ... owner` falha no Supabase. O `CREATE` é revogado no fim; o `SET` fica, e é só o `postgres` que pode assumir `porta_autor`.
- **Id da gravação gerado no aparelho:** `autor_preparar_gravacao` fica idempotente. Uma queda de rede na resposta não cria linha duplicada, e o TUS usa o mesmo id para retomar. Se a linha venceu (7 dias), o aparelho recebe `gravacao_expirada`, gera id novo e reenvia o mesmo arquivo. Se já foi recebida, recebe `recebida: true` e apaga os pedaços locais.
- **Tetos do link público:** 30 gravações e 300 MB por livro por dia, até 5 gravações subindo ao mesmo tempo, e tamanho coerente com a duração (até 160 kbps). Um link vazado gasta no máximo 300 MB por dia, e o responsável troca o link.
- **Pergunta só se `enviada`:** o autor não alcança pergunta que o responsável não liberou (D3), nem por id adivinhado.
- **O modo conversa usa o fluxo do 5A** (`prepararAudios` → TUS → `confirmarAudio`) com `origem = 'conversa'` e um `lote_id` por conversa. Não precisa de função nova.
- **`lote_id`** guarda quais arquivos subiram juntos, ou quais partes formam uma conversa, para a divisão do prompt 7. Um arquivo só continua `upload`.

## 6. Gravador (código do aparelho)

**Núcleo extraído do `GravadorCauso`.** `components/familia/gravador-causo.tsx` já tem o ciclo do MediaRecorder (tipo suportado, `start(1000)`, vibrar, pausar, retomar, concluir, cronômetro). Esse ciclo vai para `lib/gravacao/gravador.ts`, com dois parâmetros: o limite (3 ou 30 min) e o destino dos pedaços (memória ou IndexedDB). O `GravadorCauso` passa a usar o núcleo, sem IndexedDB. O kbps vem de `CAUSO_AUDIO_KBPS`, renomeado para `GRAVACAO_KBPS = 48`.

**Arquivos novos:**
- `lib/gravacao/local.ts`: IndexedDB `ecoa-gravacoes`, com o pacote `idb` (~1 KB):
  - `gravacoes`: `{ id, destino: {tipo: 'autor', token} | {tipo: 'livro', livroId}, promptId?, loteId?, parte?, mime, ext, segundos, estado: 'gravando' | 'pronta' | 'enviando' | 'enviada' | 'parada', preparado?: {id, caminho}, criadaEm }`;
  - `pedacos`: `{ gravacaoId, seq, blob }`, com chave `[gravacaoId, seq]`;
- `lib/gravacao/envio.ts`: fila de envio, uma por aparelho;
- `components/gravacao/gravar.tsx`: tela do gravador, que compõe `components/ui/gravador`.

**Gravar:**
1. `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false } })`. A supressão de ruído fica desligada porque corta voz fraca de idoso.
2. Tipo `audio/webm;codecs=opus`, senão `audio/mp4`. Sem `ogg`.
3. As escritas no IndexedDB passam por uma fila serial. O estado `pronta` só é gravado depois que o último `dataavailable` (o que vem depois do `stop()`) foi salvo.
4. Se uma escrita falhar (`QuotaExceededError`, aba privada do Safari), a gravação para com segurança e aparece: "Sem espaço no celular. O que foi gravado até aqui está guardado."
5. Vibra ao iniciar. Wake Lock enquanto grava, pedido de novo no `visibilitychange`. `navigator.storage.persist()` pedido no início.
6. Pausar e retomar. **Autor:** aos 29 min aparece 1 linha de aviso, e aos 30 o gravador conclui sozinho. **Conversa:** aos 30 min, a parte fecha e outra começa no mesmo `stream`, com o mesmo `lote_id`. O cronômetro continua.
7. Página oculta durante a gravação: pausa e salva. Se o MediaRecorder morrer (`error`, ou a faixa termina por causa de uma ligação), conclui com o que tem e marca `pronta`.
8. *Ouvir* junta os pedaços num Blob e toca. *Gravar de novo* pede confirmação ("Apagar esta gravação?") e apaga os pedaços.

**Enviar** (`envio.ts`):
1. `pronta` → `enviando`. A gravação ainda não tem `preparado`? Prepara:
   - autor: `autor_preparar_gravacao`;
   - responsável: `prepararAudios`, guardando em `preparado` o id e o caminho devolvidos.
2. Token de upload novo a cada tentativa:
   - autor: `assinarGravacao`;
   - responsável: `reassinarAudio`, que já existe.
3. TUS por `lib/audios/tus.ts`, que ganha o parâmetro `fingerprint` (= id da gravação local). Sem isso, um Blob remontado não retoma. As esperas (`ESPERAS`) continuam as mesmas.
4. O evento `online` e a abertura da página retomam o que ficou `enviando`.
5. Ao terminar, a confirmação:
   - autor: `confirmarGravacao`, que chama `servico_confirmar_gravacao_autor`;
   - responsável: `confirmarAudio`, que já existe.
   O servidor confere o objeto no Storage. Só então a gravação passa a `enviada`, e os pedaços são apagados.
6. Erros permanentes:
   - `gravacao_expirada`: a gravação ganha id novo e é preparada de novo;
   - `link_invalido`: estado `parada`, com "Este link foi trocado. Sua gravação está guardada aqui." e *Salvar no celular* (download do arquivo);
   - `limite_gravacoes`: tenta de novo em 1 hora.

**Recuperação:** ao abrir a área do autor ou *Gravar conversa*, toda gravação `gravando` (a aba morreu no meio) vira `pronta`, com a duração somada dos pedaços. Aparece um cartão: "Achamos uma gravação de 4 min que não foi enviada.", com *Enviar* (D4). As gravações `pronta` e `enviando` voltam para a fila sozinhas.

**Por que não enviar durante a gravação:** com modo avião no meio, o envio em tempo real só falharia e tentaria de novo. Gravar no aparelho e enviar depois é mais simples e cumpre "nenhuma gravação se perde": o arquivo fica inteiro no aparelho até o servidor confirmar.

## 7. Telas

**Autor** (`/a/[token]`, sem login). Regras do autor: pergunta com 28 px, texto com 20 px, alvos de 56 px e botão de gravar de 120 px.
- **Primeira abertura** (sem consentimento):
  - "Toque no círculo e conte. Pode pausar quando quiser.";
  - "Suas histórias vão virar um livro para a sua família. Podemos guardar a sua voz para isso?";
  - botão *Sim, pode guardar*, que registra o consentimento e o evento `autor_consentiu`.
- **Início:**
  - "Olá, Jair";
  - botão principal *Contar uma história*;
  - abaixo, as perguntas enviadas, uma por cartão, com a foto quando houver;
  - estado vazio: "Nenhuma pergunta por enquanto." O botão *Contar uma história* continua na tela.
- **Gravar** (`/a/[token]/gravar` e `/a/[token]/gravar/[pergunta]`):
  - pergunta no topo, foto, "A Ana pediu:" com o áudio de quem sugeriu, e o gravador;
  - depois de concluir: player, *Enviar* e *Gravar de novo*;
  - ao enviar: "Guardando sua história…" e, ao fim, "Pronto. Sua história chegou." com *Voltar*;
  - sem internet: "Sem internet agora. Sua gravação está guardada e sobe sozinha."
- **Link inválido ou trocado:** "Este link não vale mais. Peça um novo a quem está fazendo o seu livro." É uma frase própria do autor; a da família continua "Peça o novo no grupo".
- **Plano vencido:** "Este livro está fechado para novas gravações."
- **Leitura da página:**
  - um Server Component chama `autor_pagina` com o cliente anônimo, sempre sem sessão (um responsável logado abrindo o link também funciona);
  - só se a resposta não for nula, o servidor assina por 1 h os caminhos de foto (`acervo`) e de áudio da sugestão (`causos`) que a própria função devolveu;
  - o servidor nunca assina caminho que vem do navegador;
  - `assinar()` sai de `lib/livro/dados.ts` para `lib/storage/assinar.ts`.
- **`proxy.ts`:** `/a/` segue o mesmo desvio de `/f/`: sem `getClaims()`, com `Referrer-Policy: no-referrer` e `X-Robots-Tag: noindex`, e `/a/:path*` entra no `matcher`. A rota não carrega script nem fonte de terceiros.
- **Dica de primeira vez:** nenhuma; a frase da primeira abertura já explica o círculo.

**Responsável:**
- **Nova história** (`tela-nova-historia.tsx`, que já existe): ganha *Gravar conversa* ao lado de *Subir áudios*.
- **Gravar conversa** (`/livro/[id]/historias/gravar`):
  - passo 1: escolher a pergunta, com *Conversa livre, sem pergunta* no topo e depois *Para perguntar* e *Enviadas* (reaproveita o filtro da página *Nova história*);
  - passo 2: o gravador com a pergunta no topo;
  - ao enviar, volta para *Áudios recebidos*;
  - dica de primeira vez: "Deixe o celular na mesa, perto de quem fala."
- **Áudios recebidos:** mostra a origem: "Gravado pelo Jair", "Conversa" ou "Enviado por você".
- **Perguntas e kit:**
  - *Enviar ao autor* manda o link da pergunta (`…/a/<token>/gravar/<id>`), montado no cliente a partir da base do link;
  - o kit manda o link do início;
  - *Trocar link do autor* fica no kit, com confirmação.
  - O link é criado pela ação `pegarLinkDoAutor`, nunca na renderização, como o da família.

**PWA (fase C):**
- `app/manifest.ts` com `share_target` (`POST /compartilhar`, `multipart/form-data`, `audio/*`);
- um service worker mínimo (`public/sw.js`) que só trata esse POST: guarda os arquivos no IndexedDB e redireciona para `/compartilhar`;
- a página pede o livro, se houver mais de um, e passa os arquivos para *Subir áudios* (`SubirAudios.inicial`, que já existe);
- o service worker não guarda páginas em cache: nada de app offline nesta etapa.

## 8. Arquivos

**Novos:**
- `supabase/migrations/20261114120000_gravador_autor.sql` e `supabase/reversao/20261114120000_gravador_autor.down.sql`;
- `lib/gravacao/gravador.ts`, `lib/gravacao/local.ts` e `lib/gravacao/envio.ts`, com testes;
- `components/gravacao/gravar.tsx`;
- `lib/autor/tipos.ts` (tipos do jsonb de `autor_pagina` e `autor_preparar_gravacao`);
- `lib/storage/assinar.ts` e `lib/links-comum.ts` (`tokenValido` e `LINK_INVALIDO`, hoje em `app/f/[token]/acoes.ts`);
- `app/a/[token]/page.tsx`, `app/a/[token]/gravar/page.tsx`, `app/a/[token]/gravar/[pergunta]/page.tsx` e `app/a/[token]/acoes.ts` (`consentir`, `prepararGravacao`, `assinarGravacao`, `confirmarGravacao`);
- `components/telas/tela-autor.tsx` e `components/telas/tela-gravar-conversa.tsx`;
- `app/livro/[id]/historias/gravar/page.tsx`;
- fase C: `app/manifest.ts`, `public/sw.js` e `app/compartilhar/page.tsx`.

**Alterados:**
- `lib/config.ts`: `GRAVACAO_KBPS` (antes `CAUSO_AUDIO_KBPS`), `MAX_GRAVACOES_AUTOR_DIA = 30`, `MAX_MB_AUTOR_DIA = 300`, `CONSENTIMENTO_AUTOR_VERSAO = 1`;
- `lib/supabase/tipos.ts`: gerar de novo e atualizar o cabeçalho de ajustes manuais;
- `lib/erros-banco.ts`: frases de `pergunta_invalida`, `limite_gravacoes` e `gravacao_expirada`;
- `lib/eventos-acoes.ts`: `autor_consentiu`, `gerou_link_autor` e `trocou_link_autor`. A gravação usa o `gravou` que já existe, com `{ recording, origem, com_pergunta }`;
- `lib/links.ts`: `linkDoAutor()` sai, e entra `urlAutor(token)`;
- `lib/livro/dados.ts`: `linkDoAutor(livro)` só lê (como `linkDaFamilia`); `audiosDoLivro` passa a selecionar `origem`; `assinar` sai do arquivo;
- `lib/livro/tipos.ts`: `AudioDaTela.origem`, `AcoesKit` e `AcoesAudios` (`origem` e `loteId`);
- `app/livro/[id]/acoes.ts`:
  - `pegarLinkDoAutor` e `trocarLinkDoAutor`;
  - `esquemaAudios` e `prepararAudios` aceitam `origem` e `loteId`; `conversa` exige 1 arquivo; `lote` quando há mais de 1;
- `app/livro/[id]/ligar-acoes.ts`, `components/audios/subir-audios.tsx` e `lib/exemplos/prompt5a.ts`;
- `app/livro/[id]/kit/page.tsx`, `app/livro/[id]/perguntas/page.tsx`, `components/telas/tela-kit.tsx` e `components/telas/tela-perguntas.tsx`: link do autor real, ou estado "gerar link";
- `components/telas/tela-nova-historia.tsx`, `components/telas/tela-audios.tsx` e `app/livro/[id]/audios/page.tsx`;
- `components/familia/gravador-causo.tsx` (usa o núcleo) e `components/ui/gravador.tsx` (o comentário "sem MediaRecorder" sai);
- `lib/audios/tus.ts` (parâmetro `fingerprint`);
- `proxy.ts` (`/a/`);
- `lib/exemplos/prompt4.ts` e `app/(dev)/styleguide/[tela]/vitrine.tsx` (exemplos e as telas novas);
- `app/a/em-breve/` é removida.

## 9. Testes

**Banco (Vitest + PGlite):**
- o token do autor só alcança o próprio livro; um token revogado não alcança nada;
- como `porta_autor`, com `ecoa.livro` fixado no livro A, nenhuma linha do livro B aparece em `books`, `prompts`, `photos` e `recordings`;
- `autor_preparar_gravacao` recusa:
  - sem consentimento;
  - pergunta `para_enviar` ou de outro livro;
  - id de gravação de outro livro (inclusive linha sem `author_access_id`);
  - livro fechado;
  - acima de 30 gravações, ou de 300 MB, ou de 5 subindo;
  - tamanho incoerente com a duração;
  - `p_ext` nulo;
- repetir `autor_preparar_gravacao` com o mesmo id:
  - devolve a mesma linha;
  - linha recebida volta com `recebida: true`;
  - linha com mais de 7 dias dá `gravacao_expirada`;
- `servico_confirmar_gravacao_autor` recusa token de outro livro;
- `copiar_sugestao` preenche nome e áudio, e o membro não consegue escrever essas colunas;
- membro não insere `origem = 'autor'`;
- `lote` sem `lote_id` é recusado, e `upload` com `lote_id` também;
- reversão: a parte A roda sempre; a parte B só tira colunas sem dados; o banco completo continua revertendo até o fim (`rls.test.ts`).

**Testes que mudam:**
- `supabase/tests/audios.test.ts:239`: `porta_autor` agora lê `id` de `recordings`. O teste passa a conferir que ele não lê `titulo` nem linhas sem `author_access_id`;
- `supabase/tests/audios.test.ts:135`: "outra origem é recusada" vira a matriz de origem e lote;
- `supabase/tests/autor-isolamento.test.ts`:
  - acha as funções pelo dono (`porta_autor`), não só pelo prefixo `autor_`;
  - compara a lista de privilégios de `porta_autor` (`information_schema.column_privileges`) com a lista esperada, exatamente;
- `supabase/tests/config-banco.test.ts`: as 3 funções novas de `privado`.

**Unidade:** fila de envio (estados, retomada, recuperação de `gravando`, `gravacao_expirada`, `link_invalido`); escolha do tipo e da extensão; fila serial do IndexedDB.

**Ponta a ponta (Playwright, Chromium com microfone falso):**
- gravar 5 s, pausar, retomar e enviar;
- recarregar no meio da gravação e ver o cartão de recuperação;
- ficar offline durante o envio e ver a retomada ao voltar;
- responsável logado abrindo o link do autor.

**Aplicar a migration numa branch do Supabase antes da produção**, porque o PGlite é superusuário e não testa a troca de dono.

**Roteiro manual de aceite**, entregue junto, para iPhone (Safari) e Android (Chrome):
- gravar 10 min com o modo avião ligado no meio;
- fechar a aba durante a gravação e reabrir;
- bloquear a tela;
- receber uma ligação no meio;
- gravar uma conversa de 35 min (vira 2 partes);
- compartilhar 3 áudios do WhatsApp (só Android).

## 10. Riscos

| Risco | Tamanho | O que fazer |
| --- | --- | --- |
| **O storage de 1 GB acaba** (cerca de 90 gravações de 30 min, somando todas as famílias) | Alto, na ceia | Contratar o plano Pro (US$ 25/mês, 100 GB) antes de 20/12. A decisão é sua, fora do código |
| O iPhone suspende o microfone com a tela apagada | Médio | Wake Lock, mais pausar e salvar ao ocultar. O roteiro testa |
| Objeto enviado mas não confirmado fica no Storage | Baixo | Invisível e contado no teto do dia. A limpeza (sem tocar em nada confirmado) fica para o job do prompt 6 |
| O Safari apaga o IndexedDB depois de 7 dias sem uso | Baixo | Envio imediato; só perde se o aparelho ficar 7 dias offline |
| WebM gravado no Android não toca em iPhone antigo | Baixo | Cópia .m4a no prompt 6 |
| A sessão fica longa e cara (T28) | Médio | Fases A → B → C, com commit por fase |

## 11. O que mudou com a revisão

**Segurança** (`critic_report.md`):

| Achado | Resposta |
| --- | --- |
| 1. A troca de dono falharia no Supabase | **Aceito.** Conferi no banco real: falta `SET` e `CREATE`. A seção 0 da migration concede e depois revoga o `CREATE`. Aplicar antes numa branch |
| 2. Gravação presa depois de 7 dias | **Aceito.** `gravacao_expirada`, e o aparelho gera id novo e reenvia |
| 3. O teto não limitava bytes | **Aceito.** 300 MB por dia, 5 subindo ao mesmo tempo, e tamanho coerente com a duração |
| 4. Políticas `using (true)` | **Aceito.** `ecoa.livro` fixado depois do token; só `author_access` fica sem filtro, porque a busca pelo hash é a autenticação |
| 5. A confirmação não conferia o token | **Aceito.** `servico_confirmar_gravacao_autor` |
| 6. O teste de isolamento não via todas as funções | **Aceito.** Detecção pelo dono e lista exata de privilégios |
| 7. Trocar o link perdia a gravação local | **Aceito.** Estado `parada` e *Salvar no celular* |
| 8. A ceia passa de 30 min | **Aceito**, como decisão D5 (partes encadeadas) |
| 9. IndexedDB cheio, ordem das escritas, token que expira, Wake Lock | **Aceito.** Seção 6 |
| 10. A reversão travava ou apagava o consentimento | **Aceito.** Duas partes; a B só tira colunas sem dados |
| 11. Erros pequenos de SQL | **Aceito.** `p_ext` nulo, lock antes da busca, `returns table`, cliente sempre sem sessão |
| 12. Referer e quem assina foto e áudio | **Aceito.** `proxy.ts` e assinatura só do que `autor_pagina` devolve |

**Código** (`codebase_details_report.md`):

| Achado | Resposta |
| --- | --- |
| 1. A família não tem limite por IP | **Aceito.** Frase removida; os limites ficam no SQL |
| 2. A reversão deixava `execute` e quebrava o `drop role` | **Aceito.** `revoke execute` na parte A |
| 3. Troca de dono só funcionava no PGlite | Igual ao achado 1 da segurança |
| 4. Testes existentes que quebram | **Aceito.** Lista em "Testes que mudam" |
| 5. `config-banco` e `erros-banco` | **Aceito** |
| 6. `tipos.ts` | **Aceito** |
| 7. `linkDoAutor` criando link na renderização | **Aceito.** Só lê; quem cria é a ação. Consumidores listados |
| 8. Reimplementar o `GravadorCauso` | **Aceito.** Núcleo extraído e compartilhado; `ogg` removido |
| 9. TUS sem impressão digital própria; id do responsável | **Aceito.** Parâmetro `fingerprint`, `preparado` no IndexedDB e `reassinarAudio`/`confirmarAudio` reaproveitados |
| 10. Ninguém assinava foto e áudio | **Aceito.** Seção 7 |
| 11. `proxy.ts` | **Aceito** |
| 12. Arquivos esquecidos | **Aceito.** Seção 8 |
