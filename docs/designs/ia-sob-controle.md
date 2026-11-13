# Editor de histórias, parte 2: IA sob controle (prompt 9)

Status: **v3 aprovada pelo Guilherme em 2026-11-13** (I0 a I8 como recomendado; P50 a P54 e T42) · revisão minha na seção 11; revisores na seção 12 · 2026-11-13 · PRD: M6 (tamanho, revisar trecho, acrescentar áudio, aceite do M6), Pipeline de IA (Fluxos especiais), M11 (dica de primeira vez) · Decisões: P19, P25, P49, T8, T10, T11, T12, T18, T28, T31, T34, T36, T37, T38, T40, T41

Prompt com [EGM] e banco: design doc + SQL de subida e reversão para o OK. Revisores (T28): `egm:egm-design` e `egm:egm-codebase-details`, em Sonnet. Os dois caíram por limite de uso na 1ª tentativa; fiz a revisão (seção 11) e, a pedido do Guilherme, eles foram retomados depois do limite e revisaram a v2 (seção 12; relatórios em `ia-sob-controle/`).

## 1. Problema, hipótese e risco

Hoje o André corrige à mão. Se o texto ficou curto demais, longo demais ou se o Nelson lembrou de mais um pedaço depois, a única saída é reescrever. A promessa do PRD é que a IA ajude **sem nunca apagar o que a família escreveu** (T12).

- **Usuário:** André, revisando as histórias do Nelson no celular e no computador.
- **Hipótese:** com a proposta mostrada como diferença, o André usa *Tamanho*, *Revisar* e *Acrescentar áudio* em vez de reescrever, e aceita a maior parte do que a IA propõe.
- **Métricas (saem de `story_proposals`, sem nada novo):** propostas aplicadas ÷ pedidas; mudanças recusadas dentro de uma proposta aceita; parágrafos editados à mão depois de um aceite (sinal de que a IA errou); custo e tempo por proposta (`ai_usage`).
- **Critério de morte:** 1 parágrafo editado à mão que muda ou some depois de um aceite (bug grave: as telas de IA saem do ar até o teste cobrir o caso); ou mais da metade das 10 primeiras propostas do André descartadas. No segundo caso, o problema é o prompt de cada ferramenta, não o editor.
- **Risco que você não está vendo:** este prompt não está no mínimo da ceia (P28: 0 a 7), e o aceite de fidelidade do prompt 6 (leitura do André) segue aberto. Cada ferramenta nova é mais uma chamada da IA que pode inventar: *Tamanho* reescreve a história inteira. A verificação roda em toda proposta, mas a métrica que importa continua sendo a leitura do André. **Qual é a evidência de que o André quer mudar o tamanho?** Se ainda não há, a ordem de valor provável é: acrescentar áudio (o Nelson sempre lembra de mais), revisar trecho (corrige sem reescrever) e, por último, tamanho. Ver a decisão I0.

## 2. Escopo

**Entra:** os 5 itens do prompt.
1. **Tamanho** em 5 posições (Resumido, Curto, Médio, Longo, Detalhado). Gera uma proposta a partir da base estruturada (T11), com os parágrafos editados à mão travados; o controle mostra quantos. Dica: "Arraste para ter mais ou menos detalhe."
2. **Revisar um trecho:** selecionar, depois *Mais curto*, *Mais fiel à fala*, *Corrigir* ou uma instrução escrita. A proposta passa pela verificação.
3. **Acrescentar áudio:** *Gravar mais sobre isso* e *Subir mais um áudio*, ligados à mesma história.
4. **Propostas como diferença:** inserido em verde, removido riscado; *Aceitar tudo*, escolher por parágrafo ou *Descartar*. Cada aceite gera uma versão.
5. **Teste automático** do aceite do M6 (seção 9).

**Não entra (e por quê):**
- **Texto da proposta aparecendo ao vivo**, palavra por palavra. A proposta chega inteira, com uma barra de previsão (a mesma do cartão, P43). Ao vivo exige comparar texto incompleto; fica para depois se a espera incomodar.
- **Reaproveitar uma proposta igual** (voltar para *Médio* sem chamar a IA). Entra se `ai_usage` mostrar idas e vindas.
- **Autor usando as ferramentas** (prompt 10) e **co-facilitador** (onda 2: já funciona, as funções olham o membro).
- **Áudio acrescentado passando pela divisão.** *Gravar mais sobre isso* é, por definição, o mesmo assunto.
- **Desfazer um aceite:** *Restaurar* no histórico já desfaz (a versão anterior fica guardada antes de todo aceite).

## 3. Decisões que preciso de você

| # | Decisão | Recomendo | Por quê | O que se perde |
| --- | --- | --- | --- | --- |
| I0 | **Ordem de construção** | Tudo neste prompt, nesta ordem: propostas e diferença, acrescentar áudio, revisar trecho, tamanho. Se o tempo apertar, tamanho é o que fica para depois | As três ferramentas usam a mesma proposta; a ordem põe primeiro o que o André mais deve usar | Nada, se couber |
| I1 | **SQL (seção 7)** | Aprovar | Ensaiado em PGlite com as migrations reais (seção 8) | — |
| I2 | **"Cada aceite gera uma versão":** a escolha por parágrafo fica na tela; *Aceitar* grava tudo de uma vez = 1 versão | Escolher na tela, 1 versão por aceite | Aceitar parágrafo por parágrafo, cada um gerando versão, encheria o histórico (uma proposta de tamanho tem 8 a 15 parágrafos, e versão não se apaga, T36). Mesmo padrão da divisão (P45) | Fechar a tela no meio da escolha perde a escolha (a proposta continua lá) |
| I3 | **Parágrafo revisado pela IA a pedido e aceito fica travado** (como se fosse editado à mão) | Travar | A pessoa escolheu aquele texto; uma troca de tamanho depois não pode desfazer a escolha. Os parágrafos que vêm de *Tamanho* e de *Acrescentar áudio* não travam | Para destravar, só editando de novo (o que já trava) ou restaurando uma versão |
| I4 | **Editar continua livre enquanto a IA trabalha.** Quando a proposta chega, cada mudança que toca um parágrafo mexido depois do pedido aparece "O texto mudou aqui" e não pode ser aceita | Assim | Tamanho e áudio levam 1 a 2 min; travar o texto nesse tempo irrita. O banco confere parágrafo por parágrafo, então nada editado se perde | Uma mudança vencida pede um novo pedido |
| I5 | **Áudio acrescentado:** 1 gravação ou 1 arquivo de até 30 min por vez; a história fica com no máximo 60 min de fala e 10 áudios; conta na cota diária de minutos (T38); vira proposta de inserções e alterações. A história continua editável durante | Assim | 30 min cabe num passo de transcrição (T35); 60 min é o teto de uma escrita (T40), que *Tamanho* refaz | Acrescentar uma conversa de 1 h a uma história: grava como história nova |
| I6 | **Teto de 40 pedidos de IA por livro em 24 h** (tamanho, revisar e áudio juntos), conferido no banco | 40 | Sem teto, arrastar o controle sem parar gera custo sem limite (a mesma razão de T38). 40 cobre uma tarde de revisão | Quem passar de 40 espera o dia seguinte ("A IA descansa até amanhã") |
| I7 | **Tamanho dispara ao soltar o controle** (1,5 s parado na posição), sem botão a mais | Assim | Uma ação; arrastar pelas posições não dispara 4 pedidos | Soltar sem querer custa 1 pedido (e o *Descartar* resolve) |
| I8 | **Versão aplicada tem origem "IA"** e aponta para a proposta (`proposta_id`); quem aceitou fica na proposta. O histórico mostra "IA · Longo", "IA · áudio novo" ou "IA · trecho revisado" | Assim | O PRD pede a origem de cada versão; o texto veio da IA, a escolha foi da pessoa | A comparação de qualidade (T31) passa a ter mais de uma versão da IA; o `--comparar` do lab segue usando a versão 1 até alguém precisar de mais |

## 4. Como funciona

### 4.1 Proposta e mudança

Toda ferramenta produz uma **proposta** (`story_proposals`), nunca escreve no texto. A proposta guarda uma lista de **mudanças**. Uma mudança é a unidade de aceite ("por parágrafo"):

```
{ id: "m3",
  tira: [{ id: "p4", texto: "<texto do p4 na hora do pedido>" }],   // pode ser vazio
  poe:  [{ id: "n-8k2", texto, fontes, editado }],                   // pode ser vazio
  depois_de: "p3" | null }                                            // só quando tira é vazio
```

- `tira` guarda uma cópia do texto de cada parágrafo na hora do pedido. Na hora do aceite, o banco compara com o texto atual: diferente = **vencida** (I4).
- Nenhuma mudança tira um parágrafo travado (`editado: true`). A única exceção é *Revisar um trecho*, quando a pessoa selecionou um trecho dentro de um parágrafo travado: a mudança dela tira aquele parágrafo, e só ele.
- `poe` traz ids novos. O texto novo só pode vir daqui ou do texto atual (o banco confere, seção 6).

Cada ferramenta monta as mudanças assim:

| Ferramenta | Mudanças |
| --- | --- |
| **Tamanho** | A IA devolve o texto inteiro, com um marcador `{travado: "p2"}` no lugar de cada parágrafo travado. O código troca o marcador pelo texto exato do parágrafo (a IA nunca copia texto travado); se a IA esquecer um, o código o põe de volta na posição que tinha. Depois agrupa por fontes em comum: parágrafos antigos e novos que contam os mesmos segmentos viram uma mudança. Novo sem fonte em comum = inserção; antigo sem par = remoção. A proposta guarda também a ordem completa (`ordem`): *Aceitar tudo* dá exatamente o texto que a IA escreveu, com os travados no lugar |
| **Acrescentar áudio** | A IA recebe o texto atual (com os travados marcados) e a transcrição do áudio novo e devolve só operações: *inserir depois de X* ou *substituir X* (X não travado). Cada operação vira uma mudança. Operação sobre parágrafo travado ou id inexistente é descartada pelo código |
| **Revisar trecho** | Uma mudança: tira o parágrafo, põe o mesmo parágrafo com o trecho trocado pelo substituto da IA, as mesmas fontes e `editado: true` (I3) |

