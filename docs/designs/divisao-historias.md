# Divisão em histórias: lotes e conversas longas (prompt 7)

Status: **v2 aprovada pelo Guilherme em 2026-11-13** (D1 a D12; D3 com a regra de status; D9 mudou, ver seção 14) · implementada no mesmo dia · 2026-11-13 · PRD: M4 (lotes e conversas longas), M11 (dica de primeira vez), Pipeline de IA (etapa 4) · Decisões: P17, P25, P26, P27, P28, P29, P39, P40, P42, P43, T8, T18, T27, T28, T31, T34, T35, T36, T37, T38

Relatórios: `divisao-historias/critic_report.md` (segurança e banco) e `divisao-historias/codebase_details_report.md` (código). A seção 13 mostra o que mudou por causa de cada um.

## 1. Problema, hipótese e o que está em jogo

Hoje a conversa longa e o lote de arquivos ficam "Guardada · conversa longa" para sempre (P40, P43). Sem a divisão, 1 hora de ceia não vira livro: ou fica parada, ou vira uma história gigante (P27). P28 põe este prompt no mínimo da ceia.

- **Usuário:** André (design partner), gravando o pai, Nelson, na ceia de 24/12. Depois, ele confere as histórias no celular.
- **Hipótese:** a divisão da IA acerta o bastante para o André confirmar uma conversa de 40 min com no máximo 2 ajustes (juntar, separar ou descartar).
- **Métrica:** ajustes por divisão e divisões confirmadas sem ajuste (eventos `divisao_confirmada`, 6.7). Tempo do envio até "Confira as histórias".
- **Critério de morte:** em 3 divisões reais seguidas, mais de 3 ajustes em cada, ou uma divisão abandonada por 48 h. Se acontecer, a divisão volta a ser "uma história por arquivo ou por parte", e o prompt de divisão é refeito com os casos reais.
- **Risco que você não está vendo:** o aceite do prompt 6 ainda está aberto (teste ao vivo de 5 min e leitura de fidelidade pelo André). Este prompt multiplica a edição: 1 conversa vira 4 edições. Se a edição tiver problema de fidelidade, ele chega 4 vezes mais rápido. Recomendo fechar a leitura do André antes da ceia, em paralelo com este prompt.

## 2. Escopo

**Entra:**
- **Grupo de gravações:** o lote de arquivos e as partes de uma conversa viram uma história-contêiner quando todos chegam (D1, D3).
- **Detecção depois da estruturação:** gravação única com mudança de assunto, ou grupo de várias gravações, vai para a divisão. Gravação única com 1 assunto segue direto, como hoje (D2).
- **Etapa de divisão** com o modelo capaz: agrupa trechos do mesmo assunto entre arquivos, separa assuntos misturados no mesmo arquivo, propõe títulos e a pergunta pendente que cada história parece responder.
- **Tela "Confira as histórias"**: lista de histórias com os trechos tocáveis; juntar, separar no ponto escolhido, renomear e descartar trecho, com 1 toque cada; dica de primeira vez.
- **Sugestão de pergunta** em toda história sem pergunta: na divisão e, para as que seguem direto, na etapa de memória. *Marcar como respondida* ou *Ignorar* (P29).
- **Confirmar:** cada história segue para a edição com as etapas ao vivo do prompt 6.
- **Envio de vários arquivos:** já existe desde o 5A (até 30, 2 em paralelo, progresso por arquivo, retomada), e o Compartilhar do Android já recebe vários áudios (prompt 5). Muda só: o lote ganha o total e a posição de cada arquivo, e o fim do envio leva para a home.

**Não entra (e por quê):**
- **Arquivo único com mais de 30 min** continua guardado (D9). A ceia pelo modo conversa vai em partes de 30 min e passa.
- **`--lote` no laboratório** (D10). O PRD diz "reaproveitando o modo --lote", mas ele nunca foi construído: o laboratório o adiou para este prompt (`laboratorio-ia.md`, seção 7). A função `dividir()` fica em `lib/ai/etapas.ts`, pronta para o lab quando precisar.
- Editor, versões manuais e trava: prompt 8. Mudar o tamanho e acrescentar áudio: prompt 9.
- Desfazer a divisão depois de confirmada. Os áudios continuam guardados; uma história errada pode ser apagada no prompt 8.

## 3. Decisões que preciso de você

| # | Decisão proposta | Por quê | O que se perde |
| --- | --- | --- | --- |
| D1 | **História-contêiner.** O grupo (1 gravação, o lote ou as partes da conversa) vira uma história no início, e o cartão "Ouvindo" aparece na hora. Depois da confirmação, o contêiner vira a 1ª história e as outras nascem dele (`divisao_de`). | Reaproveita o pipeline, o cartão ao vivo, a varredura e o *Tentar de novo* do prompt 6, sem uma entidade nova. A gravação única que acaba dividida já tem cartão desde o início. | O contêiner muda de conteúdo na confirmação. Alternativa descartada: tabela própria de divisões, com cartão e estados próprios (mais código e um segundo jeito de mostrar "em andamento"). |
| D2 | **Quando dividir e quando confirmar.** Grupo de 2 ou mais gravações: sempre passa pela divisão **e pela sua confirmação**, mesmo que a IA ache 1 história só (mantém P17). Gravação única: passa pela divisão só se a estruturação (modelo rápido) marcar mudança de assunto; se a divisão achar 1 história, segue direto, sem tela. | No grupo, o erro da IA ao juntar tudo seria uma história gigante sem ninguém ver (achado 6 da revisão). Na gravação única, uma confirmação de 1 bloco seria passo a mais sem ganho. | Um toque a mais num lote de 1 assunto. Uma gravação única de 2 assuntos que o modelo rápido não perceber vira 1 história (o editor resolve). |
| D3 | **Quando o lote está completo.** Toda linha nova de lote ou conversa leva o total e a posição (`lote_total`, `lote_ordem`): no upload, a quantidade escolhida e a posição na lista (o servidor calcula); na conversa, o número de partes e o número da parte (o gravador guarda o total em cada parte ao terminar). A divisão começa quando todos chegam, ou 6 h depois do último que chegou. Arquivo que chega depois segue sozinho. Linhas antigas, sem total, seguem a regra de P43 (parte de 29 min ou mais espera). | O servidor não sabe se mais partes vêm (o motivo de P40). Com total e posição, não há adivinhação nem ordem trocada (`parte-10` antes de `parte-2`). | Um arquivo que demora mais de 6 h (sem internet) não entra na divisão dos outros. |
| D4 | **Os ajustes ficam no aparelho até confirmar.** Juntar, separar, renomear e descartar mudam só a tela (rascunho no `localStorage`, só com ids, apagado ao confirmar e depois de 7 dias). *Escrever N histórias* manda tudo de uma vez; o banco confere cada segmento. | Uma escrita só, conferida no banco, sem estado intermediário para co-facilitadores brigarem (onda 2). | Quem começa no celular e termina no computador recomeça os ajustes. |
| D5 | **Trecho de cerca de 1 min** é a unidade de ouvir, separar e descartar, cortado nas pausas mais longas, sem cortar frase. *Separar* só acontece entre trechos. | O segmento tem 5 a 10 s: dezenas por história, ilegível no celular. 1 min dá ponto de corte bom sem virar lista infinita (40 min ≈ 40 trechos em 4 histórias). | Corte mais fino que 1 min só no editor. |
| D6 | **O título confirmado na divisão vale.** A edição gera o próprio título, que fica na versão da IA, mas a história mantém o da divisão. | A pessoa já leu e aprovou (ou renomeou) aquele título. Trocar depois parece erro. | O título da edição, às vezes melhor, só aparece na versão da IA. |
| D7 | **Pergunta sugerida:** na divisão (modelo capaz) e, para histórias que seguem direto, na etapa de memória (modelo rápido; `memoria.md` ganha a lista). Aparece na tela de divisão e no topo da leitura da história, com *Marcar como respondida* e *Ignorar*. Ignorada não volta. | P29. A memória já roda depois de toda história pronta: sugerir ali não custa uma chamada nova. | `memoria.md` muda (o hash muda uma vez; fica registrado). A edição não muda. |
| D8 | **E-mail se a divisão esperar 10 min sem confirmação:** "As histórias da conversa de {apelido} estão prontas para conferir", sem título. | Na ceia ninguém olha o celular; no dia seguinte, o e-mail traz o André de volta. P42 vale (sem título). | Quem está com a tela aberta há 10 min sem confirmar também recebe o e-mail. |
| D9 | **Arquivo único acima de 30 min continua guardado.** | A transcrição é síncrona num passo de 300 s (T35). Gravações de até 30 min cabem; acima disso, precisa do webhook do Scribe. O modo conversa já grava em partes de 30 min. | Uma gravação longa feita fora do app (gravador do iPhone) espera um prompt futuro. Se a ceia for gravada assim, isto vira bloqueante. |
| D10 | **Sem `--lote` no laboratório agora.** A qualidade da divisão é medida na plataforma, pelos ajustes que o André faz (6.7). | O lab duplicaria a orquestração; os dados reais vêm da tela. | Sem comparação de prompts de divisão fora da plataforma até o 1º problema. |
| D11 | **Divisão com o modelo capaz** (`MODELO_CAPAZ`). ~US$ 0,10 por hora de conversa. | Agrupar assuntos entre arquivos é julgamento, não triagem. O custo é pequeno perto das 4 edições que vêm depois. | Nada relevante. |
| D12 | **Tetos de custo da divisão** (novos, da revisão): contêiner de até 120 min (o resto do lote segue sozinho); cada história confirmada com pelo menos 30 s de fala; no máximo 60 histórias criadas por livro em 24 h; edições com no máximo 4 ao mesmo tempo. | Sem eles, uma confirmação manda até 30 edições de IA, sem relação com o áudio (achado 2), e um contêiner de 4 h não foi medido (achado 11). | Uma família que confirma mais de 60 histórias num dia espera o dia seguinte. |

