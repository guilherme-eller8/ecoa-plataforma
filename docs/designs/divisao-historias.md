# Divisão em histórias: lotes e conversas longas (prompt 7)

Status: **v1, para revisão** · 2026-11-13 · PRD: M4 (lotes e conversas longas), M11 (dica de primeira vez), Pipeline de IA (etapa 4) · Decisões: P17, P25, P26, P27, P28, P29, P39, P40, P43, T8, T10, T11, T18, T27, T28, T31, T34, T35, T36, T37, T38

## 1. Problema, hipótese e o que está em jogo

Hoje a conversa longa e o lote de arquivos ficam "Guardada · conversa longa" para sempre (P40, P43). Sem a divisão, 1 hora de ceia não vira livro: ou fica parada, ou viraria uma história gigante (P27). P28 põe este prompt no mínimo da ceia.

- **Usuário:** André (design partner), gravando o pai, Nelson, na ceia de 24/12. Depois, ele confere as histórias no celular.
- **Hipótese:** a divisão da IA acerta o bastante para o André confirmar uma conversa de 40 min com no máximo 2 ajustes (juntar, separar ou descartar).
- **Métrica:** ajustes por divisão e divisões confirmadas sem ajuste (eventos `divisao_confirmada`, 6.6). Tempo do envio até "Confira as histórias".
- **Critério de morte:** em 3 divisões reais seguidas, mais de 3 ajustes em cada, ou uma divisão abandonada por 48 h. Se acontecer, a divisão volta a ser "uma história por arquivo ou por parte" e o prompt de divisão é refeito com os casos reais.
- **Risco que você não está vendo:** o aceite do prompt 6 ainda está aberto (teste ao vivo de 5 min e leitura de fidelidade pelo André). Este prompt multiplica a edição: 1 conversa vira 4 edições. Se a edição tiver problema de fidelidade, ele chega 4 vezes mais rápido. Recomendo fechar a leitura do André antes da ceia, em paralelo com este prompt.

## 2. Escopo

**Entra:**
- **Grupo de gravações:** o lote de arquivos e as partes de uma conversa viram uma história-contêiner quando todos chegam (D1, D3).
- **Detecção depois da estruturação:** gravação única com mudança de assunto, ou grupo de várias gravações, vai para a divisão. Com 1 assunto, segue direto, como hoje (D2).
- **Etapa de divisão** com o modelo capaz: agrupa trechos do mesmo assunto entre arquivos, separa assuntos misturados no mesmo arquivo, propõe títulos e a pergunta pendente que cada história parece responder.
- **Tela "Confira as histórias"**: lista de histórias com os trechos tocáveis; juntar, separar no ponto escolhido, renomear e descartar trecho, com 1 toque cada; dica de primeira vez.
- **Sugestão de pergunta** em toda história sem pergunta: na divisão e, para as que seguem direto, na etapa de memória. *Marcar como respondida* ou *Ignorar* (P29).
- **Confirmar:** cada história segue para a edição com as etapas ao vivo do prompt 6.
- **Envio de vários arquivos:** já existe desde o 5A (até 30, 2 em paralelo, progresso por arquivo, retomada) e o Compartilhar do Android já recebe vários áudios (prompt 5). Muda só: o aparelho informa quantos arquivos o lote tem, e o fim do envio leva para a home.

**Não entra (e por quê):**
- **Arquivo único com mais de 30 min** continua guardado (D9). A ceia pelo modo conversa vai em partes de 30 min e passa.
- **`--lote` no laboratório** (D10). O PRD diz "reaproveitando o modo --lote", mas ele nunca foi construído: o laboratório o adiou para este prompt (`laboratorio-ia.md`, seção 7). A função `dividir()` fica em `lib/ai/etapas.ts`, pronta para o lab quando precisar.
- Editor, versões manuais e trava: prompt 8. Mudar o tamanho e acrescentar áudio: prompt 9.
- Desfazer a divisão depois de confirmada. Os áudios continuam guardados; uma história errada pode ser apagada no prompt 8.

## 3. Decisões que preciso de você

