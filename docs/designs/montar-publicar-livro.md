# Montar e publicar o livro (prompt 13)

**Estado:** aprovado pelo Guilherme em 14/11/2026 (v2 + Q16: o livro não tem teto de páginas). SQL ensaiado no PGlite (18 testes). Aplicação no Supabase pendente (a confirmação do servidor não foi respondida em 14/11).

PRD: *M9* e *Livro pronto para a gráfica*. Decisões tocadas: P3, P7, P21, P56, P60, P65, T5, T19/T43, T20, T22, T36, T44, T45, T49.

## 1. Problema, hipótese e o que está em jogo

A família tem histórias prontas e mensagens, e precisa de dois PDFs (miolo e capa aberta) que a gráfica imprima sem retrabalho, sem a Ecoa diagramar nada (P1).

- **Hipótese:** um responsável monta e publica o livro sozinho em menos de 15 minutos, e o PDF passa na gráfica na 1ª rodada.
- **Evidência hoje:** nenhuma. Nenhuma família montou um livro, e a gráfica ainda não mandou gabarito, sangria, modo de cor nem preço.
- **Usuário:** o aceite é com 6 histórias e 2 mensagens suas. O primeiro usuário de verdade é a 1ª família pagante, que ainda não existe.
- **O risco que o código não resolve:** o maior desconhecido está na gráfica, não na tela. **Recomendação:** o PDF de 6+2 deste prompt vira a pergunta para a gráfica ("imprime isso? o que muda?"). É o teste mais rápido do gabarito e do preço, e por isso tudo o que ela não confirmou fica num lugar só (`lib/config.ts`) com uma versão.
- **Sucesso:** gráfica aceita o PDF em até 1 rodada de ajuste só no `config.ts`. **Critério de morte do formato automático:** se a gráfica devolver o arquivo 2 vezes por problema de diagramação (não de número), os primeiros livros saem diagramados à mão pela Ecoa enquanto o template é corrigido.

**O que a especificação nova muda (sua resposta de hoje):** A5 vertical (14,8 × 21 cm) cabe ~32% menos texto por página que o 21 × 21 (medido no Typst com a Newsreader: ~390 contra ~570 palavras de texto corrido, a 11 pt). Com 25 histórias, o livro tende a passar das 80. **Não há teto (Q16):** o plano cobre 80 páginas e o que passar é cobrado pelo orçamento da gráfica. Cada história abrir em página nova de qualquer lado (Q1) evita que a família pague páginas em branco.

## 2. Escopo

**Entra:**
- Tabelas `book_layouts` (a montagem em andamento) e `book_exports` (cada publicação, congelada). QR de mensagem (T49).
- Fluxo em 3 passos: **Conteúdo** (histórias e mensagens: incluir, riscar, ordenar, dedicatória), **Capa** (título até 3 linhas, subtítulo, foto, cor, prévia ao vivo de capa e lombada) e **Conferir** (alertas, páginas, valor extra, *Publicar*).
- Contador de páginas de renderização real, com o valor extra (`VALOR_PAGINA_EXTRA`).
- Templates Typst do miolo (folha de rosto, dedicatória, sumário, histórias, mensagens, colofão) e da capa aberta de capa dura, com os números do `config.ts`.
- Publicar (só o responsável): versão congelada, PDFs feitos em segundo plano com cada QR decodificado por software, prévia página a página e download dos dois PDFs.
- Formato A5 em tudo: página de amostra do prompt 10 e estimativa de páginas da home e do resumo semanal (Q4).

**Fica de fora:** *Enviar para impressão*, endereço, cópias, pagamento e status (prompt 14). *Meu livro* do autor (P55). Conversão para CMYK/PDF-X (quando a gráfica pedir, prompt 14). Exclusão de versão publicada por pedido formal (LGPD, prompt 15).

## 3. Decisões

**Já respondidas por você hoje (entram como decisão nova):**

| # | Decisão |
| --- | --- |
| Q1 | Cada história abre no topo de uma **página nova, par ou ímpar**. Só as grandes partes (sumário, *Mensagens da família*) abrem na ímpar. Substitui a regra do PRD. Economiza ~0,5 página por história (~12 páginas em 25 histórias). |
| Q2 | A capa é papel impresso 4x0 com laminação fosca: **"cor do tecido" vira "cor da capa"**, 5 cores prontas definidas em CMYK no `config.ts`, mais título, subtítulo e foto. |
| Q3 | **Publica com a especificação provisória.** Tudo o que a gráfica não confirmou fica em `ESPEC_GRAFICA` no `config.ts`, com `versao`. Cada publicação grava a especificação usada. No prompt 14, *Enviar para impressão* só aceita a versão feita com a especificação atual; senão, pede para publicar de novo (mesmo conteúdo, 1 toque). |
| Q4 | **Tudo em A5:** a amostra passa a usar o mesmo template do capítulo do livro, e a estimativa de páginas é recalibrada. Corpo 11 pt. |

**Para você aprovar com o design (minha recomendação em cada uma):**