## 4. Fatos que moldam o desenho

- **Ids de segmento.** Cada transcrição grava os segmentos com ids fixos (`segmentar(rotulo, palavras, segmento_inicial)`), e as fontes de cada parágrafo apontam para eles (T8). No contêiner, as gravações são transcritas **em ordem, uma por passo**: antes de transcrever a gravação N, o passo grava em `story_recordings.segmento_inicial` o maior id já gravado no contêiner + 1 (lido do banco; transcrição vazia não repete o início). Os ids ficam únicos no contêiner e em toda história que nasce dele. `segmentar`, `checar`, `verificar` e a validação de `fontes` não exigem ids começando em 1 nem contíguos (conferido pela revisão).
- **Rótulo da gravação.** O falante é gravado como `g{ordem}:speaker_N` na transcrição, que é imutável. As filhas guardam a `ordem` do contêiner, para o rótulo continuar valendo; a divisão e a tela usam `Segmento.arquivo`, nunca recalculam o rótulo.
- **O que muda em `story_recordings`.** Uma gravação pode alimentar várias histórias, cada uma com uma parte dela: coluna nova `segmentos integer[]` (null = a gravação inteira, como hoje). `segmentosDaHistoria` filtra por ela; a duração e o áudio de cada história saem dos seus segmentos.
- **Enum.** `story_estado` ganha `dividindo` (a IA propõe) e `separar` (espera a pessoa). O Postgres não deixa usar um valor de enum na mesma transação em que ele foi criado, nem remover um valor: os valores só aparecem dentro de funções plpgsql, e a reversão os deixa no tipo, sem uso.
- **Inngest.** Hoje a concorrência é por gravação. Num lote, as últimas partes confirmam quase juntas. O evento ganha `chave` (o `lote_id`, ou o id da gravação), e a concorrência passa a ser por ela, com reserva em `recordingId` para os eventos já em voo (a expressão é conferida no dev server). O banco também trava o livro (`pg_advisory_xact_lock`) ao criar o contêiner, o que fecha a corrida da cota diária.
- **Nada de texto no Inngest (T36).** A proposta da IA fica em `stories.divisao`; os passos devolvem só contagens.
- **Tempo.** Ceia de 1 h em 2 partes: transcrição ~2 × 60 s, estruturação ~30 s, divisão ~40 s. "Confira as histórias" em cerca de 3 min depois do envio. Cada passo cabe nos 300 s do Hobby. O contêiner de 120 min é medido no gate de prévia.
- **Custo de uma ceia de 1 h com 4 histórias:** transcrição US$ 0,40, estruturação US$ 0,01, divisão US$ 0,10, 4 edições e verificações ~US$ 1,20 (medido no prompt 6: US$ 0,085 por 2,5 min). Total ~R$ 9, dentro dos R$ 30 por livro se o livro tiver até 3 ceias assim.
- **Cota de 240 min/dia (T38)** passa a somar o grupo inteiro **e** os contêineres já criados que ainda não foram transcritos (reserva).

## 5. Banco de dados

Migration `supabase/migrations/20261117120000_divisao.sql` e reversão `supabase/reversao/20261117120000_divisao.down.sql`. **Os dois rodaram no PGlite com todas as migrations atuais:** subida, os cenários de 5.3, e descida → subida → descida → reversão completa de todas as migrations.

Regras:
- Quem cria o contêiner e as filhas é o banco, por funções com guarda de estado. Nenhum `book_id` vem de fora.
- Quem está logado só confirma a divisão e responde a sugestão, por `confirmar_divisao` e `responder_sugestao`, que conferem membro do livro e plano ativo **antes** de travar a linha. Cada segmento enviado precisa ser do contêiner, nenhum pode estar em duas histórias, e o formato do jsonb é conferido antes de qualquer conversão (um erro de conversão viraria 500 com o valor no log).
- `porta_autor` não recebe nada novo. Membro de outro livro não lê a divisão (RLS existente de `stories`).
- `divisao` não guarda quem confirmou (o `auth.uid()` dentro de um jsonb não some quando o usuário é apagado); quem confirmou fica no evento `divisao_confirmada`.

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
create function privado.max_min_conteiner() returns integer
language sql immutable set search_path = '' as $$ select 120 $$;  -- MAX_MIN_CONTEINER
create function privado.min_fala_historia_s() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;   -- MIN_FALA_HISTORIA_S
create function privado.max_historias_dia() returns integer
language sql immutable set search_path = '' as $$ select 60 $$;   -- MAX_HISTORIAS_DIA

-- ── 1. recordings: tamanho do lote e posição de cada arquivo ───────────────
-- Upload: total = arquivos escolhidos, ordem = posição na lista. Conversa: total = partes,
-- ordem = número da parte. Obrigatórios em toda linha nova de lote ou conversa (política de
-- insert abaixo); as linhas antigas, sem eles, seguem pela regra de P43. Não é CHECK: um CHECK
-- "not valid" também barraria o UPDATE das linhas antigas (confirmar, processado_em).
alter table public.recordings
  add column lote_total smallint check (lote_total is null or lote_total between 1 and 100),
  add column lote_ordem smallint check (lote_ordem is null or lote_ordem between 1 and 100),
  add constraint recordings_lote_total_so_em_lote
    check ((lote_total is null and lote_ordem is null) or lote_id is not null);
