# Design doc: Laboratório de IA e sistema de qualidade do texto

- **Autor:** Guilherme Eller
- **Data:** 2026-11-10
- **Status:** para aprovação única (revisado por 4 revisores EGM)
- **Origem:** PRD, seção *Pipeline de IA* e Prompt 1; brainstorm em `docs/designs/concepts_brief.md`

## 1. Problema

O produto inteiro depende de uma promessa: a fala do autor vira um texto de livro bom, na voz dele, sem nada inventado. Se essa promessa não se sustenta, nenhuma tela salva o produto.

O lab é um comando, `npm run lab`, que lê áudios reais e gera um relatório com 3 respostas:

1. **Transcrição:** qual provedor acerta mais nomes e palavras e separa melhor os falantes. Os candidatos são ElevenLabs Scribe, AssemblyAI e Deepgram.
2. **Texto:** o Claude transforma um áudio desorganizado numa história bem conduzida, na voz do autor, sem cara de texto de IA e sem nenhuma afirmação inventada?
   - Contam como invenção: fato, nome, data, lugar, número, emoção, juízo e ligação de causa.
   - Quando falta informação, o modelo pergunta ao autor em vez de preencher.
3. **Custo:** R$ 30 de IA por livro fecha?

Junto vem o **sistema de refinamento do texto**: prompts em arquivos `.md` que o Guilherme lê e ajusta, checagens automáticas, uma rubrica e um ciclo de ajuste com medição. Não existe ajuste fino (fine-tuning) aqui. O texto melhora pelo contexto que o modelo recebe e pela medição.

**Evidência disponível hoje:** 5 áudios reais, um por história, e nenhum texto editado por humano.

## 2. Decisões que o lab produz e critério de morte

| Pergunta | Regra de decisão | Se der errado |
| --- | --- | --- |
| 1. Provedor | Vence quem tem mais **nomes exatos** do glossário e menos **quase-nomes** (grafia errada de um nome do glossário, ver 4.2). Em caso de empate (diferença ≤ 2 nomes), o Guilherme ouve um trecho com as 3 transcrições lado a lado e escolhe. Novo empate: vence o mais barato. | Se todos errarem mais de 20% dos nomes, o produto ganha um passo de "confirmar nomes" na revisão. |
| 2. Fidelidade | Na auditoria de 2 histórias (4.10), **o sistema de marcação inteiro** (checagens sem IA + verificador) pega 100% dos trechos que o Guilherme marcou, com alarme falso ≤ 30%. Se o Guilherme não marcar nenhum trecho, o resultado é **"sem evidência"**, e não "aprovado". | Se escapar invenção, ajustar `verificar.md` e as checagens e reverificar os textos congelados da auditoria. Se ainda escapar depois de 3 rodadas, o produto passa a mostrar só a **transcrição limpa** (sem reescrita) até resolver. |
| 2. Qualidade | Na ficha do Guilherme: média ≥ 4 em *voz* e em *condução*, e nenhuma ocorrência da seção **automática** do anti-slop. | **De 3 a 3,9:** mais uma rodada de ajuste em `_estilo.md` e `editar.md`, e a meta mantida. **Abaixo de 3 depois de 3 rodadas:** reduzir a ambição para edição leve (limpar sem reestruturar). |
| 3. Custo | O custo projetado por livro (fórmula em 4.11) fica ≤ R$ 30. Enquanto houver preço de provedor não confirmado, o veredito sai como **"provisório"**. | Alavancas, nesta ordem, e cada uma medida contra a auditoria antes de virar padrão: (1) verificar com Haiku; (2) editar com Sonnet 5.5; (3) tirar as citações da saída do editor. |

**Taxa de escape** = 1 − (trechos do Guilherme pegos ÷ trechos marcados pelo Guilherme).
**Alarme falso** = marcações do lab que não se sobrepõem a nenhum trecho do Guilherme ÷ total de marcações do lab nos textos auditados.

**Aceite do Prompt 1:**
- Com os 5 áudios, sem cache de transcrição, o relatório sai em menos de 10 minutos.
- Nenhum canário escapa.
- Taxa de escape de 0% e alarme falso ≤ 30% na auditoria. Se não houver trecho marcado, o relatório diz "sem evidência".

**Tempo:**
- Construção: 4 fases (seção 13), no máximo 5 dias úteis.
- Tempo do Guilherme: cerca de 2 horas no total, para preparar a rodada, fazer a auditoria e preencher a ficha.
- **Ordem de corte se atrasar:** PDF → `--lote` → 3º provedor. A auditoria nunca é cortada.

## 3. O que entra agora e o que fica para depois

| Entra agora | Fica como andaime (arquivo pronto, sem código) | Gatilho para ligar |
| --- | --- | --- |
| Transcrição em 3 provedores, com tabela de nomes | Juiz de IA (`avaliacao/julgar.md`) e calibração | 5 ou mais casos com nota humana |
| Estruturação, divisão com `--lote` e edição em 3 tamanhos | Comparação par a par entre versões de prompt | Ruído medido: o mesmo prompt rodado 2 vezes dá a mesma nota |
| Verificação às cegas e 5 checagens sem IA | Novas checagens (nomes por maiúscula, palavras de baixa confiança) | A auditoria mostrar escape desse tipo |
| Canários por modelo e auditoria humana | Lote sintético e lote real com fronteiras marcadas | Prompt 7 |
| Ficha de avaliação humana no relatório | WER (taxa de erro de palavras) contra um minuto corrigido à mão | Empate de nomes que a escuta não resolver |
| Custo por etapa e projeção por livro | OpenAI como provedor | Algum dos 3 falhar |
| PDF de amostra simples | Typst | Prompt 10 |