### 4.2 Aceitar, escolher por parágrafo, descartar

- A tela de diferença substitui o texto enquanto a proposta está aberta. Cada mudança aparece no lugar, com as palavras inseridas em verde e as removidas riscadas (diferença por palavra). Parágrafo travado aparece com um cadeado e "Editado à mão · fica como está".
- Cada mudança tem *Não quero esta* (e volta com *Quero esta*). A ação principal é *Aceitar tudo*, que vira *Aceitar 3 de 5* quando há recusas. *Descartar* é secundária.
- Ao aceitar: o texto não salvo é salvo antes; o servidor monta o texto final com a mesma função pura que a tela usa para a prévia (`lib/editor/propostas.ts`) e chama `aplicar_proposta`, que confere tudo no banco, guarda o texto anterior como versão (nada se perde) e grava a nova versão com origem "IA" (I8). Uma versão por aceite (I2).
- Escolha parcial: as mudanças aceitas entram no lugar do 1º parágrafo que tiram; inserção entra depois da âncora (`depois_de`) ou, se a âncora não entrou, depois do parágrafo anterior que ficou. *Aceitar tudo* numa proposta de tamanho usa a `ordem` da IA.
- Grifos *Confira*: os parágrafos que ficam mantêm os seus (posição recalculada); os novos trazem os da verificação da proposta, guardados por id de parágrafo (`paragrafo_id`), não por posição.
- Título, ano e lacunas não mudam num aceite: o banco usa os do texto atual e não mexe em `stories.titulo` (P46).
- Depois do aceite, o editor recarrega o texto aplicado sem disparar salvamento: os parágrafos novos passam a ser os "originais" (senão o próximo salvamento os marcaria como editados à mão) e o `rev` é o devolvido pelo banco.

### 4.3 Tamanho

- Botão *Tamanho · Médio* acima do texto abre uma folha com o controle de 5 posições (o `ControleTamanho` do prompt 2), o aviso "2 parágrafos editados à mão ficam como estão" e a dica de primeira vez. A posição inicial é o tamanho da última versão.
- Soltar numa posição nova (1,5 s parado) pede a proposta (I7). A folha mostra "Escrevendo a versão Longa · falta cerca de 1 min" com a barra de previsão. Pode fechar e continuar editando (I4); quando fica pronta, aparece *Ver a versão Longa* no topo do texto.
- A IA recebe toda a transcrição da história (inclusive áudios acrescentados) e a estrutura, nunca a versão anterior (T11). Frações: Resumido 30%, Curto 45%, Médio 60%, Longo 75%, Detalhado 90% das palavras com conteúdo (`TAMANHOS_TEXTO`).
- Passos (Inngest, `propor`): `editar` (modelo capaz, com os travados) → `verificar` (só os parágrafos novos) → `gravar`. Entre os passos, a saída da IA fica na própria proposta (`servico_gravar_proposta` com `p_pronta = false`); os passos devolvem só ids (T36).
- Parágrafo criado depois do pedido (Enter, colar) não está na proposta: ele fica no texto, no lugar dele, em qualquer aceite.
- Enquanto um áudio novo está sendo ouvido, *Tamanho* espera ("Espere o áudio novo"): a estrutura ainda não tem os falantes dele.

### 4.4 Revisar um trecho

- Selecionar texto dentro de um parágrafo mostra o botão *Revisar* colado na seleção (o mesmo jeito do *Ouvir*, P49). Seleção que atravessa parágrafos: o botão diz "Escolha dentro de um parágrafo". Dica de primeira vez: "Selecione um trecho para pedir uma revisão."
- A folha mostra *Mais curto*, *Mais fiel à fala*, *Corrigir* e um campo "Ou escreva o que mudar" (até 300 letras).
- Entra: o trecho, o parágrafo inteiro, um parágrafo antes e um depois, os segmentos de origem do parágrafo e a instrução. Sai um único substituto. A instrução escrita vai como pedido entre marcadores, nunca como regra: as regras de não inventar continuam valendo.
- Roda na própria ação do servidor (10 a 20 s, sem fila): `revisar` → `checar` + `verificar` (só o parágrafo, contra os segmentos dele e dos vizinhos) → `gravar`. Mostra "Revisando…" e abre a diferença daquele parágrafo.

### 4.5 Acrescentar áudio

- Na coluna (ou aba) *Áudio*: *Acrescentar áudio* abre a folha com *Gravar mais sobre isso* e *Subir mais um áudio*.
- *Gravar* abre `/livro/[id]/historias/[historiaId]/gravar`: o gravador com o título da história no topo ("Mais sobre: O trem de 1962"), uma parte só (`emPartes={false}`, para em 30 min), com adaptador próprio, sem lote de conversa. A gravação guardada no aparelho leva o id da história: se a página recarregar, o *Enviar* recuperado volta para a mesma história, nunca cria uma nova. *Subir* escolhe 1 arquivo e mostra o progresso na própria folha. Os dois criam a gravação com `para_historia` = a história (I5).
- No servidor, `servico_iniciar_historia` vê `para_historia`: em vez de criar uma história, confere os tetos, liga a gravação à história (`story_recordings`, próxima ordem; os ids de segmento continuam pelo `fixarSegmentoInicial`, no código) e cria a proposta de áudio "gerando". O cartão no editor diz "Ouvindo o áudio novo · falta cerca de 2 min".
- Passos (mesma função `processar-gravacao`, com a concorrência pela história): `transcrever` (só a gravação nova) → confere a duração real (passou dos tetos: falha com `longa`) → `estruturar-audio` (só os segmentos novos; falantes e vazios entram na estrutura da história por um método novo do banco, porque `gravarEstrutura` só grava em história `ouvindo`) → `integrar` (modelo capaz) → `verificar` (só os parágrafos novos) → `gravar`. Se a função falhar, o `onFailure` marca a proposta como falhou (hoje ele só mexe em história em andamento).
- Descartar a proposta não tira o áudio da história: ele continua na transcrição, *Usar este áudio no texto* pede de novo, e uma troca de tamanho já o inclui.

### 4.6 Uma proposta por vez, por tipo

- No máximo uma proposta pendente (gerando ou pronta) por história e por tipo. Pedir outra do mesmo tipo descarta a pronta; se ainda está gerando, a tela diz "Espere a proposta atual".
- Um segundo áudio que chega com a primeira proposta de áudio pronta: a nova cobre os dois e a anterior é descartada. Os eventos de áudio da mesma história passam um de cada vez (chave de concorrência = a história).
- Propostas de tipos diferentes podem estar prontas juntas; a tela mostra uma de cada vez, da mais antiga. Depois de aceitar uma, o que a outra tocava aparece vencido (I4).
- Proposta gerando há mais de 20 min vira "falhou" pela varredura (como a história parada), com *Tentar de novo*.

### 4.7 Telas

- **Editor** (`/livro/[id]/historias/[historiaId]`): a ação principal continua *Marcar como pronta*. Acima do texto, discreto: *Tamanho · Médio*. Na seleção: *Revisar*. Na coluna *Áudio*: *Acrescentar áudio*. Proposta pronta: faixa "A versão Longa está pronta · Ver" no topo do texto.
- **Diferença**: dentro do editor (não é rota nova). Título curto ("Versão Longa", "Áudio novo", "Trecho revisado"), mudanças no lugar, *Aceitar tudo* / *Descartar* no rodapé fixo do celular e no fim da coluna no computador.
- **Gravar mais** (`/livro/[id]/historias/[historiaId]/gravar`): reaproveita `TelaGravarConversa` com a história.
- **Histórico**: rótulos novos (I8).
- **Estado vazio:** nenhuma tela nova sem conteúdo (a diferença sempre tem ao menos uma mudança; proposta sem mudança nenhuma vira "A IA não achou nada para mudar", com *Fechar*).
- **Celular primeiro:** a folha inferior do prompt 2 para tamanho, revisar e acrescentar áudio; a diferença usa a largura toda.

### 4.8 Prompts da IA

- `tamanho-entrada.md` (novo; o sistema é o mesmo `editar.md`, então a edição normal não muda nem de hash): a entrada da edição + a lista "Parágrafos travados (não reescreva; devolva `{travado: id}` na posição)". Schema `EdicaoComTravados`.
- `integrar.md` + `integrar-entrada.md` (novos): as regras de sempre (`_regras`, `_estilo`, `_conectores`), o texto atual numerado por id com os travados marcados, os segmentos novos. Schema `Integracao = {operacoes: [{tipo: "inserir" | "substituir", alvo: id | null, paragrafos: [{texto, fontes}]}]}`; fontes só de segmentos da história.
- `revisar.md` + `revisar-entrada.md` (novos). Schema `Revisao = {substituto}`.
- `verificar.md` sem mudança: recebe só os parágrafos novos.

## 5. Arquitetura (o que muda no código)