grant select (lote_total, lote_ordem), insert (lote_total, lote_ordem) on public.recordings to authenticated;
drop policy "membro cria com plano ativo" on public.recordings;
create policy "membro cria com plano ativo" on public.recordings for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id)
              and upload = 'enviando' and origem in ('upload', 'lote', 'conversa')
              and (lote_id is null or (lote_total is not null and lote_ordem is not null
                                       and lote_ordem <= lote_total)));

-- ── 2. stories: divisão, origem e pergunta sugerida ────────────────────────
alter table public.stories
  add column divisao jsonb check (divisao is null or jsonb_typeof(divisao) = 'object'), -- {gravacoes, ia, final}
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
-- Se a gravação que chamou ficou fora do grupo (longa, sem duração, além de 120 min), o
-- contêiner dos outros é criado e devolvido; ela segue sozinha na próxima chamada.
create or replace function public.servico_iniciar_historia(p_recording uuid)
returns table (historia uuid, estado public.story_estado, motivo text)
language plpgsql security definer set search_path = '' as $$
declare
  v public.recordings; v_story uuid; v_estado public.story_estado; v_dividida boolean;
  v_grupo uuid[]; v_total integer; v_recebidas integer; v_enviando integer; v_ultima timestamptz;
  v_longa_sem_total boolean; v_min numeric; v_reservado numeric; v_prompt uuid; v_id uuid;
  v_i integer := 0;