## 4. Pipeline

```
áudios ─► normalizar ─► transcrever (3 provedores, em paralelo, com cache)
                              │ base = 1º provedor da lista
                              ▼
                 segmentar ─► estruturar (Haiku) ─► [--lote] dividir
                              ▼
               editar (Opus, streaming, 3 tamanhos, até 4 chamadas ao mesmo tempo)
                              ▼
           [--canario] plantar ─► checagens sem IA ─► verificar às cegas (Opus)
                              ▼
         relatório + arquivos de auditoria + ficha + [--amostra] PDF
```

### 4.1 Normalizar (`scripts/lab/audio.ts`)

- `ffmpeg-static` converte o áudio para FLAC mono 16 kHz e mede a duração. O FLAC não perde qualidade e os 3 provedores aceitam.
- Isso fica fora de `lib/ai/`: no prompt 6, o ffmpeg vem da extensão do Trigger.dev.
- O modo simulado (`LAB_FAKE=1`) não chama o ffmpeg. Sem o binário, o lab para com uma mensagem que diz o que instalar.

### 4.2 Transcrever (`lib/ai/transcricao/`)

**Contrato único:**
```ts
type Palavra = { texto: string; inicio: number /* s */; fim: number; falante: string | null; confianca: number | null };
type Transcricao = { provedor: Provedor; palavras: Palavra[]; bruto: unknown; ms: number; minutos: number };
transcrever(audio: Buffer, nomeArquivo: string, opcoes: { dicas: string[]; chave: string; fetch?: typeof fetch }): Promise<Transcricao>
```

**Chamadas por provedor.** Os sites dos provedores estão bloqueados nesta sessão, então os detalhes abaixo são premissas, a confirmar na 1ª rodada real. Os ids de modelo ficam no `config`.

| Provedor | Chamada | Falantes | Dicas | Tempo |
| --- | --- | --- | --- | --- |
| ElevenLabs Scribe | `POST api.elevenlabs.io/v1/speech-to-text`, cabeçalho `xi-api-key`, multipart (`file`, `model_id`, `language_code=por`, `diarize=true`, `timestamps_granularity=word`) | `words[].speaker_id` | `keyterms`, se o modelo aceitar | segundos |
| AssemblyAI | `POST /v2/upload` → `POST /v2/transcript` (`language_code=pt`, `speaker_labels=true`) → `GET /v2/transcript/{id}` a cada 3 s até `completed` ou `error` | `words[].speaker` | `keyterms_prompt` (ou `word_boost`) | milissegundos ÷ 1000 |
| Deepgram | `POST api.deepgram.com/v1/listen?model=nova-3&language=pt-BR&diarize=true&smart_format=true`, cabeçalho `Authorization: Token` | `words[].speaker` (número) | `keyterm` (repetido) | segundos |

- Na 1ª rodada real, o lab guarda a resposta bruta de cada provedor no cache. Se o normalizador falhar, o erro aponta o arquivo bruto, que vira um teste depois de anonimizado (instruções no `lab/README.md`).
- **Ordem padrão:** `LAB_PROVEDORES=elevenlabs,assemblyai,deepgram`. A flag `--provedores` vale mais que a variável, que vale mais que o padrão.
- A falha de um provedor não derruba o lab: o relatório sai parcial e diz qual falhou e por quê. Se o 1º provedor falhar, o 2º vira a base.

**Nomes do glossário (critério da pergunta 1).** Para cada nome e apelido do glossário, em cada transcrição, o lab conta:

- **exato:** o nome aparece igual, sem diferença de caixa nem de acento.
- **quase:** uma sequência de palavras a até 2 letras de distância do nome. É sinal de nome escrito errado.

A tabela mostra os dois números por provedor. O Guilherme confere ouvindo os quase-nomes, que ficam listados com a minutagem.

### 4.3 Segmentar (`lib/ai/segmentar.ts`)

- A base é o 1º provedor que respondeu.
- Um segmento novo começa quando o falante muda, quando há uma pausa de 1,5 s ou mais, ou quando o segmento passa de 40 palavras. Os 3 valores ficam no `config`.
- Os arquivos entram em ordem alfabética. Os ids são **inteiros contínuos** entre arquivos.
- Dentro do prompt, o id aparece como `S001`.
- O falante é qualificado pelo arquivo (`arquivo:falante`), para não colidir no lote.
- `Segmento = { id, arquivo, inicio, fim, falante, texto }`.

### 4.4 Estruturar (Haiku 5.5, `estruturar.md`)

Por arquivo, saída em zod:
```
{
  falantes: { [falante]: 'autor' | 'entrevistador' | 'outro' },
  vazios: number[],             // segmentos sem conteúdo de história
  mudancasDeAssunto: number[]   // segmento onde começa assunto novo
}
```

### 4.5 Dividir em histórias

