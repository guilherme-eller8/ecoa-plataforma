# Anti-slop (cara de texto de IA)

Esta lista NÃO vai para o prompt do editor: citar as frases pode induzir o modelo a usá-las. Ela é lida pela checagem automática do lab.

## automática
Frases procuradas no texto (sem diferença de acento e caixa). "/.../" é regex sobre o texto minúsculo e sem acento.
- lição valiosa
- aquece o coração
- aquecer o coração
- memórias preciosas
- até hoje me lembro com carinho
- jornada
- tapeçaria
- tecido da vida
- marcou para sempre
- ficou gravado para sempre
- naquele dia, aprendi que
- e foi assim que aprendi
- uma história de superação
- um verdadeiro
- /nao era (apenas|so) .{1,40}, era /
- /mais do que (um|uma) .{1,30}, (era|foi) /

## heurística
Padrões que exigem leitura. Vão para a ficha de avaliação humana e, no futuro, para o juiz.
- Tríade de adjetivos ("simples, honesto e trabalhador").
- Moral ou lição no último parágrafo que o autor não disse.
- Abertura genérica ("Era uma vez", "Lembro como se fosse hoje") sem que o autor tenha dito.
- Travessões em excesso para dar efeito dramático.
- Frases de efeito curtas em sequência ("E foi isso. Simples assim.").