begin
  select * into v from public.recordings r where r.id = p_recording;
  if not found or v.upload <> 'recebido' then
    return query select null::uuid, null::public.story_estado, 'nao_recebido'; return;
  end if;
  if v.processado_em is not null and not exists (select 1 from public.story_recordings sr
                                                 where sr.recording_id = p_recording) then
    return query select null::uuid, null::public.story_estado, 'descartada'; return;
  end if;
  -- Um livro de cada vez por aqui: o grupo e a cota diária são decididos sem corrida.
  perform pg_advisory_xact_lock(hashtextextended('livro:' || v.book_id::text, 0));

  select sr.story_id, s.estado, (s.divisao_de is not null or coalesce(s.divisao ? 'final', false))
    into v_story, v_estado, v_dividida
    from public.story_recordings sr join public.stories s on s.id = sr.story_id
    where sr.recording_id = p_recording order by s.criado_em, sr.ordem limit 1;
  if found then  -- já existe: quem chamou decide (pronta/falhou/separar/dividida = parar)
    return query select v_story, v_estado, case when v_dividida then 'dividida' end; return;
  end if;

  if v.lote_id is null then
    v_grupo := array[p_recording];
  elsif exists (select 1 from public.recordings r join public.story_recordings sr on sr.recording_id = r.id
                where r.book_id = v.book_id and r.lote_id = v.lote_id) then
    v_grupo := array[p_recording];  -- chegou depois que o lote já virou história: segue sozinha
  else
    select count(*) filter (where r.upload = 'recebido'), count(*) filter (where r.upload = 'enviando'),
           max(r.recebido_em), max(r.lote_total),
           bool_or(r.lote_total is null and r.origem = 'conversa' and r.upload = 'recebido'
                   and r.duracao_s >= privado.max_historia_s() - 60)
      into v_recebidas, v_enviando, v_ultima, v_total, v_longa_sem_total
      from public.recordings r where r.book_id = v.book_id and r.lote_id = v.lote_id;
    -- Completo: chegaram todos os que o aparelho anunciou. Linha antiga, sem total: nenhum
    -- enviando e nenhuma parte de conversa com 29 min ou mais (a regra de P43). Ou 6 h de espera.
    if not ((v_total is not null and v_recebidas >= v_total)
            or (v_total is null and v_enviando = 0 and not coalesce(v_longa_sem_total, false))
            or v_ultima < now() - make_interval(hours => privado.espera_lote_h())) then
      return query select null::uuid, null::public.story_estado, 'lote_incompleto'; return;
    end if;
    -- Em ordem, até 120 min: o que passar fica sem história e segue sozinho depois.
    select array_agg(x.id order by x.n) into v_grupo
      from (select r.id, row_number() over w as n, sum(r.duracao_s) over w as acumulado
            from public.recordings r
            where r.book_id = v.book_id and r.lote_id = v.lote_id and r.upload = 'recebido'
              and r.duracao_s is not null and r.duracao_s <= privado.max_historia_s()
            window w as (order by r.lote_ordem nulls last, r.criado_em, r.nome_arquivo, r.id)) x
      where x.n = 1 or x.acumulado <= privado.max_min_conteiner() * 60;
    if v_grupo is null then v_grupo := array[p_recording]; end if;
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
  -- Cota (T38): o que já foi transcrito em 24 h + o que já tem história e ainda não foi transcrito.
  select coalesce(sum(u.minutos_audio), 0) into v_min from public.ai_usage u
    where u.book_id = v.book_id and u.etapa = 'transcrever' and u.criado_em > now() - interval '24 hours';
  select coalesce(sum(r.duracao_s), 0) / 60.0 into v_reservado
    from public.recordings r
    where r.book_id = v.book_id and r.recebido_em > now() - interval '24 hours'
      and exists (select 1 from public.story_recordings sr where sr.recording_id = r.id)
      and not exists (select 1 from public.transcripts t where t.recording_id = r.id);
  if v_min + v_reservado + (select sum(r.duracao_s) from public.recordings r where r.id = any (v_grupo)) / 60.0
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
-- Grupo de 2 ou mais gravações vai para a confirmação mesmo com 1 história (P17).
create function public.servico_propor_divisao(p_story uuid, p_proposta jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if jsonb_typeof(p_proposta -> 'historias') is distinct from 'array'
     or jsonb_array_length(p_proposta -> 'historias') not between 1 and privado.max_historias_divisao() then
    return false;
  end if;
  update public.stories s
    set estado = 'separar',
        divisao = jsonb_build_object(
          'gravacoes', (select jsonb_agg(sr.recording_id order by sr.ordem)
                        from public.story_recordings sr where sr.story_id = s.id),
          'ia', p_proposta, 'proposta_em', now())
  where s.id = p_story and s.estado::text = 'dividindo';
  return found;
end $$;

-- ── 7. Confirmação (membro do livro, plano ativo) ──────────────────────────
-- p_historias: [{titulo, segmentos: int[], prompt_id, sugerida, ignorada}], na ordem da tela.
-- A 1ª é o próprio contêiner; as outras nascem com divisao_de. Devolve os ids, nessa ordem.
-- Lista vazia = "deixar fora do livro": nada vai para a escrita e as gravações saem da fila.
create function public.confirmar_divisao(p_story uuid, p_historias jsonb) returns uuid[]
language plpgsql security definer set search_path = '' as $$
declare
  v public.stories; v_livro uuid; v_todos integer[]; v_usados integer[] := '{}'; v_ids integer[];
  v_item jsonb; v_k integer := 0; v_n integer; v_nova uuid; v_out uuid[] := '{}';
  v_titulo text; v_prompt uuid; v_sug uuid; v_ign boolean; v_final jsonb := '[]'::jsonb;
  v_estrutura jsonb; v_rec record; v_fala numeric;
  c_uuid constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
begin
  -- Confere o livro antes de travar a linha (ninguém de fora segura o lock).
  select s.book_id into v_livro from public.stories s where s.id = p_story;
  if v_livro is null or not privado.eh_membro(v_livro) or not privado.livro_editavel(v_livro) then
    raise exception 'sem_permissao';
  end if;
  select * into v from public.stories s where s.id = p_story for update;
  if v.estado::text <> 'separar' then raise exception 'divisao_ja_confirmada'; end if;
  if jsonb_typeof(p_historias) is distinct from 'array' or v.estrutura is null then
    raise exception 'divisao_invalida';
  end if;
  v_n := jsonb_array_length(p_historias);
  if v_n > privado.max_historias_divisao() then raise exception 'divisao_invalida'; end if;
  if v_n > 1 and (select count(*) from public.stories s where s.book_id = v.book_id
                    and s.criado_em > now() - interval '24 hours') + v_n - 1 > privado.max_historias_dia() then
    raise exception 'divisao_limite_dia';
  end if;
  v_estrutura := jsonb_set(v.estrutura, '{mudancasDeAssunto}', '[]'::jsonb);

  -- Universo: os segmentos das gravações do contêiner. Id repetido entre gravações = recusa.
  select array_agg((e ->> 'id')::integer) into v_todos
    from public.story_recordings sr
    join public.transcripts t on t.recording_id = sr.recording_id,
    lateral jsonb_array_elements(t.segmentos) e
    where sr.story_id = p_story;
  if v_todos is null
     or cardinality(v_todos) <> (select count(distinct x) from unnest(v_todos) x) then
    raise exception 'divisao_invalida';
  end if;

  -- Forma de cada item, antes de qualquer cast (erro de cast viraria 500 com o valor no log).
  if exists (
    select 1 from jsonb_array_elements(p_historias) i
    where jsonb_typeof(i) <> 'object'
       or jsonb_typeof(i -> 'segmentos') is distinct from 'array'
       or jsonb_array_length(i -> 'segmentos') not between 1 and cardinality(v_todos)
       or coalesce(jsonb_typeof(i -> 'titulo'), 'null') not in ('string', 'null')
       or coalesce(jsonb_typeof(i -> 'ignorada'), 'null') not in ('boolean', 'null')
       or coalesce(jsonb_typeof(i -> 'prompt_id'), 'null') not in ('string', 'null')
       or coalesce(jsonb_typeof(i -> 'sugerida'), 'null') not in ('string', 'null')
       or (jsonb_typeof(i -> 'prompt_id') = 'string' and not (i ->> 'prompt_id') ~ c_uuid)
       or (jsonb_typeof(i -> 'sugerida') = 'string' and not (i ->> 'sugerida') ~ c_uuid)
       or exists (select 1 from jsonb_array_elements(i -> 'segmentos') x
                  where jsonb_typeof(x) <> 'number' or x::text !~ '^[0-9]{1,9}$')) then
    raise exception 'divisao_invalida';
  end if;

  -- Perguntas aceitas: do livro, e viram respondidas antes de olhar as sugestões.
  for v_item in select value from jsonb_array_elements(p_historias) loop
    v_prompt := (v_item ->> 'prompt_id')::uuid;
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
    select array_agg(distinct x::integer order by x::integer) into v_ids
      from jsonb_array_elements_text(v_item -> 'segmentos') x;
    if not (v_ids <@ v_todos) or v_ids && v_usados then raise exception 'divisao_invalida'; end if;
    -- Fala mínima por história: o custo de cada uma (edição, verificação) não vale para migalhas.
    select coalesce(sum((e ->> 'fim')::numeric - (e ->> 'inicio')::numeric), 0) into v_fala
      from public.story_recordings sr
      join public.transcripts t on t.recording_id = sr.recording_id,
      lateral jsonb_array_elements(t.segmentos) e
      where sr.story_id = p_story and (e ->> 'id')::integer = any (v_ids);
    if v_fala < privado.min_fala_historia_s() then raise exception 'divisao_curta'; end if;
    v_usados := v_usados || v_ids;
    v_titulo := nullif(left(btrim(coalesce(v_item ->> 'titulo', '')), 200), '');
    v_prompt := (v_item ->> 'prompt_id')::uuid;
    v_sug := (v_item ->> 'sugerida')::uuid;
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
      -- A filha guarda a ordem do contêiner: o rótulo g{ordem} gravado na transcrição continua valendo.
      for v_rec in
        select sr.recording_id, sr.segmento_inicial, sr.ordem, array_agg(x.id order by x.id) as segs
          from public.story_recordings sr
          join public.transcripts t on t.recording_id = sr.recording_id,
          lateral (select (e ->> 'id')::integer as id from jsonb_array_elements(t.segmentos) e) x
          where sr.story_id = p_story and x.id = any (v_ids)
          group by sr.recording_id, sr.segmento_inicial, sr.ordem
      loop
        insert into public.story_recordings (story_id, recording_id, book_id, ordem, segmento_inicial, segmentos)
          values (v_nova, v_rec.recording_id, v.book_id, v_rec.ordem, v_rec.segmento_inicial, v_rec.segs);
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

  -- Gravação com todos os trechos descartados: sai da fila (o áudio continua guardado).
  update public.recordings r set processado_em = now()
    from public.story_recordings sr
    where sr.story_id = p_story and r.id = sr.recording_id and r.processado_em is null
      and not exists (select 1 from public.story_recordings s2
                      join public.stories s on s.id = s2.story_id
                      where s2.recording_id = r.id and (s.id = p_story and s2.segmentos is not null
                                                        or s.divisao_de = p_story));

  if v_n = 0 then  -- deixar fora do livro: o contêiner encerra sem texto
    update public.stories
      set estado = 'falhou', erro_etapa = 'divisao', erro = 'tudo_descartado',
          divisao = v.divisao || jsonb_build_object('final', '[]'::jsonb, 'confirmada_em', now())
    where id = p_story;
    return v_out;
  end if;

  delete from public.story_recordings sr where sr.story_id = p_story and sr.segmentos is null;
  update public.stories
    set estado = 'ouvindo', titulo = v_titulo, prompt_id = v_prompt, pergunta_sugerida = v_sug,
        sugestao_ignorada = v_ign, estrutura = v_estrutura,
        divisao = v.divisao || jsonb_build_object('final', v_final, 'confirmada_em', now())
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
declare v_livro uuid; v public.stories;
begin
  select s.book_id into v_livro from public.stories s where s.id = p_story;
  if v_livro is null or not privado.eh_membro(v_livro) or not privado.livro_editavel(v_livro) then
    raise exception 'sem_permissao';
  end if;
  select * into v from public.stories s where s.id = p_story for update;
  if p_aceitar is null or v.pergunta_sugerida is null then return false; end if;
  if p_aceitar then
    if not exists (select 1 from public.prompts p where p.book_id = v.book_id and p.id = v.pergunta_sugerida
                     and p.estado in ('para_enviar', 'enviada', 'respondida')) then
      return false;
    end if;
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
-- * Os valores 'dividindo' e 'separar' continuam no enum (o Postgres não remove valor de enum).
-- * Trava: com qualquer divisão já feita (proposta, confirmada ou com segmentos escolhidos), só
--   roda com `set ecoa.reversao_destrutiva = 'sim'`. Sem a coluna `segmentos`, o código antigo
--   escreveria a gravação inteira (inclusive trechos descartados) ou o lote inteiro numa história.
-- * Forçada: toda história que passou pela divisão e ainda não está pronta vira 'falhou'
--   (erro 'reversao'); o admin decide o que refazer.
do $$
begin
  if (exists (select 1 from public.stories where divisao is not null or divisao_de is not null)
      or exists (select 1 from public.story_recordings where segmentos is not null)
      or exists (select 1 from public.story_recordings group by story_id having count(*) > 1))
     and coalesce(current_setting('ecoa.reversao_destrutiva', true), '') <> 'sim' then
    raise exception 'reversao_com_divisao: rode com ecoa.reversao_destrutiva = sim';
  end if;
end $$;

update public.stories s set estado = 'falhou', erro_etapa = 'reversao', erro = 'reversao', rascunho = null
  where s.estado::text in ('ouvindo', 'escrevendo', 'dividindo', 'separar')
    and (s.divisao is not null or s.divisao_de is not null
         or exists (select 1 from public.story_recordings sr where sr.story_id = s.id
                    group by sr.story_id having count(*) > 1));

drop function if exists public.responder_sugestao(uuid, boolean);
drop function if exists public.servico_sugerir_pergunta(uuid, uuid);
drop function if exists public.confirmar_divisao(uuid, jsonb);
drop function if exists public.servico_propor_divisao(uuid, jsonb);

-- Funções de volta às versões de 20261115 (mudar etapa, concluir) e 20261116 (iniciar).
create or replace function public.servico_mudar_etapa(p_story uuid, p_para public.story_estado, p_erro_etapa text default null, p_erro text default null)
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
    set estado = 'pronta', titulo = v_titulo, pronta_em = now(), rascunho = null
    where id = p_story;
  update public.recordings r set processado_em = now()
    from public.story_recordings sr
    where sr.story_id = p_story and r.id = sr.recording_id and r.processado_em is null;
  return true;
end $$;

create or replace function public.servico_iniciar_historia(p_recording uuid)
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
  -- P43: conversa de uma parte só e com menos de 29 min vira história direto. A 1ª parte de uma
  -- conversa longa tem 30 min (espera pelo tamanho); as seguintes acham a 1ª no mesmo lote.
  if v.origem not in ('autor', 'livre', 'upload', 'conversa')
     or (v.origem = 'conversa' and (
           v.duracao_s is null
           or v.duracao_s >= privado.max_historia_s() - 60
           or (select count(*) from public.recordings r2 where r2.lote_id = v.lote_id) > 1))
     or (v.origem <> 'conversa' and v.lote_id is not null) then
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

drop policy if exists "membro cria com plano ativo" on public.recordings;
create policy "membro cria com plano ativo" on public.recordings for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id)
              and upload = 'enviando' and origem in ('upload', 'lote', 'conversa'));