| # | Pergunta | Recomendação |
| --- | --- | --- |
| Q5 | O *Publicar* espera a voz de todos os QR ficar pronta? | **Não.** Publica e gera os PDFs na hora; a tela da versão mostra "vozes prontas: 7 de 8". O prompt 14 só deixa *Enviar para impressão* com todas prontas. O motivo da P56 (papel com player em "preparando") vale na impressão, que é lá. **O QR é vivo, o papel é congelado:** editar a história depois de publicar troca o recorte que o QR toca (T45), e o responsável pode desligar um QR. Por isso o prompt 14 confere de novo, no envio, cada QR da versão (ligado e com recorte da fonte atual) e pede nova publicação se algum mudou. |
| Q6 | Quantas fotos de cada história entram? | **Todas (até 4).** A 1ª abre a história; as outras vêm depois do texto, uma por bloco. Família que pôs 3 fotos e vê 1 no livro é surpresa ruim, e a contagem real já mostra o custo. |
| Q7 | Quem mexe na montagem e quem baixa os PDFs? | **Qualquer membro** monta (ordem, riscar, capa, dedicatória) e baixa os PDFs. **Só o responsável publica** (P60). Co-facilitador vê "Só Ana publica." no lugar do botão. |
| Q8 | Riscar uma mensagem na montagem | **É o mesmo "entra no livro" da aba *Mensagens*** (`no_livro`, P65). Uma regra só, nas duas telas. A montagem guarda só a ordem delas. |
| Q9 | História com texto pronto mas **não marcada como pronta** (P48) | Aparece na lista com "falta revisar" e **bloqueia o *Publicar*** (vermelho) até alguém marcar ou riscar. Papel só com texto revisado, como na amostra (P56). |
| Q10 | História sem áudio aceito pelo QR, mensagem só escrita, QR desligado pelo responsável | **Sai sem QR**, com alerta amarelo. Nunca imprime um QR que não toca. |
| Q11 | Prévia ao vivo da capa | **Renderizada pelo próprio Typst no servidor** (SVG, com miniatura da foto), 600 ms depois da última mudança. Mesma máquina do PDF: o título que quebra em 3 linhas na prévia quebra igual no papel. |
| Q12 | Onde roda a geração dos PDFs | **Numa função nova do Inngest, na mesma rota `/api/inngest`.** Typst + mupdf + sharp + ffmpeg somam ~160 MB (estimativa, não medida), abaixo dos 250 MB da Vercel. `sharp` entra como dependência direta (hoje só vem como opcional do Next) e em `serverExternalPackages`. O build mede; passou de 220 MB, a geração vai para uma rota própria chamada pelo passo do Inngest (seção 5.5). |
| Q13 | Cor no PDF | **Texto e QR em 100% preto (K)**, cores da capa em CMYK, fotos em RGB. Texto em preto "rico" ou cinza vira 4 cores na conversão e borra letra pequena e QR. Para sair K de verdade: texto com `cmyk(0%, 0%, 0%, 100%)` (hoje a amostra usa `rgb`) e **o QR desenhado no próprio Typst** (quadrados a partir da matriz do pacote `qrcode`), não um SVG importado, que entraria em RGB. Conferido no PDF na construção. PDF/X e CMYK das fotos quando a gráfica pedir. |
| Q14 | Tetos | **10 publicações por livro em 24 h** (as que falharam não contam) e uma por vez. **Contagem e prévia da capa: 30 por pessoa e livro por minuto**, conferido no banco (`montagem_reservar_uso`), porque o debounce da tela não protege nada. |
| Q15 | O player de um QR de mensagem mostra o quê? | **"Mensagem de Bia, neta"** e *Ouvir*: o mesmo nome e relação impressos na página. Nunca o texto. **Mensagem arquivada para de tocar na hora** (spam, pedido de quem enviou); desarquivar volta. Apagar de vez uma mensagem publicada fica para o pedido formal do prompt 15. |
| Q16 | Teto de páginas? | **Nenhum** (sua resposta). 80 é o que o preço base cobre; acima disso, a Ecoa cobra pelo orçamento da gráfica no prompt 14. A montagem e o Publicar nunca limitam pelo número de páginas; o contador só informa. |

## 4. Especificação da gráfica (o que é fixo e o que é provisório)

Tudo em `lib/config.ts`, num objeto `ESPEC_GRAFICA` com `versao` (começa em `1`, `confirmada: false`). Mudou um número: sobe a versão.

| Item | Valor | Estado |
| --- | --- | --- |
| Formato do miolo | 148 × 210 mm, vertical | **Confirmado** |
| Miolo | 80 páginas incluídas, 4x4, couché fosco 115 g | **Confirmado** |
| Capa | Capa dura, 4x0, laminação fosca na frente | **Confirmado** |
| Sangria do miolo | 3 mm em cada lado (página de 154 × 216 mm) | Provisório (PRD) |
| Múltiplo de páginas | 4 (completa com páginas em branco antes do colofão) | Provisório. Capa dura costurada costuma pedir cadernos de 16: aí 80 continua, e o extra pula de 16 em 16 |
| Espessura do papel | 0,10 mm por folha (couché 115 g) | Provisório |
| Gabarito da capa dura | papelão 2 mm, papelão maior que o miolo em 3 mm na cabeça, no pé e na frente, canal de 8 mm, dobra de 15 mm | Provisório |
| Lombada | folhas × espessura + 2 × papelão + 1 mm de folga (80 páginas ≈ 9 mm) | Provisório |
| Capa aberta | largura = 2 × dobra + 2 × papelão da frente + 2 × canal + lombada (≈ 356 mm); altura = 2 × dobra + 216 mm (≈ 246 mm) | Provisório |
| Modo de cor | Q13 | Provisório |
| Valor da página e da cópia extra | `null`: a tela diz "o valor sai no orçamento" | Pendente |

