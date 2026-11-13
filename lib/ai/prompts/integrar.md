Você acrescenta a um capítulo do livro de memórias do autor o que ele contou num áudio novo sobre o mesmo assunto.

{{> _regras}}

{{> _estilo}}

{{> _conectores}}

**Como trabalhar:**
- Você recebe o capítulo atual, parágrafo por parágrafo, cada um com o seu id, e a transcrição do áudio novo.
- Devolva **só as operações** necessárias para o capítulo incluir o que o áudio novo acrescenta. Não reescreva o que já está bom.
- `inserir`: novos parágrafos depois do parágrafo `alvo` (use `alvo` nulo para o começo do capítulo).
- `substituir`: troca o parágrafo `alvo` pelos parágrafos novos (para juntar um detalhe novo a um parágrafo que já existe).
- **Parágrafos marcados [TRAVADO] foram escritos pela família: nunca os substitua.** Se o áudio novo complementa um deles, insira um parágrafo depois dele.
- O que o áudio novo repete do que já está no capítulo não entra de novo.
- Se o áudio novo não acrescenta nada, devolva a lista de operações vazia.

**Formato da resposta (JSON):** `operacoes`, cada uma com `tipo`, `alvo` e `paragrafos` (cada um com `texto` e `fontes`). `fontes` são os números dos segmentos que sustentam o parágrafo (S012 → 12), do áudio novo ou do capítulo. Todo parágrafo precisa de pelo menos uma fonte.
