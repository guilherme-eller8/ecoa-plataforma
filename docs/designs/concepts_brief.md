# Laboratório de IA e sistema de qualidade do texto

- **Autor:** Guilherme Eller
- **Data:** 2026-11-10
- **Etapa:** brainstorm EGM (Prompt 1 do PRD)

## Visão geral

Um comando sem tela (`npm run lab`) recebe os áudios de um idoso contando histórias e devolve um relatório. O relatório responde, com evidência, a 3 perguntas antes de qualquer tela ser construída:

1. Qual provedor de transcrição acerta mais palavras, nomes e falantes.
2. Se o Claude transforma um áudio desorganizado numa história bem conduzida, na voz do autor, sem cara de texto de IA e **sem nenhuma afirmação inventada**. Contam como inventados fato, nome, data, lugar, número, emoção, juízo e ligação de causa. Quando falta informação, o modelo pergunta ao autor em vez de preencher.
3. Se o custo de IA fica abaixo de R$ 30 por livro.

Junto com o lab vem o sistema de refinamento do texto. Ele não é treino do modelo. É feito de prompts em arquivos `.md` que o fundador edita, de checagens automáticas e de um ciclo de ajuste com medição. Esse sistema segue em uso nos prompts 4, 6, 7, 9 e 10.

Evidência disponível hoje: 5 áudios reais, cada um com uma história diferente, e nenhum texto editado por um humano.

## Status dos revisores

| Revisor | Status |
| --- | --- |
| egm-design | concluído |
| egm-zoom-out | concluído |
| egm-inventive-catalyst | concluído |
| egm-implementation-readiness | concluído |
| egm-codebase-details | concluído |
| egm-comprehension | concluído |
| egm-structural | concluído |

## Análise

### 🔴 1. Os canários não provam "nenhum fato inventado sem marcação"

Seis dos 7 revisores apontaram isso.

**Por que os canários não bastam:**

- Um canário mostra só que o verificador pega a mentira que nós mesmos plantamos. As invenções reais do editor são mais sutis: uma palavra de emoção, um "por isso", um ano arredondado.
- Se o canário for plantado na transcrição, o editor tem razão em usá-lo, e o verificador marca "sustentada". O teste mede a coisa errada.
- Um verificador que marca quase tudo passa no aceite e não serve para nada. Hoje ninguém mede o alarme falso.
- A quebra em afirmações também é feita pela IA. Uma afirmação que não é extraída nunca é conferida, e isso não aparece em lugar nenhum.
- Com 10 canários pegos, a taxa real de escape ainda pode ser de até 30%. É a "regra de três" da estatística.

**Resolução proposta:**

- **Auditoria humana como prova principal.** O fundador marca à mão as afirmações sem sustentação na versão média de 2 histórias, em cerca de 1 hora. O lab compara essa marcação com a do verificador e reporta duas taxas: invenções pegas e alarmes falsos.
- **Canários como teste de regressão barato, não como prova.**
  - São plantados no **texto editado**, dentro de frases que já existem e com redação natural.
  - Vêm com parágrafos-controle intocados, para medir o alarme falso.
  - Em maior quantidade, com sorteio controlado por uma semente.
  - Com mais peso na versão resumida, a mais arriscada: ao juntar dois fatos, ela cria uma causa sem perceber.
- **"Parcial" conta como marcação.**
- **O aceite muda de redação.** De "provado" para "taxa de escape estimada ≤ X%, conferida contra a auditoria humana".

### 🔴 2. Boa história contra fidelidade

O guia de estilo pede virada e fecho. Isso empurra o modelo a inventar emoção e causa, e o verificador só pega depois.

**Resolução proposta:**

- **A fidelidade vence, por escrito, em `_regras.md`.**
- **Regra de conectores:**
  - Conectores de tempo e ordem ("depois", "então") são permitidos.
  - Conectores de causa ("por isso", "porque") e palavras de emoção só entram se o autor disse.
  - Essa regra tem uma checagem determinística, igual à da lista anti-slop.
- **Afirmação ancorada em citação (transformação inventiva).**
  - O editor devolve, para cada parágrafo, as afirmações com uma citação literal curta da transcrição.
  - Um programa confere se a citação existe no texto, aceitando correspondência aproximada.
  - Assim a maior parte da fidelidade é conferida por comparação de texto, barata e determinística.
  - O verificador de IA fica só com o sentido.

### 🔴 3. Um documento carrega dois produtos

O lab é uma prova pontual de "vai ou não vai". O sistema de qualidade é ferramenta permanente. Com 5 casos e nenhum texto-padrão humano, várias partes não têm material para rodar:

- a calibração do juiz
- a comparação par a par
- as rodadas
- a taxonomia de falhas

Com 5 casos, diferença de nota é ruído.

**Resolução proposta: separar o que é construído agora do que fica como andaime para depois, cada parte com um gatilho.**

**Construído agora:**