| Onde | O quê |
| --- | --- |
| `lib/config.ts` | `TAMANHOS_TEXTO` com 5 chaves; `MAX_PROPOSTAS_DIA = 40`, `MAX_AUDIO_EXTRA_MIN = 30`, `MAX_AUDIOS_HISTORIA = 10`, `INSTRUCAO_MAX = 300`, `ESPERA_TAMANHO_MS = 1500`, `VARREDURA_PROPOSTA_MIN = 20`, previsões |
| `lib/editor/propostas.ts` (novo, puro) | Montar mudanças de tamanho (grupos por fontes), de áudio (operações) e de trecho; compor o texto final (aceitar tudo, parcial, vencidas); diferença por palavra |
| `lib/ai/etapas.ts`, `schemas.ts` | `editarComTravados`, `integrar`, `revisar` |
| `lib/pipeline/propostas.ts` (novo) | `proporTamanho`, `proporAudio`, `revisarTrecho`: puros, com banco e IA por injeção, como `processar.ts` |
| `lib/pipeline/processar.ts` | `iniciar` com motivo `acrescentar` → `proporAudio` |
| `lib/inngest/funcoes.ts` | Função `propor` (evento `ecoa/proposta.pedida`, concorrência 1 por história); varredura ganha "propostas paradas"; `chaveDoEvento` usa a história para áudio acrescentado |
| `lib/pipeline/regras.ts` | Mensagem `{tipo: "proposta", historia, proposta, estado}` no canal do livro (sem texto, T37) |
| `app/livro/[id]/historias/editor-acoes.ts` | `pedirTamanho`, `revisarTrecho`, `propostaPendente`, `aplicarProposta`, `descartarProposta`, `usarAudioNoTexto` |
| `app/livro/[id]/acoes.ts` | `prepararAudios` aceita `paraHistoria` (1 arquivo, sem lote) |
| `components/editor/` | `diferenca.tsx`, `folha-tamanho.tsx`, `folha-revisar.tsx`, `folha-acrescentar.tsx`; `editor-texto.tsx` ganha a seleção |

## 6. Segurança (o que o banco garante)

- **Edição manual nunca se perde (a garantia do prompt).** `aplicar_proposta` recusa (`travado_alterado`) qualquer texto final em que um parágrafo travado do texto atual não esteja idêntico (id, texto, fontes, `editado`), salvo o alvo de um *Revisar trecho* aceito. E recusa (`proposta_vencida`) qualquer mudança cujo `tira` não bate com o texto atual. Isso vale mesmo se a tela ou a função pura errarem.
- **Nada de texto estranho com origem "IA":** todo parágrafo do texto final vem do texto atual (idêntico) ou de uma mudança aceita da proposta (idêntico); todo parágrafo atual que não está numa mudança aceita continua (`dados_invalidos`).
- **Trava e plano:** pedir, aplicar e descartar exigem a trava desta tela (`editar_historia`), o plano ativo e a história `pronta`. O texto pendente vira versão antes de todo aceite.
- **Isolamento:** `story_proposals` com RLS (membro do livro lê; ninguém logado escreve direto) e chaves estrangeiras compostas por livro. `para_historia` tem chave composta (`book_id`, `para_historia`): não dá para acrescentar áudio à história de outro livro.
- **Autor e família:** nenhum grant novo para `anon` ou `porta_autor`.
- **Custo:** 40 pedidos por livro em 24 h (I6), contados com trava do livro (sem corrida); áudio acrescentado entra na cota de minutos (T38) e nos tetos de I5.
- **Instrução escrita:** até 300 letras, guardada no pedido (o membro lê; é dele). Vai ao modelo como pedido delimitado. O pior caso é a pessoa piorar o próprio texto, que passa pela verificação e pela diferença.
- **Imutável:** proposta decidida (aplicada, descartada, falhou) não muda nem se apaga; `story_versions` continua só insert.
- **T36:** a proposta fica no banco; os passos do Inngest devolvem só ids e contagens.

## 7. SQL

### Subida: `supabase/migrations/20261119120000_ia_sob_controle.sql`