revoke select (lote_total, lote_ordem), insert (lote_total, lote_ordem) on public.recordings from authenticated;
alter table public.recordings
  drop constraint if exists recordings_lote_total_so_em_lote,
  drop column if exists lote_ordem,
  drop column if exists lote_total;

drop function if exists privado.max_historias_dia();
drop function if exists privado.min_fala_historia_s();
drop function if exists privado.max_min_conteiner();
drop function if exists privado.espera_lote_h();
drop function if exists privado.max_historias_divisao();
```

### 5.3 Cenários já rodados no PGlite

- **Linhas antigas:** conversa sem total com parte de 30 min → `lote_incompleto`; 7 h depois → segue. Membro inserindo lote sem total ou sem posição → recusado pela política; com os dois → aceito.
- **Lote:** 3 arquivos chegando fora de ordem (`IMG-10`, `IMG-2`, `IMG-3`) → `lote_incompleto` até o último; o contêiner sai na ordem da posição; iniciar de novo por outro arquivo → o mesmo contêiner. Lote em que o último a chegar tem 40 min → o contêiner dos outros dois é criado na mesma chamada; o de 40 min → `longa`. 4º arquivo chegando depois → história própria.
- **Cota:** 3 lotes de 120 min no mesmo livro → os dois primeiros seguem, o 3º → `cota_diaria` (a reserva conta os contêineres ainda não transcritos).
- **Estados:** `ouvindo → dividindo → separar`; propor de novo → `false`; filha → `dividindo` recusado.
- **Confirmação:** membro de outro livro → `sem_permissao`; `porta_autor` e `anon` → negados; segmento de fora → `divisao_invalida`; o mesmo segmento em duas histórias → `divisao_invalida`; pergunta de outro livro → `divisao_invalida`; segmento `"abc"`, `1.5`, `prompt_id` que não é uuid e título numérico → `divisao_invalida` (sem erro de conversão); história com 10 s de fala → `divisao_curta`; válida com 3 → o contêiner fica com a 1ª (título sem espaços, pergunta aceita e respondida, sem mudanças de assunto, a lista de gravações guardada), as filhas nascem com `divisao_de`, cada uma só com as suas gravações e segmentos, **na ordem original**; a sugestão de uma pergunta que acabou de ser aceita cai; confirmar de novo → `divisao_ja_confirmada`; iniciar uma gravação já dividida → `dividida`.
- **Descartar tudo:** lista vazia → o contêiner encerra (`falhou`, `tudo_descartado`), as gravações saem da fila.
- **Concluir** mantém o título confirmado ("Guarapari", não o "Outro" da edição).
- **Sugestão:** pergunta de outro livro → `false`; membro de outro livro → `sem_permissao`; `null` → `false` sem efeito; aceitar → pergunta respondida.
- **Isolamento:** membro de outro livro não lê `divisao`.
- **Reversão** com divisão feita → trava; forçada → passa; subida e descida de novo → ok; reversão completa → ok.
- **Achado no caminho:** um CHECK `not valid` para exigir o total também barrava o UPDATE das linhas antigas (confirmar o upload, `processado_em`). Virou regra na política de insert.

## 6. Pipeline

### 6.1 Disparo

- `confirmarAudio` (upload e conversa) e as ações do link do autor disparam **toda** gravação recebida sem `processado_em`. Evento `ecoa/gravacao.recebida` com `{ recordingId, chave }` (`chave` = `lote_id` ou o próprio id); id `{chave}:{recordingId}`, e com sufixo quando houver (`:admin:…`, `:consentimento`, `:varredura:{janela}`). `dispararGravacao` lê o `lote_id` da gravação quando quem chama não o tem (admin, consentimento, varredura).
- `prepararAudios`: no upload com 2 ou mais arquivos, o servidor grava `lote_total` = quantidade e `lote_ordem` = posição na lista. *Escolher mais* depois de enviar cria outro lote. Na conversa, `OpcoesAudios.conversa` ganha `totalPartes` e `parte`; o gravador grava `totalPartes` em cada `GravacaoLocal` ao terminar a gravação (e na gravação recuperada, P38, ao tocar *Enviar*). Registros antigos do IndexedDB, sem o campo, mandam o número de partes do grupo que está no aparelho.
- **Consentimento:** ao confirmar a IA em Configurações, todas as gravações esperando são disparadas (sai o filtro de origem e a constante `ORIGENS_AVULSAS`).
- **Varredura (a cada 15 min):**
  - Reenvia gravação recebida há mais de 5 min e há menos de 7 dias, sem história, sem `processado_em`, com até 30 min e livro com consentimento, em ordem de chegada. Pula gravação de lote com total anunciado ainda incompleto e menos de 6 h.
  - Reenvia `ecoa/historia.confirmada` para história nascida de divisão (ou contêiner confirmado) parada em `ouvindo` há mais de 5 min, sem rascunho.
  - Marca como `parada` a história em `ouvindo`, `escrevendo` ou `dividindo` há mais de 20 min. Como cada passo de transcrição toca `atualizado_em`, um contêiner grande ainda rodando não é parado. `separar` nunca é parada (espera a pessoa).

### 6.2 Função `processar-gravacao` (mudada)

Concorrência por `event.data.chave` (reserva em `recordingId`); `chave` opcional no zod e no `onFailure`.

| Passo | O que faz |
| --- | --- |
| `iniciar` | `servico_iniciar_historia`. Para em `pronta`, `falhou`, `separar`, `dividindo` com divisão já gravada, e no motivo `dividida`. Devolve os ids das gravações do contêiner, em ordem (execução antiga sem a lista = só a gravação do evento) |
| `transcrever` (1ª) e `transcrever:{n}` (n ≥ 2) | um passo por gravação, em ordem. Se já houver transcrição, pula. Senão, grava `segmento_inicial`, toca `atualizado_em` e transcreve, como no prompt 6. O nome do 1º passo não muda, para não quebrar execuções em voo |
| `estruturar` | igual, sobre os segmentos de todas as gravações; `arquivo` = a lista `g1, g2…`; falante sem papel na resposta herda o papel do mesmo `speaker_N` de outra gravação, senão `outro`. `estruturar.md` passa a falar de "uma ou mais gravações" |
| — | **decide**, lendo a estrutura do banco (o passo reaproveitado devolve só `{reaproveitada}`): história com `divisao`/`divisao_de` → para; 2 ou mais gravações, ou `mudancasDeAssunto` não vazio → divisão; senão → `escrever` (os passos do prompt 6, sem mudança) |
| `dividir` | lê estado e `divisao` antes de tudo: já em `separar` → devolve contagens, **sem chamar a IA**. Senão, `servico_mudar_etapa(dividindo)` e canal `separando` → modelo capaz (`dividir.md`) → `limparDivisao` (6.3). Gravação única com 1 história: grava a sugestão de pergunta e segue para `escrever`. Senão: `servico_propor_divisao` e canal `conferir` |
| `esperar-divisao` | `step.sleep(10 min)` |
| `avisar-divisao` | se continuar em `separar`: e-mail ao responsável (D8), `idempotencyKey: divisao:{id}`. Nunca lança |

### 6.3 Divisão (IA e limpeza)

- **Prompt** `lib/ai/prompts/dividir.md` e `dividir-entrada.md` (para o Guilherme ler e ajustar). Entrada: nome do autor, as gravações (`g1 · 2 min`, com a pergunta ligada, se houver), as perguntas pendentes numeradas (`P1…`, até 100, mais recentes primeiro) e os segmentos com o papel de cada falante e a marca de vazio. Regras: uma história é um episódio que se sustenta sozinho; não separar por causa de uma pergunta de acompanhamento; juntar o mesmo assunto mesmo em arquivos diferentes; cada história com pelo menos 1 min de fala; título curto, com palavras da fala, sem fato inventado; pergunta só se a história claramente responde.
- **Saída** (zod `Divisao`): `historias[{ titulo, trechos[{de, ate}], pergunta: número | null }]`. Etapa `dividir` em `claude.ts`; ramo no `ClienteFalso` do lab.
- **`limparDivisao`** (pura, com teste): expande as faixas em ids que existem; o 1º que pede um segmento fica com ele; segmento sem dono vai para a história do segmento anterior (nada some sem a pessoa ver); tira histórias vazias; junta uma história com menos de 30 s de fala à vizinha; ordena pelo 1º segmento; acima de 30, junta o excesso na 30ª; título vazio vira null; pergunta fora da lista vira null. Pergunta ligada a uma gravação (escolhida no upload) vira `promptId` direto; uma pendente vira sugestão. Pergunta ligada que nenhuma história pegou vai para a história com mais segmentos daquela gravação.
- **Guardado** em `stories.divisao`: `gravacoes` (ids, na ordem), `ia` (`{ historias: [{ titulo, segmentos: [[de, ate]…], promptId, sugeridaId }], hash_prompts }`) e, ao confirmar, `final`. A diferença entre `ia` e `final` é a medida de qualidade da divisão (como T31 faz com o texto).

### 6.4 Função nova `escrever-historia`

- Evento `ecoa/historia.confirmada` `{ historiaId }`, id `historia:{id}` (no *Tentar de novo* do admin, id novo), enviado pela ação de confirmar em `after()`, um por história. Concorrência por `historiaId` e, no total da função, no máximo 4 ao mesmo tempo. `retries: TENTATIVAS_POR_PASSO - 1`.
- Passos: `retomar` (lê o estado; só segue em `ouvindo` ou `escrevendo`) e os mesmos `editar`, `verificar`, `concluir`, `memoria`, `esperar`, `avisar` do prompt 6, extraídos para `escreverHistoria()` e usados pelas duas funções. O `retomar` publica `ouvindo` no canal (o cartão sai de "Conferir").
- `onFailure`: `falhou`, como no prompt 6.
- **Admin, *Tentar de novo*:** história com `divisao_de` ou com divisão confirmada manda `ecoa/historia.confirmada`; as outras mandam o evento da gravação, como hoje.

### 6.5 Memória com pergunta (D7)

- `memoria-entrada.md` ganha `{{perguntas}}`: a lista numerada das pendentes, só se a história não tiver pergunta, sugestão ou sugestão ignorada; senão "(nenhuma)". O schema `Memoria` ganha `pergunta: número | null`. O código traduz o número no id e chama `servico_sugerir_pergunta`. Falha aqui não muda nada (a memória nunca lança).

### 6.6 Ações do servidor

- `confirmarDivisao(livroId, historiaId, historias)` e `responderSugestao(livroId, historiaId, aceitar)` entram em `app/livro/[id]/acoes.ts`, ao lado de `paraEscrever`, `evento`, `atualizar` e `falhou` (um arquivo `"use server"` não exporta helpers: separar criaria uma terceira cópia). Zod com os mesmos limites do banco. Erros por `fraseDoErro`: `divisao_invalida` → "Não deu certo agora. Tente de novo."; `divisao_ja_confirmada` → "Estas histórias já foram para a escrita."; `divisao_curta` → "Uma das histórias ficou curta demais. Junte com outra."; `divisao_limite_dia` → "Hoje já foram muitas histórias. Confirme amanhã."

### 6.7 Eventos (medida da hipótese)

- `divisao_proposta` (sistema): histórias propostas, gravações, minutos.
- `divisao_confirmada` (membro): propostas, confirmadas, e as contagens de juntar, separar, descartar e renomear (calculadas no aparelho a partir das ações; os detalhes aceitam número).
- `pergunta_sugerida_aceita` e `pergunta_sugerida_ignorada`.

### 6.8 Tempo real

- `ETAPA_DO_ESTADO` ganha `dividindo → separando` e `separar → conferir`. Mensagem do canal só com a etapa (nenhum título vai pelo canal nesta fase). Ao receber `conferir`, a home relê o servidor. Para `separar`, o estado do servidor vale mais que o do canal; depois da confirmação, o `retomar` publica `ouvindo`.

## 7. Telas

Celular primeiro; uma ação principal por tela; títulos e trechos em `font-livro`. Reaproveita `EstadoVazio`, `Campo`, `Aviso`, `Botao`, `DicaPrimeiraVez` (chave própria), `assinarLeitura` e `andamento()`.

- **Cartão do contêiner (home e Histórias).** Ramo próprio no cartão, fora do passo a passo de 4 etapas (que daria erro com uma etapa desconhecida). `separando`: a barra pelo tempo previsto (`andamento()` ganha a fase), "Separando as histórias · falta cerca de 1 min". `conferir`: "Encontramos 4 histórias nesta conversa." + *Conferir* (botão principal do cartão). Origem: "Conversa · 40 min" ou "8 áudios".
- **Confira as histórias (`/livro/[id]/historias/[historiaId]/dividir`).**
  - A página lê a história, as gravações e as transcrições (só `recording_id` e `segmentos`, sem `palavras`) com a **sessão**, filtrando pelo livro `[id]`; assina só os caminhos que voltaram dessa leitura (`assinarLeitura`, 1 h). Outra história ou outro livro → 404.
  - Título "4 histórias" e uma linha: "Confira antes de escrever." Dica de primeira vez: "Juntar une com a de baixo. Separar corta onde você tocar."
  - Cada história num bloco: título (toque para renomear), "3 trechos · 6 min", a sugestão de pergunta ("Parece responder: *Como conheceu a vó?*" + *Marcar como respondida* · *Ignorar*) e os trechos: ▶, "Parte 1 · 12:30", as primeiras palavras e *Tirar*. Embaixo: *Juntar com a de baixo* · *Separar*.
  - *Separar* mostra "Separar aqui" entre os trechos daquele bloco; um toque divide; *Cancelar* sai.
  - *Tirar* deixa o trecho fora das histórias, com "Fora das histórias · *Desfazer*". O áudio continua guardado (a palavra "descartar" daria a ideia de apagar).
  - Botão principal fixo embaixo: *Escrever 4 histórias*. Depois do toque, volta para a home, com os cartões ao vivo.
  - Um player só por tela: ▶ toca o trecho do áudio original e para no fim dele.
  - **Vazio:** se tudo for tirado, "Nenhum trecho sobrou." + *Recomeçar* (volta à proposta da IA) e, em texto, *Deixar fora do livro* (confirma a lista vazia). Se a divisão já foi confirmada (outra aba, outro irmão): "Estas histórias já foram para a escrita." + *Ver histórias*.
- **Ler a história:** a sugestão de pergunta no topo, com os mesmos dois botões. Áudio e duração só dos segmentos da história.
- **Status de todo áudio enviado, sempre visível (pedido do Guilherme na aprovação de D3).** Em *Áudios recebidos*, os arquivos de um mesmo envio aparecem juntos ("8 áudios · 13/11, 20:14"), e cada um tem um selo com o estado de agora: *Enviando 40%*, *Esperando os outros 2*, *Ouvindo*, *Separando as histórias*, *Confira as histórias* (com o botão), *Escrevendo*, *Virou história* (com o link), *Fora das histórias* ou o motivo de espera. Nenhum áudio fica sem selo.
- **Áudios recebidos e home:** a gravação aponta para o contêiner (a história mais antiga), não para a última filha. Motivos novos, derivados sem coluna nova: lote com total anunciado maior que os recebidos e menos de 6 h → "Guardada. Esperando os outros áudios."; `processado_em` preenchido e sem história → "Fora das histórias."; gravação num contêiner em `separar` → "Confira as histórias". Sai a frase "Conversas longas viram histórias em breve" e o motivo `divisao`.
- **Subir áudios:** ao terminar, "Pronto. 8 áudios guardados. As histórias aparecem no início." + *Acompanhar* (home); *Ver áudios recebidos* vira link de texto.
- **Histórias:** o contêiner encerrado com `tudo_descartado` não aparece.
- **Admin → Processamento:** campo de motivo nas gravações esperando; contêineres em `separar` há mais de 24 h (livro, idade).

## 8. Arquivos

**Criar:**
```
supabase/migrations/20261117120000_divisao.sql, supabase/reversao/20261117120000_divisao.down.sql
supabase/tests/divisao.test.ts                       5.3 + isolamento + porta_autor
lib/ai/prompts/dividir.md, dividir-entrada.md
lib/divisao/limpar.ts (+ .test.ts)                   limparDivisao (6.3)
lib/divisao/trechos.ts (+ .test.ts)                  trechos de ~1 min; juntar, separar, tirar, renomear, desfazer
lib/divisao/dados.ts, tipos.ts                       leitura da tela (sessão + URLs assinadas)
app/livro/[id]/historias/[historiaId]/dividir/page.tsx
components/telas/tela-dividir.tsx
e2e/dividir.spec.ts
```
**Modificar:**
```
lib/ai/schemas.ts, etapas.ts, claude.ts (+ etapas.test.ts)   Divisao, dividir(), etapa "dividir"; Memoria.pergunta; estruturar com várias gravações
lib/ai/prompts/estruturar.md, estruturar-entrada.md, memoria.md, memoria-entrada.md
lib/pipeline/processar.ts (+ processar.test.ts)       grupo, transcrever em ordem, decidir, dividir; escreverHistoria(); bancoFalso
lib/pipeline/banco.ts                                segmentos filtrados, fixarSegmentoInicial, tocar, propor, sugerir, perguntas pendentes
lib/pipeline/regras.ts, disparo.ts                   etapas e motivos novos (sem divisao), chave do evento, sem ORIGENS_AVULSAS
lib/inngest/funcoes.ts                               concorrência por chave; escrever-historia; varredura
app/livro/[id]/acoes.ts                              lote_total/lote_ordem; disparo de toda gravação; confirmarDivisao, responderSugestao
app/a/[token]/acoes.ts, app/livro/[id]/configuracoes/acoes.ts   chave do evento; consentimento sem filtro de origem
app/admin/*, components/telas/admin-processamento.tsx         motivo; Tentar de novo por tipo
lib/livro/tipos.ts, lib/gravacao/local.ts, lib/gravacao/envio.ts (+ envio.test.ts), components/gravacao/gravar.tsx, components/telas/tela-gravar-conversa.tsx   totalPartes e parte
components/audios/subir-audios.tsx                   fim do envio
lib/ui/etapas.ts, lib/historias/etapas.ts (+ teste), previsao.ts, tipos.ts, dados.ts   estados separando/conferir, sugestão, mapa de áudios, duração por segmentos
components/ui/cartao-historia.tsx, historias-ao-vivo.tsx
components/telas/tela-historia.tsx, tela-livro.tsx, tela-audios.tsx, tela-historias.tsx
lib/email/modelos.ts (+ teste)                       divisaoPronta
lib/eventos-acoes.ts                                 eventos de 6.7
lib/erros-banco.ts (+ teste)                         divisao_invalida, divisao_ja_confirmada, divisao_curta, divisao_limite_dia
lib/config.ts                                        MAX_HISTORIAS_DIVISAO, ESPERA_LOTE_H, MAX_MIN_CONTEINER, MIN_FALA_HISTORIA_S, MAX_HISTORIAS_DIA, ESPERA_EMAIL_DIVISAO_MIN, TRECHO_ALVO_S, EDICOES_SIMULTANEAS, PREVISAO_DIVIDIR_*
lib/supabase/tipos.ts                                aplicar a migration, regerar e reaplicar os ajustes manuais (cabeçalho, retornos anuláveis, confirmar_divisao uuid[])
supabase/tests/pipeline.test.ts, rls.test.ts, config-banco.test.ts   testes de P43 reescritos com lote_total; listas de funções e limites
lib/exemplos/prompt6.ts, e2e/historias.spec.ts       frases novas de espera
scripts/lab/fakes.ts                                 ramos dividir e memoria.pergunta
app/(dev)/styleguide                                 vitrine da tela de divisão e dos cartões novos
docs/decisoes.md                                     P44–P47 e T40 (seção 12)
```

## 9. Testes

- **Banco (PGlite):** os cenários de 5.3, mais: gravação com todos os trechos tirados → `processado_em` e `descartada` ao reiniciar; transições de `servico_mudar_etapa`; `porta_autor` sem execute nas funções novas; listas de grants e funções em `rls.test.ts`; espelho de config; os testes de P43 em `pipeline.test.ts` reescritos com `lote_total`.
- **Unidade:** `limparDivisao` (sobreposição, buracos, faixa inventada, história curta, excesso de 30, pergunta fora da lista, pergunta ligada sem dono); trechos (corte em ~1 min na pausa mais longa, juntar, separar, tirar e desfazer, renomear, a carga do confirmar); `estruturar` com 2 gravações e falante sem papel; pipeline com fakes: gravação única sem mudança → direto (como hoje, com os mesmos nomes de passo); com mudança → divisão com 1 história → direto; com 3 → `separar` e para; lote de 3 → `separar` mesmo com 1 história; transcreve em ordem com ids contínuos e um arquivo vazio no meio; repetir `dividir` em `separar` → zero chamadas à IA; `escrever-historia` só a partir de `ouvindo`/`escrevendo`; nenhum texto no retorno dos passos nem nos erros; mapa de estados com as etapas novas.
- **Ponta a ponta (Playwright, vitrine sem Supabase):** juntar, separar, tirar com desfazer, renomear; a carga enviada no confirmar; dica de primeira vez uma vez só; os dois estados vazios; cartões `separando` e `conferir`.
- **No deploy de prévia (gate T28):** o aceite com áudio real: 8 áudios sobre 3 assuntos → 3 propostas; conversa livre de 40 min sobre 4 assuntos → 4; juntar 2 → editada como uma só. Mais: um contêiner de 120 min (tempo de `estruturar` e `dividir`); a expressão de concorrência do Inngest; Compartilhar do Android com vários áudios; membro de outro livro abrindo `/dividir` de um livro alheio → 404; erros de runtime da Vercel.

## 10. Riscos

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| A divisão erra muito com conversa de mesa (falas cruzadas, assunto que volta) | Alto | Ajustes de 1 toque; métrica e critério de morte (seção 1); a proposta da IA e a final ficam guardadas para corrigir o prompt |
| Edição sem fidelidade medida, agora multiplicada por 4 | Alto | Fechar a leitura do André antes da ceia (seção 1) |
| Ceia gravada fora do app num arquivo de 1 h | Médio | D9; orientar o André a usar *Gravar conversa*; se acontecer, o webhook do Scribe entra antes do Natal |
| App antigo em cache enviando conversa sem total | Médio | A política recusa o insert; o gravador guarda a parte e mostra "Não deu certo agora", e a página nova manda certo. As linhas que já existem seguem P43 |
| Gravação única com 2 assuntos que o modelo rápido não marca | Baixo | D2; vira 1 história, que o editor resolve |
| Lote em que um arquivo nunca chega | Baixo | Espera de 6 h (D3) |
| Duas pessoas confirmando ao mesmo tempo | Baixo | `for update` + estado: a segunda recebe "já foram para a escrita" |
| Muitas edições de uma vez | Baixo | D12: fala mínima, 60 por dia, 4 simultâneas, contêiner de até 120 min |

## 11. Configuração (Guilherme)

Nada novo na Vercel nem no Supabase. Depois do deploy, sincronizar o app no Inngest (a função `escrever-historia` é nova).

## 12. Decisões novas para `docs/decisoes.md` (se aprovadas)

- **P44** = D1 + D2 (contêiner; quando dividir; grupo sempre confirma, gravação única de 1 assunto segue). Substitui em parte P40 e P43; mantém P17.
- **P45** = D3 + D4 + D5 (lote completo com total e posição; ajustes no aparelho; trecho de ~1 min).
- **P46** = D6 + D7 (título confirmado vale; pergunta sugerida na divisão e na memória).
- **P47** = D8 (e-mail da divisão).
- **T40** = D9 + D10 + D11 + D12 (arquivo único de mais de 30 min espera; sem `--lote` no lab; divisão no modelo capaz; tetos de custo da divisão).

## 13. O que mudou com a revisão

**Segurança e banco (`critic_report.md`):** veredito "aprovar com correções", sem vazamento entre livros nem acesso do `porta_autor`. Entraram:
1. Lote sem total: a regra de P43 volta para as linhas antigas; linhas novas exigem total e posição (política de insert).
2. Custo por confirmação: fala mínima de 30 s, 60 histórias por dia, 4 edições simultâneas (D12).
3. Cota: trava por livro e reserva dos contêineres ainda não transcritos; contêiner de até 120 min, então nenhum grupo fica acima da cota para sempre; a varredura olha 7 dias.
4. Parada: cada transcrição toca `atualizado_em`; filhas paradas têm o evento reenviado antes de qualquer `falhou`.
5. Evento da confirmação com id e reenvio pela varredura.
6. P17 mantido: o grupo sempre passa pela confirmação (D2).
7. Reversão inteira no doc; trava com qualquer divisão; contêineres afetados viram `falhou` na reversão forçada.
8. `dividir` e o "decide" sem custo repetido.
9. URLs assinadas só do que a sessão leu.
10. Ordem pela posição (`lote_ordem`).
11. Teto de 120 min por contêiner.
12. Gatilho excluído cria o contêiner dos outros.
13. a 17. Conferir antes de travar; formato do jsonb antes de converter; ids repetidos; lista vazia ("Deixar fora do livro"); sugestão confere a pergunta e trata `null`.
18. LGPD: "Tirar" e "Fora das histórias" em vez de "descartar"; quem confirmou só no evento; rascunho local só com ids e apagado.
19. `divisao.gravacoes` guarda as gravações do contêiner.
20. Rótulo `g{ordem}:speaker_N` conferido; as filhas mantêm a ordem.

**Código (`codebase_details_report.md`):** os 20 achados entraram: chave do evento com reserva e os 5 chamadores (1); nome do 1º passo de transcrição mantido e `iniciar` tolerante (2); ordem por posição (3); lista dos testes que mudam (4); ramo próprio do cartão para as etapas novas (5); ordem preservada nas filhas (6); `estruturar` com várias gravações (7); `fixarSegmentoInicial` (8); total do upload no servidor e `totalPartes` no gravador (9); reenvio do evento perdido (10); `dividir` idempotente (11); ações em `app/livro/[id]/acoes.ts` (12); mapa de áudios e duração por segmentos (13); consentimento e varredura sem filtro de origem (14); ordem para regerar os tipos (15); `atualizado_em` (16); etapa, fakes e hashes da divisão (17); motivos trocados de uma vez (18); peças de UI reaproveitadas (19); SQL completo e reversão completa testada (20).

**O que não entrou:** máximo de histórias proporcional aos minutos (`ceil(min/2)`, achado 2 de segurança). Ele quebraria o aceite de 8 áudios curtos sobre 3 assuntos (4 min → no máximo 2); a fala mínima de 30 s já amarra o número de histórias ao áudio.

## 14. O que mudou na aprovação e na implementação

- **D9 (Guilherme):** o arquivo único não fica mais preso a 30 min. Até 2 h ele é processado inteiro, sem cortar o original; a separação é lógica, pelo texto, e uma história pode ter 50 min e outra 10. Acima de 2 h, a frase pede para dividir o arquivo. Uma história confirmada vai até 60 min de fala (`divisao_longa`), para caber numa escrita só. Gravação única acima de 60 min de fala sempre passa pela tela, mesmo com 1 história. Migration: `privado.max_arquivo_s()` (7200) e `privado.max_fala_historia_s()` (3600).
- **D3 (Guilherme):** todo áudio enviado mostra o status de agora, e os do mesmo envio aparecem juntos (seção 7).
- **Achado no teste:** a reversão roda duas vezes sem erro (o teste de banco desce, sobe e desce de novo).
- **Banco:** os tipos de `lib/supabase/tipos.ts` foram atualizados à mão (o conector do Supabase não respondeu nesta sessão). Ao aplicar a migration, regerar e conferir que só mudam as linhas do prompt 7.
- **Pendências do deploy:** aplicar a migration; sincronizar o Inngest (função nova `escrever-historia`); conferir na prévia a expressão de concorrência `has(event.data.chave) ? … : …`, o tempo de transcrição de um arquivo de 1 h e de `estruturar`/`dividir` num contêiner de 120 min, e o aceite com áudio real.