O PDF da capa marca `TrimBox` na área sem a dobra, e o do miolo em 148 × 210 mm dentro dos 3 mm. O Typst não grava essas caixas (achado do prompt 10); o mupdf grava depois (`PDFPage.setPageBox`).

## 5. Como funciona

### 5.1 Montar (`/livro/[id]/montar`, `/montar/capa`, `/montar/conferir`)

Entrada: cartão na home "Montar o livro", visível quando há 1 história pronta. A ação principal da home continua *Nova história* (P26). Três telas, uma ação cada, com o contador fixo embaixo: "72 páginas" até 80, e "92 páginas · 12 extras" acima. Nunca impede de incluir nada.

- **Conteúdo.** Dedicatória no topo (campo opcional, até 600 letras). Depois as histórias prontas na ordem do livro, cada uma com título, ano e duas setas (*Subir*, *Descer*) e *Tirar* / *Pôr de volta* (riscada fica cinza e tachada, no lugar). Depois *Mensagens da família (capítulo final)* com as mensagens enviadas, do mesmo jeito. Setas em vez de arrastar: gesto óbvio para quem tem 80 anos. Ação: *Próximo: capa*.
  - Dica de 1ª vez: "Use as setas para mudar a ordem."
  - Vazio: "Quando a primeira história ficar pronta, ela aparece aqui." + *Nova história*.
- **Capa.** Prévia no topo (capa, lombada e contracapa abertas, 5.3). Campos: *Título* (até 3 linhas na capa e 90 letras; preenchido com "Histórias de {apelido}"), *Subtítulo* (opcional), *Foto* (do acervo do livro, o seletor que o editor já usa), *Cor* (5 bolinhas). Ação: *Próximo: conferir*.
- **Conferir.** O número grande ("84 páginas"), a frase do valor e os alertas, vermelhos primeiro, cada um com o link para resolver:
  - vermelho (bloqueia): livro sem título, história sem título, história não marcada como pronta (Q9), título da capa com mais de 3 linhas;
  - amarelo: foto abaixo de 300 DPI no tamanho impresso, história com menos de 120 palavras, história ou mensagem que sai sem QR (Q10);
  - páginas (informação, nunca alerta nem bloqueio, Q16): "92 páginas. O plano inclui 80; as 12 a mais entram no orçamento da gráfica." Com `VALOR_PAGINA_EXTRA` definido, acrescenta "cerca de R$ X".
  - Ação: *Publicar* (só o responsável). Folha de confirmação: "Publicar a versão 2? O que mudar depois fica para a próxima." Co-facilitador vê "Só {responsável} publica."
  - **Publica o que a pessoa viu.** A tela de Conferir guarda o `hash` que `montagem_conteudo` devolveu e o manda no *Publicar*. Se qualquer coisa mudou desde então (montagem, uma história que ficou pronta, uma mensagem tirada, editada ou arquivada), o banco recusa com `montagem_mudou` e a tela recarrega: "O livro mudou enquanto você conferia. Confira de novo."

**Salvar:** cada mudança chama `montagem_salvar` com a montagem inteira e a revisão lida (`rev`). Outra pessoa salvou antes: `montagem_mudou`, a tela recarrega e avisa "Alguém mudou a montagem agora. Atualizamos." Riscar mensagem chama a `mensagem_no_livro` que já existe (Q8). Plano vencido: só leitura (`livro_fechado`), e as versões publicadas continuam abrindo (P4).

### 5.2 Contador de páginas (T20)

- Ação `contarPaginas(livro)` (servidor), 800 ms depois da última mudança salva. A tela mostra "contando…" sem travar nada. Antes de compilar, `montagem_reservar_uso` (30 por pessoa e livro por minuto, Q14); passou do teto, a tela espera e tenta de novo. Resultado guardado em memória pelo `hash` do conteúdo: a mesma montagem não compila duas vezes.
- Lê `montagem_conteudo` (o mesmo `privado.conteudo_do_livro` que a publicação congela: uma fonte só), monta o JSON do template e compila o miolo no Typst.
- **Sem baixar foto:** toda foto entra numa caixa de tamanho fixo calculado do JSON (`largura`/`altura` da tabela `photos`, ou 4:3 quando não há; mensagens numa caixa fixa), com a imagem em `fit: "cover"`. No modo contagem, a caixa recebe um cinza de 1 pixel. Mesmo layout, mesma contagem, ~100 ms para 80 páginas.
- Devolve `paginas` (já completadas até o múltiplo), `extra` e a lista de alertas, incluindo o de título da capa (3 linhas medidas no Typst).
- O mesmo número substitui a estimativa por palavras quando a montagem existe? **Não neste prompt:** a home e o resumo semanal continuam com a estimativa recalibrada (220 palavras por página, medido no A5 e conferido com histórias reais na construção).

### 5.3 Prévia da capa (Q11)

- Ação `previaCapa(livro, {titulo, subtitulo, fotoId, cor})`, 600 ms depois da última tecla, com o mesmo `montagem_reservar_uso`. Compila `capa.typ` com a lombada da última contagem e devolve SVG. A miniatura da foto fica em memória por id.
- A foto entra como miniatura de 600 px feita com sharp no servidor (o arquivo original tem até 5 MB; o SVG fica em ~80 KB). A foto é lida pelo id da montagem, conferido como do livro pelo banco.
- A prévia desenha a linha da dobra e da lombada em cinza claro (só na prévia, nunca no PDF).