```sql
-- 20261119120000_ia_sob_controle.sql
-- Prompt 9: editor, parte 2. Tamanho em 5 posições, revisar trecho, acrescentar áudio e
-- propostas da IA mostradas como diferença. Design: docs/designs/ia-sob-controle.md.
--
-- Regras deste arquivo:
-- * A IA nunca escreve no texto da história: grava uma proposta. Só uma pessoa, com a trava,
--   aplica, por aplicar_proposta, que confere no banco que nenhum parágrafo editado à mão
--   mudou ou sumiu.
-- * Nenhum texto passa pelo Inngest (T36). story_versions continua só insert.
-- * porta_autor não recebe nenhum grant novo.

create type public.proposta_tipo as enum ('tamanho', 'trecho', 'audio');
create type public.proposta_estado as enum ('gerando', 'pronta', 'aplicada', 'descartada', 'falhou');

-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts confere.
create function privado.max_propostas_dia() returns integer
language sql immutable set search_path = '' as $$ select 40 $$;    -- MAX_PROPOSTAS_DIA
create function privado.max_audio_extra_s() returns integer
language sql immutable set search_path = '' as $$ select 1800 $$;  -- MAX_AUDIO_EXTRA_MIN = 30
create function privado.max_audios_historia() returns integer
language sql immutable set search_path = '' as $$ select 10 $$;    -- MAX_AUDIOS_HISTORIA
create function privado.instrucao_max() returns integer
language sql immutable set search_path = '' as $$ select 300 $$;   -- INSTRUCAO_MAX

-- ── 1. Tamanho em 5 posições ───────────────────────────────────────────────
-- Só alarga o CHECK: as versões existentes (3 valores) continuam valendo.
alter table public.story_versions drop constraint story_versions_tamanho_check;
alter table public.story_versions add constraint story_versions_tamanho_check
  check (tamanho in ('resumido', 'curto', 'medio', 'longo', 'detalhado'));

-- ── 2. Áudio acrescentado a uma história pronta ─────────────────────────────
-- Avulso (sem lote) e nunca passa pela divisão. A chave composta impede outro livro.
alter table public.recordings
  add column para_historia uuid,
  add constraint recordings_para_historia_fk foreign key (book_id, para_historia)
    references public.stories (book_id, id) on delete restrict,
  add constraint recordings_para_historia_avulsa check (para_historia is null or lote_id is null),
  -- Literal: um CHECK roda com o usuário corrente, que não executa funções de privado (= 30 min).
  add constraint recordings_para_historia_duracao check (para_historia is null or duracao_s between 1 and 1800);
create index recordings_para_historia on public.recordings (para_historia) where para_historia is not null;
grant select (para_historia), insert (para_historia) on public.recordings to authenticated;
-- Restritiva (soma às políticas de insert que já existem): só para história pronta do mesmo livro.
create policy "acrescenta só em história pronta" on public.recordings as restrictive
  for insert to authenticated
  with check (para_historia is null or exists (
    select 1 from public.stories s
    where s.id = recordings.para_historia and s.book_id = recordings.book_id and s.estado = 'pronta'));

-- ── 3. story_proposals ─────────────────────────────────────────────────────
-- mudancas: [{id, tira: [{id, texto}], poe: [{id, texto, fontes, editado}], depois_de}].
-- ordem: o texto inteiro proposto (ids), só no tamanho ("Aceitar tudo" = texto da IA).
-- travados: [{id, texto}] dos parágrafos editados à mão na hora do pedido.
-- gravacoes: as gravações que a proposta cobre (áudio: as novas; tamanho: todas).
-- marcacoes: grifos dos parágrafos novos, por id de parágrafo ({paragrafo_id, inicio, fim, ...}).
-- Entre passos do Inngest, a saída da IA fica aqui (servico_gravar_proposta com p_pronta = false).
create table public.story_proposals (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null,
  book_id uuid not null,
  tipo public.proposta_tipo not null,
  estado public.proposta_estado not null default 'gerando',
  tamanho text not null check (tamanho in ('resumido', 'curto', 'medio', 'longo', 'detalhado')),
  pedido jsonb not null default '{}'::jsonb
    check (jsonb_typeof(pedido) = 'object' and octet_length(pedido::text) <= 8000),
  gravacoes uuid[] not null default '{}' check (cardinality(gravacoes) <= 100),
  travados jsonb not null default '[]'::jsonb
    check (jsonb_typeof(travados) = 'array' and octet_length(travados::text) <= 2000000),
  mudancas jsonb check (mudancas is null or jsonb_typeof(mudancas) = 'array'),
  ordem text[] check (ordem is null or cardinality(ordem) <= 300),
  marcacoes jsonb not null default '[]'::jsonb check (jsonb_typeof(marcacoes) = 'array'),
  erro text check (erro is null or erro ~ '^[a-z_]{2,40}$'),
  modelos jsonb check (modelos is null or jsonb_typeof(modelos) = 'object'),           -- T31
  hash_prompts jsonb check (hash_prompts is null or jsonb_typeof(hash_prompts) = 'object'),
  aplicadas text[] check (aplicadas is null or cardinality(aplicadas) <= 400),
  versao integer check (versao is null or versao >= 1),
  pedida_por uuid references auth.users (id) on delete set null,
  pedida_em timestamptz not null default now(),
  pronta_em timestamptz,
  decidida_por uuid references auth.users (id) on delete set null,
  decidida_em timestamptz,
  unique (book_id, id),
  foreign key (book_id, story_id) references public.stories (book_id, id) on delete restrict,
  constraint propostas_decidida check ((estado in ('aplicada', 'descartada')) = (decidida_em is not null)),
  constraint propostas_com_mudancas check (estado not in ('pronta', 'aplicada') or mudancas is not null),
  constraint propostas_falhou check ((estado = 'falhou') = (erro is not null)),
  constraint propostas_aplicada check ((estado = 'aplicada') = (versao is not null and aplicadas is not null))
);
create unique index story_proposals_uma_pendente on public.story_proposals (story_id, tipo)
  where estado in ('gerando', 'pronta');
create index story_proposals_livro_data on public.story_proposals (book_id, pedida_em desc);
create index story_proposals_gerando on public.story_proposals (pedida_em) where estado = 'gerando';

-- Decidida não muda nem se apaga (base das métricas). Só os ids de pessoa podem virar null (LGPD).
create function privado.proposta_imutavel() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then raise exception 'versao_imutavel'; end if;
  if old.estado::text in ('aplicada', 'descartada', 'falhou')
     and (to_jsonb(new) - array['pedida_por', 'decidida_por'])
         <> (to_jsonb(old) - array['pedida_por', 'decidida_por']) then
    raise exception 'versao_imutavel';
  end if;
  return new;
end $$;
create trigger story_proposals_imutavel before update or delete on public.story_proposals
  for each row execute function privado.proposta_imutavel();
create trigger story_proposals_sem_truncate before truncate on public.story_proposals
  for each statement execute function privado.so_insert();

alter table public.story_proposals enable row level security;
revoke all on public.story_proposals from public, anon, authenticated, porta_autor, service_role;
grant select, insert, update on public.story_proposals to service_role;  -- sem delete nem truncate
grant select (id, story_id, book_id, tipo, estado, tamanho, pedido, gravacoes, mudancas, ordem,
  marcacoes, erro, aplicadas, versao, pedida_em, pronta_em, decidida_em)
  on public.story_proposals to authenticated;
create policy "membro lê" on public.story_proposals for select to authenticated
  using (privado.eh_membro(book_id));

-- A versão que nasceu de uma proposta aceita aponta para ela (origem sempre 'ia').
alter table public.story_versions
  add column proposta_id uuid,
  add constraint story_versions_proposta_fk foreign key (book_id, proposta_id)
    references public.story_proposals (book_id, id) on delete restrict,
  add constraint story_versions_proposta_so_ia check (proposta_id is null or origem = 'ia');

-- ── 4. Auxiliares ──────────────────────────────────────────────────────────
-- Parágrafos do texto atual (o salvo, ou a última versão). A versão da IA não tem id nem
-- "editado": ganha p1..pN, como normalizarTexto (lib/editor/conteudo.ts).
create function privado.paragrafos_atuais(p_story uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v jsonb;
begin
  select s.texto into v from public.stories s where s.id = p_story;
  if v is null then
    select x.conteudo into v from public.story_versions x where x.story_id = p_story
      order by x.numero desc limit 1;
  end if;
  return coalesce((
    select jsonb_agg(case when jsonb_typeof(p -> 'id') = 'string'
                          then p || jsonb_build_object('editado', coalesce((p ->> 'editado')::boolean, false))
                          else p || jsonb_build_object('id', 'p' || n, 'editado', false) end
                     order by n)
    from jsonb_array_elements(v -> 'paragrafos') with ordinality t(p, n)), '[]'::jsonb);
end $$;

create function privado.travados_atuais(p_story uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a ->> 'id', 'texto', a ->> 'texto')), '[]'::jsonb)
  from jsonb_array_elements(privado.paragrafos_atuais(p_story)) a
  where (a ->> 'editado')::boolean
$$;

create function privado.tamanho_atual(p_story uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce((select x.tamanho from public.story_versions x where x.story_id = p_story
                   order by x.numero desc limit 1), 'medio')
$$;

create function privado.propostas_hoje(p_book uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.story_proposals p
  where p.book_id = p_book and p.pedida_em > now() - interval '24 hours'
$$;

-- Segundos de fala da história: pelos segmentos dela; gravação ainda sem transcrição, pela duração.
create function privado.fala_da_historia_s(p_story uuid) returns numeric
language sql stable security definer set search_path = '' as $$
  select coalesce(sum(case
    when t.recording_id is null then r.duracao_s::numeric
    else (select coalesce(sum((s ->> 'fim')::numeric - (s ->> 'inicio')::numeric), 0)
          from jsonb_array_elements(t.segmentos) s
          where sr.segmentos is null or (s ->> 'id')::integer = any (sr.segmentos))
  end), 0)
  from public.story_recordings sr
  join public.recordings r on r.id = sr.recording_id
  left join public.transcripts t on t.recording_id = sr.recording_id
  where sr.story_id = p_story
$$;

-- Áudios acrescentados que ainda não entraram no texto por uma proposta aplicada.
create function privado.audios_fora_do_texto(p_story uuid) returns uuid[]
language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(sr.recording_id order by sr.ordem), '{}')
  from public.story_recordings sr join public.recordings r on r.id = sr.recording_id
  where sr.story_id = p_story and r.para_historia = p_story
    and not exists (select 1 from public.story_proposals p
                    where p.story_id = p_story and p.estado = 'aplicada'
                      and sr.recording_id = any (p.gravacoes)
                      -- Tamanho aceito só em parte pode ter deixado o áudio de fora.
                      and (p.tipo = 'audio' or cardinality(p.aplicadas) = jsonb_array_length(p.mudancas)))
$$;

-- Formato das mudanças (o servidor monta; o banco confere antes de mostrar).
create function privado.mudancas_validas(p jsonb, p_tipo public.proposta_tipo, p_pedido jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare m jsonb; x jsonb; v_ids text[] := '{}'; v_poe text[] := '{}';
begin
  if p is null or jsonb_typeof(p) <> 'array' or jsonb_array_length(p) > 400
     or octet_length(p::text) > 2000000 then return false; end if;
  -- Revisar trecho: 1 mudança, que tira só o parágrafo pedido e põe 1 parágrafo.
  if p_tipo = 'trecho' and (jsonb_array_length(p) <> 1
       or jsonb_array_length(p -> 0 -> 'tira') <> 1 or jsonb_array_length(p -> 0 -> 'poe') <> 1
       or (p -> 0 -> 'tira' -> 0 ->> 'id') is distinct from (p_pedido ->> 'paragrafo')) then
    return false;
  end if;
  for m in select value from jsonb_array_elements(p) loop
    if jsonb_typeof(m) <> 'object' or (m - array['id', 'tira', 'poe', 'depois_de']) <> '{}'::jsonb
       or coalesce(m ->> 'id', '') !~ '^m[0-9]{1,4}$' or (m ->> 'id') = any (v_ids)
       or coalesce(jsonb_typeof(m -> 'tira'), '') <> 'array'
       or coalesce(jsonb_typeof(m -> 'poe'), '') <> 'array'
       or jsonb_array_length(m -> 'tira') + jsonb_array_length(m -> 'poe') = 0
       or coalesce(jsonb_typeof(m -> 'depois_de'), 'null') not in ('null', 'string')
       or (jsonb_array_length(m -> 'tira') > 0 and jsonb_typeof(m -> 'depois_de') = 'string') then
      return false;
    end if;
    v_ids := v_ids || (m ->> 'id');
    for x in select value from jsonb_array_elements(m -> 'tira') loop
      if jsonb_typeof(x) <> 'object' or (x - array['id', 'texto']) <> '{}'::jsonb
         or coalesce(x ->> 'id', '') !~ '^[a-z0-9-]{1,40}$'
         or coalesce(jsonb_typeof(x -> 'texto'), '') <> 'string' then return false; end if;
    end loop;
    for x in select value from jsonb_array_elements(m -> 'poe') loop
      -- Mesmo formato de parágrafo do editor (conteudo_valido); editado só no trecho (I3).
      if not privado.conteudo_valido(jsonb_build_object('titulo', '', 'paragrafos', jsonb_build_array(x)))
         or btrim(x ->> 'texto') = '' or (x ->> 'id') = any (v_poe)
         or coalesce((x ->> 'editado')::boolean, false) <> (p_tipo = 'trecho') then
        return false;
      end if;
      v_poe := v_poe || (x ->> 'id');
    end loop;
  end loop;
  return true;
end $$;

-- ── 5. Áudio acrescentado (chamado por servico_iniciar_historia) ────────────
-- Liga a gravação à história e cria a proposta "gerando". historia null = não processar agora.
create function privado.acrescentar_audio(p_recording uuid)
returns table (historia uuid, estado public.story_estado, motivo text)
language plpgsql security definer set search_path = '' as $$
declare v public.recordings; s public.stories; v_min numeric; v_reservado numeric;
  v_pend public.story_proposals; v_ordem integer;
begin
  select * into v from public.recordings r where r.id = p_recording;
  perform pg_advisory_xact_lock(hashtextextended('livro:' || v.book_id::text, 0));
  select * into s from public.stories x where x.id = v.para_historia for update;
  if exists (select 1 from public.story_recordings sr where sr.recording_id = p_recording) then
    return query select s.id, s.estado, 'acrescentar'; return;  -- idempotente
  end if;
  if s.estado::text <> 'pronta' then
    return query select null::uuid, null::public.story_estado, 'historia_indisponivel'; return;
  end if;
  if not privado.livro_editavel(v.book_id) then
    return query select null::uuid, null::public.story_estado, 'livro_fechado'; return;
  end if;
  if not exists (select 1 from public.books b where b.id = v.book_id
                   and b.ia_consentimento_versao >= privado.consentimento_ia_versao()) then
    return query select null::uuid, null::public.story_estado, 'sem_consentimento'; return;
  end if;
  if v.duracao_s is null then
    return query select null::uuid, null::public.story_estado, 'sem_duracao'; return;
  end if;
  if v.duracao_s > privado.max_audio_extra_s()
     or privado.fala_da_historia_s(s.id) + v.duracao_s > privado.max_fala_historia_s()
     or (select count(*) from public.story_recordings sr where sr.story_id = s.id)
        >= privado.max_audios_historia() then
    return query select null::uuid, null::public.story_estado, 'longa'; return;
  end if;
  -- Cota de minutos (T38): a mesma conta de servico_iniciar_historia.
  select coalesce(sum(u.minutos_audio), 0) into v_min from public.ai_usage u
    where u.book_id = v.book_id and u.etapa = 'transcrever' and u.criado_em > now() - interval '24 hours';
  select coalesce(sum(r.duracao_s), 0) / 60.0 into v_reservado from public.recordings r
    where r.book_id = v.book_id and r.recebido_em > now() - interval '24 hours'
      and exists (select 1 from public.story_recordings sr where sr.recording_id = r.id)
      and not exists (select 1 from public.transcripts t where t.recording_id = r.id);
  if v_min + v_reservado + v.duracao_s / 60.0 > privado.max_minutos_ia_por_dia() then
    return query select null::uuid, null::public.story_estado, 'cota_diaria'; return;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('propostas:' || v.book_id::text, 0));
  if privado.propostas_hoje(v.book_id) >= privado.max_propostas_dia() then
    return query select null::uuid, null::public.story_estado, 'cota_ia_diaria'; return;
  end if;
  select * into v_pend from public.story_proposals p
    where p.story_id = s.id and p.tipo = 'audio' and p.estado in ('gerando', 'pronta') for update;
  if found and v_pend.estado = 'gerando' then raise exception 'proposta_em_andamento'; end if;  -- o Inngest tenta de novo
  select coalesce(max(sr.ordem), 0) + 1 into v_ordem from public.story_recordings sr where sr.story_id = s.id;
  insert into public.story_recordings (story_id, recording_id, book_id, ordem)
    values (s.id, p_recording, v.book_id, v_ordem);
  -- A nova cobre a anterior (que ainda não foi aceita) e o áudio novo.
  if v_pend.id is not null then
    update public.story_proposals set estado = 'descartada', decidida_em = now() where id = v_pend.id;
  end if;
  insert into public.story_proposals (story_id, book_id, tipo, tamanho, gravacoes, travados, pedida_por)
    values (s.id, v.book_id, 'audio', privado.tamanho_atual(s.id), privado.audios_fora_do_texto(s.id),
            privado.travados_atuais(s.id), v.criado_por);
  return query select s.id, s.estado, 'acrescentar';
end $$;

-- servico_iniciar_historia: corpo de 20261117120000_divisao.sql, com UMA mudança logo depois
-- de ler a gravação e conferir que ela chegou:
--   if v.para_historia is not null then
--     return query select * from privado.acrescentar_audio(p_recording); return;
--   end if;
-- (O arquivo traz o corpo inteiro; a reversão recria o anterior.)
create or replace function public.servico_iniciar_historia(p_recording uuid) ...;

-- ── 6. Funções das propostas ───────────────────────────────────────────────
-- Pedir tamanho, revisão de trecho ou "usar este áudio no texto". Exige a trava desta tela.
-- p_pedido: tamanho e áudio = {}; trecho = {paragrafo, inicio, fim, instrucao, texto?}.
create function public.pedir_proposta(p_story uuid, p_aba uuid, p_tipo public.proposta_tipo,
  p_tamanho text default null, p_pedido jsonb default '{}'::jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_ok boolean; v_livro uuid; v_tam text; v_atual jsonb; v_alvo jsonb; v_grav uuid[] := '{}';
  v_pend public.story_proposals; v_id uuid; v_ini integer; v_fim integer;
begin
  select e.editando into v_ok from public.editar_historia(p_story, p_aba, true, false) e;
  if not v_ok then raise exception 'trava_de_outro'; end if;  -- editar_historia já confere membro, pronta e plano
  select s.book_id into v_livro from public.stories s where s.id = p_story;
  if not exists (select 1 from public.books b where b.id = v_livro
                   and b.ia_consentimento_versao >= privado.consentimento_ia_versao()) then
    raise exception 'sem_consentimento';
  end if;
  -- Sempre história antes de 'propostas:' (a mesma ordem de acrescentar_audio): sem deadlock.
  perform pg_advisory_xact_lock(hashtextextended('propostas:' || v_livro::text, 0));
  if privado.propostas_hoje(v_livro) >= privado.max_propostas_dia() then raise exception 'cota_ia_diaria'; end if;
  v_tam := coalesce(p_tamanho, privado.tamanho_atual(p_story));
  if v_tam not in ('resumido', 'curto', 'medio', 'longo', 'detalhado') or p_pedido is null
     or jsonb_typeof(p_pedido) <> 'object' then
    raise exception 'dados_invalidos';
  end if;
  v_atual := privado.paragrafos_atuais(p_story);
  if (select count(*) <> count(distinct a ->> 'id') from jsonb_array_elements(v_atual) a) then
    raise exception 'dados_invalidos';  -- ids repetidos: o editor salva de novo (normalizarTexto) antes
  end if;
  if p_tipo = 'tamanho' then
    if p_pedido <> '{}'::jsonb then raise exception 'dados_invalidos'; end if;
    -- Áudio ainda sendo ouvido: a estrutura não tem os falantes dele.
    if exists (select 1 from public.story_proposals p where p.story_id = p_story
               and p.tipo = 'audio' and p.estado = 'gerando') then
      raise exception 'proposta_em_andamento';
    end if;
    select coalesce(array_agg(sr.recording_id order by sr.ordem), '{}') into v_grav
      from public.story_recordings sr where sr.story_id = p_story;
  elsif p_tipo = 'trecho' then
    if (p_pedido - array['paragrafo', 'inicio', 'fim', 'instrucao', 'texto']) <> '{}'::jsonb
       or coalesce(p_pedido ->> 'instrucao', '') not in ('curto', 'fiel', 'corrigir', 'livre')
       or coalesce(jsonb_typeof(p_pedido -> 'paragrafo'), '') <> 'string'
       or coalesce(jsonb_typeof(p_pedido -> 'inicio'), '') <> 'number'
       or coalesce(jsonb_typeof(p_pedido -> 'fim'), '') <> 'number'
       or (p_pedido ->> 'inicio') !~ '^[0-9]{1,5}$' or (p_pedido ->> 'fim') !~ '^[0-9]{1,5}$'
       or ((p_pedido ->> 'instrucao') = 'livre')
          <> coalesce(jsonb_typeof(p_pedido -> 'texto') = 'string', false)
       or char_length(btrim(coalesce(p_pedido ->> 'texto', 'x'))) not between 1 and privado.instrucao_max() then
      raise exception 'dados_invalidos';
    end if;
    -- Posições em pontos de código (char_length); o servidor converte do UTF-16 da tela.
    select a into v_alvo from jsonb_array_elements(v_atual) a where a ->> 'id' = p_pedido ->> 'paragrafo';
    v_ini := (p_pedido ->> 'inicio')::integer;
    v_fim := (p_pedido ->> 'fim')::integer;
    if v_alvo is null or v_fim <= v_ini or v_fim > char_length(v_alvo ->> 'texto') then
      raise exception 'dados_invalidos';
    end if;
    -- A revisão roda na ação do servidor: se ela morreu, a pendente de 3 min não bloqueia.
    update public.story_proposals set estado = 'falhou', erro = 'parada'
      where story_id = p_story and tipo = 'trecho' and estado = 'gerando'
        and pedida_em < now() - interval '3 minutes';
  else  -- audio: usar no texto os áudios acrescentados que ficaram de fora
    if p_pedido <> '{}'::jsonb then raise exception 'dados_invalidos'; end if;
    v_grav := privado.audios_fora_do_texto(p_story);
    if cardinality(v_grav) = 0 then raise exception 'dados_invalidos'; end if;
  end if;
  select * into v_pend from public.story_proposals p
    where p.story_id = p_story and p.tipo = p_tipo and p.estado in ('gerando', 'pronta') for update;
  if found then
    if v_pend.estado = 'gerando' then raise exception 'proposta_em_andamento'; end if;
    update public.story_proposals set estado = 'descartada', decidida_por = (select auth.uid()),
      decidida_em = now() where id = v_pend.id;
  end if;
  insert into public.story_proposals (story_id, book_id, tipo, tamanho, pedido, gravacoes, travados, pedida_por)
    values (p_story, v_livro, p_tipo, v_tam, p_pedido, v_grav, privado.travados_atuais(p_story),
            (select auth.uid()))
    returning id into v_id;
  return v_id;
end $$;

-- O pipeline grava as mudanças (p_pronta = false entre passos; true no fim).
create function public.servico_gravar_proposta(p_proposta uuid, p_mudancas jsonb, p_ordem text[],
  p_marcacoes jsonb, p_pronta boolean, p_modelos jsonb default null, p_hash jsonb default null)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare pr public.story_proposals;
begin
  select * into pr from public.story_proposals p where p.id = p_proposta for update;
  if not found or pr.estado <> 'gerando' then return false; end if;
  if not privado.mudancas_validas(p_mudancas, pr.tipo, pr.pedido)
     or not privado.marcacoes_validas(coalesce(p_marcacoes, '[]'::jsonb))
     or (p_ordem is not null and pr.tipo <> 'tamanho') then
    raise exception 'dados_invalidos';
  end if;
  begin
    update public.story_proposals set mudancas = p_mudancas, ordem = p_ordem,
      marcacoes = coalesce(p_marcacoes, '[]'::jsonb), modelos = p_modelos, hash_prompts = p_hash,
      estado = case when p_pronta then 'pronta'::public.proposta_estado else 'gerando'::public.proposta_estado end,
      pronta_em = case when p_pronta then now() end
    where id = p_proposta;
  exception when check_violation then
    raise exception 'dados_invalidos';  -- nunca a linha com o texto na mensagem (T36)
  end;
  if p_pronta then
    update public.recordings r set processado_em = now()
      where r.id = any (pr.gravacoes) and r.para_historia = pr.story_id and r.processado_em is null;
  end if;
  return true;
end $$;

create function public.servico_falhar_proposta(p_proposta uuid, p_erro text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.story_proposals set estado = 'falhou',
    erro = case when p_erro ~ '^[a-z_]{2,40}$' then p_erro else 'erro_inesperado' end
  where id = p_proposta and estado = 'gerando';
  return found;
end $$;

create function public.descartar_proposta(p_story uuid, p_aba uuid, p_proposta uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_ok boolean;
begin
  select e.editando into v_ok from public.editar_historia(p_story, p_aba, true, false) e;
  if not v_ok then raise exception 'trava_de_outro'; end if;
  update public.story_proposals set estado = 'descartada', decidida_por = (select auth.uid()),
    decidida_em = now()
  where id = p_proposta and story_id = p_story and estado = 'pronta';
  return found;
end $$;

-- Aceitar (tudo ou parte). p_conteudo é o texto final montado pelo servidor; o banco confere
-- que ele é exatamente "texto atual - o que as mudanças aceitas tiram + o que elas põem".
create function public.aplicar_proposta(p_story uuid, p_aba uuid, p_rev integer, p_proposta uuid,
  p_aplicadas text[], p_conteudo jsonb, p_marcacoes jsonb)
returns integer
language plpgsql security definer set search_path = '' as $$
declare v_ok boolean; v public.stories; pr public.story_proposals; v_eu uuid := (select auth.uid());
  v_base jsonb; v_atual jsonb; v_ms jsonb; v_novos jsonb; v_tira text[]; v_poe text[]; v_num integer;
  v_tam text; v_final jsonb;
begin
  select e.editando into v_ok from public.editar_historia(p_story, p_aba, true, false) e;
  if not v_ok then raise exception 'trava_de_outro'; end if;
  select * into v from public.stories s where s.id = p_story for update;
  if v.texto_rev <> p_rev then raise exception 'texto_desatualizado'; end if;
  select * into pr from public.story_proposals p where p.id = p_proposta and p.story_id = p_story for update;
  if not found or pr.estado <> 'pronta' then raise exception 'proposta_indisponivel'; end if;
  if p_aplicadas is null or cardinality(p_aplicadas) = 0
     or p_conteudo is null or jsonb_typeof(p_conteudo -> 'paragrafos') <> 'array'
     or not privado.marcacoes_validas(p_marcacoes) then
    raise exception 'dados_invalidos';
  end if;
  -- Título, ano e lacunas são os do texto atual: o aceite só mexe nos parágrafos.
  v_base := coalesce(v.texto, (select x.conteudo from public.story_versions x
                               where x.story_id = p_story order by x.numero desc limit 1));
  -- Ninguém editou ainda: o título é o de stories (P46: pode ser o confirmado na divisão).
  if v.texto is null then
    v_base := v_base - 'ano' || jsonb_build_object('titulo', coalesce(v.titulo, v_base ->> 'titulo', ''))
              || case when v.ano is null then '{}'::jsonb else jsonb_build_object('ano', v.ano) end;
  end if;
  v_novos := p_conteudo -> 'paragrafos';
  v_final := (v_base - 'paragrafos') || jsonb_build_object('paragrafos', v_novos);
  if not privado.conteudo_valido(v_final) then raise exception 'dados_invalidos'; end if;
  v_atual := privado.paragrafos_atuais(p_story);
  if (select count(*) <> count(distinct n ->> 'id') from jsonb_array_elements(v_novos) n)
     or (select count(*) <> count(distinct a ->> 'id') from jsonb_array_elements(v_atual) a) then
    raise exception 'dados_invalidos';
  end if;
  select coalesce(jsonb_agg(m), '[]'::jsonb) into v_ms
    from jsonb_array_elements(pr.mudancas) m where m ->> 'id' = any (p_aplicadas);
  if jsonb_array_length(v_ms) <> (select count(distinct x) from unnest(p_aplicadas) x) then
    raise exception 'dados_invalidos';
  end if;
  select coalesce(array_agg(t ->> 'id'), '{}') into v_tira
    from jsonb_array_elements(v_ms) m, jsonb_array_elements(m -> 'tira') t;
  select coalesce(array_agg(q ->> 'id'), '{}') into v_poe
    from jsonb_array_elements(v_ms) m, jsonb_array_elements(m -> 'poe') q;

  -- O que as mudanças tiram ainda está igual ao da hora do pedido...
  if exists (select 1 from jsonb_array_elements(v_ms) m, jsonb_array_elements(m -> 'tira') t
             where not exists (select 1 from jsonb_array_elements(v_atual) a
                               where a ->> 'id' = t ->> 'id' and a ->> 'texto' = t ->> 'texto')) then
    raise exception 'proposta_vencida';
  end if;
  -- ...e não é travado (salvo o parágrafo escolhido num "Revisar trecho").
  if exists (select 1 from jsonb_array_elements(v_atual) a
             where a ->> 'id' = any (v_tira) and (a ->> 'editado')::boolean
               and not (pr.tipo = 'trecho' and a ->> 'id' = pr.pedido ->> 'paragrafo')) then
    raise exception 'travado_alterado';
  end if;
  -- Id novo não pode repetir o de um parágrafo que fica.
  if exists (select 1 from jsonb_array_elements(v_atual) a
             where a ->> 'id' = any (v_poe) and not (a ->> 'id' = any (v_tira))) then
    raise exception 'dados_invalidos';
  end if;
  -- Todo parágrafo atual fora das mudanças continua idêntico (é aqui que o editado à mão é garantido).
  if exists (select 1 from jsonb_array_elements(v_atual) a
             where not (a ->> 'id' = any (v_tira)) and (a ->> 'editado')::boolean
               and not exists (select 1 from jsonb_array_elements(v_novos) n
                               where n ->> 'id' = a ->> 'id' and n ->> 'texto' = a ->> 'texto'
                                 and n -> 'fontes' = a -> 'fontes'
                                 and coalesce((n ->> 'editado')::boolean, false))) then
    raise exception 'travado_alterado';
  end if;
  if exists (select 1 from jsonb_array_elements(v_atual) a
             where not (a ->> 'id' = any (v_tira))
               and not exists (select 1 from jsonb_array_elements(v_novos) n
                               where n ->> 'id' = a ->> 'id' and n ->> 'texto' = a ->> 'texto'
                                 and n -> 'fontes' = a -> 'fontes'
                                 and coalesce((n ->> 'editado')::boolean, false) = (a ->> 'editado')::boolean)) then
    raise exception 'proposta_vencida';
  end if;
  -- Todo parágrafo posto está lá, idêntico ao da proposta.
  if exists (select 1 from jsonb_array_elements(v_ms) m, jsonb_array_elements(m -> 'poe') q
             where not exists (select 1 from jsonb_array_elements(v_novos) n
                               where n ->> 'id' = q ->> 'id' and n ->> 'texto' = q ->> 'texto'
                                 and n -> 'fontes' = q -> 'fontes'
                                 and coalesce((n ->> 'editado')::boolean, false)
                                     = coalesce((q ->> 'editado')::boolean, false))) then
    raise exception 'dados_invalidos';
  end if;
  -- E nada além: atuais que ficam + postos (com os dois checks acima, nada estranho entra).
  if jsonb_array_length(v_novos)
     <> (select count(*) from jsonb_array_elements(v_atual) a where not (a ->> 'id' = any (v_tira)))
        + cardinality(v_poe) then
    raise exception 'dados_invalidos';
  end if;
  -- Os que ficam mantêm a ordem entre si.
  if (select coalesce(array_agg(a ->> 'id' order by i), '{}') from jsonb_array_elements(v_atual)
        with ordinality t(a, i) where not (a ->> 'id' = any (v_tira)))
     <> (select coalesce(array_agg(n ->> 'id' order by i), '{}') from jsonb_array_elements(v_novos)
        with ordinality t(n, i) where not (n ->> 'id' = any (v_poe))) then
    raise exception 'dados_invalidos';
  end if;

  perform privado.guardar_versao(p_story);  -- o texto pendente vira versão antes (nada se perde)
  v_tam := case when pr.tipo = 'tamanho' then pr.tamanho else privado.tamanho_atual(p_story) end;
  select coalesce(max(x.numero), 0) + 1 into v_num from public.story_versions x where x.story_id = p_story;
  insert into public.story_versions (story_id, book_id, numero, origem, tamanho, conteudo, marcacoes,
    modelos, hash_prompts, proposta_id)
    values (p_story, v.book_id, v_num, 'ia', v_tam, v_final, p_marcacoes, pr.modelos, pr.hash_prompts,
            p_proposta);
  -- Título e ano da história não mudam (P46: o título pode ser o confirmado na divisão).
  update public.stories set
    texto = v_final, texto_marcacoes = p_marcacoes, texto_rev = texto_rev + 1,
    versao_rev = texto_rev + 1, texto_por = v_eu, texto_origem = 'ia', texto_em = now()
  where id = p_story;
  update public.story_proposals set estado = 'aplicada', aplicadas = p_aplicadas, versao = v_num,
    decidida_por = v_eu, decidida_em = now()
  where id = p_proposta;
  return v.texto_rev + 1;
end $$;

revoke all on function public.pedir_proposta(uuid, uuid, public.proposta_tipo, text, jsonb),
  public.aplicar_proposta(uuid, uuid, integer, uuid, text[], jsonb, jsonb),
  public.descartar_proposta(uuid, uuid, uuid),
  public.servico_gravar_proposta(uuid, jsonb, text[], jsonb, boolean, jsonb, jsonb),
  public.servico_falhar_proposta(uuid, text)
  from public, anon, authenticated, porta_autor, service_role;
grant execute on function public.pedir_proposta(uuid, uuid, public.proposta_tipo, text, jsonb),
  public.aplicar_proposta(uuid, uuid, integer, uuid, text[], jsonb, jsonb),
  public.descartar_proposta(uuid, uuid, uuid)
  to authenticated;
grant execute on function public.servico_gravar_proposta(uuid, jsonb, text[], jsonb, boolean, jsonb, jsonb),
  public.servico_falhar_proposta(uuid, text)
  to service_role;
revoke all on function privado.max_propostas_dia(), privado.max_audio_extra_s(),
  privado.max_audios_historia(), privado.instrucao_max(), privado.proposta_imutavel(),
  privado.paragrafos_atuais(uuid), privado.travados_atuais(uuid), privado.tamanho_atual(uuid),
  privado.propostas_hoje(uuid), privado.fala_da_historia_s(uuid), privado.audios_fora_do_texto(uuid),
  privado.mudancas_validas(jsonb, public.proposta_tipo, jsonb), privado.acrescentar_audio(uuid)
  from public;
```

