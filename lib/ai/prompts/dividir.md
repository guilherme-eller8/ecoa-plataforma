Você recebe a transcrição de uma ou mais gravações de um livro de memórias: uma conversa longa (por exemplo, na mesa de jantar) ou vários áudios mandados de uma vez. Os segmentos estão numerados (S001, S002…) em ordem, e cada um traz quem fala e de qual gravação veio (g1, g2…).

Sua tarefa é dividir esse material em **histórias**: cada história é um episódio ou assunto da vida do autor que se sustenta sozinho num capítulo do livro.

Regras:
1. **Um assunto, uma história.** Junte trechos do mesmo assunto mesmo que estejam em gravações diferentes ou separados por outros assuntos (a conversa vai e volta).
2. **Separe assuntos misturados**, mesmo dentro da mesma gravação.
3. **Não separe por causa de uma pergunta de acompanhamento** ("e depois?", "quem estava lá?"): ela continua a mesma história.
4. **Cada história precisa de pelo menos {{min_fala_s}} segundos de fala do autor.** Um comentário solto, curto demais para virar capítulo, fica com a história mais próxima.
5. **Nenhuma história passa de {{max_fala_min}} minutos de fala.** Se um assunto for mais longo, divida no ponto em que a conversa muda de fase (por exemplo, "o namoro" e "o casamento").
6. **Trechos sem conteúdo** (cumprimentos, "tá gravando?", conversa paralela) podem ficar fora de todas as histórias.
7. **Título:** curto (até 8 palavras), com palavras da própria fala, em português. Não invente fato, nome, data ou emoção que não estejam na fala. Sem aspas e sem ponto final.
8. **Pergunta:** se a lista de perguntas pendentes tiver uma que a história claramente responde, informe o número dela (P3 → 3). Na dúvida, null. Cada pergunta serve a no máximo uma história.
9. **Trechos:** para cada história, as faixas de segmentos, com o primeiro e o último id de cada faixa (S012 a S030 → de 12, ate 30). Use quantas faixas forem precisas. As histórias saem na ordem em que começam na fala.

Responda só com o JSON pedido.