### 5.4 Publicar

1. Ação `publicar(livro, hash)` → `publicar_livro(livro, hash)` (seção 8). O banco, numa transação: confere responsável e plano (antes de qualquer trava); trava a montagem, as histórias e as mensagens do livro até o fim e confere o `hash`; uma publicação por vez (a presa há 30 min vira `falhou`); teto de 10 em 24 h; bloqueios vermelhos; **cria os QR que faltam** (histórias com áudio aceito, mensagens com áudio transcrito); congela `conteudo` e conta `qr_esperados` (só os QR que vão impressos); devolve os códigos cujo recorte reservou.
2. O servidor envia `qr/recortar` para cada código reservado (já existe), `livro/exportar` com **só o id da versão** (T36) e registra `livro_publicado` (ids e contagens).
3. A tela vai para `/livro/[id]/publicado/[versao]`.

### 5.5 Gerar os PDFs (`lib/inngest/livro.ts`, função `livro-exportar`)

Gatilho `livro/exportar` `{ export_id }`; `concurrency` 1 por versão; novas tentativas como as outras (`TENTATIVAS_POR_PASSO`); falhou em todas → `servico_export_falhou(id, 'falhou_montar')`. **Erro com código fixo:** o passo captura toda exceção do Typst, do mupdf e do sharp e lança só um código (`falhou_typst`, `falhou_foto`, `qr_nao_conferido`…). O detalhe vai para o log do servidor, nunca para o Inngest, porque a mensagem do Typst pode citar o texto da família (T36). Um teste confere isso.

**Passo 1, montar (um passo só: os PDFs nunca passam pelo Inngest).**
- `servico_export_conteudo(id)`: o conteúdo congelado. Estado diferente de `gerando`: termina sem fazer nada.
- Baixa as fotos (4 por vez) pela chave secreta. Cada caminho é conferido de novo por expressão do bucket (`acervo`: `livros/{livro}/acervo/{uuid}.jpg`; `mensagens`: `livros/{livro}/mensagens/{uuid}-foto.jpg`) antes de assinar.
- sharp com `limitInputPixels` (40 milhões) e `failOn: "error"`, porque foto de mensagem vem de quem tem o link: reduz cada foto ao tamanho impresso a 300 DPI (nunca aumenta), JPEG 88, sem metadados (nada de GPS no PDF). No Typst, cada foto entra por um nome local (`foto-3.jpg`), nunca pelo caminho do Storage.
- Typst, miolo em 2 compilações: a 1ª conta as páginas; a 2ª acrescenta as páginas em branco até o múltiplo, antes do colofão. Depois a capa, com a lombada daquela contagem.
- mupdf: grava `TrimBox` e `BleedBox`; rasteriza cada página a 150 DPI uma vez só e usa a imagem duas vezes:
  - **conferência dos QR:** o template marca cada QR com `metadata` e posição (`here().position()`, **testado neste container**: `query` devolve página, x e y em pt, a partir do canto da página com a sangria); o servidor recorta aquele quadrado da página (pt × 150/72) e decodifica com jsQR. É o `conferirQr` de hoje generalizado (recebe a imagem da página e o retângulo), não um segundo módulo; a amostra passa a usá-lo também. Exige que cada código esperado seja lido **exatamente** na sua URL, inclusive com 2 mensagens na mesma página (por isso o recorte, não a página inteira). Falhou um: a versão falha (`qr_nao_conferido`) e nenhum PDF fica disponível;
  - **prévia:** a mesma imagem reduzida a ~100 DPI, JPEG, `p001.jpg`…; e `capa.jpg`.
- Sobe tudo para o bucket privado `exportacoes`, numa pasta nova por tentativa: `livros/{livro}/v{versao}-{12 hex}/` (`miolo.pdf`, `capa.pdf`, prévias). Erro no meio, ou `servico_export_pronto` devolvendo `false` (a versão expirou enquanto o job rodava): apaga a pasta da tentativa. Uma varredura de pastas sem versão `pronta` fica para o prompt 14.
- Devolve só pasta, páginas, lombada, bytes e número de QR conferidos.

**Passo 2, gravar.** `servico_export_pronto(...)` com a `espec` usada. O banco recusa se `qr_conferidos ≠ qr_esperados`. Evento `livro_pronto` (sistema).

**Tempo:** ~25 fotos baixadas e reduzidas (~10 s), Typst (<1 s), 84 páginas rasterizadas (~6 s), upload (~20 MB). Folgado nos 300 s do passo.

**Tamanho da função (Q12):** Typst ~51 MB, ffmpeg ~77 MB, mupdf ~14 MB, sharp/libvips ~20 MB (estimativas). `next.config.ts`: `sharp` em `serverExternalPackages`; `outputFileTracingIncludes` de `/api/inngest` ganha `./lib/livro/typst/**` e `./lib/livro/fontes/*.ttf` (lidos com `readFileSync`, o tracing não vê), e a rota da amostra troca `amostra.typ` por `typst/**`. O gate de build soma o `.nft.json` da rota; acima de 220 MB, o passo 1 passa a chamar uma rota própria (`POST /api/livro/exportar`, com assinatura HMAC de segredo novo) e o resto não muda.

### 5.6 A versão publicada (`/livro/[id]/publicado/[versao]`)