- **Sem flag:** 1 arquivo = 1 história.
- **`--lote`:** uma chamada sobre todos os segmentos (`dividir-lote.md`) devolve `{ historias: [{ titulo, segmentos: number[] }] }`.
- **Validação determinística:**
  - todo id existe;
  - nenhum id aparece em 2 histórias;
  - nenhum segmento vazio entra;
  - todo segmento com conteúdo entra em alguma história (os que sobrarem são listados como "não usados").
- **Limite:** até 60 min de áudio no lote. Acima disso, o lab avisa e pede para dividir. O fatiamento automático fica para o prompt 7.

### 4.6 Editar (Opus 5.5, `editar.md`, streaming)

- **3 tamanhos** a partir da mesma base: resumido, médio e detalhado, com alvo de 30%, 60% e 90% das palavras dos segmentos com conteúdo, sem os vazios (`TAMANHOS_TEXTO`).
- **`--tamanhos medio`** limita a 1 tamanho. É a alavanca se o tempo passar de 10 minutos.
- **Até 4 chamadas ao mesmo tempo** (`LAB_CONCORRENCIA`). A 1ª chamada de cada execução vai sozinha, para gravar o cache do prompt na Anthropic. Se as camadas fixas forem curtas demais para o tamanho mínimo do cache, ele simplesmente não acontece; o relatório mostra o cache lido em cada etapa.
- **Saída (zod):**
  ```
  {
    titulo: string,
    paragrafos: [{
      texto: string,
      fontes: number[],     // ids dos segmentos
      citacoes: string[]    // 1 a 3 trechos literais curtos (≤ 12 palavras) das fontes que sustentam o parágrafo
    }],
    lacunas: [{ pergunta: string, motivo: string }]   // perguntas ao autor
  }
  ```
- **Primeira palavra:** é o momento em que o streaming entrega o 1º caractere depois de `"texto":"` dentro de `paragrafos` (busca no texto acumulado). O relatório mede dois tempos: desde o início da chamada e desde o início do processamento daquele arquivo.
- **Validação:** zod + todo id em `fontes` precisa existir. Se falhar, há 1 nova tentativa; se falhar de novo, vira erro no relatório.

### 4.7 Checagens sem IA (`lib/ai/checagens.ts`)

São determinísticas: a mesma entrada dá sempre o mesmo resultado, a custo zero. Cada marcação tem `{ paragrafo, inicio, fim, tipo, origem: 'checagem', motivo }`, com `inicio` e `fim` em caracteres do parágrafo.

| Checagem | Marca quando |
| --- | --- |
| Citação existe | A citação não aparece nas fontes do parágrafo. Antes de comparar, o lab normaliza caixa, acento e pontuação e aceita até 15% de diferença de caracteres (distância de Levenshtein ÷ tamanho da citação). |
| Conectores e emoção | Um item de `_conectores.md` (causa: "por isso", "porque", "foi aí que"…; emoção: "orgulho", "saudade", "emocionado"…) aparece no parágrafo e não aparece nas fontes. |
| Números e anos | Um número ou ano do parágrafo não existe nas fontes. Números por extenso são normalizados ("dezoito" = 18, "cinquenta e oito" = 58). |
| Anti-slop | Uma frase ou regex da seção **automática** de `_anti-slop.md` aparece. |
| Tamanho | O número de palavras sai de ±10 pontos percentuais da meta. A marcação vale para a história inteira. |

A **cobertura** (% dos segmentos com conteúdo citados nas fontes) aparece no relatório só como número, sem gerar marcação.

### 4.8 Verificar às cegas (Opus 5.5, `verificar.md`)

- A chamada é independente da edição: não leva o histórico nem as fontes e citações do editor.
- Ela recebe o texto de **um tamanho** de uma história, com os parágrafos numerados, e **todos os segmentos** da história. Ela procura sozinha a sustentação de cada afirmação.
- **Devolve só o que tem problema:**
  ```
  {
    totalAfirmacoes: number,
    marcadas: [{
      paragrafo: number,
      trecho: string,     // cópia exata do trecho do parágrafo
      tipo,
      status: 'parcial' | 'sem_sustentacao',
      motivo: string
    }]
  }
  ```
  O lab acha a posição do `trecho` no parágrafo (busca exata, depois aproximada) e converte para `{ inicio, fim }`.
- **`parcial` conta como marcação.**
- Os tipos vêm de uma lista única em `schemas.ts`: `fato | nome | data | lugar | numero | emocao | juizo | causa | ordem`. A mesma lista serve à rubrica e à taxonomia de falhas.
- **Por padrão, só o médio é verificado.** `--verificar-todos` verifica os 3 tamanhos. `--verificador-rapido` usa o Haiku.
- **Marcação final** = checagens + verificador. O relatório mostra a origem de cada marcação e a contagem por origem.

### 4.9 Canários (`--canario`)

- **Onde:** no texto **médio** editado, depois da edição e antes das checagens. Com `--verificar-todos`, também no resumido e no detalhado.
- **Como:** modelos fixos em `scripts/lab/canarios.ts`. São determinísticos (sem chamada de IA) e entram **dentro de uma frase que já existe**:

  | Tipo | Modelo |
  | --- | --- |
  | Emoção | insere ", muito emocionado," depois do 1º verbo |
  | Causa | põe "Por causa disso, " no começo da frase |
  | Data | troca o 1º número por número + 7, ou insere " em 1958" |
  | Lugar | insere " lá em Ouro Preto" |
  | Nome | insere " com o compadre Osvaldo" |
  | Juízo | insere ", o que foi um erro," |

  Os valores de lugar, nome e ano são trocados se já existirem nas fontes.