### Reversão: `supabase/reversao/20261119120000_ia_sob_controle.down.sql`

```sql
-- Reversão de 20261119120000_ia_sob_controle.sql.
-- As versões criadas por aceite ficam em story_versions (só insert); só a coluna proposta_id
-- some. As propostas se perdem (o texto aceito continua nas versões). Os áudios acrescentados
-- continuam ligados às histórias (story_recordings); só a coluna para_historia some.
-- O CHECK de 5 tamanhos fica: voltar para 3 quebraria guardar_versao nas histórias que já têm
-- versão Curto ou Longo.

-- Trava (como a da divisão): com proposta já pedida, só roda com `set ecoa.reversao_destrutiva = 'sim'`.
-- Forçada: proposta gerando ou pronta se perde; a de áudio deixa o áudio ligado e fora do texto.
do $$
begin
  if to_regclass('public.story_proposals') is not null
     and exists (select 1 from public.story_proposals)
     and coalesce(current_setting('ecoa.reversao_destrutiva', true), '') <> 'sim' then
    raise exception 'reversao_com_propostas: rode com ecoa.reversao_destrutiva = sim';
  end if;
end $$;

-- servico_iniciar_historia volta ao corpo de 20261117120000_divisao.sql (copiado sem mudança).
create or replace function public.servico_iniciar_historia(p_recording uuid) ...;

drop function if exists public.aplicar_proposta(uuid, uuid, integer, uuid, text[], jsonb, jsonb);
drop function if exists public.descartar_proposta(uuid, uuid, uuid);
drop function if exists public.servico_falhar_proposta(uuid, text);
drop function if exists public.servico_gravar_proposta(uuid, jsonb, text[], jsonb, boolean, jsonb, jsonb);
drop function if exists public.pedir_proposta(uuid, uuid, public.proposta_tipo, text, jsonb);
drop function if exists privado.acrescentar_audio(uuid);
drop function if exists privado.mudancas_validas(jsonb, public.proposta_tipo, jsonb);
drop function if exists privado.audios_fora_do_texto(uuid);
drop function if exists privado.fala_da_historia_s(uuid);
drop function if exists privado.propostas_hoje(uuid);
drop function if exists privado.tamanho_atual(uuid);
drop function if exists privado.travados_atuais(uuid);
drop function if exists privado.paragrafos_atuais(uuid);

alter table public.story_versions
  drop constraint if exists story_versions_proposta_so_ia,
  drop constraint if exists story_versions_proposta_fk,
  drop column if exists proposta_id;
drop table if exists public.story_proposals;
drop function if exists privado.proposta_imutavel();

drop policy if exists "acrescenta só em história pronta" on public.recordings;
revoke select (para_historia), insert (para_historia) on public.recordings from authenticated;
drop index if exists public.recordings_para_historia;
alter table public.recordings
  drop constraint if exists recordings_para_historia_duracao,
  drop constraint if exists recordings_para_historia_avulsa,
  drop constraint if exists recordings_para_historia_fk,
  drop column if exists para_historia;

drop type if exists public.proposta_estado;
drop type if exists public.proposta_tipo;
drop function if exists privado.instrucao_max();
drop function if exists privado.max_audios_historia();
drop function if exists privado.max_audio_extra_s();
drop function if exists privado.max_propostas_dia();
```