- **gerando:** "Preparando os PDFs. Leva cerca de 1 minuto." Consulta o estado a cada 3 s.
- **pronta:** a capa e depois as páginas, uma por vez no celular (setas e "Página 5 de 84"), duas lado a lado na tela larga. Embaixo: *Baixar miolo* e *Baixar capa* (URL assinada de 60 s, com nome de arquivo) e "Vozes prontas: 7 de 8" (Q5). Evento `livro_baixado`.
- **falhou:** "Não deu certo desta vez. Publique de novo." + *Voltar para conferir*.
- Prévias: URLs assinadas de 10 min, pedidas de 4 em 4 páginas.
- Qualquer membro abre (Q7). O caminho vem do banco pela sessão (RLS) e é assinado pela chave secreta, como os outros buckets.

### 5.7 Templates (`lib/livro/typst/`)

- `comum.typ`: tamanhos, margens, cores, fontes, e a função `historia(dados)` usada pelo livro **e pela amostra** (uma fonte só para o capítulo).
- `miolo.typ`, na ordem: folha de rosto (título, subtítulo, nome do autor) e verso em branco; dedicatória (se houver) e verso em branco; sumário (Typst `outline`, abre na ímpar); histórias (página nova; ano pequeno, título, QR ao lado do título como na amostra, foto, texto, demais fotos); *Mensagens da família* (abre na ímpar; cada mensagem com nome, relação, foto opcional, texto e QR; mensagem curta não quebra entre páginas, então cabem 2 por página quando curtas); brancos até o múltiplo; colofão na última página ("Livro feito com a Ecoa Memórias", data e "versão N").
- Página: 154 × 216 mm (com sangria); margens interna 20 mm (capa dura abre menos), externa 15, cabeça 18, pé 20. Newsreader 11 pt. Número de página no pé, fora da folha de rosto, dedicatória, aberturas e brancos.
- `capa.typ`: capa aberta (contracapa, lombada, capa). Frente: cor, foto num retângulo, título (até 3 linhas) e subtítulo, tudo a 8 mm das bordas do papelão. Lombada: título e nome do autor girados, só se ela tiver 6 mm ou mais. Verso: cor e "Ecoa Memórias" pequeno.
- Todo texto da família entra pelo `dados.json` (T43), nunca como código Typst.
- Reuso de `amostra.ts`: `NodeCompiler.create` com as fontes, `mapShadow`, e o QR. Cada QR em arquivo virtual próprio (`/qr-{código}`), porque hoje o caminho é fixo (`/qr.svg`) e o livro tem vários.

### 5.8 QR de mensagem (T49)

- `qr_codes.message_id` (um dos dois, história ou mensagem). Criado só pela publicação.
- Só mensagem com áudio **transcrito** ganha QR: a duração gravada vem do aparelho de quem enviou, e é a transcrição (T48) que conferiu o teto de 5 min. O teto do recorte de mensagem é o teto do link (310 s) + 30 s, nunca a duração declarada.
- Recorte: o arquivo inteiro do bucket `mensagens`, pelo mesmo `qr-recortar` endurecido (sem metadados, AAC, demuxer forçado, `-protocol_whitelist file`). `servico_qr_trechos` devolve `bucket`, `recording_id` nulo e o tipo pela extensão (só `webm`, `m4a` e `ogg` existem, pelo CHECK do caminho). **Muda no código:** `lib/qr/tipos.ts` (`TrechosQr`: `recording_id` pode ser nulo, `bucket` obrigatório), `lib/qr/recortar.ts` (baixa do bucket do plano, não de `audios` fixo; chave dos tempos não depende de `recording_id`), `lib/qr/trechos.ts`.
- Player: "Mensagem de {nome}, {relação}" e *Ouvir* (Q15); arquivada → "Este áudio não está mais disponível.". **Muda no código:** `lib/qr/tipos.ts` (`OuvirQr` ganha o ramo `tipo`), `lib/qr/player.ts`, `components/telas/tela-player.tsx`, tipos de `servico_ouvir_qr`, `servico_qr_trechos` e `publicar_livro` em `lib/supabase/tipos.ts`. `qr_tocou` registra `message_id`.
- `mensagem_apagar` recusa mensagem com QR ou dentro de uma versão publicada (`mensagem_publicada`). O pedido formal de exclusão depois de publicada é do prompt 15.

### 5.9 A5 no que já existe

- `amostra.ts`/`amostra.typ`: página A5 com a função `historia` de `comum.typ`; o resto do algoritmo (parágrafos inteiros, "Continua no livro.", conferência do QR) fica.
- `PALAVRAS_POR_PAGINA_ESTIMADA` 320 → 220 (e `privado.palavras_por_pagina`, usado por `servico_resumo_semanal`), recalibrado com histórias reais na construção. Consumidores: `lib/livro/paginas.ts`, `lib/exemplos/livro-jair.ts`, `config-banco.test.ts`.
- `config.ts`: `FORMATO_LIVRO` e `SANGRIA_MM` passam a sair de `ESPEC_GRAFICA`; o comentário de `FOTO_LADO_MAX_PX` vai para o A5 (148 mm a 300 DPI pede 1748 px); `FOTO_LADO_MIN_IMPRESSAO_PX` dá lugar ao alerta de DPI no tamanho impresso de verdade (no editor também). Em `amostra.ts`, `LARGURA_TEXTO_MM` e `FOTO_MAX_MM` saem de `comum.typ`.

## 6. Segurança