- **Quantos:** 3 por história, em parágrafos diferentes e com tipos sorteados. O sorteio usa a semente `--semente` (padrão 1), para repetir igual.
- **Controle:** 1 parágrafo intocado por história. Uma marcação nele é candidata a alarme falso. Ela só conta como alarme falso se esse parágrafo estiver numa história auditada e o Guilherme não tiver marcado nada ali.
- **"Pego":** alguma marcação final se sobrepõe a pelo menos metade dos caracteres inseridos.
- **Se um canário escapar**, o relatório abre com **FALHA** e mostra:
  - a frase antes e depois, e o tipo;
  - o que o verificador disse sobre aquele parágrafo;
  - o arquivo a olhar: `verificar.md` para sentido, `_conectores.md` para conector e emoção;
  - o comando para repetir: `npm run lab -- --canario --semente N --historia X`.
- Os canários nunca entram no cache e nunca vão para os arquivos de auditoria nem para o PDF.

### 4.10 Auditoria humana

**1. O lab gera os arquivos.** `npm run lab -- --auditar <historiaA>,<historiaB>` gera `lab/auditoria/<historia>.md` com:

- No topo: o **hash** do texto, a data e os modelos.
- Cada parágrafo do texto **médio** (sem canário), e logo abaixo os segmentos de onde ele veio.
- Uma instrução de uma linha: "Envolva com `[[ ]]` todo trecho que não está no áudio: fato, nome, data, lugar, número, emoção, juízo ou causa."

**2. O Guilherme marca os trechos**, com o áudio ou a transcrição ao lado. Leva cerca de 30 min por história.

**3. O lab mede o resultado.** `npm run lab -- --medir-auditoria`:

- Lê os arquivos marcados.
- **Reverifica o próprio texto congelado de cada arquivo** com as checagens e o verificador atuais. Não chama o editor de novo, então a auditoria nunca fica velha quando só `verificar.md` ou as checagens mudam.
- Casa os trechos pela mesma regra dos canários (sobreposição ≥ 50%) e calcula a taxa de escape e o alarme falso (seção 2).
- Lista os trechos que escaparam e as marcações sem par.

**4. Quando refazer a auditoria.** Só quando mudar o que gera o texto: `_regras.md`, `_estilo.md`, `editar.md`, `exemplos/`, o modelo do editor ou o provedor base. O relatório avisa quando o hash do texto novo difere do auditado.

### 4.11 Relatório (`lab/relatorio.md`, seções em ordem fixa)

1. **Veredito.** 3 linhas:
   - o provedor vencedor e a margem;
   - a fidelidade: canários, taxa de escape e alarme falso, ou "auditoria pendente";
   - o custo por livro em relação aos R$ 30.

   No topo também aparecem, quando for o caso, a faixa **SIMULADO (LAB_FAKE)**, o selo **PROVISÓRIO** (enquanto houver preço não confirmado) e a duração total dos áudios.
2. **Transcrição.** As 3 transcrições lado a lado por arquivo, em colunas, com o falante. Tabela por provedor: nomes exatos e quase-nomes (com a minutagem), número de falantes detectados, tempo e custo.
3. **Divisão em histórias.** Só com `--lote`: a divisão proposta, os segmentos não usados e os erros de validação.
4. **Histórias.** Os 3 tamanhos de cada uma. Para cada tamanho: palavras em relação à meta, cobertura, o texto com as marcações em **negrito** seguidas de `⚠ tipo · origem · motivo`.
5. **Perguntas ao autor.**
6. **Canários.** Tabela: tipo, história, pego ou escapou, por qual origem. Os escapes vêm detalhados como em 4.9.
7. **Custo e tempo por etapa.** Tokens de entrada, de saída e de cache lido, R$, segundos e tempo até a primeira palavra em relação à meta de 60 s.
8. **Custo projetado por livro.** A fórmula, com valores do `config` rotulados como premissa:
   ```
   custo_livro = HISTORIAS_POR_LIVRO × (
       MIN_AUDIO_POR_HISTORIA × preço_min_provedor_vencedor
     + custo_medido_estruturar_por_min × MIN_AUDIO_POR_HISTORIA
     + custo_medido_editar_medio_por_min × MIN_AUDIO_POR_HISTORIA × (1 + TROCAS_TAMANHO_POR_HISTORIA)
     + custo_medido_verificar_por_min × MIN_AUDIO_POR_HISTORIA × (1 + TROCAS_TAMANHO_POR_HISTORIA)
     + REVISOES_TRECHO_POR_HISTORIA × FRACAO_CUSTO_REVISAO × custo_editar_medio_por_historia )
     + custo_me_conte_sobre_ele (estimado: 1 chamada Opus de 5 min de áudio)
   ```
   Valores iniciais:

   | Premissa | Valor |
   | --- | --- |
   | Histórias por livro | 25 |
   | Minutos de áudio por história | 6 |
   | Trocas de tamanho por história | 2 |
   | Revisões de trecho por história | 3 |
   | Fração de custo de uma revisão | 0,1 |

   Os números são estimativas para um livro de 80 páginas com cerca de 3 páginas por história, e o Guilherme ajusta no `config`.