| # | Decisão proposta | Por quê | O que se perde |
| --- | --- | --- | --- |
| D1 | **História-contêiner.** O grupo (1 gravação, o lote ou as partes da conversa) vira uma história no início, e o cartão "Ouvindo" aparece na hora. Depois da confirmação, o contêiner vira a 1ª história e as outras nascem dele (`divisao_de`). | Reaproveita o pipeline, o cartão ao vivo, a varredura e o *Tentar de novo* do prompt 6 sem uma entidade nova. A gravação única que acaba dividida já tem cartão desde o início. | O contêiner muda de conteúdo na confirmação (perde as gravações que foram para as outras). Alternativa descartada: tabela própria de divisões, com cartão e estados próprios (mais código e um segundo jeito de mostrar "em andamento"). |
| D2 | **Quando dividir.** Grupo de 2 ou mais gravações: sempre passa pela divisão. Gravação única: só se a estruturação (modelo rápido) marcar mudança de assunto. Se a divisão achar 1 história só, segue direto para a edição, **sem pedir confirmação**. | O modelo rápido erra para os dois lados. Com o grupo, ele não decide nada; com a gravação única, ele só filtra, e quem decide é o modelo capaz. Uma conversa de 1 assunto não ganha passo a mais. | Uma gravação única de 2 assuntos que o modelo rápido não perceber vira 1 história (o editor do prompt 8 ou 9 resolve). |
| D3 | **Quando o lote está completo.** O aparelho informa quantos arquivos o lote tem (`lote_total`): no upload, a quantidade escolhida; na conversa, o número de partes. A divisão começa quando todos chegam, ou 6 h depois do último que chegou (o que falta fica de fora). Arquivo que chega depois que o lote já virou história segue sozinho. | O servidor não sabe se mais partes vêm (o motivo de P40). Com o total, não há adivinhação; o prazo cobre o arquivo que nunca chega. | Um arquivo que demora mais de 6 h (sem internet) não entra na divisão dos outros. |
| D4 | **Os ajustes ficam no aparelho até confirmar.** Juntar, separar, renomear e descartar mudam só a tela (com rascunho no `localStorage`). *Escrever N histórias* manda tudo de uma vez; o banco confere cada segmento. | Uma escrita só, conferida no banco, sem estado intermediário para co-facilitadores brigarem (onda 2). | Quem começa no celular e termina no computador recomeça os ajustes. |
| D5 | **Trecho de cerca de 1 min** é a unidade de ouvir, separar e descartar. Os trechos são cortados nas pausas mais longas, sem cortar frase. *Separar* só acontece entre trechos. | O segmento tem 5 a 10 s: dezenas por história, ilegível no celular. 1 min dá ponto de corte bom sem virar lista infinita (uma conversa de 40 min ≈ 40 trechos em 4 histórias). | Corte mais fino que 1 min só no editor. |
| D6 | **O título confirmado na divisão vale.** A edição gera o próprio título, que fica na versão da IA, mas a história mantém o da divisão. | A pessoa já leu e aprovou (ou renomeou) aquele título. Trocar depois parece erro. | O título da edição, às vezes melhor, só aparece na versão da IA. |
| D7 | **Pergunta sugerida:** na divisão (modelo capaz) e, para histórias que seguem direto, na etapa de memória (modelo rápido, prompt `memoria.md` ganha a lista). Aparece na tela de divisão e no topo da leitura da história, com *Marcar como respondida* e *Ignorar*. Ignorada não volta. | P29. A memória já roda depois de toda história pronta: sugerir ali não custa uma chamada nova. | `memoria.md` muda (o hash muda uma vez; fica registrado). A edição não muda. |
| D8 | **E-mail se a divisão esperar 10 min sem confirmação:** "As histórias da conversa de {apelido} estão prontas para conferir", sem título. | Na ceia ninguém olha o celular; no dia seguinte, o e-mail traz o André de volta. P42 vale (sem título). | Quem está com a tela aberta há 10 min sem confirmar recebe o e-mail também. |
| D9 | **Arquivo único acima de 30 min continua guardado.** | A transcrição é síncrona num passo de 300 s (T35). Gravações de até 30 min cabem; acima disso, precisa do webhook do Scribe. O modo conversa já grava em partes de 30 min. | Uma gravação longa feita fora do app (gravador do iPhone) espera um prompt futuro. Se a ceia for gravada assim, isto vira bloqueante. |
| D10 | **Sem `--lote` no laboratório agora.** A qualidade da divisão é medida na plataforma, pelos ajustes que o André faz (6.6). | O lab duplicaria a orquestração; os dados reais vêm da tela. | Sem comparação de prompts de divisão fora da plataforma até o 1º problema. |
| D11 | **Divisão com o modelo capaz** (`MODELO_CAPAZ`). Custo estimado: ~US$ 0,10 por hora de conversa. | Agrupar assuntos entre arquivos é julgamento, não triagem. O custo é pequeno perto das 4 edições que vêm depois. | Nada relevante. |

## 4. Fatos que moldam o desenho

- **Ids de segmento.** Cada transcrição grava os segmentos com ids fixos (`segmentar(rotulo, palavras, segmento_inicial)`), e as fontes de cada parágrafo apontam para eles (T8). No contêiner, as gravações são transcritas **em ordem, uma por passo**: a gravação N começa no id seguinte ao último da N−1. Os ids ficam únicos no contêiner e em toda história que nasce dele.
- **O que muda em `story_recordings`.** Uma gravação pode alimentar várias histórias, cada uma com uma parte dela: coluna nova `segmentos integer[]` (null = a gravação inteira, como hoje). `segmentosDaHistoria` filtra por ela.
- **Enum.** `story_estado` ganha `dividindo` (a IA propõe) e `separar` (espera a pessoa). O Postgres não deixa usar um valor de enum na mesma transação em que ele foi criado, nem remover um valor: os valores só aparecem dentro de funções plpgsql, e a reversão os deixa no tipo, sem uso.
- **Inngest.** Hoje a concorrência é por gravação. Num lote, as últimas partes confirmam quase juntas e mandariam duas execuções para o mesmo contêiner. O evento ganha `chave` (o `lote_id`, ou o id da gravação) e a concorrência passa a ser por ela. O banco também trava o lote (`pg_advisory_xact_lock`) ao criar o contêiner.
- **Nada de texto no Inngest (T36).** A proposta da IA fica em `stories.divisao`; o passo devolve só contagens.
- **Tempo.** Ceia de 1 h em 2 partes: transcrição ~2 × 60 s, estruturação ~30 s, divisão ~40 s. "Confira as histórias" em cerca de 3 min depois do envio. Cada passo cabe nos 300 s do Hobby.
- **Custo de uma ceia de 1 h com 4 histórias:** transcrição US$ 0,40, estruturação US$ 0,01, divisão US$ 0,10, 4 edições e verificações ~US$ 1,20 (medido no prompt 6: US$ 0,085 por 2,5 min). Total ~R$ 9, dentro dos R$ 30 por livro se o livro tiver até 3 ceias assim.
- **Cota de 240 min/dia (T38)** passa a somar o grupo inteiro na criação do contêiner.

## 5. Banco de dados

Migration `supabase/migrations/20261117120000_divisao.sql` e reversão `supabase/reversao/20261117120000_divisao.down.sql`. **Os dois já rodaram no PGlite com todas as migrations atuais:** subida, 25 cenários (5.3) e descida → subida → descida → reversão completa.

Regras:
- Quem cria o contêiner e as filhas é o banco, por funções com guarda de estado. Nenhum `book_id` vem de fora.
- Quem está logado só confirma a divisão e responde a sugestão, por `confirmar_divisao` e `responder_sugestao`, que conferem membro do livro e plano ativo. Cada segmento enviado precisa ser do contêiner, e nenhum pode estar em duas histórias.
- `porta_autor` não recebe nada novo. Membro de outro livro não lê a divisão (RLS existente de `stories`).

### 5.1 SQL de subida

