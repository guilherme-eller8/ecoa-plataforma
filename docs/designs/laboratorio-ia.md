# Design doc: Laboratório de IA (versão enxuta)

- **Autor:** Guilherme Eller
- **Data:** 2026-11-10
- **Status:** para aprovação única
- **Origem:** PRD, *Pipeline de IA* e Prompt 1. A versão completa, com juiz, canários e auditoria, está no histórico do git (commit `bab2493`) e em `docs/designs/concepts_brief.md`. Ela volta por gatilho (seção 7).

## 1. Decisão de produto

Em vez de provar a qualidade do texto com áudios de teste antes de construir, a qualidade passa a melhorar com o **uso real do design partner**. André grava o pai, Nelson. As correções do André sobre o texto da IA viram a base que melhora as regras, o estilo e o glossário.

Este prompt entrega o **mínimo para isso funcionar**:

1. O pipeline real (transcrever, estruturar, editar, verificar) em `lib/ai/`, já no formato que a plataforma reaproveita no prompt 6.
2. O registro imutável da versão da IA e uma comparação com a versão corrigida pelo André.
3. Um relatório simples com o texto, as marcações "Confira", as perguntas ao autor e o custo e o tempo por etapa.

**O que não se simplifica:**
- A regra de não inventar.
- A marcação "Confira".
- O consentimento.

Uma invenção não marcada na história do pai do André custa a confiança da família inteira.

## 2. Hipótese do teste com o André

- **Hipótese:** com o André conduzindo conversas naturais com o Nelson, o pipeline gera histórias que a família aceita corrigindo no máximo 1 de cada 3 parágrafos, sem nenhuma invenção que passe sem "Confira".
- **Métricas.** Elas saem do `--comparar` (seção 4.5):
  - percentual de parágrafos corrigidos;
  - invenções removidas pelo André em parágrafos **sem** "Confira" (escapes);
  - percentual de "Confira" que eram invenção de verdade;
  - custo e tempo por história.
- **Critério de morte:** 1 escape de invenção que a família perceba, ou mais de 50% do texto reescrito em 3 histórias seguidas. Se acontecer, as telas param e a prioridade volta para regras e verificação.
- **Atalho:** o André pode gravar já, no gravador do celular, e mandar os arquivos. O lab processa e o André corrige o texto num documento. Assim o aprendizado começa antes das telas.

## 3. Pipeline

```
áudio ─► normalizar (ffmpeg) ─► transcrever (Scribe; AssemblyAI como alternativa) ─► segmentar
      ─► estruturar (Haiku) ─► editar (Opus, streaming) ─► checagens + verificar (Opus)
      ─► lab/saidas/<historia>/ (ia.json imutável + ia.md) ─► relatório
                    ... André corrige ia.md → editado.md ...
      ─► npm run lab -- --comparar <historia> ─► lab/aprendizados.md
```

### 3.1 Transcrição

- **Provedor padrão:** ElevenLabs Scribe, escolhido por avaliação de mercado (acerto em português, falantes separados, tempo por palavra).
- **Alternativa pronta:** AssemblyAI, atrás da mesma interface. Trocar o provedor é trocar `LAB_PROVEDOR`.
- **Custo:** não decide a escolha. Pelos preços de mercado, a transcrição sai abaixo de US$ 1 por livro. O Guilherme confere os preços atuais no site de cada provedor antes da 1ª rodada; até lá, os valores no `config` ficam marcados como "NÃO CONFIRMADO".
- **Contrato:**
  ```ts
  type Palavra = { texto: string; inicio: number; fim: number; falante: string | null; confianca: number | null };
  transcrever(audio, nomeArquivo, { dicas: string[]; chave: string }): Promise<{ palavras: Palavra[]; bruto: unknown; minutos: number; ms: number }>
  ```
- **Chamadas.** São premissas: os sites dos provedores estão bloqueados nesta sessão. Na 1ª rodada real, a resposta bruta fica guardada, e se o formato divergir o erro aponta o arquivo.
  - **Scribe:** `POST api.elevenlabs.io/v1/speech-to-text`, cabeçalho `xi-api-key`, multipart com `file`, `model_id`, `language_code=por`, `diarize=true` e `timestamps_granularity=word`.
  - **AssemblyAI:** `POST /v2/upload` → `POST /v2/transcript` com `language_code=pt` e `speaker_labels=true` → `GET` a cada 3 s até ficar pronta.