9. **Ficha de avaliação** (modelo em `avaliacao/ficha-avaliacao.md`). O Guilherme preenche à mão, por história: voz, condução, limpeza e perguntas (de 1 a 5), mais uma linha "por quê" e as falhas pela taxonomia.
10. **Rodapé.** Commit, se havia alterações não salvas, modelos usados e semente.

### 4.12 PDF de amostra (`--amostra <historia>`)

- 1 página no tamanho `FORMATO_LIVRO` (21×21 cm), com sangria `SANGRIA_MM`.
- Leva título, texto médio sem canário e um QR de 2 cm com o caminho do arquivo de áudio.
- `pdf-lib` com Times-Roman (fonte padrão, com acentos do português).
- É descartável: o motor oficial sai no prompt 10.
- Serve de plano B da página do dia 26 (PRD, linha 401).

## 5. Sistema de qualidade (engenharia de contexto)

### 5.1 Camadas do prompt de edição

Da mais estável para a mais variável: as camadas fixas vêm primeiro, para o cache reaproveitar.

| # | Camada | Arquivo | Muda quando |
| --- | --- | --- | --- |
| 1 | Regras invioláveis | `lib/ai/prompts/_regras.md` | Raramente |
| 2 | Guia de estilo | `lib/ai/prompts/_estilo.md` | A cada ajuste de estilo |
| 3 | Exemplos | `lib/ai/prompts/exemplos/*.json` | Quando entra uma correção do Guilherme |
| 4 | Contexto do livro | `lab/glossario.json` | Por livro |
| 5 | A história | segmentos com papel do falante, vazios marcados e tamanho pedido | Por chamada |

- **`_regras.md`:**
  - A fidelidade vence o estilo.
  - Tudo que não está no áudio é invenção.
  - Conectores de tempo e ordem ("depois", "então", "naquela época") são permitidos. Conectores de causa e palavras de emoção só entram se o autor disse.
  - Na dúvida, o modelo cria uma lacuna em vez de preencher.
  - O texto vai em 1ª pessoa.
  - No modo conversa, as perguntas do entrevistador são absorvidas na narrativa.
  - O modelo reordena só o necessário para seguir a cronologia.
- **`_estilo.md`:**
  - Descreve o estilo bom: uma abertura que situa com material do áudio, uma sequência clara e um fecho com uma fala do próprio autor.
  - Preserva expressões e regionalismos. Tira vícios, repetições e falsos começos.
  - Traz minipares curtos "slop × bom", escritos pelo Guilherme.
  - A lista de frases proibidas **não** vai para o prompt, porque citá-las pode induzir o modelo a usá-las.
- **`_anti-slop.md`** tem 2 seções:
  - **automática:** uma frase ou regex por linha, que a checagem procura;
  - **heurística:** tríade de adjetivos, "não era só X, era Y", moral no fim e outros padrões que exigem leitura. Vai para a ficha humana e, no futuro, para o juiz.
- **`_conectores.md`:** seções *causa* e *emoção*, um item por linha.
- **Exemplos:**
  - A versão 0 roda **sem exemplos**.
  - As correções do Guilherme sobre a versão média viram pares `{ entrada: segmentos, saida: texto corrigido, porque: "..." }`.
  - Antes de entrar no git, cada par passa por **anonimização revisada à mão**: nomes, lugares, datas e episódios identificáveis são trocados.
  - O par só entra com o **consentimento da família para reuso**, que é separado do consentimento da rodada.
  - Um par usado como exemplo sai do conjunto avaliado.

**Montagem.** Os prompts por etapa (`estruturar.md`, `dividir-lote.md`, `editar.md`, `verificar.md`) usam `{{nome}}` para valores e `{{> _regras}}` para incluir os arquivos compartilhados. `carregar-prompt.ts` recebe o diretório-base como argumento, para os `.md` chegarem ao Vercel e ao Trigger.dev no prompt 6. O Prettier ignora `*.md`, o que preserva o texto byte a byte.

### 5.2 Avaliação (`avaliacao/`, fora do código de produção)

- **`rubrica.md`:**
  - Portão de fidelidade: qualquer trecho confirmado na auditoria reprova.
  - Portão anti-slop: a seção automática tem que zerar.
  - Notas de 1 a 5, com descrição do 1, do 3 e do 5: voz preservada, condução, limpeza e perguntas úteis.
- **`taxonomia.md`:** invenção (por tipo da lista única), voz perdida, slop, ordem trocada, ponto-chave cortado e erro de transcrição.
- **`ficha-avaliacao.md`:** modelo da ficha que o relatório inclui.
- **`julgar.md` e `README.md`:** andaime do juiz de IA, com os gatilhos da seção 3. O rascunho de texto-padrão feito por ele só vale depois de revisão humana.

### 5.3 Ciclo de ajuste

1. Mudar **uma coisa** num `.md`.
2. Rodar o comando certo:

   | Ajuste em | Comando |
   | --- | --- |
   | Verificação | `--medir-auditoria` (sem custo de edição) |
   | Edição | `npm run lab` (a transcrição vem do cache) |
3. Ler o veredito, as marcações e a ficha. Classificar as falhas pela taxonomia.
4. Manter a mudança se melhorou sem perder fidelidade. Se não, `git checkout` no arquivo.
5. Escrever no commit o que mudou e o efeito medido.

