# Ver o livro antes de imprimir (P72, T56)

Plano curto (tela sem banco, T28: sem EGM). Pedido do Guilherme em 16/11, a partir da fala do 1º cliente: "não tenho nada até o produto final; quero o feeling de como vai ser ler essa história e como o QR complementa".

## Problema

1. **A amostra travava.** A folha ficava em "Preparando a voz…" sem dizer se podia fechar nem se andava. Em 16/11 a voz nunca ficou pronta: o evento `qr/recortar` não chegou ao Inngest (as chaves foram trocadas na Vercel às 09:00 UTC; o deploy de produção era das 01:19 UTC) e `pedirRecorte` engolia o erro.
2. **Não havia como ver o livro antes de publicar.** A prévia página a página só existia na versão publicada.

## O que muda

**Amostra (folha no editor):**
- A página A5 aparece na hora (JPEG do PDF real). Até a voz ficar pronta, o QR sai tracejado; com a voz, a imagem é refeita com o QR de verdade.
- Dois passos à vista: "Texto, título e foto no lugar" e "Preparando a voz do QR" → "O QR já toca a voz".
- Barra que anda até 90% em 40 s (`AMOSTRA_VOZ_TIPICA_S`) e a frase "Pode fechar: a voz continua sendo preparada e o PDF fica aqui".
- *Baixar PDF para imprimir* sempre no mesmo lugar, travado até a voz (P56 continua).
- Demorou mais de 2 min: frase calma e *Tentar de novo*. A fila recusou: diz na hora e manda tentar em 10 min (a reserva do recorte, `QR_AUDIO_ESPERA_MIN`).

**Folhear o livro (`/livro/[id]/montar/folhear`):**
- Qualquer membro. Começa pela capa aberta (a mesma prévia da montagem) e segue página a página.
- Celular: uma página por vez, setas embaixo. A partir de 768 px: livro aberto, par à esquerda e ímpar à direita (a página 1 abre sozinha). Setas do teclado.
- O mesmo `montarDadosMiolo` do PDF final; só muda o colofão ("prévia" no lugar do número da versão) e o QR provisório (`ZZZZZZZZ`), coberto por tracejado com a legenda "o QR nasce ao publicar".
- Fotos reais, reduzidas a 900 px. PDF em memória por hash (3 por instância); 4 páginas por pedido, rasterizadas a 130 DPI. Montar de novo gasta a cota da contagem (30 por minuto no banco).
- Estado vazio: "Ainda não há histórias prontas para folhear." + *Ver as histórias*.
- Entradas: link "Folhear o livro" no topo dos 3 passos da montagem e *Folhear antes de publicar* na Conferir.

## Segurança

Sem tabela, sem RLS nova, sem link sem login. O conteúdo vem de `montagem_conteudo` pela sessão; a chave secreta só baixa fotos depois de `conferirCaminhos`. A rota é de membro: o autor (`/a/`) não chega, então as *Mensagens da família* continuam fora do alcance dele (T5).

## Como medir

`livro_folheado` (membro, `{ paginas, historias }`) e `amostra_gerada`. A hipótese: ver o livro cedo faz a família gravar mais. Olhar, nas 2 famílias da ceia, se quem folheia volta a gravar em 7 dias.