- Os nomes do glossário vão como dicas de vocabulário quando o provedor aceitar.
- A transcrição fica em cache por hash do áudio, provedor e modelo. A resposta bruta também é guardada, para reprocessar sem pagar de novo.

### 3.2 Segmentar e estruturar

- **Segmentos.** Um segmento novo começa quando o falante muda, quando há uma pausa de 1,5 s ou mais, ou quando o segmento passa de 40 palavras. Os ids são inteiros contínuos (`S001` dentro do prompt).
- **Estruturar (Haiku 5.5).** Diz quem é o autor e quem é o entrevistador, e marca os segmentos vazios e as mudanças de assunto. Na conversa com o Nelson, o André é o entrevistador. As perguntas dele são absorvidas na narrativa e nunca viram fala do Nelson.

### 3.3 Editar (Opus 5.5, streaming)

- **Tamanho padrão: médio**, mirando 60% das palavras com conteúdo. `--tamanhos todos` gera também o resumido (30%) e o detalhado (90%).
- **Saída (zod):**
  ```
  {
    titulo,
    paragrafos: [{ texto, fontes: number[] }],
    lacunas: [{ pergunta, motivo }]
  }
  ```
- **Lacunas.** São perguntas sobre o que ficou confuso ou faltando. Viram **o roteiro da próxima conversa do André com o Nelson**.
- **Primeira palavra.** É o 1º caractere de `paragrafos[0].texto` no streaming. O tempo é medido desde o início da chamada e desde o início do processamento do arquivo.
- **Validação.** Zod, mais a regra de que todo id em `fontes` existe. Se falhar, há 1 nova tentativa.

### 3.4 Checagens sem IA e verificação

**Checagens** (determinísticas, custo zero; `lib/ai/checagens.ts`):

| Checagem | Marca quando |
| --- | --- |
| Conectores e emoção | Um item de `_conectores.md` (causa ou emoção) aparece no parágrafo e não aparece nas fontes |
| Números e anos | Um número ou ano do parágrafo não aparece nas fontes. Os números por extenso são normalizados. |
| Anti-slop | Uma frase ou regex de `_anti-slop.md` aparece |

**Verificação às cegas** (Opus 5.5, `verificar.md`):
- Recebe o texto e **todos** os segmentos da história, sem as fontes do editor.
- Devolve só o que tem problema: `{ marcadas: [{ paragrafo, trecho, tipo, status: 'parcial'|'sem_sustentacao', motivo }] }`.
- Os tipos vêm de uma lista única: `fato | nome | data | lugar | numero | emocao | juizo | causa | ordem`.
- `parcial` também conta como "Confira".
- O lab localiza o `trecho` no parágrafo e grava a posição `{ inicio, fim }`.

**"Confira"** = checagens + verificador, com a origem de cada marcação.

### 3.5 Versão da IA e comparação com o André

**Registro (`lab/saidas/<historia>/`):**
- `ia.json`: **imutável**. Guarda o texto, as fontes, as marcações, as lacunas e os metadados da geração:
  - data, modelos e provedor;
  - **hash de cada prompt `.md` usado**, para saber qual versão das regras gerou cada erro;
  - custo e tempos.
- `ia.md`: cópia legível para o André corrigir. Cada "Confira" aparece como `⚠` no fim do trecho.
- `editado.md`: a versão corrigida pelo André (colada de volta, se ele editar num Google Docs). Pode levar comentários opcionais `<!-- motivo: ... -->`.

**`npm run lab -- --comparar <historia>`:**
1. Alinha os parágrafos de `ia.json` e de `editado.md` por similaridade de texto e calcula o percentual de parágrafos alterados e de palavras adicionadas e removidas.
2. Para cada parágrafo alterado, o Haiku classifica a mudança (`classificar-edicao.md`):

   | Categoria | Para onde vai |
   | --- | --- |
   | Invenção removida (com o tipo) | `_regras.md`, `_conectores.md`, `verificar.md` |
   | Nome ou palavra errada da transcrição | Glossário e dicas do provedor |
   | Voz restaurada (expressão do Nelson recolocada) | `_estilo.md` |
   | Corte excessivo (informação do áudio que faltou) | `editar.md` (tamanho e cobertura) |
   | Informação nova da família (não estava no áudio) | Não é erro da IA: vira lacuna ou glossário |
   | Ordem trocada | `_regras.md` |
   | Preferência de estilo | `_estilo.md`, quando se repetir |