A falha mais frequente decide a próxima mudança.

## 6. Arquivos

### No git

```
lib/ai/   (sem ffmpeg, sem disco, sem server-only; não importa de scripts/ nem lab/)
  schemas.ts  carregar-prompt.ts  segmentar.ts  claude.ts  checagens.ts  nomes.ts  custo.ts
  transcricao/{elevenlabs,assemblyai,deepgram,index}.ts
  prompts/_regras.md _estilo.md _anti-slop.md _conectores.md
          estruturar.md dividir-lote.md editar.md verificar.md exemplos/README.md
  __fixtures__/  (respostas sintéticas dos provedores)   *.test.ts ao lado de cada módulo
avaliacao/  rubrica.md taxonomia.md ficha-avaliacao.md julgar.md README.md
scripts/lab/  index.ts opcoes.ts audio.ts cache.ts pipeline.ts relatorio.ts canarios.ts
              auditoria.ts amostra-pdf.ts fakes.ts   *.test.ts
lab/README.md  lab/glossario.exemplo.json
lib/config.ts  lib/config.test.ts  package.json  .gitignore  .env.example
```

### Privado

O `.gitignore` recebe:
```
/lab/*
!/lab/README.md
!/lab/glossario.exemplo.json
```

Ficam fora do git: `audios/`, `glossario.json`, `auditoria/`, `relatorio.md`, `amostra.pdf` e `.cache/`.

### `lab/glossario.json` (schema zod em `schemas.ts`)

```json
{
  "autor": { "nome": "Jair", "apelido": "Vô Jair" },
  "sobre": "texto livre sobre o autor",
  "pessoas": [{ "nome": "Maria", "apelidos": ["Lia"], "relacao": "esposa" }],
  "lugares": [{ "nome": "Guarapari", "apelidos": [] }],
  "consentimento": { "familia": "nome do responsável", "data": "2026-11-12", "reusoComoExemplo": false }
}
```

**Sem `consentimento`, o lab recusa a rodada real** e só roda o modo simulado.

### Cache (`lab/.cache/`)

- **Só a transcrição** é cacheada, porque é a etapa lenta e paga por minuto.
- A chave é o sha256 do áudio + provedor + modelo + hash das dicas. O cache guarda `{ bruto, transcricao }`.
- `--sem-cache` ignora o cache e grava de novo.
- As etapas do Claude não são cacheadas: rodar de novo gera texto novo. A auditoria usa o texto congelado no próprio arquivo (4.10).

### `lib/config.ts` (nova seção IA, só constantes)

| Grupo | Constantes |
| --- | --- |
| Modelos | `MODELO_RAPIDO = 'claude-haiku-5-5'`, `MODELO_CAPAZ = 'claude-opus-5-5'`, `MODELO_ALTERNATIVO = 'claude-sonnet-5-5'` |
| Preços por milhão de tokens (US$) | Haiku 0,10 entrada / 0,50 saída; Opus 4 / 20, cache lido 0,20; Sonnet 2 / 10 |
| Preço por minuto (US$) | Por provedor, com o comentário "NÃO CONFIRMADO" e `PRECOS_PROVEDORES_CONFIRMADOS = false` |
| Câmbio | `COTACAO_USD_BRL` |
| Modelos de transcrição | `MODELOS_TRANSCRICAO` |
| Tamanhos | `TAMANHOS_TEXTO = { resumido: 0.3, medio: 0.6, detalhado: 0.9 }`, `TOLERANCIA_TAMANHO = 0.1` |
| Segmentação | `PAUSA_SEGMENTO_S = 1.5`, `MAX_PALAVRAS_SEGMENTO = 40` |
| Metas | `META_PRIMEIRAS_PALAVRAS_S = 60`, `META_CUSTO_LIVRO_BRL = 30`, `META_ALARME_FALSO = 0.3` |
| Premissas | As 5 premissas do livro (4.11) |
| Limites do lab | `MAX_MIN_LOTE = 60` |

Cada constante nova ganha um teste em `lib/config.test.ts`.

### Comando e dependências

`"lab": "node --env-file-if-exists=.env.local --import tsx scripts/lab/index.ts"` (Node 22).

| Pacote | Tipo | Uso |
| --- | --- | --- |
| `@anthropic-ai/sdk` | dependência | `claude.ts` (reaproveitado no prompt 6) |
| `tsx` | desenvolvimento | roda o TypeScript do lab |
| `ffmpeg-static` | desenvolvimento | normalizar o áudio |
| `pdf-lib`, `qrcode`, `@types/qrcode` | desenvolvimento | PDF de amostra |

Os provedores são chamados com `fetch` direto, sem SDK. As versões são as mais recentes no `npm install`, travadas pelo `package-lock`.

O `.env.example` ganha `ELEVENLABS_API_KEY`, `ASSEMBLYAI_API_KEY`, `DEEPGRAM_API_KEY`, `LAB_PROVEDORES` e `LAB_CONCORRENCIA`.

**Flags:** `--lote`, `--canario`, `--semente N`, `--historia X`, `--tamanhos medio`, `--verificar-todos`, `--verificador-rapido`, `--auditar a,b`, `--medir-auditoria`, `--amostra X`, `--provedores` e `--sem-cache`.

### Contrato com o Claude (`lib/ai/claude.ts`)

