# Editor de histórias, parte 1 (prompt 8)

Status: **aprovado pelo Guilherme em 2026-11-13** (E1, E2 e E3 como recomendado; P48, P49 e T41) · implementado no mesmo dia · 2026-11-13 · PRD: M6, Design e experiência, M11 (dicas) · Decisões: P23, P25, T8, T12, T18, T24, T28, T31, T36

Prompt sem [EGM], mas com banco: plano curto + SQL de subida e reversão para o OK (CLAUDE.md). Sem revisores (T28). A revisão de segurança foi feita por mim na seção 6, e o SQL foi ensaiado num Postgres em memória com as migrations reais (seção 7).

## 1. Problema, hipótese e risco

Hoje a história pronta só pode ser lida. A família não corrige um nome errado, não tira um grifo *Confira*, não põe foto. Sem isso, a versão corrigida, que mede a qualidade da IA (T31), não existe.

- **Usuário:** André, corrigindo as primeiras histórias do Nelson, no celular e no computador.
- **Hipótese:** com o áudio ao lado e o grifo *Confira*, o André corrige uma história de 5 min em menos de 10 min, sem perder nada.
- **Métrica:** tempo do 1º salvamento até *Marcar como pronta*; parágrafos editados por história (sai de graça das versões, T31).
- **Critério de morte:** o André reescreve mais de 50% do texto em 3 histórias seguidas (já é o critério do PRD); ou alguma edição se perde. No primeiro caso, a prioridade volta para o prompt da edição, não para o editor.
- **Risco que você não está vendo:** o aceite do prompt 6 (leitura de fidelidade pelo André) segue aberto. O editor deixa ele *corrigir* invenções, mas a métrica que importa é quantas ele precisa corrigir. Não use "o editor está bom" como sinal de que a IA está boa.

## 2. Escopo

**Entra:** os 8 itens do prompt.
1. Tela da história com áudio + transcrição navegável e texto editável (Tiptap); no celular, abas *Texto* e *Áudio*.
2. Cada parágrafo guarda id, segmentos de origem (`fontes`) e se foi editado à mão (`editado`, base para o travamento do prompt 9).
3. *Confira* grifado; some ao editar o trecho ou ao tocar *Está certo*.
4. Salvamento automático, versões com a origem e tela de histórico com *Restaurar*.
5. `edit_locks` e "Ana está editando", com expiração de 2 min sem atividade.
6. Título, ano e até 4 fotos (acervo ou novas), legenda e alerta abaixo de 1200 px no lado menor.
7. *Marcar como pronta*.
8. Dicas de primeira vez: tocar numa frase para ouvir; restaurar uma versão.

**Não entra:** tamanho, revisar trecho e acrescentar áudio (prompt 9); o autor corrigindo o texto (prompt 10); edição simultânea de verdade (é trava, não colaboração).

## 3. Decisões que preciso de você

| # | Decisão | Recomendo | Por quê |
| --- | --- | --- | --- |
| E1 | **SQL abaixo (seção 5)** | Aprovar | Ensaiado: trava, salvar, restaurar, fotos, isolamento e reversão |
| E2 | **A lista "Seu livro em 5 passos" não existe no código.** O prompt 4 entregou só o cartão "Continuar a configuração". O item 7 pede concluir o passo 5 de uma lista que não está lá | Gravar `stories.revisada_em` e o evento `historia_revisada` agora; o cartão dos 5 passos vira um prompt curto depois (calculado dos dados, sem banco novo) | Os 2 parceiros de design têm você do lado: o cartão é onboarding de cliente sem ajuda, que ainda não existe. Construir a home agora é escopo fora do editor |
| E3 | **Tocar numa frase:** o toque põe o cursor (para corrigir) e mostra um botão *Ouvir* colado na frase; 1 toque nele toca o trecho | Botão *Ouvir* | Se o toque já tocasse o áudio, quem só quer corrigir uma letra ouviria a frase toda vez. Na aba *Áudio*, tocar num trecho da transcrição toca direto |

## 4. Como funciona