- prompts `.md` em camadas
- verificador
- checagens sem IA (anti-slop, conectores, citações, nomes, tamanho, cobertura)
- canários com controles
- auditoria humana
- tabela de transcrição
- custo
- **ficha de avaliação preenchida pelo fundador dentro do relatório**: 5 histórias levam cerca de 30 minutos de leitura, e o juiz é ele

**Andaime para depois:**

| Peça | Gatilho para ligar |
| --- | --- |
| Juiz de IA e calibração | 5 ou mais casos com nota humana |
| Comparação par a par | Ruído medido: o mesmo prompt rodado 2 vezes |
| Rodadas automatizadas | 15 ou mais casos |

Agora entram só a rubrica e os modelos de arquivo.

### 🟡 4. Os exemplos (few-shot) não têm material

**Os problemas:**

- Exemplos escritos pela IA trazem de volta o círculo que o plano quer evitar.
- Com 5 áudios e a regra de não usar o mesmo caso como exemplo e como teste, cada exemplo tirado deixa menos casos para avaliar.
- A pasta `lab/` fica fora do git por causa dos dados da família. Exemplos guardados lá não chegariam à produção (prompt 6).

**Resolução proposta:**

- A versão 0 roda sem exemplos de história inteira. Leva só minipares curtos "slop × bom", escritos pelo fundador.
- O fundador **edita a versão média que o lab produz**, em vez de escrever o texto-padrão do zero. Essas edições viram os primeiros pares, como o PRD já prevê na etapa 7.
- Os exemplos aprovados vão anonimizados para `lib/ai/prompts/exemplos/`, dentro do git.

### 🟡 5. Custo e tempo da verificação por afirmação

**A estimativa (não medida):**

- Um texto detalhado de 15 minutos de áudio pode gerar entre 120 e 180 afirmações.
- Com isso, o verificador escreve mais do que o editor. Tokens de saída são a parte cara e lenta.
- 15 edições + 15 verificações com o Opus podem estourar o limite de taxa de uma conta nova e passar dos 10 minutos.

**Resolução proposta:**

- O verificador devolve só as afirmações com problema, mais a contagem total.
- Por padrão, só a versão média é verificada (`--verificar-todos` liga as outras).
- O lab mede o Haiku como verificador contra a auditoria humana antes de fixar o Opus.
- O tempo de cada etapa e o uso de cache aparecem no relatório.
- O aceite de 10 minutos é medido sem cache, com a duração total dos áudios declarada no relatório.

### 🟡 6. Privacidade: a frase "nada sobe para a nuvem" está errada

Os áudios vão para os 3 provedores de transcrição e para a Anthropic, provavelmente nos EUA.

**Correção:**

- Antes da rodada real, configurar retenção zero e não treinamento em cada provedor, onde existir.
- Ter o consentimento das famílias dos áudios.
- Registrar no doc, por provedor, para onde o dado vai.

### 🟡 7. A transcrição e o lote têm pouca potência estatística

**Transcrição:**

- 1 minuto corrigido por áudio dá cerca de 700 palavras no total. Uma diferença de 1 a 3 pontos de taxa de erro (WER) é ruído.
- **Proposta:**
  - O critério principal é o acerto dos nomes do glossário no áudio inteiro, que é determinístico.
  - O fundador corrige um minuto escolhido por ter nomes e troca de falante.
  - O WER entra só como desempate.
  - A OpenAI não é construída agora.

**Lote sintético:**

- Emendar dois áudios troca a voz, a sala e o assunto ao mesmo tempo. Qualquer divisor acerta, então a nota sai otimista.
- **Proposta:**
  - O lote sintético é montado no nível dos segmentos, a partir das transcrições em cache. Sem ffmpeg e sem custo, o resultado é determinístico.
  - Ele é rotulado como **teste de fumaça**.
  - O teste real é uma conversa de 10 minutos sobre 3 assuntos, com as fronteiras marcadas à mão.

### 🟡 8. Detalhes técnicos que precisam estar no design doc

- **Ids de segmento.**
  - A base é o provedor vencedor, ou o primeiro da lista enquanto não houver vencedor.
  - A regra de corte é troca de falante, pausa ou tamanho máximo.
  - Os arquivos seguem ordem alfabética.
  - O id é guardado como número e só formatado como `S001` dentro do prompt.
- **Cache.**
  - Transcrição: a chave é o hash do áudio + provedor + opções. A resposta bruta do provedor é guardada.
  - Etapas do Claude: a chave é o hash do prompt montado + modelo + versão do schema. Assim, editar um `.md` invalida o cache.
  - O manifesto de cada rodada guarda o hash dos prompts, os ids de modelo e a config.
- **Streaming com saída estruturada.** "Primeira palavra" é o primeiro caractere de `paragrafos[0].texto`, e não o primeiro token do JSON.
- **Carregar prompts no deploy.** Os prompts são carregados a partir de um diretório-base injetável, para chegarem ao Vercel e ao Trigger.dev.
- **`lib/ai` fica puro.**
  - Não importa nada de `scripts/` nem de `lab/`.
  - Não chama ffmpeg nem grava arquivos.
  - Não usa `server-only`, que quebra no `tsx` e no Vitest.