## 8. Ensaio do SQL (PGlite, migrations reais)

**Feito (v2):** subida, reversão e nova subida sem erro. Cenário do aceite pelas funções do banco: editar o 2º parágrafo → áudio acrescentado (`servico_iniciar_historia` devolve `acrescentar` e cria a proposta) → aplicar → pedir *Longo* → aplicar; o 2º parágrafo sai idêntico; um texto final que reescreve o 2º parágrafo é recusado com `travado_alterado`; versões 3 e 4 com origem `ia` e `proposta_id`; proposta aplicada não muda (`versao_imutavel`).

Viram teste automático em `supabase/tests/propostas.test.ts`, com os demais casos: pedir sem a trava → `trava_de_outro`; trecho fora do parágrafo → `dados_invalidos`; 41º pedido do dia → `cota_ia_diaria`; dois pedidos de tamanho seguidos (o 1º pronto é descartado; o 1º gerando recusa); áudio para história de outro livro (a chave recusa); áudio para história que não está pronta; áudio de 31 min; aplicar com rev velha; aplicar mudança vencida; aplicar conteúdo que muda o parágrafo travado → `travado_alterado`; conteúdo com parágrafo inventado → `dados_invalidos`; aceite parcial; versão nova com origem `ia` e `proposta_id`; proposta aplicada não muda; `anon` e `porta_autor` sem acesso; membro de outro livro não lê; reversão e nova subida sem erro.