**Texto atual e versões.** `story_versions` continua só insert (T36). O texto que muda a cada salvamento fica em `stories.texto`. Uma versão nova nasce quando a sessão de edição fecha (saiu da tela, ficou 2 min parado, outra pessoa ou outra tela assumiu), a cada 10 min de edição contínua, ao restaurar e ao marcar como pronta. Nada fica fora de uma versão por mais de 10 min, e o histórico não vira uma lista de 300 salvamentos. O histórico mostra o *Texto atual* no topo quando ele ainda não virou versão.

**Origem.** `ia`, `responsavel` ou `cofacilitador`, pelo papel de quem salvou; `autor` chega no prompt 10. Restaurar cria uma versão nova com `restaurada_de` = número da versão escolhida ("Restaurada da versão de 13 nov, 14:02"). A versão da IA (nº 1) nunca muda.

**Salvamento automático.** 1,5 s depois da última tecla (no máximo 5 s digitando sem parar). Selo "Salvando…" / "Salvo". O navegador manda o `texto_rev` que viu; se outra tela salvou antes, o banco recusa (nada é sobrescrito sem ver). Enquanto o servidor não confirma, o texto fica guardado no aparelho (localStorage); sem internet, a tela diz "Sem internet. Guardado neste aparelho" e tenta de novo. Ao reabrir, se sobrou texto não salvo, ele volta sozinho (mesma base) ou aparece *Recuperar o texto deste aparelho* (base diferente).

**Trava.** Abrir a história pronta, com o plano ativo, pega a trava. Ela é renovada por atividade (tecla, toque) no máximo a cada 30 s e expira 2 min depois da última. A trava é da *tela* (aba), não da pessoa: com o mesmo login em dois navegadores, o segundo também vê "Você está editando em outra tela", com *Editar aqui* (assume; a outra tela fica só leitura). Outra pessoa vê "Ana está editando", com o texto só para ler, e a tela consulta a cada 15 s; quando solta, aparece *Editar agora* (ninguém pega a trava sem querer só por estar olhando). O banco confere a trava em todo salvamento e em todo restaurar, não só a tela. O nome vem do Google (primeiro nome); sem nome, "Alguém da família".

**Parágrafos e grifos no Tiptap.** Parágrafo com atributos `id`, `fontes` e `editado`. Enter divide: as duas metades herdam as fontes, a nova ganha id novo. Juntar parágrafos une as fontes. *Confira* é uma marca: mudou qualquer letra do trecho grifado, o grifo sai; tocar no grifo abre a folha com o motivo, *Ouvir o trecho* e *Está certo* (tira o grifo). Os grifos restantes são salvos com a posição recalculada.

**Frase → áudio.** Sem tempo por frase no banco: a frase tocada é comparada (palavras em comum) com os segmentos de origem do parágrafo, e toca o segmento mais parecido; empate ou nada parecido, o 1º segmento do parágrafo. Função pura, com teste.

**Transcrição navegável.** Os segmentos da história (só os dela, no caso de divisão), com quem fala (nome do autor ou "Entrevistador", pela estruturação) e o minuto. Tocar toca; o trecho tocando fica destacado e a lista acompanha. No computador, o cursor num parágrafo destaca os segmentos de origem dele.

**Fotos.** Tabela `story_photos` (até 4 por história, conferido no banco). Escolher do acervo ou subir novas (o mesmo envio do acervo). Legenda é a de `photos` (a mesma foto tem a mesma legenda em todo lugar). Abaixo de 1200 px no lado menor: "Pequena para imprimir bem." Tirar a foto da história não apaga do acervo.

**Marcar como pronta.** Grava `revisada_em` e o evento `historia_revisada`; o cartão da história mostra "Pronta". *Voltar para rascunho* desfaz. Não exige a trava. Estados do M6: `processando` = ouvindo/escrevendo/dividindo/separar; `rascunho` = pronta sem `revisada_em`; `pronta` = com `revisada_em`.

**Quem lê o texto atual.** A lista de histórias, a home e a tela da história passam a mostrar `stories.texto` (ou a última versão, se ninguém editou). O `--baixar` do laboratório baixa a versão da IA *e* a corrigida, para o `--comparar`.