```ts
type Etapa = 'estruturar' | 'dividir' | 'editar' | 'verificar';
type ChamadaIA<T> = {
  etapa: Etapa; modelo: string; maxTokens: number;
  sistemaFixo: string;          // camadas 1–3, com cache_control
  sistemaLivro?: string;        // camada 4, com cache_control
  usuario: string;              // camada 5
  schema: z.ZodType<T>;
  aoPrimeiraPalavra?: () => void;
};
type Uso = { entrada: number; saida: number; cacheLido: number; cacheGravado: number };
type RespostaIA<T> = { dados: T; uso: Uso; ms: number; msPrimeiraPalavra: number | null; idRequisicao: string | null };
interface ClienteIA { gerar<T>(c: ChamadaIA<T>): Promise<RespostaIA<T>> }
```

- **Implementação real:**
  - Usa `client.messages.stream` com saída estruturada (`output_config.format` com o JSON Schema gerado por `z.toJSONSchema` do zod 4). O texto final é validado com `schema.parse`.
  - A detecção da primeira palavra usa os deltas de texto (4.6).
  - O SDK faz 2 novas tentativas para os erros 429 e 5xx. O lab faz +1 tentativa quando a validação do zod falha.
  - Antes de usar, conferir na documentação do SDK instalado: o formato exato do `output_config`, as restrições de JSON Schema aceitas e o pensamento adaptativo (o Opus 5.5 não aceita desligá-lo; usar `effort` médio para editar e verificar).
- **Implementação simulada (`scripts/lab/fakes.ts`):** gera respostas determinísticas a partir dos segmentos. Ela permite um modo "verificador cego", que não marca nada, e um modo "verificador paranoico", que marca tudo, usados nos testes.

## 7. Privacidade

- Os áudios vão para os 3 provedores de transcrição e para a Anthropic, provavelmente processados nos EUA.
- **Antes da rodada real**, o `lab/README.md` traz o checklist:
  - ligar, em cada provedor, a retenção zero ou o apagamento depois do processamento, e o não uso para treino, onde houver;
  - consentimento das famílias registrado em `glossario.json`, sem o qual o lab não roda.
- O reuso como exemplo exige consentimento separado (`reusoComoExemplo`) e anonimização revisada à mão.
- Tudo o que o lab grava fica na máquina do Guilherme e fora do git.
- Os logs nunca levam chave nem texto da família.
- Os fixtures dos testes são sintéticos.

## 8. Testes (Vitest, sem chamar API)

| Arquivo | O que prova |
| --- | --- |
| `lib/ai/transcricao/*.test.ts` | Os normalizadores dos 3 provedores convertem um JSON sintético em `Palavra[]` (segundos, falante, confiança) |
| `lib/ai/segmentar.test.ts` | Troca de falante, pausa, máximo de palavras, ids contínuos e falante qualificado pelo arquivo |
| `lib/ai/nomes.test.ts` | Nome exato e quase-nome |
| `lib/ai/checagens.test.ts` | Cada uma das 5 checagens, com casos positivos e negativos, incluindo número por extenso e citação aproximada |
| `lib/ai/custo.test.ts` | Tokens e minutos convertidos em reais, e a fórmula do livro |
| `lib/ai/carregar-prompt.test.ts` | Inclusões `{{> }}`, valores `{{ }}` e erro em marcador sem valor |
| `scripts/lab/canarios.test.ts` | Os modelos inserem dentro da frase, a semente repete igual, e "pego" e "escapou" seguem a sobreposição |
| `scripts/lab/auditoria.test.ts` | Leitura de `[[ ]]`, cálculo da taxa de escape e do alarme falso, "sem evidência" com zero marcas e aviso de hash diferente |
| `scripts/lab/pipeline.test.ts` | Ponta a ponta com fakes. Verificador cego: o relatório abre com FALHA. Verificador paranoico: alarme falso alto. Falha de 1 provedor: relatório parcial. Sem consentimento: recusa a rodada real. |
| `scripts/lab/relatorio.test.ts` | Ordem das seções, veredito, faixa SIMULADO e selo PROVISÓRIO |
| `lib/config.test.ts` | As constantes novas |

Gate de fim de tarefa: `npm run build`, `lint`, `test` e `format`. Não há tela, então não há gate de design.

## 9. Alternativas consideradas

| Escolha | Alternativa rejeitada | Por quê |
| --- | --- | --- |
| Opus 5.5 edita | Sonnet 5.5 | Qualidade de texto é a pergunta do lab: começar pelo melhor e descer só se a auditoria e a ficha mostrarem que o Sonnet mantém o nível. Fica como alavanca de custo. |
| Verificação às cegas, só do que tem problema | Avaliar afirmação por afirmação, com todas na saída | O verificador escreveria mais que o editor, o que pesa em custo e tempo. A saída só com problemas é o formato que o prompt 6 também vai usar. |
| Verificação às cegas | Verificar só os segmentos citados pelo editor | Herdaria o erro de citação do editor e deixaria de ser independente. |
| Citações curtas por parágrafo | Lista completa de afirmações com citação | Dobraria a saída do editor e pioraria a primeira palavra. A citação curta já permite a checagem determinística. |
| Canários por modelo fixo | Canários escritos pela IA | Sem custo e repetíveis. Se o lab escrevesse os canários com IA, ele estaria testando um modelo com outro modelo. |
| Auditoria do texto congelado | Cache das etapas do Claude | Mais simples: a auditoria não fica velha quando só a verificação muda. |
| Nomes exatos e quase-nomes | WER contra um minuto corrigido à mão | Com cerca de 700 palavras, o WER é ruído. Nomes certos importam mais num livro de família. |
| `--lote` com validação | Lote sintético emendando áudios | Daria nota otimista (vozes diferentes facilitam a separação). O teste real fica para o prompt 7. |
| pdf-lib | Typst agora | Typst é decisão do prompt 10. A amostra do lab é descartável. |
| Base no 1º provedor | Base no provedor vencedor | O vencedor só se conhece depois da rodada. Basta trocar a ordem para refazer com ele. |
| Uma chamada para o lote | Agrupar por arquivo e depois juntar | 5 a 8 arquivos cabem numa chamada. O fatiamento fica para o prompt 7. |