## 9. Testes e gate

- **O teste do aceite (item 5), em duas camadas:**
  - `lib/pipeline/propostas.test.ts` (IA simulada que tenta reescrever o 2º parágrafo em toda chamada): editar o 2º parágrafo à mão → acrescentar áudio → aceitar tudo → mudar o tamanho → aceitar tudo → o 2º parágrafo é idêntico (id, texto e fontes).
  - `supabase/tests/propostas.test.ts` (banco real em PGlite): o mesmo cenário pelas funções do banco, mais a recusa de um texto final que mude o 2º parágrafo.
- **Vitest puro (`lib/editor/propostas.test.ts`):** grupos por fontes; travado esquecido pela IA volta ao lugar; operação sobre travado descartada; composição parcial e âncora que não entrou; mudança vencida; diferença por palavra.
- **Playwright (vitrine com dados falsos):** tamanho → diferença → aceitar tudo; recusar uma mudança e aceitar o resto; revisar trecho; folha de acrescentar áudio; parágrafo travado com cadeado; celular e computador.
- **Gate de design:** build de produção, `taste:lint`, `taste:inspect` em 390, 768 e 1440 px, até 3 rodadas.
- **Depois do push:** migration aplicada com o seu OK, deploy de prévia, erros de runtime e as rotas conferidas. O teste à mão no celular (o aceite) é seu.

## 10. Custo e tempo (estimativa; medir na prévia)

- **Tamanho** de uma história de 5 min: edição + verificação dos parágrafos novos ≈ US$ 0,10 e 60 a 90 s. A premissa de custo do lab já conta 2 trocas por história (`PREMISSA_TROCAS_TAMANHO_POR_HISTORIA`); com 25 histórias, ≈ R$ 28 só em trocas. **Isso estoura a meta de R$ 30 por livro se todas as histórias tiverem 2 trocas.** Recomendo medir o uso real do André antes de mexer no modelo (Sonnet é a alavanca registrada, `MODELO_ALTERNATIVO`).
- **Revisar trecho:** ≈ US$ 0,01 a 0,02 e 10 a 20 s.
- **Acrescentar 5 min de áudio:** transcrição US$ 0,03 + integração e verificação ≈ US$ 0,08; ≈ 2 min.

## 11. Revisão (feita por mim; os revisores caíram por limite de uso)

**Segurança e banco**

| # | Sev. | Achado | O que mudou |
| --- | --- | --- | --- |
| R1 | Alto | **Deadlock possível:** `pedir_proposta` travava a história (por `editar_historia`) e depois o livro (`livro:`); `acrescentar_audio` faz o contrário (livro, depois história) | `pedir_proposta` usa outra chave, `propostas:`, e `acrescentar_audio` a pega depois da história. Ordem única: livro → história → propostas |
| R2 | Alto | **Instrução livre sem texto passava:** `true <> null` dá null, e o `if` não dispara | `coalesce(... = 'string', false)` |
| R3 | Médio | `inicio`/`fim` com casa decimal derrubavam a função com erro genérico; `paragrafo` sem tipo conferido | Regex de inteiro e tipo `string` conferidos antes do cast |
| R4 | Médio | Parágrafo editado e depois desfeito (texto igual ao da hora do pedido, mas `editado: true`) passa no `tira` e é barrado como `travado_alterado`, derrubando o aceite inteiro | O banco fica como está (conservador). A função pura da tela marca essa mudança como vencida antes do aceite, para o erro nunca chegar à pessoa |
| R5 | Baixo | Áudio acrescentado a uma história que deixou de estar pronta fica "historia_indisponivel" e a varredura o reenvia por 48 h | Aceito: cada reenvio é uma consulta barata. O status em *Áudios recebidos* mostra "Guardado" |
| R6 | Baixo | Proposta de áudio que falha deixa a gravação sem `processado_em` | Aceito: o editor mostra *Tentar de novo*; `processado_em` só quando a proposta fica pronta |

Conferido e sem mudança: a garantia do travado está no banco (todo parágrafo fora das mudanças aceitas precisa sair idêntico, com id, texto, fontes e `editado`); ids repetidos no texto final são recusados; `para_historia` só aponta para história do mesmo livro (chave composta) e precisa estar `pronta`; nenhum grant para `anon` ou `porta_autor`; `story_proposals` sem escrita direta de ninguém logado; CHECKs compatíveis com os descartes feitos pelo servidor; reversão testada.

**Código**