```sql
-- 20261117120000_divisao.sql
-- Prompt 7: divisão em histórias (lotes e conversas longas). Design: docs/designs/divisao-historias.md.
--
-- Regras deste arquivo:
-- * O grupo de gravações (1 gravação, um lote de arquivos ou as partes de uma conversa) vira uma
--   história-contêiner no início. Depois da divisão confirmada, o contêiner é a 1ª história e as
--   outras nascem dele (divisao_de).
-- * Os valores novos do enum só aparecem dentro de corpos plpgsql: o Postgres não deixa usar um
--   valor de enum na mesma transação que o criou.
-- * Quem está logado só confirma a divisão e responde a sugestão de pergunta, por funções com guarda.
-- * porta_autor não recebe nenhum grant novo.

alter type public.story_estado add value if not exists 'dividindo'; -- a IA está propondo
alter type public.story_estado add value if not exists 'separar';   -- esperando o responsável

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.max_historias_divisao() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;   -- MAX_HISTORIAS_DIVISAO
create function privado.espera_lote_h() returns integer
language sql immutable set search_path = '' as $$ select 6 $$;    -- ESPERA_LOTE_H

-- ── 1. recordings: quantos arquivos tem o lote (ou partes a conversa) ──────
-- Informado pelo aparelho no envio. null = linha antiga: vale "nenhum ainda enviando".
alter table public.recordings
  add column lote_total smallint check (lote_total is null or lote_total between 1 and 100),
  add constraint recordings_lote_total_so_em_lote check (lote_total is null or lote_id is not null);
grant select (lote_total), insert (lote_total) on public.recordings to authenticated;

-- ── 2. stories: divisão, origem e pergunta sugerida ────────────────────────
alter table public.stories
  add column divisao jsonb check (divisao is null or jsonb_typeof(divisao) = 'object'), -- {ia, final}
  add column divisao_de uuid,                              -- o contêiner de onde a história nasceu
  add column pergunta_sugerida uuid,
  add column sugestao_ignorada boolean not null default false,
  add constraint stories_divisao_de_fk foreign key (book_id, divisao_de)
    references public.stories (book_id, id) on delete restrict,
  add constraint stories_pergunta_sugerida_fk foreign key (book_id, pergunta_sugerida)
    references public.prompts (book_id, id) on delete set null (pergunta_sugerida),
  add constraint stories_sugestao_sem_pergunta check (pergunta_sugerida is null or prompt_id is null);
create index stories_divisao_de on public.stories (divisao_de) where divisao_de is not null;
grant select (divisao, divisao_de, pergunta_sugerida, sugestao_ignorada) on public.stories to authenticated;

-- ── 3. story_recordings: quais segmentos da gravação a história usa ────────
-- null = todos (gravação inteira). Ids fixados na transcrição (contínuos no contêiner).
alter table public.story_recordings
  add column segmentos integer[] check (segmentos is null or cardinality(segmentos) between 1 and 20000);

-- ── 4. Início: gravação única ou o grupo inteiro vira o contêiner ──────────
-- historia null = não processar agora; motivo diz por quê. motivo 'dividida' com historia
-- preenchida = a gravação já passou por uma divisão confirmada (quem chamou para).
create or replace function public.servico_iniciar_historia(p_recording uuid)
returns table (historia uuid, estado public.story_estado, motivo text)
language plpgsql security definer set search_path = '' as $$
declare
  v public.recordings; v_story uuid; v_estado public.story_estado; v_dividida boolean;
  v_grupo uuid[]; v_total integer; v_recebidas integer; v_enviando integer; v_ultima timestamptz;
  v_min numeric; v_prompt uuid; v_id uuid; v_i integer := 0;
begin
  select * into v from public.recordings r where r.id = p_recording;
  if not found or v.upload <> 'recebido' then
    return query select null::uuid, null::public.story_estado, 'nao_recebido'; return;
  end if;
  if v.processado_em is not null and not exists (select 1 from public.story_recordings sr
                                                 where sr.recording_id = p_recording) then
    return query select null::uuid, null::public.story_estado, 'descartada'; return;
  end if;
  -- As partes de um lote chegam juntas: uma de cada vez por aqui.
  if v.lote_id is not null then
    perform pg_advisory_xact_lock(hashtextextended('lote:' || v.lote_id::text, 0));
  end if;
  perform 1 from public.recordings r where r.id = p_recording for update;

  select sr.story_id, s.estado, (s.divisao_de is not null or s.divisao ? 'final')
    into v_story, v_estado, v_dividida
    from public.story_recordings sr join public.stories s on s.id = sr.story_id
    where sr.recording_id = p_recording order by s.criado_em, sr.ordem limit 1;
  if found then  -- já existe: quem chamou decide (pronta/falhou/separar/dividida = parar)
    return query select v_story, v_estado, case when v_dividida then 'dividida' end; return;
  end if;

  if v.lote_id is null then
    v_grupo := array[p_recording];
  else
    select count(*) filter (where r.upload = 'recebido'), count(*) filter (where r.upload = 'enviando'),
           max(r.recebido_em), max(r.lote_total)
      into v_recebidas, v_enviando, v_ultima, v_total
      from public.recordings r where r.book_id = v.book_id and r.lote_id = v.lote_id;
    if exists (select 1 from public.recordings r join public.story_recordings sr on sr.recording_id = r.id
               where r.book_id = v.book_id and r.lote_id = v.lote_id) then
      v_grupo := array[p_recording];  -- chegou depois que o lote já virou história: segue sozinha
    elsif v_recebidas >= coalesce(v_total, v_recebidas + v_enviando)
          or v_ultima < now() - make_interval(hours => privado.espera_lote_h()) then
      select array_agg(x.id order by x.criado_em, x.nome_arquivo, x.id) into v_grupo
        from (select r.id, r.criado_em, r.nome_arquivo from public.recordings r
              where r.book_id = v.book_id and r.lote_id = v.lote_id and r.upload = 'recebido'
                and r.duracao_s is not null and r.duracao_s <= privado.max_historia_s()
              order by r.criado_em, r.nome_arquivo, r.id limit 100) x;
      -- Arquivo sem duração ou longo demais fica de fora e espera com o próprio motivo.
      if v_grupo is null or not (p_recording = any (v_grupo)) then v_grupo := array[p_recording]; end if;
    else
      return query select null::uuid, null::public.story_estado, 'lote_incompleto'; return;
    end if;
  end if;

  if exists (select 1 from public.recordings r where r.id = any (v_grupo) and r.duracao_s is null) then
    return query select null::uuid, null::public.story_estado, 'sem_duracao'; return;
  end if;
  if exists (select 1 from public.recordings r where r.id = any (v_grupo)
             and r.duracao_s > privado.max_historia_s()) then
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
  if v_min + (select sum(r.duracao_s) from public.recordings r where r.id = any (v_grupo)) / 60.0
       > privado.max_minutos_ia_por_dia() then
    return query select null::uuid, null::public.story_estado, 'cota_diaria'; return;
  end if;

  -- Pergunta do contêiner: a da gravação, ou a mesma em todos os arquivos do grupo.
  select case when count(*) = count(r.prompt_id) and count(distinct r.prompt_id) = 1
              then (array_agg(r.prompt_id))[1] end
    into v_prompt from public.recordings r where r.id = any (v_grupo);
  insert into public.stories (book_id, prompt_id) values (v.book_id, v_prompt) returning id into v_story;
  foreach v_id in array v_grupo loop
    v_i := v_i + 1;
    insert into public.story_recordings (story_id, recording_id, book_id, ordem)
      values (v_story, v_id, v.book_id, v_i);
  end loop;
  return query select v_story, 'ouvindo'::public.story_estado, null::text;
end $$;

-- ── 5. Transições ──────────────────────────────────────────────────────────
-- ouvindo → dividindo (só contêiner que nunca foi dividido); ouvindo|dividindo → escrevendo;
-- ouvindo|dividindo|escrevendo → falhou; falhou → ouvindo. separar só por servico_propor_divisao;
-- separar → ouvindo só por confirmar_divisao; pronta só por servico_concluir_historia.
create or replace function public.servico_mudar_etapa(p_story uuid, p_para public.story_estado,
  p_erro_etapa text default null, p_erro text default null)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_para::text = 'escrevendo' then
    update public.stories set estado = 'escrevendo'
    where id = p_story and estado::text in ('ouvindo', 'dividindo');
  elsif p_para::text = 'dividindo' then
    update public.stories set estado = 'dividindo'
    where id = p_story and estado::text = 'ouvindo' and divisao_de is null and divisao is null;
  elsif p_para::text = 'falhou' then
    update public.stories set estado = 'falhou', erro_etapa = coalesce(p_erro_etapa, 'desconhecida'),
      erro = coalesce(p_erro, 'erro_inesperado'), rascunho = null
    where id = p_story and estado::text in ('ouvindo', 'escrevendo', 'dividindo');
  elsif p_para::text = 'ouvindo' then
    update public.stories set estado = 'ouvindo', erro_etapa = null, erro = null
    where id = p_story and estado::text = 'falhou';
  else
    return false;
  end if;
  return found;
end $$;

-- ── 6. Proposta da IA (só o servidor; ids já conferidos no código) ─────────
create function public.servico_propor_divisao(p_story uuid, p_proposta jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(p_proposta -> 'historias') is distinct from 'array'
     or jsonb_array_length(p_proposta -> 'historias') not between 2 and privado.max_historias_divisao() then
    return false;
  end if;
  update public.stories
    set estado = 'separar', divisao = jsonb_build_object('ia', p_proposta, 'proposta_em', now())
  where id = p_story and estado::text = 'dividindo';
  return found;
end $$;

-- ── 7. Confirmação (membro do livro, plano ativo) ──────────────────────────
-- p_historias: [{titulo, segmentos: int[], prompt_id, sugerida, ignorada}], na ordem da tela.
-- A 1ª é o próprio contêiner; as outras nascem com divisao_de. Devolve os ids, nessa ordem.
create function public.confirmar_divisao(p_story uuid, p_historias jsonb) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare
  v public.stories; v_todos integer[]; v_usados integer[] := '{}'; v_ids integer[];
  v_item jsonb; v_k integer := 0; v_n integer; v_nova uuid; v_out uuid[] := '{}';
  v_titulo text; v_prompt uuid; v_sug uuid; v_ign boolean; v_final jsonb := '[]'::jsonb;
  v_estrutura jsonb; v_ordem integer; v_rec record;
begin
  select * into v from public.stories s where s.id = p_story for update;
  if not found or not privado.eh_membro(v.book_id) or not privado.livro_editavel(v.book_id) then
    raise exception 'sem_permissao';
  end if;
  if v.estado::text <> 'separar' then raise exception 'divisao_ja_confirmada'; end if;
  if jsonb_typeof(p_historias) is distinct from 'array' then raise exception 'divisao_invalida'; end if;
  v_n := jsonb_array_length(p_historias);
  if v_n not between 1 and privado.max_historias_divisao() then raise exception 'divisao_invalida'; end if;
  if v.estrutura is null then raise exception 'divisao_invalida'; end if;
  v_estrutura := jsonb_set(v.estrutura, '{mudancasDeAssunto}', '[]'::jsonb);

  -- Universo: os segmentos das gravações do contêiner.
  select array_agg((e ->> 'id')::integer) into v_todos
    from public.story_recordings sr
    join public.transcripts t on t.recording_id = sr.recording_id,
    lateral jsonb_array_elements(t.segmentos) e
    where sr.story_id = p_story;
  if v_todos is null then raise exception 'divisao_invalida'; end if;

  -- Perguntas aceitas: do livro, e viram respondidas antes de olhar as sugestões.
  for v_item in select value from jsonb_array_elements(p_historias) loop
    v_prompt := nullif(v_item ->> 'prompt_id', '')::uuid;
    continue when v_prompt is null;
    if not exists (select 1 from public.prompts p where p.book_id = v.book_id and p.id = v_prompt
                     and p.estado in ('para_enviar', 'enviada', 'respondida')) then
      raise exception 'divisao_invalida';
    end if;
    update public.prompts set estado = 'respondida'
      where book_id = v.book_id and id = v_prompt and estado in ('para_enviar', 'enviada');
  end loop;

  -- Do fim para o começo: o contêiner (1ª) muda por último, depois que as filhas leram dele.
  for v_k in reverse v_n..1 loop
    v_item := p_historias -> (v_k - 1);
    if jsonb_typeof(v_item -> 'segmentos') is distinct from 'array' then raise exception 'divisao_invalida'; end if;
    select array_agg(distinct x::integer order by x::integer) into v_ids
      from jsonb_array_elements_text(v_item -> 'segmentos') x;
    if v_ids is null or not (v_ids <@ v_todos) or v_ids && v_usados then
      raise exception 'divisao_invalida';
    end if;
    v_usados := v_usados || v_ids;
    v_titulo := nullif(left(btrim(coalesce(v_item ->> 'titulo', '')), 200), '');
    v_prompt := nullif(v_item ->> 'prompt_id', '')::uuid;
    v_sug := nullif(v_item ->> 'sugerida', '')::uuid;
    v_ign := coalesce((v_item ->> 'ignorada')::boolean, false);
    if v_prompt is not null or v_ign or not exists (select 1 from public.prompts p
         where p.book_id = v.book_id and p.id = v_sug and p.estado in ('para_enviar', 'enviada')) then
      v_sug := null;
    end if;

    if v_k > 1 then
      insert into public.stories (book_id, prompt_id, titulo, estado, estrutura, divisao_de,
                                  pergunta_sugerida, sugestao_ignorada)
        values (v.book_id, v_prompt, v_titulo, 'ouvindo', v_estrutura, p_story, v_sug, v_ign)
        returning id into v_nova;
      v_ordem := 0;
      for v_rec in
        select sr.recording_id, sr.segmento_inicial, array_agg(x.id order by x.id) as segs
          from public.story_recordings sr
          join public.transcripts t on t.recording_id = sr.recording_id,
          lateral (select (e ->> 'id')::integer as id from jsonb_array_elements(t.segmentos) e) x
          where sr.story_id = p_story and x.id = any (v_ids)
          group by sr.recording_id, sr.segmento_inicial, sr.ordem order by sr.ordem
      loop
        v_ordem := v_ordem + 1;
        insert into public.story_recordings (story_id, recording_id, book_id, ordem, segmento_inicial, segmentos)
          values (v_nova, v_rec.recording_id, v.book_id, v_ordem, v_rec.segmento_inicial, v_rec.segs);
      end loop;
    else
      v_nova := p_story;
      update public.story_recordings sr set segmentos = x.segs
        from (select sr2.recording_id, array_agg(y.id order by y.id) as segs
                from public.story_recordings sr2
                join public.transcripts t on t.recording_id = sr2.recording_id,
                lateral (select (e ->> 'id')::integer as id from jsonb_array_elements(t.segmentos) e) y
                where sr2.story_id = p_story and y.id = any (v_ids)
                group by sr2.recording_id) x
        where sr.story_id = p_story and sr.recording_id = x.recording_id;
    end if;
    v_out := v_nova || v_out;
    v_final := jsonb_build_array(jsonb_build_object('titulo', v_titulo, 'segmentos', to_jsonb(v_ids),
                                                    'prompt_id', v_prompt)) || v_final;
  end loop;

  -- Gravação com todos os trechos descartados: não volta para a fila (o áudio continua guardado).
  update public.recordings r set processado_em = now()
    from public.story_recordings sr
    where sr.story_id = p_story and r.id = sr.recording_id and r.processado_em is null
      and not exists (select 1 from public.story_recordings s2
                      join public.stories s on s.id = s2.story_id
                      where s2.recording_id = r.id and (s.id = p_story and s2.segmentos is not null
                                                        or s.divisao_de = p_story));
  delete from public.story_recordings sr where sr.story_id = p_story and sr.segmentos is null;

  update public.stories
    set estado = 'ouvindo', titulo = v_titulo, prompt_id = v_prompt, pergunta_sugerida = v_sug,
        sugestao_ignorada = v_ign, estrutura = v_estrutura,
        divisao = v.divisao || jsonb_build_object('final', v_final, 'confirmada_em', now(),
                                                  'confirmada_por', (select auth.uid()))
  where id = p_story;
  return v_out;
end $$;

-- ── 8. Pergunta sugerida ───────────────────────────────────────────────────
create function public.servico_sugerir_pergunta(p_story uuid, p_prompt uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.stories s set pergunta_sugerida = p_prompt
  where s.id = p_story and s.prompt_id is null and s.pergunta_sugerida is null and not s.sugestao_ignorada
    and exists (select 1 from public.prompts p where p.book_id = s.book_id and p.id = p_prompt
                  and p.estado in ('para_enviar', 'enviada'));
  return found;
end $$;

create function public.responder_sugestao(p_story uuid, p_aceitar boolean) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v public.stories;
begin
  select * into v from public.stories s where s.id = p_story for update;
  if not found or not privado.eh_membro(v.book_id) or not privado.livro_editavel(v.book_id) then
    raise exception 'sem_permissao';
  end if;
  if v.pergunta_sugerida is null then return false; end if;
  if p_aceitar then
    update public.prompts set estado = 'respondida'
      where book_id = v.book_id and id = v.pergunta_sugerida and estado in ('para_enviar', 'enviada');
    update public.stories set prompt_id = v.pergunta_sugerida, pergunta_sugerida = null where id = p_story;
  else
    update public.stories set pergunta_sugerida = null, sugestao_ignorada = true where id = p_story;
  end if;
  return true;
end $$;

-- ── 9. Título confirmado pela pessoa vale mais que o da edição ─────────────
create or replace function public.servico_concluir_historia(p_story uuid, p_tamanho text, p_modelos jsonb, p_hash jsonb)
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
    set estado = 'pronta', titulo = coalesce(v.titulo, v_titulo), pronta_em = now(), rascunho = null
    where id = p_story;
  update public.recordings r set processado_em = now()
    from public.story_recordings sr
    where sr.story_id = p_story and r.id = sr.recording_id and r.processado_em is null;
  return true;
end $$;

-- ── 10. Privilégios ────────────────────────────────────────────────────────
revoke all on function public.servico_propor_divisao(uuid, jsonb),
  public.confirmar_divisao(uuid, jsonb),
  public.servico_sugerir_pergunta(uuid, uuid),
  public.responder_sugestao(uuid, boolean)
  from public, anon, authenticated, porta_autor;
grant execute on function public.servico_propor_divisao(uuid, jsonb),
  public.servico_sugerir_pergunta(uuid, uuid) to service_role;
grant execute on function public.confirmar_divisao(uuid, jsonb),
  public.responder_sugestao(uuid, boolean) to authenticated;
```