3. Cruza a classificação com as marcações. Uma **invenção removida num parágrafo sem "Confira"** é um **escape**: ela aparece no topo, em destaque.
4. Acrescenta em `lab/aprendizados.md`:
   - a data, a história e as métricas;
   - cada mudança com o antes, o depois, a categoria e uma sugestão de regra.

**Promoção para o prompt.** O Guilherme lê `aprendizados.md` e decide o que entra nos `.md`. **Nada muda o prompt sozinho.** Um padrão que aparece em 2 histórias vira regra. Um par bom vira exemplo, se houver consentimento para reuso (seção 5).

**Na plataforma.** A tabela `story_versions` do PRD já guarda a origem de cada versão (IA, responsável…). O `lib/ai/comparar.ts` é o mesmo código: a comparação passa a rodar sobre o banco no prompt 9.

### 3.6 Relatório (`lab/relatorio.md`)

Uma seção por história, com:
- a transcrição, com os falantes;
- o texto com os "Confira";
- as perguntas para a próxima conversa;
- o custo e o tempo por etapa, e o tempo até a primeira palavra em relação à meta de 60 s.

No fim, o **custo projetado por livro**: custo medido por minuto de áudio × as premissas do `config` (25 histórias de 6 min, 2 trocas de tamanho por história), em relação aos R$ 30. Faixa **SIMULADO** quando os dados são de fake e selo **PROVISÓRIO** enquanto o preço do provedor não estiver confirmado.

## 4. Arquivos

```
lib/ai/   (puro: sem ffmpeg, sem disco, sem server-only)
  schemas.ts carregar-prompt.ts segmentar.ts claude.ts checagens.ts custo.ts comparar.ts
  transcricao/{elevenlabs,assemblyai,index}.ts   __fixtures__/   *.test.ts
  prompts/_regras.md _estilo.md _anti-slop.md _conectores.md
          estruturar.md editar.md verificar.md classificar-edicao.md exemplos/README.md
scripts/lab/  index.ts opcoes.ts audio.ts cache.ts pipeline.ts relatorio.ts fakes.ts   *.test.ts
lab/README.md  lab/glossario.exemplo.json
lib/config.ts (seção IA)  lib/config.test.ts  package.json  .gitignore  .env.example
```

- **`.gitignore`:** `/lab/*` com exceções para `README.md` e `glossario.exemplo.json`. Áudios, glossário real, saídas, aprendizados e cache ficam só na máquina do Guilherme.
- **`lab/glossario.json`:**
  ```
  {
    autor,
    sobre,
    pessoas[],
    lugares[],
    consentimento: { quem, data, escopo, reusoComoExemplo }
  }
  ```
  Sem `consentimento`, o lab recusa a rodada real.
- **`lib/config.ts`:**
  - `MODELO_RAPIDO = 'claude-haiku-5-5'`, `MODELO_CAPAZ = 'claude-opus-5-5'`, `MODELO_ALTERNATIVO = 'claude-sonnet-5-5'`;
  - preços (os dos provedores com o selo NÃO CONFIRMADO);
  - `COTACAO_USD_BRL`;
  - `TAMANHOS_TEXTO`;
  - os valores da segmentação;
  - as metas (60 s e R$ 30);
  - as premissas do livro.
- **`lib/ai/claude.ts`:** interface `ClienteIA` injetável, `gerar<T>({ etapa, modelo, sistemaFixo, sistemaLivro, usuario, schema, aoPrimeiraPalavra }) → { dados, uso, ms, msPrimeiraPalavra }`.
  - A implementação real usa streaming do SDK com saída estruturada (JSON Schema via `z.toJSONSchema`) e cache de prompt nas camadas fixas.
  - A implementação simulada fica em `scripts/lab/fakes.ts`.