**Telas.**
- `/livro/[id]/historias/[historiaId]`: no celular, título, abas *Texto* | *Áudio*, barra do player no rodapé. No computador, duas colunas (áudio e transcrição à esquerda, fixos; texto à direita). Ação principal: *Marcar como pronta*, no fim do texto. *Histórico* discreto no topo. Fotos depois do texto.
- `/livro/[id]/historias/[historiaId]/versoes`: lista (data, quem/origem, "Restaurada de…"), tocar abre a prévia com *Restaurar esta versão*. Dica: "Restaurar não apaga nada: o texto de agora fica guardado."
- Estado vazio: história ainda sendo escrita mostra a tela atual do prompt 6 (sem editor).

## 5. SQL

### Subida: `supabase/migrations/20261118120000_editor.sql`

```sql
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
```

### Reversão: `supabase/reversao/20261118120000_editor.down.sql`

```sql
-- Reversão de 20261118120000_editor.sql.
-- As versões criadas pelo editor ficam em story_versions (só insert, T36); só a coluna
-- restaurada_de some. O texto atual (stories.texto) se perde: a última versão continua lá.
drop function if exists public.marcar_historia_pronta(uuid, boolean);
drop function if exists public.restaurar_versao(uuid, uuid, integer);
drop function if exists public.parar_de_editar(uuid, uuid);
drop function if exists public.salvar_historia(uuid, uuid, integer, jsonb, jsonb);
drop function if exists public.editar_historia(uuid, uuid, boolean, boolean);
drop function if exists privado.guardar_versao(uuid);
drop function if exists privado.origem_do_membro(uuid);
drop function if exists privado.primeiro_nome();
drop function if exists privado.marcacoes_validas(jsonb);
drop function if exists privado.conteudo_valido(jsonb);

drop table if exists public.story_photos;
drop function if exists privado.cota_fotos_historia();
drop table if exists public.edit_locks;

alter table public.story_versions drop column if exists restaurada_de;

revoke select (texto, texto_marcacoes, texto_rev, versao_rev, texto_por, texto_origem, texto_em,
  ano, revisada_em, estrutura) on public.stories from authenticated;
alter table public.stories
  drop constraint if exists stories_versao_rev,
  drop column if exists revisada_por,
  drop column if exists revisada_em,
  drop column if exists ano,
  drop column if exists texto_em,
  drop column if exists texto_origem,
  drop column if exists texto_por,
  drop column if exists versao_rev,
  drop column if exists texto_rev,
  drop column if exists texto_marcacoes,
  drop column if exists texto;

drop function if exists privado.max_letras_paragrafo();
drop function if exists privado.max_paragrafos();
drop function if exists privado.max_fotos_historia();
drop function if exists privado.versao_a_cada_s();
drop function if exists privado.trava_edicao_s();
```

## 6. Revisão de segurança (feita por mim)

- **Isolamento:** toda função confere `eh_membro` do livro da história; escrita confere `livro_editavel` e estado `pronta`. `story_photos` tem chave estrangeira composta (`book_id`, `photo_id`) e (`book_id`, `story_id`): não dá para ligar foto de outro livro.
- **`edit_locks` sem nenhum grant para `authenticated`:** ninguém lê `user_id` ou `aba` de outra pessoa; o estado da trava sai só por `editar_historia`, que devolve o primeiro nome de quem edita (outra pessoa) ou "outra tela" (você).
- **Autor e anônimo:** nenhuma função nova executável por `anon` ou `porta_autor`; `porta_autor` sem grant em `story_photos`, `edit_locks` e nas colunas novas.
- **Conteúdo validado no banco:** formato, chaves conhecidas, ids de parágrafo, tamanho por parágrafo (6.000 letras), até 300 parágrafos, 400 KB no total; marcações até 500 e 200 KB.
- **Imutabilidade:** `story_versions` segue só insert; a reversão não apaga versão nenhuma.
- **Nome no banco:** o primeiro nome fica na trava enquanto ela vale (é o que a tela mostra aos membros). Não vai para URL nem para `events`.
- **Aceito como risco:** `user_metadata` é editável pela própria pessoa (ela pode trocar o próprio nome que os outros membros do livro veem). Sem impacto fora do livro dela.

## 7. Ensaio do SQL (PGlite, migrations reais)