`servico_iniciar_historia`, `servico_mudar_etapa` e `servico_concluir_historia` mantêm a assinatura: `create or replace` conserva os grants do prompt 6.

### 5.2 SQL de reversão

```sql
-- 20261117120000_divisao.down.sql
-- Desfaz a divisão em histórias. Os áudios, as transcrições e as versões ficam intactos.
-- * Os valores 'dividindo' e 'separar' continuam no enum (o Postgres não remove valor de enum);
--   histórias nesses estados viram 'falhou' (erro 'reversao') e podem ser refeitas pelo admin.
-- * Trava: com alguma história nascida de divisão, só roda com `set ecoa.reversao_destrutiva = 'sim'`
--   (as filhas perdem a lista de segmentos e passariam a usar a gravação inteira).
do $$
begin
  if exists (select 1 from public.stories where divisao_de is not null)
     and coalesce(current_setting('ecoa.reversao_destrutiva', true), '') <> 'sim' then
    raise exception 'reversao_com_divisao: rode com ecoa.reversao_destrutiva = sim';
  end if;
end $$;

update public.stories set estado = 'falhou', erro_etapa = 'reversao', erro = 'reversao', rascunho = null
  where estado::text in ('dividindo', 'separar');

drop function if exists public.responder_sugestao(uuid, boolean);
drop function if exists public.servico_sugerir_pergunta(uuid, uuid);
drop function if exists public.confirmar_divisao(uuid, jsonb);
drop function if exists public.servico_propor_divisao(uuid, jsonb);

-- Funções de volta às versões de 20261115 (mudar etapa, concluir) e 20261116 (iniciar),
-- copiadas sem mudança daqueles arquivos.
create or replace function public.servico_mudar_etapa(...) ...      -- corpo de 20261115, seção 10
create or replace function public.servico_concluir_historia(...) ... -- corpo de 20261115, seção 10
create or replace function public.servico_iniciar_historia(...) ...  -- corpo de 20261116

alter table public.story_recordings drop column if exists segmentos;

drop index if exists public.stories_divisao_de;
alter table public.stories
  drop constraint if exists stories_sugestao_sem_pergunta,
  drop constraint if exists stories_pergunta_sugerida_fk,
  drop constraint if exists stories_divisao_de_fk,
  drop column if exists sugestao_ignorada,
  drop column if exists pergunta_sugerida,
  drop column if exists divisao_de,
  drop column if exists divisao;

alter table public.recordings
  drop constraint if exists recordings_lote_total_so_em_lote,
  drop column if exists lote_total;

drop function if exists privado.espera_lote_h();
drop function if exists privado.max_historias_divisao();
```