- **O autor nunca alcança o livro montado.** `book_exports` leva o texto das mensagens (P21, T5): sem grant e com política restritiva `using (false)` para `anon` e `porta_autor`, nas duas tabelas novas. `book_layouts`, `book_exports` entram em `TABELAS_DA_FAMILIA`, e `exportacoes` em `BUCKETS_DA_FAMILIA` (os testes do autor passam a barrar).
- **Conteúdo congelado só o servidor lê.** O membro lê a lista de versões, mas não a coluna `conteudo` (grant por coluna).
- **Escrita só por função.** Nenhum `insert`/`update` direto para `authenticated`. `montagem_salvar` confere membro, plano, que cada id é do livro e que a cor está na paleta. `publicar_livro` confere responsável.
- **Imutável para todos.** `book_exports` não é apagada nem truncada, nem pela chave secreta; o conteúdo nunca muda; o estado sai de `gerando` uma vez. O QR de mensagem herda a imutabilidade de `qr_codes`.
- **Caminhos.** CHECK da pasta por livro e versão; cada foto do conteúdo é conferida de novo pela expressão do bucket antes de assinar; URLs assinadas curtas (60 s download, 10 min prévia).
- **Texto como dado.** Template lê JSON (T43); nome, relação, dedicatória e título nunca viram código.
- **Nada de texto no Inngest** (T36): o evento leva só o id; os passos devolvem números e a pasta.
- **Custo e abuso.** 10 publicações por dia por livro e uma por vez; contagem e prévia só para membro, com teto de 30 por minuto no banco (Q14). A permissão é conferida antes de qualquer trava.
- **Fotos sem metadados** no PDF (sharp tira EXIF/GPS).
- **QR conferido duas vezes:** por software no servidor, e pelo banco (`qr_conferidos = qr_esperados`). Só conta como impresso o QR que toca: não desligado, com áudio aceito (história) ou transcrito (mensagem).
- **Publica o que foi conferido:** `hash` do conteúdo, com a montagem, as histórias e as mensagens travadas na transação (seção 5.1).
- **Funções internas fechadas:** as `privado.*` novas são `security definer` sem checagem própria (`conteudo_do_livro` devolve mensagens de qualquer livro). `revoke` explícito de `public`, `anon`, `authenticated` e `porta_autor`, com teste por papel.
- **Contrato de colunas:** teste lista as colunas de `book_exports` que `authenticated` lê e quebra se aparecer outra.
- **Arquivo anônimo no ffmpeg e no sharp:** o recorte endurecido do T45 vale para o áudio de mensagem; sharp com limite de pixels.

## 7. Modelo de dados

**`book_layouts`** (1 por livro, a montagem em andamento): `book_id` (PK), `titulo` (≤ 90), `subtitulo` (≤ 120), `dedicatoria` (≤ 600), `capa_foto_id` (FK para `photos` do mesmo livro; foto apagada vira nulo), `capa_cor` (chave da paleta), `ordem_historias uuid[]`, `ordem_mensagens uuid[]`, `fora uuid[]` (histórias riscadas), `rev`, `atualizado_em`, `atualizado_por`. Histórias novas entram no fim, incluídas.

**`book_exports`** (cada publicação, nunca apagada): `id`, `book_id`, `versao` (1, 2, 3… por livro), `estado` (`gerando` → `pronta` | `falhou`), `conteudo` (o livro congelado: títulos, parágrafos, fotos, QR, mensagens, capa), `qr_esperados`, e quando pronta: `espec` (a especificação da gráfica usada), `paginas`, `lombada_mm`, `pasta`, `miolo_bytes`, `capa_bytes`; `erro`, `publicado_por`, `criado_em`, `terminado_em`.

**`qr_codes`** ganha `message_id` (um dos dois: `story_id` ou `message_id`).

**`montagem_usos`** (contador do teto de contagem e prévia): `book_id`, `user_id`, `janela` (minuto), `n`. Ninguém lê; linhas de mais de 1 h são apagadas a cada reserva.

## 8. SQL

Arquivos: `supabase/migrations/20261123120000_montar_livro.sql` (subida) e `supabase/reversao/20261123120000_montar_livro.down.sql` (reversão). Resumo da subida:

```sql
-- 0. Espelhados em lib/config.ts: max_itens_livro() = 150, max_publicacoes_dia() = 10,
--    publicacao_expira_s() = 1800, max_usos_montagem_minuto() = 30,
--    capa_cores() = {terracota, oliva, azul, areia, grafite};
--    palavras_por_pagina() 320 → 220.
-- 1. qr_codes: story_id passa a aceitar nulo; message_id único com FK (book_id, message_id) para
--    family_messages (restrict); CHECK um dos dois. qr_imutavel compara com "is not distinct from".
--    Novas: fonte_audio_da_mensagem (caminho + duração), fonte_audio_do_qr, qr_duracao_max_s (mensagem:
--    teto do link, nunca a duração do aparelho),
--    qr_inserir (sorteio com 5 tentativas), historia_aceita_qr.
--    Reescritas para servir os dois donos: qr_reservar_audio, criar_qr (mesmo comportamento),
--    servico_qr_audio_pronto, servico_ouvir_qr (+ tipo, nome, relação; mensagem arquivada = desativado),
--    servico_qr_tocou,
--    servico_qr_trechos (+ bucket).
-- 2. book_layouts: RLS, membro lê, restritiva nega anon e porta_autor, nenhuma escrita direta.
--    privado.conteudo_do_livro(livro, só_incluídas): o livro em JSON (fonte única da contagem e da
--    publicação; QR "ligado" só se toca). montagem_conteudo(livro): membro, devolve + hash.
--    montagem_salvar(...): membro, plano ativo, rev, mesma trava de publicar.
--    montagem_usos + montagem_reservar_uso(livro): 30 por pessoa e livro por minuto.
-- 3. book_exports + enum export_estado: CHECKs de pasta, pronta completa, falhou com erro;
--    gatilhos de imutável e sem truncate; membro lê sem a coluna conteudo; restritiva para
--    anon e porta_autor. publicar_livro(livro, hash): responsável, permissão antes da trava, trava
--    montagem/histórias/mensagens, confere o hash; teto só conta as que não falharam. servico_export_conteudo,
--    servico_export_pronto (exige qr_conferidos = qr_esperados), servico_export_falhou: só servidor.
-- 4. mensagem_apagar recusa mensagem com QR ou publicada (mensagem_publicada).
-- 5. Bucket privado 'exportacoes' (50 MB; application/pdf, image/jpeg), sem políticas.
```