## 10. Desvios do PRD

| PRD | Aqui | Por quê |
| --- | --- | --- |
| `lab/contexto.json` | `lab/glossario.json` com `sobre` e `consentimento` | Pedido do Guilherme, mais o controle de consentimento |
| `lab/exemplos/` | `lib/ai/prompts/exemplos/`, no git e anonimizado | Precisa chegar à produção |
| 5 a 10 pares da tia Caia antes do prompt 1 | 0 pares; as correções do Guilherme viram os primeiros | Ainda não existem |
| Critério: fidelidade e voz ≥ 4 | Mais condução ≥ 4, anti-slop zerado e auditoria | Pedido de "história marcante sem slop" |
| Marcação por parágrafo | Marcação por trecho, com posição | "Inventado" inclui emoção, juízo e causa, e a auditoria precisa casar trechos |
| Aceite "nenhum fato inventado sem marcação" | Taxa de escape medida contra a auditoria humana | Não dá para provar com 5 casos |
| Conjunto de testes de 5 a 10 histórias | Meta de 15 a 20 antes do 1º cliente | 5 casos é teste de fumaça |
| Avaliador automático de 1 a 5 | Ficha humana agora; juiz de IA com gatilho | O juiz precisa ser calibrado contra notas humanas que ainda não existem |

## 11. Riscos

- **Excesso de marcações** no resumido, por causa da regra de conectores. Mitigação: o alarme falso é medido e o `_conectores.md` é ajustado. Conectores de tempo continuam permitidos.
- **Tempo de 10 minutos.** Estimativa para 5 áudios de cerca de 5 min (25 min de áudio, cerca de 3.750 palavras):

  | Etapa | Estimativa |
  | --- | --- |
  | Transcrição, em paralelo | 1–2 min |
  | Estruturação (Haiku) | < 30 s |
  | 15 edições, 4 por vez, cerca de 1–2,5 mil tokens de saída cada | ~4 min |
  | 5 verificações | ~1 min |
  | **Total** | **~7 min** |

  Alavanca: `--tamanhos medio`. São estimativas: o relatório mede o tempo real.
- **Provedores com API diferente da premissa.** A resposta bruta fica guardada e o erro aponta onde corrigir. Os fixtures são regravados.
- **Mesma família de modelo editando e verificando.** Mitigação: verificação às cegas, checagens sem IA e auditoria humana.
- **Limite de taxa da conta Anthropic.** Concorrência configurável (`LAB_CONCORRENCIA`).

## 12. Perguntas em aberto

1. Quais são os preços atuais por minuto dos 3 provedores? O Guilherme confere antes da rodada real; até lá, o veredito de custo sai "PROVISÓRIO".
2. A tia Caia entra quando? Ela valida o texto-padrão a partir de 15 casos.
3. O Haiku basta como verificador? A resposta sai da auditoria (`--medir-auditoria --verificador-rapido`).

## 13. Fases de construção

Cada fase termina com `build`, `lint` e `test` verdes e um commit.

| Fase | Entrega |
| --- | --- |
| 1. Núcleo | `config` (seção IA), `schemas`, `carregar-prompt`, `segmentar`, `checagens`, `nomes`, `custo`, os prompts `.md`, `avaliacao/` e os testes |
| 2. Transcrição | Os 3 adaptadores com fixtures, `audio.ts`, cache e opções do comando |
| 3. Claude | `claude.ts` (`ClienteIA` real e simulado), estruturar, `--lote`, editar em streaming, verificar e o pipeline com fakes |
| 4. Saídas | Canários, auditoria, relatório, PDF, `lab/README.md` (checklist da 1ª rodada e glossário de termos) e a rodada `LAB_FAKE=1` de ponta a ponta |

## 14. Entrega para os próximos prompts

| Prompt | Reaproveita |
| --- | --- |
| 4 (Me conte sobre ele) | `claude.ts`, `carregar-prompt.ts`, `schemas.ts` e o padrão de prompt `.md` |
| 6 (Pipeline ao vivo) | Todo o `lib/ai/`, com o provedor vencedor e os prompts. O `ClienteIA` em streaming alimenta o Realtime. Os ids de segmento inteiros vão para o banco. |
| 7 (Upload em lote) | `dividir-lote.md` e a validação da divisão |
| 9 (IA sob controle) | `editar.md` (tamanhos), `verificar.md` e as checagens. As lacunas viram perguntas com origem IA. |
| 10 (Página de amostra) | Comparação com o PDF do lab |