No arquivo de verdade, os três `create or replace` trazem o corpo inteiro (é o que rodou no PGlite); aqui ficam abreviados para não repetir 90 linhas idênticas às migrations anteriores.

### 5.3 Cenários já rodados no PGlite

Lote de 3 com `lote_total = 3`: os dois primeiros → `lote_incompleto`; o 3º cria o contêiner com as 3 gravações na ordem do nome; iniciar de novo pela 2ª → o mesmo contêiner. Transcrições com ids 1–4, 5–8, 9–12. `ouvindo → dividindo → separar`. Confirmação: membro de outro livro → `sem_permissao`; `porta_autor` → negado; segmento que não é do contêiner → `divisao_invalida`; o mesmo segmento em duas histórias → `divisao_invalida`; pergunta de outro livro → `divisao_invalida`; lista vazia → `divisao_invalida`; válida com 3 histórias → o contêiner fica com a 1ª (título sem espaços, pergunta aceita e marcada como respondida, sem mudanças de assunto), as filhas nascem com `divisao_de`, cada uma só com as suas gravações e segmentos; a sugestão de uma pergunta que acabou de ser aceita cai; confirmar de novo → `divisao_ja_confirmada`; iniciar uma gravação já dividida → `dividida`. 4º arquivo do lote chegando depois → história própria. Sugestão: membro de outro livro → `sem_permissao`; aceitar → pergunta respondida. Conversa de 1 parte (`lote_total = 1`, 29 min 50 s) → segue sozinha. Conversa antiga sem `lote_total`, com uma parte ainda "enviando" → `lote_incompleto`; 7 h depois → segue com o que chegou. Membro de outro livro não lê `divisao`. Reversão com filhas → trava; forçada → passa; subida e descida de novo → ok; reversão completa de todas as migrations → ok.