Passou: pegar a trava; a mesma pessoa em outra tela vê "outra tela" e pode assumir (a sessão anterior vira versão); membro de outro livro recebe `sem_permissao`; salvar com rev velha → `texto_desatualizado`; conteúdo inválido → `dados_invalidos`; salvar sem a trava → `trava_de_outro`; restaurar a v1 guarda o texto atual antes e cria a v4 com `restaurada_de = 1`; trava expirada + co-facilitador pega → a sessão da responsável vira versão; marcar como pronta guarda o pendente; `parar_de_editar` guarda e solta; 5ª foto → `cota_fotos_historia`; plano vencido → `livro_fechado`; `authenticated` não lê `edit_locks`; `anon` e `porta_autor` sem acesso; reversão e nova subida sem erro.

Vira teste automático em `supabase/tests/editor.test.ts`, mais: foto de outro livro recusada; versão nunca alterada; RLS entre livros em `story_photos`.

## 8. Testes e gate

- **Vitest:** frase → segmento; Tiptap ↔ conteúdo (ids, fontes, `editado`, grifos com posição recalculada); dividir e juntar parágrafos; códigos novos em `erros-banco`.
- **Playwright (vitrine com dados falsos):** editar, ver "Salvo", restaurar uma versão, segundo contexto do navegador vê a trava, abas no celular.
- **Gate de design:** build de produção, `taste:lint`, `taste:inspect` em 390, 768 e 1440 px, até 3 rodadas.
- **Depois do push:** migration aplicada no Supabase (com o seu OK), deploy de prévia, erros de runtime da Vercel e a rota real conferida.

## 9. O que mudou na implementação

- **Frase → áudio:** ouvido por segmento (5 a 10 s), como planejado. O segmento escolhido é o de mais palavras em comum com a frase.
- **Tiptap só no navegador:** ele sorteia ids ao criar o editor, o que quebra a pré-renderização do Next 16. Até montar, o mesmo texto aparece parado, com a mesma tipografia.
- **Bug achado no gate de design:** ao virar editável, o Tiptap avisava "mudou" e a tela salvava sem ninguém editar (um salvamento à toa por abertura). Corrigido: virar editável não conta como mudança.
- **Saída da tela:** `sendBeacon` para `/livro/[id]/historias/[historiaId]/parar` ao fechar a guia; a navegação dentro do app salva e solta a trava.
- **Vitrine:** `editor`, `editor-trava`, `editor-outra-tela`, `editor-somente-leitura`, `editor-pronta` e `versoes`, com um áudio de silêncio de 76 s em `public/exemplo/trem.m4a` (5 KB).

## 10. Gate

- `npm test`: 511 testes (16 novos de banco em `supabase/tests/editor.test.ts`, 15 de `lib/editor`).
- `npm run test:e2e`: 162 testes, 17 novos do editor e do histórico (celular e computador).
- Design: `taste:lint` 0 FAIL; `taste:inspect` 0 FAIL nas 4 telas novas em 390, 768 e 1440 px, em 2 rodadas. Corrigidos: salvamento à toa ao abrir, linhas divisórias, sombra em aba, placeholder "1962" no Ano (parecia valor já preenchido), fotos grandes demais no celular, player cobrindo as duas colunas no computador, contorno de foco no texto e título da coluna da gravação.
- **Banco (13/11):** migration aplicada no Supabase (`ecoa-plataforma`, São Paulo). Conferido no banco real: só membro logado executa as 5 funções novas; `anon` e `porta_autor` sem acesso a `story_photos`, `edit_locks` e `stories.texto`; ninguém lê `edit_locks` direto; RLS ligada nas 2 tabelas novas. O verificador de segurança não apontou nada novo além do padrão já aceito (função com guarda chamável por logado; `edit_locks` sem política de propósito).
- **Prévia (13/11):** deploy pronto; `/livro/[id]/historias/[historiaId]` e `/versoes` respondem e mandam quem está sem sessão para `/entrar`; nenhum erro de runtime na Vercel na última hora.
- **Pendente (aceite do Guilherme):** editar no celular e no computador com login real, restaurar uma versão antiga e abrir a mesma história em dois navegadores (o segundo vê a trava). Isso eu não consigo fazer daqui: exige entrar com a sua conta.