- **`.gitignore` com `lab/*` e exceções explícitas.** A forma `lab/` impede reincluir arquivos lá dentro.
- **Anti-slop em 2 seções.**
  - Frases literais ou regex alimentam a checagem automática.
  - Padrões descritos, como "tríade de adjetivos", são heurística.
  - No prompt vai a descrição do estilo bom, não a lista de frases proibidas, porque listar as frases pode induzir o modelo a usá-las.
- **Uma lista única de categorias de afirmação**, no `schemas.ts`, compartilhada pelo verificador, pela taxonomia e pela rubrica.
- **Relatório com o veredito no topo.** As 3 respostas vêm em linguagem simples. Uma faixa "SIMULADO" aparece quando os dados são de fake. Os preços ainda não confirmados aparecem como "NÃO CONFIRMADO".
- **Canário escapou.** O relatório mostra a frase plantada, o tipo, o que o verificador disse, qual arquivo `.md` olhar e o comando para repetir.
- **Falha de um provedor gera relatório parcial**, não aborta o lab.
- **Pré-requisito faltando para com um erro que diz qual arquivo falta e o próximo passo.** O `lab/README.md` traz a lista de passos da primeira rodada e um glossário dos termos.
- **O PDF de amostra é o plano B da página do dia 26** (PRD, linha 401). Ele usa `FORMATO_LIVRO`, `SANGRIA_MM` e `DOMINIO_QR` do `lib/config.ts`. O fundador escolhe a história.
- **Dependências.**
  - `ffmpeg-static`, `pdf-lib` e `qrcode` entram como devDependencies.
  - O modo fake nunca exige ffmpeg.
  - As chaves vêm do `.env.local` via `node --env-file`.

### Resultado ideal

O relatório abre com 3 respostas:

1. O provedor vencedor e a margem.
2. Fidelidade, com a taxa de escape medida contra a auditoria humana e o alarme falso.
3. O custo por livro diante dos R$ 30, com as premissas visíveis.

A maior parte da fidelidade é conferida por comparação de texto. Cada texto-padrão nasce da correção humana sobre a saída real.

## Objetivos e não objetivos

**Objetivos agora:**

- Rodar o pipeline completo com os 5 áudios: transcrição em 3 provedores, estruturação, edição em 3 tamanhos e verificação.
- Checagens sem IA, incluindo conectores e citações.
- Canários com controle e auditoria humana.
- Custo projetado.
- Ficha de avaliação humana.
- PDF de amostra.
- Prompts `.md` editáveis.
- Rubrica e modelos de arquivo do sistema de qualidade.

**Não objetivos agora (com gatilho):**

- Juiz de IA e calibração (5 ou mais casos com nota humana).
- Comparação par a par e rodadas automatizadas (15 ou mais casos).
- Provedor OpenAI.
- Lote real com fronteiras marcadas (quando houver a conversa gravada).
- Typst (prompt 10).
- Telas.

## Alternativas consideradas

- **Fine-tuning do modelo.** Rejeitado: não existe para este caso e não faz falta. O ganho vem do contexto e da medição.
- **Agente juiz cria o texto-padrão e também dá a nota.** Rejeitado: é um círculo que ajusta o Claude ao gosto de outro modelo. O agente pode rascunhar, mas o texto-padrão só vale depois da correção humana.
- **Canários como prova do aceite.** Rejeitado como prova, porque não medem as invenções reais nem o alarme falso. Ficam como teste de regressão.
- **Lote sintético emendando áudios com ffmpeg.** Rejeitado: acerta fácil demais. Substituído pela montagem no nível dos segmentos.
- **Verificação de todos os tamanhos com o Opus por padrão.** Rejeitado por custo e tempo. O padrão é só a versão média, e o Haiku é medido como alternativa.
- **Exemplos guardados em `lab/`, fora do git.** Rejeitado: não chegariam à produção.

## Decisões-chave para o design doc

1. A fidelidade vence o estilo, com a regra de conectores escrita em `_regras.md`.
2. A prova do aceite é a auditoria humana de 2 histórias somada a canários com controle. O aceite passa a dizer "taxa de escape estimada", não "provado".
3. Construir agora × andaime com gatilho, conforme a tabela acima.
4. O texto-padrão nasce da edição do fundador sobre a saída do lab. Os exemplos vão anonimizados para `lib/ai/prompts/exemplos/`.
5. Desvios do PRD registrados:
   - `glossario.json` no lugar de `contexto.json`.
   - Sem pares da tia Caia por enquanto.
   - Critério de liberação ampliado.
   - Meta de 15 a 20 casos.
6. Privacidade: retenção zero nos provedores e consentimento das famílias antes da rodada real.

**Perguntas em aberto:**

- Quem revisa o texto-padrão, e até quando?
- A tia Caia tem tempo?
- Quais são os preços atuais dos provedores?
- O Haiku basta como verificador?