## 6. Pipeline

### 6.1 Disparo

- `confirmarAudio` passa a disparar **toda** gravação recebida sem `processado_em` (não só as avulsas). Evento `ecoa/gravacao.recebida` com `{ recordingId, chave }`, onde `chave` é o `lote_id` ou o próprio id; id do evento `{loteId}:{recordingId}` (cada parte manda o seu, e o banco ignora as que chegam com o lote incompleto).
- `prepararAudios`: no upload, `lote_total` = quantidade de arquivos (só com 2 ou mais); na conversa, o número de partes. O gravador grava esse total em cada parte guardada no aparelho ao terminar a gravação (`totalPartes` em `GravacaoLocal`), e na gravação recuperada (P38) ao tocar *Enviar*. Contar o grupo na hora do envio erraria: depois de reiniciar, as partes que já subiram não estão mais no aparelho.
- **Varredura:** deixa de filtrar por origem. Reenvia toda gravação recebida há mais de 5 min, sem história, sem `processado_em`, com até 30 min e livro com consentimento. Marca como `parada` também o contêiner preso em `dividindo` há mais de 20 min. `separar` nunca é parada (espera a pessoa).

### 6.2 Função `processar-gravacao` (mudada)

Concorrência por `event.data.chave`. Os passos:

| Passo | O que faz |
| --- | --- |
| `iniciar` | `servico_iniciar_historia`. Para em `pronta`, `falhou`, `separar` e no motivo `dividida`. Devolve os ids das gravações do contêiner, em ordem |
| `transcrever:{n}` | um passo por gravação, em ordem. Se já houver transcrição, pula. Senão, fixa `segmento_inicial` = último id da gravação anterior + 1 e transcreve, como no prompt 6 |
| `estruturar` | igual, sobre os segmentos de todas as gravações |
| — | **decide:** 2 ou mais gravações, ou `mudancasDeAssunto` não vazio → divisão; senão → `escrever` (os passos do prompt 6, sem mudança) |
| `dividir` | `servico_mudar_etapa(dividindo)` e canal `dividindo` → modelo capaz (`dividir.md`) → `limparDivisao` (6.3). Com 1 história: grava a sugestão de pergunta e segue para `escrever` no mesmo job. Com 2 ou mais: `servico_propor_divisao` e canal `separar` |
| `esperar-divisao` | `step.sleep(10 min)` |
| `avisar-divisao` | se continuar em `separar`: e-mail ao responsável (D8), `idempotencyKey: divisao:{id}`. Nunca lança |