Erros novos com frase em `lib/erros-banco.ts`: `montagem_mudou`, `publicacao_em_andamento`, `limite_publicacoes`, `livro_vazio`, `livro_sem_titulo`, `historia_sem_titulo`, `qr_nao_conferido`, `export_imutavel`, `mensagem_publicada`.

**Reversão:** trava se houver montagem, versão publicada ou QR de mensagem; forçada com `set ecoa.reversao_destrutiva = 'sim'`. Volta as funções ao texto dos prompts 10 e 12 e `palavras_por_pagina` a 320. Não mexe em Storage: antes de forçar, esvaziar `exportacoes` e apagar do bucket `qr` os recortes de mensagem. O bucket sai por último, só vazio.

## 9. Testes

**Banco (ensaiados, passando):** `supabase/tests/montar-livro.test.ts`, 18 testes: funções internas novas fechadas para `anon`, `authenticated` e `porta_autor`; contrato das colunas de `book_exports`; teto de 30 usos por minuto; privilégios de `anon`, `porta_autor` e `authenticated` (sem `conteudo`, sem escrita direta); ordem salva, novas no fim, riscadas; parágrafo em branco fora; revisão velha, cor fora da paleta, item de outro livro e não membro recusados; só o responsável publica; montagem que mudou, história sem título e não revisada bloqueiam; hash velho (mensagem tirada depois de conferir) recusado; congela, cria QR de história e de mensagem com áudio transcrito, mensagem só escrita e história sem áudio saem sem QR, `qr_esperados` e reservas batem; uma por vez; pronta só com todos os QR conferidos, uma vez, e depois imutável (update e delete); mensagem publicada não se apaga; player de mensagem com nome e relação, sem o texto; arquivada para de tocar e desarquivar volta; recorte acima do teto do link recusado; trechos do bucket `mensagens`; reversão trava, forçada passa, sobe de novo.

**Suíte inteira hoje:** 398 passando, 4 quebras esperadas, a corrigir na construção: lista de funções de `authenticated` (`rls.test.ts`, +3), frases dos 9 erros novos, `palavras_por_pagina` 220 (`config-banco.test.ts`), e `mensagens.test.ts` (o *truncate* continua recusado, agora pela FK de `qr_codes`; o teste aceita as duas mensagens).

**A fazer na construção:**
- Banco: teto de 10 por dia (falhou não conta); publicação presa há 30 min vira `falhou`; QR criado pela amostra numa história que perdeu o áudio aceito não conta como impresso; plano vencido (monta não, lê sim); co-facilitador monta; `criar_qr` da amostra igual ao do prompt 10 (os testes de `qr.test.ts` continuam passando).
- Unidade: JSON do template a partir do conteúdo; lombada e capa aberta pelo `config.ts`; múltiplo de 4; alertas (DPI no tamanho impresso, 120 palavras, sem QR, 3 linhas); conferência dos QR com 2 mensagens na mesma página e com um QR estragado de propósito; `TrimBox` presente; texto e QR em K no PDF; caminhos de foto fora da expressão recusados; erro do Typst com texto da família vira só o código; recorte de mensagem (bucket `mensagens`, `recording_id` nulo); player de mensagem.
- Contagem: o livro de exemplo (6 histórias + 2 mensagens) dá o mesmo número no modo contagem e no PDF final.
- Rotas do autor: `book_layouts`, `book_exports` e `exportacoes` barrados.
- Tela (Playwright no styleguide): Conteúdo (vazio, com itens, riscada), Capa, Conferir (vermelho, amarelo, acima de 80, co-facilitador), versão (gerando, pronta, falhou).
- **Aceite:** com 6 histórias e 2 mensagens reais, publico; os PDFs abrem no Acrobat (no container: `pdffonts` com a Newsreader embutida, `pdfinfo -box` com `TrimBox` 3 mm para dentro). E o QR de 2 cm impresso abre o player a 20 cm (folha física, com você).

## 10. Ordem de entrega

- **A. Banco:** migration, testes, `config.ts` (`ESPEC_GRAFICA`, `CAPA_CORES`, tetos), frases dos erros. Aplicar no Supabase depois do OK e conferir os avisos de segurança.
- **B. Templates e geração:** `lib/livro/typst/` (comum, miolo, capa), `lib/livro/montar-dados.ts`, `lib/livro/espec.ts`, conferência por posição, `TrimBox`; amostra em A5.
- **C. Inngest:** `livro-exportar`, recorte de mensagem no `qr-recortar`, player de mensagem.
- **D. Telas:** montar (3 passos), versão publicada, cartão na home, styleguide, eventos (`livro_publicado`, `livro_pronto`, `livro_falhou`, `livro_baixado`).
- **E. Gate:** build (com o tamanho da função), lint, testes, e2e, design, prévia na Vercel com 6 + 2 de verdade, PDFs abertos e conferidos.