- **Comando:** `"lab": "node --env-file-if-exists=.env.local --import tsx scripts/lab/index.ts"`.
- **Flags:** `--tamanhos todos`, `--provedor`, `--sem-cache`, `--comparar <historia>`.
- **Dependências:** `@anthropic-ai/sdk` como dependência; `tsx` e `ffmpeg-static` como dependências de desenvolvimento.
- **`.env.example`:** ganha `ELEVENLABS_API_KEY`, `ASSEMBLYAI_API_KEY` e `LAB_PROVEDOR`.

## 5. Consentimento do Nelson

O André quer gravar sem dizer, de início, que é para um livro, para os casos saírem naturais. Separar duas coisas resolve:

- **A surpresa do livro pode ficar.**
- **A gravação e o envio para processamento não podem ser escondidos.** A voz do Nelson vai para o ElevenLabs e para a Anthropic, provavelmente nos EUA, e fica guardada. É dado pessoal de um idoso.

**Proposta:** o André pede ao Nelson algo como "posso gravar suas histórias para a família guardar?". O propósito é verdadeiro (preservar as histórias), e o livro continua surpresa. Esse consentimento é registrado em `glossario.json` (`quem`, `data`, `escopo`).

**Reuso como exemplo no prompt** (que chega ao texto de outras famílias) é outra coisa. Exige `reusoComoExemplo: true`, autorizado pelo André e, quando o livro for revelado, pelo Nelson, além de anonimização revisada à mão. Até lá, as histórias do Nelson melhoram **regras e estilo**, mas não entram como exemplo literal.

**Antes da rodada real:** ligar no ElevenLabs e no AssemblyAI a retenção zero ou o apagamento depois do processamento, e o não uso para treino, onde existir. O `lab/README.md` traz o checklist.

## 6. Testes (Vitest, sem API)

- Normalizadores do Scribe e do AssemblyAI, com JSON sintético.
- `segmentar`.
- As 3 checagens.
- `custo`, incluindo a projeção por livro.
- `carregar-prompt`.
- `comparar`:
  - alinhamento de parágrafos;
  - percentual alterado;
  - escape (invenção removida sem "Confira") com classificação simulada.
- Pipeline de ponta a ponta com fakes:
  - relatório com a faixa SIMULADO;
  - recusa da rodada real sem consentimento.
- As constantes novas do `config`.

Gate: `build`, `lint`, `test` e `format`.

## 7. Fica para depois, com gatilho

| Peça | Gatilho |
| --- | --- |
| Comparar provedores com áudio real | Muitos nomes errados no Scribe (categoria "transcrição" frequente no `--comparar`) |
| Canários e auditoria formal | 1º escape, ou antes do 1º cliente pagante |
| Rubrica e juiz de IA | 5 histórias corrigidas pelo André |
| Exemplos no prompt | 1º par com consentimento de reuso e anonimizado |
| Divisão em lote | Prompt 7 |
| PDF de amostra | Prompt 10 (plano B do dia 26, se o 10 atrasar) |

## 8. Desvios do PRD

| PRD | Aqui | Por quê |
| --- | --- | --- |
| 2 ou 3 provedores comparados | 1 padrão (Scribe) e 1 alternativa pronta | A decisão é reversível, e o custo de transcrição é irrelevante |
| `--lote` e `--amostra` | Fora | Prompts 7 e 10 |
| Aceite "5 áudios, nada inventado sem marcação" | Hipótese e critério de morte medidos com o André | Os áudios reais do design partner valem mais que os áudios de teste |
| `lab/contexto.json` | `lab/glossario.json` com consentimento | Pedido do Guilherme e controle de consentimento |

## 9. Fases (no máximo 2 dias)

1. **Núcleo:** `config`, `schemas`, `carregar-prompt`, `segmentar`, checagens, custo, os prompts `.md` e os testes.
2. **Pipeline:** transcrição (Scribe e AssemblyAI), `claude.ts`, estruturar, editar em streaming, verificar, saídas e relatório, e a rodada `LAB_FAKE=1`.
3. **Comparação:** `comparar.ts`, `classificar-edicao.md`, `--comparar`, `aprendizados.md` e o `lab/README.md`.

Cada fase termina com o gate verde e um commit.