### 6.3 Divisão (IA e limpeza)

- **Prompt** `lib/ai/prompts/dividir.md` e `dividir-entrada.md` (para o Guilherme ler e ajustar). Entrada: nome do autor, as gravações (`g1 · 2 min`, com a pergunta ligada, se houver), as perguntas pendentes numeradas (`P1…`, até 100, mais recentes primeiro) e os segmentos com o papel de cada falante e a marca de vazio. Regras: uma história é um episódio que se sustenta sozinho; não separar por causa de uma pergunta de acompanhamento; juntar o mesmo assunto mesmo em arquivos diferentes; cada história com pelo menos 1 min de fala; título curto, com palavras da fala, sem fato inventado; pergunta só se a história claramente responde.
- **Saída** (zod `Divisao`): `historias[{ titulo, trechos[{de, ate}], pergunta: número | null }]`.
- **`limparDivisao`** (pura, com teste): expande as faixas em ids que existem; o 1º que pede um segmento fica com ele; segmento sem dono (vazio ou esquecido) vai para a história do segmento anterior, para nada sumir sem a pessoa ver; tira histórias vazias; ordena pelo 1º segmento; acima de 30, junta o excesso na 30ª; título vazio vira null; pergunta fora da lista vira null. A pergunta ligada a uma gravação (escolhida no upload) vira `promptId` direto; uma pendente vira sugestão. Pergunta ligada que nenhuma história pegou vai para a história com mais segmentos daquela gravação.
- **Guardado** em `stories.divisao.ia`: `{ historias: [{ titulo, segmentos: [[de, ate]…], promptId, sugeridaId }] }`. No confirmar, `divisao.final` guarda o que a pessoa aprovou. A diferença entre os dois é a medida de qualidade da divisão (como T31 faz com o texto).

### 6.4 Função nova `escrever-historia`

- Evento `ecoa/historia.confirmada` `{ historiaId }`, enviado pela ação de confirmar (em `after()`), um por história. Concorrência por `historiaId`; `retries: 2`.
- Passos: `retomar` (lê o estado; só segue em `ouvindo`), e os mesmos `editar`, `verificar`, `concluir`, `memoria`, `esperar`, `avisar` do prompt 6, extraídos para `escreverHistoria()` e usados pelas duas funções.
- `segmentosDaHistoria` filtra por `story_recordings.segmentos`; a estrutura vem da que o banco copiou do contêiner.
- `onFailure`: `falhou`, como no prompt 6.
- **Admin, *Tentar de novo*:** história com `divisao_de` ou com divisão confirmada manda `ecoa/historia.confirmada`; as outras mandam o evento da gravação, como hoje.

### 6.5 Memória com pergunta (D7)

- `memoria-entrada.md` ganha `{{perguntas}}`: a lista numerada das pendentes, só se a história não tiver pergunta nem sugestão decidida; senão "(nenhuma)". O schema `Memoria` ganha `pergunta: número | null`. O código traduz o número no id e chama `servico_sugerir_pergunta`. Falha aqui não muda nada (a memória nunca lança).

### 6.6 Eventos (medida da hipótese)

- `divisao_proposta` (sistema): histórias propostas, gravações, minutos.
- `divisao_confirmada` (membro): propostas, confirmadas, e as contagens de juntar, separar, descartar e renomear (calculadas no aparelho a partir das ações).
- `pergunta_sugerida_aceita` e `pergunta_sugerida_ignorada`.

### 6.7 Tempo real

- `ETAPA_DO_ESTADO` ganha `dividindo → separando` e `separar → conferir`. Mensagem do canal só com a etapa (nenhum título vai pelo canal nesta fase). Ao receber `conferir`, a home relê o servidor e mostra o cartão.

## 7. Telas

Celular primeiro; uma ação principal por tela; títulos e trechos em `font-livro`.

- **Cartão do contêiner (home e Histórias).** `separando`: a barra pelo tempo previsto, "Separando as histórias · falta cerca de 1 min". `conferir`: "Encontramos 4 histórias nesta conversa." + *Conferir* (botão principal do cartão). Origem: "Conversa · 40 min" ou "8 áudios".
- **Confira as histórias (`/livro/[id]/historias/[historiaId]/dividir`).**
  - Título "4 histórias" e uma linha: "Confira antes de escrever." Dica de primeira vez: "Juntar une com a de baixo. Separar corta onde você tocar."
  - Cada história num bloco: título (toque para renomear), "3 trechos · 6 min", a sugestão de pergunta ("Parece responder: *Como conheceu a vó?*" + *Marcar como respondida* · *Ignorar*) e os trechos: ▶, "Parte 1 · 12:30", as primeiras palavras e *Descartar*. Embaixo: *Juntar com a de baixo* · *Separar*.
  - *Separar* mostra "Separar aqui" entre os trechos daquele bloco; um toque divide; *Cancelar* sai.
  - *Descartar* tira o trecho, com "Trecho descartado · *Desfazer*".
  - Botão principal fixo embaixo: *Escrever 4 histórias*. Depois do toque, volta para a home, com os 4 cartões ao vivo.
  - Um player só por tela: ▶ toca o trecho do áudio original (URL assinada) e para no fim dele.
  - **Vazio:** se tudo for descartado, "Nenhum trecho sobrou." + *Recomeçar* (volta à proposta da IA). Se a divisão já foi confirmada (outra aba, outro irmão): "Estas histórias já foram para a escrita." + *Ver histórias*.
- **Ler a história:** a sugestão de pergunta no topo, com os mesmos dois botões.
- **Áudios recebidos e home:** novos motivos: `lote_incompleto` → "Guardada. Esperando os outros áudios."; `descartada` → "Fora das histórias."; gravação num contêiner em `separar` → "Confira as histórias". Some a frase "Conversas longas viram histórias em breve".
- **Subir áudios:** ao terminar, "Pronto. 8 áudios guardados. As histórias aparecem no início." + *Acompanhar* (home); *Ver áudios recebidos* vira link de texto.
- **Admin → Processamento:** contêineres em `separar` há mais de 24 h (livro, idade), e os motivos novos.

## 8. Arquivos