## 11. Decisões novas para registrar depois do OK

- **P66:** livro A5 vertical (14,8 × 21 cm), capa dura 4x0 com laminação fosca, miolo de 80 páginas 4x4 em couché fosco 115 g; cada história abre em página nova de qualquer lado (só sumário e mensagens na ímpar); "cor do tecido" vira cor da capa impressa, de uma paleta de 5 (Q1, Q2, Q4). Substitui no PRD o formato 21 × 21 e a regra da página ímpar.
- **P67:** sem teto de páginas: 80 é o que o plano cobre, o extra sai pelo orçamento da gráfica e a montagem só informa (Q16); qualquer membro monta e baixa; só o responsável publica; mensagem no livro é o `no_livro` da P65; história não revisada bloqueia; todas as fotos da história entram; o que não tem QR que toca sai sem QR; publicar não espera as vozes (o prompt 14 espera); 10 publicações por dia (Q5 a Q10, Q14).
- **T50:** montagem em `book_layouts`; publicação em `book_exports`, conteúdo congelado pelo banco numa transação (fonte única com a contagem) e só se o `hash` for o que a pessoa conferiu; QR vivo, papel congelado (o prompt 14 reconfere os QR no envio); teto de contagem e prévia no banco; PDFs numa função do Inngest com fotos reduzidas a 300 DPI, QR conferido por posição e pelo banco, `TrimBox` pelo mupdf, prévias JPEG; especificação da gráfica versionada no `config.ts` e gravada em cada versão (Q3, Q11, Q12).
- **T51:** QR de mensagem: `qr_codes.message_id`, só com áudio transcrito, recorte do arquivo inteiro com o teto do link, player com nome e relação; arquivada para de tocar; mensagem com QR ou publicada não se apaga pelo produto (Q15). Completa T49.
- **T52:** texto e QR em 100% K, cores da capa em CMYK, fotos em RGB até a gráfica pedir outra coisa (Q13).

## 12. Revisão

Uma rodada, 2 revisores em Sonnet. Relatórios em `montar-publicar-livro/critic_report.md` e `codebase_details_report.md`.

### Segurança: "aprovar com ajustes" (12 achados)

| # | Achado | O que mudou |
| --- | --- | --- |
| 1 | Alta. Publicar congelava mudanças que a pessoa não conferiu (mensagem tirada, história nova) | `hash` do conteúdo + travas na transação (5.1, 5.4); teste |
| 2 | Alta. Mensagem retirada seguia tocando em público | Arquivada = desativado no player (Q15); teste |
| 3 | Média. Duração da mensagem vem do aparelho e era o teto do recorte | QR só com áudio transcrito; teto = o do link (5.8); teste |
| 4 | Média. Arquivo anônimo no ffmpeg e no sharp | Recorte endurecido do T45; sharp com limite de pixels (5.5) |
| 5 | Média. `privado.*` sem checagem protegidas só por `from public` | `revoke` de todos os papéis + teste |
| 6 | Média. Contagem e prévia sem teto no servidor | `montagem_usos`, 30 por minuto (Q14); teste |
| 7 | Média. 15 min podia expirar job ainda rodando; pasta órfã | 30 min; `false` no pronto apaga a pasta; varredura no prompt 14 |
| 8 | Média. O QR continua vivo depois de congelar | Escrito em Q5; o prompt 14 reconfere no envio |
| 9 | Baixa. Erro do Typst pode levar texto ao Inngest | Erro com código fixo; foto por nome local (5.5); teste a fazer |
| 10 | Baixa. Reversão com buracos | Trava inclui a montagem; bucket por último; Storage documentado |
| 11 | Baixa. Trava antes da permissão; falha contava no teto | Permissão antes; teto só conta as que não falharam |
| 12 | Baixa. Sem contrato das colunas lidas | Teste das colunas |

### Código: arquitetura sólida, 12 achados

| # | Achado | O que mudou |
| --- | --- | --- |
| 1-2 | Recorte e player quebrariam com mensagem (tipos, bucket fixo, tela) | Arquivos listados em 5.8 |
| 3 | `sharp` não é dependência direta | Q12 |
| 4 | Tracing de `/api/inngest` sem templates e fontes | 5.5 |
| 5 | Conferência reinventava `conferirQr` | Generalizar o existente (5.5, 5.7) |
| 6 | `here().position()` não confirmado | **Testado aqui:** funciona; origem com a sangria |
| 7 | K puro não sai com `rgb` nem com SVG importado | Texto em `cmyk`, QR desenhado no Typst (Q13) |
| 8 | Consumidores do 21 × 21 não listados | 5.9 |
| 9 | Duração nula desligava o teto | Teto do link, sem nulo |
| 10 | `rev` sem trava | Coberto pelo hash e pelas travas |
| 11 | Expirar volta no rollback; sem montagem dava `montagem_mudou` | A tela mostra como falhou a `gerando` vencida; título vazio não existe (CHECK de `stories`) |
| 12 | QR criado pela amostra contava sem áudio aceito | `ligado` só se toca; teste a fazer |