| # | Sev. | Achado | O que muda na implementação |
| --- | --- | --- | --- |
| C1 | Alto | `processarGravacao` devolve `ja_estava` quando o estado é `pronta`: o áudio acrescentado (história pronta) pararia ali | Conferir `motivo === "acrescentar"` antes das saídas antecipadas (`lib/pipeline/processar.ts`) |
| C2 | Alto | O passo `estruturar` é pulado quando `stories.estrutura` já existe | Passo próprio `estruturar-audio`, só com os segmentos novos, que junta falantes e vazios à estrutura da história |
| C3 | Médio | A chave de concorrência (`chaveDoEvento`) e a varredura não conhecem `para_historia` | `chaveDoEvento` usa `lote_id ?? para_historia ?? id`; `dispararSeRecebida` e a varredura passam a ler a coluna |
| C4 | Médio | Aceitar com um salvamento automático em voo daria `texto_desatualizado` | A diferença pausa o salvamento; o aceite espera o salvamento em voo terminar e usa o `rev` dele |
| C5 | Médio | Códigos novos sem frase em `lib/erros-banco.ts` | `travado_alterado`, `proposta_vencida`, `proposta_indisponivel`, `proposta_em_andamento`, `cota_ia_diaria` ganham frase |
| C6 | Baixo | `Etapa` (`lib/ai/claude.ts`) e `TAMANHOS_TEXTO` mudam de forma | `Etapa` ganha `tamanho`, `integrar` e `revisar`; `TAMANHOS_TEXTO` ganha `curto` (0,45) e `longo` (0,75); `TAMANHO_PADRAO` continua `medio`. Lista `PROMPTS_DAS_PROPOSTAS` para o hash, sem mexer em `PROMPTS_DO_PIPELINE` |
| C7 | Baixo | Rota `/historias/[historiaId]/gravar` ao lado de `/historias/gravar` | Sem colisão: o segmento fixo `gravar` vence o dinâmico em `/historias/gravar` |

Conferido: a versão 1 (IA) não tem id nos parágrafos e `normalizarTexto` dá `p1..pN`, igual a `privado.paragrafos_atuais`; `fixarSegmentoInicial` continua os ids certo também em história nascida de divisão (pega o maior id das transcrições inteiras das gravações anteriores dela); o rótulo `g{ordem}` da gravação nova não colide dentro da história.

## 12. Revisores (rodada única sobre a v2)

Relatórios: `ia-sob-controle/critic_report.md` (segurança e banco) e `ia-sob-controle/codebase_details_report.md` (código). Os dois confirmaram R1 a R6 e C1 a C7, com complementos. O que mudou:

**No SQL (ensaiado de novo em PGlite: sobe, reverte, sobe; cenário do aceite passa)**

| # | Achado | Mudança |
| --- | --- | --- |
| S1 | Aceite podia apagar o ano e trocar o título e as lacunas | O banco monta o texto final com título, ano e lacunas do texto atual e só troca os parágrafos; `stories.titulo` e `ano` não mudam |
| S2 | Ids repetidos no texto atual faziam um travado sumir em silêncio | `pedir_proposta` e `aplicar_proposta` recusam ids repetidos; o texto final precisa ter exatamente "os que ficam + os postos" |
| S3 | A ordem dos parágrafos que ficam não era conferida | Conferida (ensaiado: reordenar um travado é recusado) |
| S4 | Id novo igual ao de um parágrafo que fica descartava o novo em silêncio | Recusado; os postos são comparados por inteiro |
| S5 | Revisar trecho aceitava várias mudanças | Exatamente 1 mudança, que tira o parágrafo pedido e põe 1 (ensaiado) |
| S6 | Consentimento de IA não conferido em `acrescentar_audio` e `pedir_proposta` | Conferido (`sem_consentimento`) |
| S7 | Tetos com a duração declarada pelo navegador | CHECK de 1 a 1800 s em áudio acrescentado; política restritiva de insert exige história `pronta` do mesmo livro; o pipeline reconfere a duração real depois da transcrição |
| S8 | Erro de CHECK com o texto na mensagem podia subir ao Inngest (T36) | `servico_falhar_proposta` limpa o código (ensaiado); `servico_gravar_proposta` troca violação de CHECK por `dados_invalidos` |
| S9 | Tamanho aceito em parte contava o áudio novo como já no texto | Só conta se a proposta de tamanho foi aceita inteira |
| S10 | `inicio`/`fim` como texto passavam | Exigido tipo número |
| S11 | Versão aceita sem `modelos` e `hash_prompts` (T31) | A proposta guarda os dois e a versão os copia |
| S12 | Tamanho pedido com áudio ainda sendo ouvido | Recusado até o áudio virar proposta |
| S13 | Revisão de trecho que morre na ação do servidor bloqueava novos pedidos por 20 min | Pendente de trecho com mais de 3 min vira falhou no próximo pedido |
| S14 | Reversão apagava propostas sem aviso | Trava como a da divisão: só roda com `ecoa.reversao_destrutiva = 'sim'` se houver proposta |

**No código (entram na implementação)**

| # | Achado | O que fazer |
| --- | --- | --- |
| K1 | Depois do aceite, o próximo salvamento marcaria os parágrafos da IA como editados à mão, salvaria de novo e trocaria a origem | Recarregar o texto sem emitir mudança (`definir` com `emitir: false`), recalcular os originais e usar o `rev` devolvido |
| K2 | `iniciar` devolve todas as gravações da história; o loop transcreveria todas | No caminho `acrescentar`, só a gravação nova |
| K3 | Gravar mais usava o adaptador de conversa (lote), o que o banco recusa, e a gravação recuperada criaria história nova | Adaptador próprio, sem lote; `historiaId` no destino e na gravação local; `emPartes={false}` |
| K4 | `chaveDoEvento`, `dispararGravacao`, `audioEnviando` e a varredura não leem `para_historia` | Todos passam a ler |
| K5 | Mensagem nova no canal quebra o `else` de `historias-ao-vivo` e os fakes do lab | Ramo explícito por `tipo`; o editor assina o canal (extrair `useCanalDoLivro`) |
| K6 | `onFailure` não marca a proposta; `propor` precisa entrar em `funcoes` | `servico_falhar_proposta` no `onFailure`; registrar a função; varredura usa `VARREDURA_PARADA_MIN` |
| K7 | `checar`/`verificar` devolvem posição numa sublista | Converter para `paragrafo_id` antes de gravar |
| K8 | Revisar: o `Ouvir` é por clique e a folha tira o foco do editor; posições em UTF-16 vs pontos de código no banco | `ApiDoTexto` expõe a seleção; capturar antes de abrir a folha; salvar antes de pedir; converter UTF-16 → pontos de código no servidor |
| K9 | Ação de revisar com 2 chamadas do modelo capaz, sem `maxDuration` | `maxDuration` na página do editor; extrair `dependencias()` de `funcoes.ts` |
| K10 | Motivos novos (`longa`, `historia_indisponivel`, `cota_ia_diaria`, `sem_consentimento`) viram "Guardada" | Entram em `MOTIVOS_ESPERA`/`FRASES_ESPERA`; a tela confere os 30 min antes de enviar |
| K11 | `TAMANHOS_TEXTO` com 5 chaves quebra `config.test.ts` e o `--tamanho todos` do lab; dois tipos `Tamanho` com o mesmo nome | Atualizar os dois; mapa posição (1 a 5) → chave em `lib/ui/tamanho.ts` |
| K12 | Histórico não lê `tamanho` nem `proposta_id`; `config-banco.test.ts` sem as funções novas; `lib/supabase/tipos.ts` | Ajustar a consulta, a lista do teste e regenerar os tipos |

## 13. O que mudou na implementação

- **Parágrafo novo que só reconta um travado sai da proposta de tamanho.** Se a IA esquece o marcador e reescreve o conteúdo de um parágrafo editado à mão, com as mesmas fontes, ele duplicaria o que a família escreveu. O código descarta esse parágrafo novo e devolve o travado ao lugar (teste do item 5 no pipeline).
- **Título de quem nunca editou:** o aceite usa o título de `stories` (P46) quando ainda não há texto salvo, e nunca muda `stories.titulo` nem o ano.
- **O editor confere as propostas a cada 5 s** (enquanto uma está sendo escrita ou um áudio acabou de subir), em vez de assinar o canal. O servidor também publica `proposta` no canal do livro, num evento próprio que a lista de histórias não ouve; o editor pode passar a usá-lo depois, sem mudar o servidor.
- **Diferença por palavra separa a pontuação:** "escuro." → "escuro," marca só a vírgula.
- **Uma dica de primeira vez por vez:** a de "Revisar" só aparece depois que a de "Ouvir" foi vista (`depoisDe`).
- **Vitrine:** `editor-ia`, `editor-proposta`, `editor-diferenca` (a diferença já aberta) e `gravar-mais`.

## 14. Gate

- `npm test`: 557 testes (17 novos de banco em `supabase/tests/propostas.test.ts`, 14 de `lib/editor/propostas.test.ts`, 3 de `lib/pipeline/propostas.test.ts`, incluindo o item 5 nas duas camadas).
- `npm run test:e2e`: 177 testes, 14 novos em `e2e/ia-sob-controle.spec.ts` (celular e computador).
- Design: `taste:lint` 0 FAIL; `taste:inspect` 0 FAIL nas 4 telas novas em 390, 768 e 1440 px. Um WARN aceito: "Gravar mais" no computador tem o mesmo vazio do gravador da conversa (coluna estreita de propósito). Corrigidos na rodada: título repetido 3 vezes nas folhas, "Versão Longo" (virou "Texto longo"), player cobrindo o *Aceitar* no celular, rótulo do cadeado na fonte do livro, pontuação trocando a palavra inteira na diferença, duas dicas empilhadas.
- **Banco (13/11):** migration aplicada no Supabase (`ecoa-plataforma`, São Paulo). As 7 funções principais têm o mesmo hash do banco de teste. Só membro logado executa `pedir_proposta`, `aplicar_proposta` e `descartar_proposta`; só o servidor grava e falha propostas; `anon` e `porta_autor` sem acesso; ninguém logado lê `travados`. O verificador de segurança não apontou nada novo além do padrão já aceito.