**Criar:**
```
supabase/migrations/20261117120000_divisao.sql, supabase/reversao/20261117120000_divisao.down.sql
supabase/tests/divisao.test.ts                       5.3 + isolamento + porta_autor
lib/ai/prompts/dividir.md, dividir-entrada.md
lib/divisao/limpar.ts (+ .test.ts)                   limparDivisao (6.3)
lib/divisao/trechos.ts (+ .test.ts)                  trechos de ~1 min; juntar, separar, descartar, renomear, desfazer
lib/divisao/dados.ts, tipos.ts                       leitura da tela (sessão + URLs assinadas)
app/livro/[id]/historias/[historiaId]/dividir/page.tsx
components/telas/tela-dividir.tsx
e2e/dividir.spec.ts
```
**Modificar:**
```
lib/ai/schemas.ts, etapas.ts, claude.ts              Divisao, dividir(), etapa "dividir"; Memoria.pergunta
lib/ai/prompts/memoria.md, memoria-entrada.md        {{perguntas}}
lib/pipeline/processar.ts                            grupo, transcrever em ordem, decidir, dividir; escreverHistoria()
lib/pipeline/banco.ts                                segmentos filtrados, segmento_inicial, propor, sugerir
lib/pipeline/regras.ts, disparo.ts                   etapas novas, motivos novos, chave do evento
lib/inngest/funcoes.ts                               concorrência por chave; escrever-historia; varredura
app/livro/[id]/acoes.ts                              lote_total; disparo de toda gravação
app/livro/[id]/historias/acoes.ts                    confirmarDivisao, responderSugestao
app/admin/*                                          motivos novos; Tentar de novo por tipo
lib/gravacao/envio.ts, components/telas/tela-gravar-conversa.tsx   total de partes
components/audios/subir-audios.tsx                   fim do envio
components/ui/cartao-historia.tsx, historias-ao-vivo.tsx, lib/historias/*   estados separando/conferir, sugestão
components/telas/tela-historia.tsx, tela-livro.tsx, tela-audios.tsx
lib/email/modelos.ts (+ teste)                       divisaoPronta
lib/eventos-acoes.ts                                 eventos de 6.6
lib/erros-banco.ts                                   divisao_invalida, divisao_ja_confirmada
lib/config.ts                                        MAX_HISTORIAS_DIVISAO, ESPERA_LOTE_H, ESPERA_EMAIL_DIVISAO_MIN, TRECHO_ALVO_S, PREVISAO_DIVIDIR_*
lib/supabase/tipos.ts                                regerar
supabase/tests/pipeline.test.ts, rls.test.ts, config-banco.test.ts   regras de P43 trocadas, listas de funções e limites
scripts/lab/fakes.ts                                 ramos dividir e memoria.pergunta
app/(dev)/styleguide                                 vitrine da tela de divisão e dos cartões novos
docs/decisoes.md                                     P44–P47 e T40 (seção 12)
```

## 9. Testes

- **Banco (PGlite):** os cenários de 5.3; gravação com todos os trechos descartados → `processado_em` e `descartada` ao reiniciar; grupo que passa da cota → `cota_diaria`; arquivo de 40 min no lote fica de fora e os outros seguem; `servico_mudar_etapa` (todas as transições, inclusive `dividindo` em filha → recusado); `concluir` mantém o título da divisão; `porta_autor` sem execute nas funções novas; listas de grants e funções em `rls.test.ts`; espelho de config.
- **Unidade:** `limparDivisao` (sobreposição, buracos, faixa inventada, excesso de 30, pergunta fora da lista, pergunta ligada sem dono); trechos (corte em ~1 min na pausa mais longa, juntar, separar, descartar e desfazer, renomear, o que vai no confirmar); pipeline com fakes: gravação única sem mudança → direto (como hoje); com mudança → divisão com 1 história → direto; com 3 → `separar` e para; lote de 3 → transcreve em ordem com os ids contínuos; `escrever-historia` só a partir de `ouvindo`; nenhum texto no retorno dos passos nem nos erros.
- **Ponta a ponta (Playwright, vitrine sem Supabase):** juntar, separar, descartar com desfazer, renomear; a carga enviada no confirmar; dica de primeira vez uma vez só; os dois estados vazios; cartões `separando` e `conferir`.
- **No deploy de prévia (gate T28):** o aceite com áudio real: 8 áudios sobre 3 assuntos → 3 propostas; conversa livre de 40 min sobre 4 assuntos → 4; juntar 2 → editada como uma só. Mais: Compartilhar do Android com vários áudios; erros de runtime da Vercel.

## 10. Riscos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| A divisão erra muito com conversa de mesa (falas cruzadas, assunto que volta) | Alto | Ajustes de 1 toque; métrica e critério de morte (seção 1); a proposta da IA e a final ficam guardadas para corrigir o prompt |
| Edição sem fidelidade medida, agora multiplicada por 4 | Alto | Fechar a leitura do André antes da ceia (seção 1) |
| Ceia gravada fora do app num arquivo de 1 h | Médio | D9; orientar o André a usar *Gravar conversa*; se acontecer, o webhook do Scribe entra antes do Natal |
| Gravação única com 2 assuntos que o modelo rápido não marca | Baixo | D2; vira 1 história, que o editor resolve |
| Lote em que um arquivo nunca chega | Baixo | Espera de 6 h (D3) |
| Duas pessoas confirmando ao mesmo tempo | Baixo | `for update` + estado: a segunda recebe "já foi para a escrita" |
| 30 edições paralelas de uma vez | Baixo | Teto de 30 histórias; o Inngest enfileira; a cota diária já contou os minutos |

## 11. Configuração (Guilherme)

Nada novo na Vercel nem no Supabase. Depois do deploy, sincronizar o app no Inngest (a função `escrever-historia` é nova).

## 12. Decisões novas para `docs/decisoes.md` (se aprovadas)

- **P44** = D1 + D2 (contêiner; quando dividir; 1 história segue sem confirmação). Substitui em parte P40 e P43.
- **P45** = D3 + D4 + D5 (lote completo; ajustes no aparelho; trecho de ~1 min).
- **P46** = D6 + D7 (título confirmado vale; pergunta sugerida na divisão e na memória).
- **P47** = D8 (e-mail da divisão).
- **T40** = D9 + D10 + D11 (arquivo único de mais de 30 min espera; sem `--lote` no lab; divisão no modelo capaz).
