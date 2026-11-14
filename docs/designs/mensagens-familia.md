# Mensagens da família para o livro (prompt 12)

Status: **v2 aprovada pelo Guilherme em 2026-11-14** (Q1 a Q13 como recomendado; P65, T48 e T49). Depois do OK: Q11 alinhada à P60 do prompt 11 (rodou em paralelo), migration renomeada para `20261122120000` (a do prompt 11 é `20261121120000`) e números das decisões trocados (P59 a P64 e T47 são do prompt 11), revisada por 2 revisores (T28) · 2026-11-14 · PRD: M8, Papéis e permissões, Jornadas (Família), Livro pronto para a gráfica (estrutura do miolo), Segurança, LGPD · Decisões: P4, P7, P9, P12, P21, P23, P24, T5, T6, T23, T25, T26, T27, T28, T32, T35, T36, T38, T46

Relatórios: `mensagens-familia/critic_report.md` (segurança) e `mensagens-familia/codebase_details_report.md` (código). A seção 11 mostra o que mudou por causa de cada um.

## 1. Problema, hipótese e o que está em jogo

O capítulo de mensagens é o diferencial emocional do livro (P21): o autor abre o livro impresso e encontra a voz de quem gosta dele. Hoje não existe jeito de juntar essas mensagens sem o responsável virar secretário no WhatsApp.

- **Quem usa:** André, responsável pelo livro do pai, o Nelson. Ele manda o link para parentes e amigos do Nelson, inclusive gente que não está no grupo da família (resposta do Guilherme em 14/11). **Quem deixa mensagem ainda não tem nome.** Esse é o maior risco do prompt.
- **Hipótese:** com um link e um texto pronto no WhatsApp, pessoas que nunca usaram a Ecoa deixam uma mensagem sozinhas, sem ajuda do André.
- **Sinal de sucesso (sai de `events`):** em até 14 dias depois de `gerou_link_mensagem`, **5 mensagens enviadas** (`deixou_mensagem`) por pelo menos 4 nomes diferentes, com pelo menos 1 em áudio; e o André marca pelo menos 2 para o livro (`mensagem_no_livro`).
- **Critério de morte:** menos de 2 mensagens em 14 dias. Nesse caso, nada mais é construído para mensagens (QR de mensagem, layout do capítulo), e o capítulo vira texto colado pelo responsável no prompt 13.
- **Evidência hoje (banco de produção, 14/11):** 2 livros; 4 gravações, todas do responsável; o link da família teve 3 sugestões no dia em que foi criado (09/11) e 0 votos na enquete. Ainda não há evidência de que a família usa links sem ajuda. O Guilherme decidiu construir agora para o app causar boa impressão quando o André começar.

**O que essa conversa revelou e não é deste prompt:** o André quer a tia Márcia e a irmã Camila como co-facilitadoras. São usuárias com nome do **prompt 11**, que ficou para trás. Recomendo que o 11 venha logo depois deste.

## 2. Escopo

**Entra:**
1. Link `/m/{token}`, um ativo por livro, revogável, com o convite pronto para o WhatsApp (sem número, P9) e a frase "É surpresa".
2. Formulário: nome, relação ("sobrinha", "amigo do trabalho"), áudio de até 5 min **ou** texto, foto opcional, consentimento.
3. Áudio vira transcrição **na hora**, sem IA reescrevendo. A pessoa confere, corrige e envia. Toda mensagem enviada tem texto que a própria pessoa confirmou ou escreveu.
4. Aba *Mensagens* para os membros: ouvir, ler, ajustar o texto, pôr ou tirar do livro, arquivar; o responsável apaga de vez uma arquivada.
5. Segredo: nada do link `/m`, das tabelas, das funções ou do bucket chega ao token do autor; testes de banco e das rotas.

**Fica de fora (com motivo):**
- **QR de mensagem:** prompt 13 (Q9). O áudio original fica guardado, e o QR só é preciso quando o livro é montado.
- **Capítulo no PDF, contagem de páginas e foto recodificada para a gráfica:** prompt 13.
- **Editar depois de enviar (quem enviou):** depois de *Enviar*, só os membros mexem. Quem enviou pede a quem mandou o link (a tela final diz isso).
- **Áudio retomável (IndexedDB, TUS):** a mensagem tem 5 min. O gravador simples do causo, com envio único por URL assinada.
- **DPA com a ElevenLabs, retenção zero e regras para menores de idade:** entram no texto de LGPD do prompt 15 (Q13).

## 3. Decisões que preciso de você

| # | Decisão | Recomendo | Por quê | O que se perde |
| --- | --- | --- | --- | --- |
| Q1 | **SQL (seção 7)** | Aprovar | Ensaiado em PGlite com as migrations reais: 58 testes novos; suíte inteira passando (721). Depois de aplicar, confiro no Supabase de verdade (Storage, grants e os avisos de segurança), que o PGlite não reproduz | — |
| Q2 | **Link próprio `/m`**, separado do `/f` | Assim (você confirmou) | O André vai mandar para gente de fora do grupo. Um link separado é revogado sem derrubar o `/f`, e quem recebe não vê enquete nem causos | Mais um link (fica na aba *Mensagens*) |
| Q3 | **Transcrição: só ElevenLabs Scribe**, sem Claude. O banco guarda a transcrição bruta; a pessoa recebe uma sugestão sem hesitações ("ahn", "hum", "éé"). Nenhuma palavra é trocada nem juntada | Assim | É a voz de quem não é o autor. Uma IA "limpando" pode trocar uma palavra e a pessoa não perceber no celular. A regra de juntar repetições saiu na revisão ("não, não" e "tchau tchau" são fala de verdade) | Texto com marcas de fala ("né", "aí"): quem enviou ou o André ajusta |
| Q4 | **Transcrição dentro da ação do servidor**, sem Inngest. Exceção a T35 só para mensagens. A página tem `maxDuration` de 60 s, o pedido ao Scribe é cortado em 45 s, e a reserva no banco dura 2 min e tem dono | Assim | Quem enviou está esperando na tela; 5 min de áudio levam segundos. Sem fila, sem consulta a cada 4 s. Se a resposta se perder na rede, a próxima chamada devolve o texto já gravado | Sem retomada automática: quem enviou toca *Tentar de novo*. Depois de 3 falhas: "Escreva a mensagem você mesmo" |
| Q5 | **O link só escreve.** O rascunho fica preso ao aparelho (cookie httpOnly da rota `/m`, guardado como hash por livro) e vale 48 h; no máximo 3 rascunhos abertos por aparelho. Depois de *Enviar*, nem quem enviou lê de novo | Assim | O link vai circular fora do grupo. Quem o tiver não lê nada de ninguém. Se o autor receber o link por engano, vê só o convite | Recarregar a página no meio perde o rascunho (começa de novo; o vencido é apagado em 48 h) |
| Q6 | **Só entra no livro o que um membro marcar** (padrão: fora). Qualquer membro marca, inclusive co-facilitador | Assim | O capítulo é surpresa e o link circula: spam não vai para o papel sozinho. O aceite já pede "o responsável inclui 2" | Um toque por mensagem |
| Q7 | **Enviar exige texto.** Com áudio, é a transcrição conferida pela pessoa (ou o que ela escreveu se a transcrição falhar). Membros ajustam o texto; o banco guarda para sempre o que a pessoa enviou e a transcrição bruta, e a folha mostra "Ver o que {nome} enviou" quando o texto mudou | Assim | Nenhum membro escreve no lugar de quem mandou só áudio: as palavras atribuídas ao parente no livro são dele | Quem não consegue escrever depende de a transcrição funcionar (3 tentativas) |
| Q8 | **Arquivar tira da lista e do livro; o responsável apaga de vez** uma arquivada ("Apagar para sempre", com confirmação), com evento. Enviada não é apagada por mais nada, nem pela chave secreta. Rascunho não enviado é apagado em 48 h | Assim | Spam e pedido de quem enviou (LGPD) precisam de saída agora, não no prompt 15. Só o responsável, e em 2 passos, para ninguém apagar a voz de um parente por engano | A regra "áudio original nunca é apagado" ganha uma exceção para mensagens, só pelo responsável |
| Q9 | **QR de mensagem vai para o prompt 13.** Substitui a parte de T46 que o punha aqui | Assim | No 13, a montagem cria os QR de histórias e mensagens no mesmo passo. Lá, `mensagem_apagar` passa a recusar mensagem com QR impresso | Nada até o livro ser montado |
| Q10 | **Limites próprios, maiores que os do causo:** áudio até 5 min e 4 MB, foto até 4 MB, texto até 6.000 caracteres; 20 enviadas por hora e 40 por dia por livro; 100 rascunhos por dia por livro; 3 rascunhos abertos por aparelho; 3 transcrições por mensagem e 60 por livro por dia. O áudio cuja transcrição passa de 5 min e 10 s é recusado ("Grave de novo, mais curto"). Plano vencido fecha o link | Assim | O causo é uma sugestão de 3 min; a mensagem é um depoimento. O teto por hora conta só enviadas, para o convite a 30 pessoas não travar. A duração real vem da transcrição, não do aparelho. Pior caso de abuso num link vazado: ~US$ 13 por dia de transcrição até o André trocar o link | Uma família que mande mais de 40 num dia espera o dia seguinte |
| Q11 | **Quem gera ou troca o link:** qualquer membro gera o primeiro; trocar o link ativo é só do responsável (alinhado à P60 do prompt 11, depois da aprovação) | Assim | Mandar o link não é "convidar co-facilitador"; trocar derruba os rascunhos de quem está escrevendo, como nos links do autor e da família | O co-facilitador pede ao responsável para trocar |
| Q12 | **A página `/m` mostra só o apelido do autor.** Sem apelido: "Uma mensagem para o livro". Nunca o nome completo, nada do livro | Assim | Menos dado exposto num link que circula | O convite do WhatsApp dá o contexto |
| Q13 | **Um consentimento só, com texto específico** (versão 1): "Autorizo guardar minha voz, meu texto e minha foto no livro do {apelido}, enquanto o livro existir. A família que faz o livro pode ouvir, ajustar o texto e imprimir. A voz é transcrita por um serviço nos Estados Unidos." DPA, retenção zero no fornecedor e menores ficam para o prompt 15 | Assim | Duas caixas de seleção para um avô de 80 anos é atrito sem ganho real. O texto diz destino, prazo e quem vê | Revisão jurídica do texto no prompt 15 |

## 4. Como funciona

### 4.1 Quem deixa a mensagem (`/m/{token}`, celular, sem login)

Uma ação principal por tela:

1. **"Uma mensagem para o livro do Tio Nelson"** · "É surpresa: ele só vai ver no livro impresso." Campos *Seu nome* e *Quem você é para ele*. Botão **Gravar mensagem**; link *Prefiro escrever*.
2. **Gravar** (o gravador do causo, com teto de 5 min por parâmetro): gravar, pausar, ouvir, regravar. Abaixo: *Pôr uma foto* (opcional, comprimida no aparelho) e o consentimento (Q13). Botão **Continuar**.
3. **"Escrevendo o que você falou…"** (alguns segundos) → **Confira o texto.** Texto editável; *Ouvir de novo* toca do próprio aparelho. Botão **Enviar mensagem**. Se a transcrição falhar 3 vezes: "Não conseguimos escrever o áudio. Escreva a mensagem você mesmo."
4. **"Mensagem enviada. Obrigado!"** · "Quer mudar ou tirar sua mensagem? Peça a quem te mandou o link." · *Deixar outra mensagem*.

No caminho *Prefiro escrever*, o passo 2 é uma caixa de texto e o 3 não existe. Link revogado: "Este link não vale mais. Sua mensagem não foi enviada."

**Por baixo, na ordem.** Todas as chamadas são da ação do servidor com a chave secreta; nenhuma função do link é executável pela chave pública. O aparelho vem do cookie, nunca do formulário.
- `servico_mensagem_criar(token, aparelho, nome, relação, tipo do áudio, foto?, consentimento, versão)` cria o rascunho e fixa os caminhos (`livros/{livro}/mensagens/{id}.webm` e `…/{id}-foto.jpg`).
- O servidor assina o upload só para esses caminhos (`servico_caminho_mensagem`: só o aparelho que criou, só nos primeiros 30 min; a URL assinada do Supabase vale 2 h, mas a confirmação depois de 30 min é recusada). Antes de confirmar, confere no Storage o tamanho e os primeiros bytes (WebM `1A45DFA3`, Ogg `OggS`, MP4 `ftyp` no byte 4, JPEG `FFD8FF`) e só então chama `servico_confirmar_audio_mensagem` (com a duração do aparelho) ou `servico_confirmar_foto_mensagem`.
- Transcrição (Q4): `servico_mensagem_reservar_transcricao` devolve `{reserva, caminho, apelido}` → baixa o áudio → Scribe sem diarização, com o apelido como dica, `AbortSignal.timeout(45 s)` → `servico_mensagem_transcrita(…, reserva, texto bruto, fim da última palavra)`. Resposta `ok`: a ação devolve a sugestão (`limparTranscricao`). `ja_havia`: reserva de novo, que devolve o texto gravado. `audio_longo`: "Grave de novo". Falha: `servico_mensagem_transcricao_falhou(…, reserva)` libera só a própria reserva.
- `servico_mensagem_enviar(token, aparelho, id, texto)` muda para `enviada` e grava `texto` e `texto_enviado`. Devolve a transcrição bruta ao servidor só para calcular o booleano `alterou` do evento. A foto que não chegou fica de fora (caminho guardado, sem `foto_recebida_em`); uma foto que chegue depois do envio não entra (o gatilho recusa).

### 4.2 Os membros (`/livro/[id]/mensagens`)

- Entrada na home do livro: cartão *Mensagens da família* com a contagem ("3 mensagens · 2 no livro").
- **Ação principal:** *Convidar pelo WhatsApp*: abre `wa.me/?text=` com o convite e o link. Na primeira vez, gera o link.
  - Convite: "Estamos fazendo um livro com as histórias do {apelido}. É surpresa: não conte para ele. Deixe uma mensagem para o livro, gravada ou escrita: {link}"
- **Lista:** nome · relação, data, ▶ quando há áudio, as 2 primeiras linhas do texto e a chave **No livro**. Arquivadas num link discreto no fim ("2 arquivadas").
- **Tocar na mensagem** abre a folha inferior: ouvir, texto editável (salva ao sair do campo), "Ver o que {nome} enviou" quando o texto mudou, *Arquivar*. Na arquivada: *Voltar para a lista* e, só para o responsável, *Apagar para sempre* (confirmação: "A voz e o texto de {nome} somem. Não dá para desfazer.").
- **Ouvir:** a ação recebe só o id, lê a mensagem com o cliente da sessão (RLS) e assina o `audio_caminho` que veio do banco, por 10 min. Nunca um caminho vindo da tela.
- **Apagar:** `mensagem_apagar(id)` devolve os caminhos; a ação apaga os arquivos do bucket e registra `mensagem_apagada` (só ids).
- **Estado vazio:** "Ninguém deixou mensagem ainda." + *Convidar pelo WhatsApp*.
- **Dica de primeira vez (1 linha):** "Só entra no livro o que você marcar."
- **Trocar o link:** em *Configurações*, ao lado do link da família ("O link antigo para de funcionar").
- A lista se atualiza ao abrir a tela (sem tempo real; mensagem não é urgente).

### 4.3 Transcrição (`lib/mensagens/limpar.ts`)

O banco guarda o bruto: as palavras do Scribe (`normalizarScribe`, sem eventos de áudio) juntas como vieram. A sugestão mostrada à pessoa é o bruto sem hesitações isoladas (`ahn`, `hã`, `hum`, `hmm`, `éé`, `ãã`…), com a pontuação presa a elas. Nada mais muda: "né", "aí", "não, não" e "tchau tchau" ficam. Testes com casos reais, incluindo "é" verbo (fica) e "éé" hesitação (sai).

### 4.4 O que muda no código existente (revisão de código)

- `components/familia/gravador-causo.tsx`: props `maxMin` e textos, com o padrão do causo.
- `app/f/[token]/acoes.ts`: a assinatura e a confirmação de upload saem para um helper parametrizado (bucket, função de caminho, validador, MB, tipos), usado pelo causo e pela mensagem, incluindo foto. O causo continua com o comportamento de hoje.
- `lib/ai/transcricao/tipos.ts` e `elevenlabs.ts`: opção `diarizar` (padrão `true`); a mensagem usa `false`. Chave `ELEVENLABS_API_KEY` e modelo como no pipeline (`envPipeline`, conferindo que carrega numa ação).
- `proxy.ts`: `proxyFamilia(request, caminho)` parametrizado, desvio de `/m/` antes do ramo com sessão, `/m/:path*` no matcher, `Cache-Control: no-store`; `/m` público em `lib/rotas.ts`. Os cookies `ecoa_aparelho` de `/f` e `/m` convivem (caminhos diferentes).
- `lib/links.ts`: tipo `mensagem` e `urlMensagem`; comentário de `hashDoToken`.

## 5. Segurança

| Ameaça | Defesa |
| --- | --- |
| **O autor vê as mensagens** (a surpresa é o produto) | 5 camadas: (1) `porta_autor` e `anon` sem nenhum privilégio em `family_messages` e `message_access`; (2) política restritiva do prompt 10, intocada, também na tabela nova; (3) nenhuma função do link `/m` executável por `anon`, `authenticated` ou `porta_autor` (teste); (4) nenhuma função `autor_*` cita as tabelas (teste existente, agora com `message_access`); (5) as rotas `/a` não citam as tabelas, o bucket `mensagens` nem funções de mensagem (teste das rotas, estendido) |
| O autor ganha login no futuro | O autor nunca entra em `book_members` (o enum só tem responsável e co-facilitador; teste). Um "Meu livro" com login (P55) terá de manter isso |
| O autor recebe o link `/m` por engano | O link só escreve: vê o convite com o apelido, nenhuma mensagem. O convite diz "É surpresa: não conte para ele" |
| Token do autor ou da família usado em `/m` (e o contrário) | Cada link tem a sua tabela de hashes; o HMAC usa o tipo (`mensagem:{id}`). Testado nos dois sentidos |
| Quem tem o link lê mensagens dos outros | Nenhuma função devolve mensagem; a única coisa que volta é a transcrição do próprio rascunho, ao aparelho que o criou, enquanto é rascunho, pelo servidor |
| Abuso pelo link que circula | Só o servidor chama; 3 rascunhos abertos por aparelho, 100 por dia e 40 enviadas por dia por livro, 3 transcrições por mensagem e 60 por livro por dia, áudio de 4 MB com duração real conferida; o membro arquiva, o responsável apaga e troca o link. Sem limite por IP (o app não guarda IP); se precisar, regra no Firewall da Vercel |
| Arquivo falso no caminho | Caminho fixado pelo banco, URL assinada só para ele, bucket privado (só áudio e JPEG, 4 MB), tamanho e primeiros bytes conferidos antes de confirmar; a foto é recodificada no prompt 13 antes do PDF |
| Mensagem enviada alterada ou apagada | Gatilho: enviada não volta a rascunho; nome, relação, áudio, foto, `transcricao` e `texto_enviado` não mudam; DELETE só de rascunho ou pela marca de `mensagem_apagar` (vale só para aquela mensagem, na transação; teste) |
| Palavras atribuídas a quem não as disse | Enviar exige texto confirmado pela pessoa; `texto_enviado` fixo e visível ao membro (Q7) |
| Voz de terceiros fora do Brasil (LGPD) | Consentimento específico (Q13); só ElevenLabs processa; rascunho apagado em 48 h; o responsável apaga a pedido; a tela final diz a quem pedir |
| Texto da mensagem em logs ou no Inngest | Não passa pelo Inngest (Q4); eventos só com ids e booleanos (`audio`, `foto`, `alterou`) |
| Assinar áudio de outro livro | A ação de ouvir lê pelo cliente da sessão (RLS) e assina o caminho do banco; teste com membro de outro livro |
| Token vazando por Referer ou indexação | `/m` no proxy antes do ramo com sessão: `no-referrer`, `noindex`, `no-store`; teste do proxy |

## 6. Modelo de dados

`message_access` (novo, igual a `family_access`): `id`, `book_id`, `token_hash`, `chave_versao`, `criado_em`, `criado_por`, `revogado_em`. Um ativo por livro.

`family_messages` (a tabela vazia do prompt 10 ganha as colunas):

| Coluna | O quê |
| --- | --- |
| `access_id`, `aparelho_hash` | De que link e de que aparelho veio (o membro não lê) |
| `nome`, `relacao` | Quem escreveu e quem é para o autor |
| `estado` | `rascunho` → `enviada` ⇄ `arquivada` |
| `audio_caminho`, `audio_recebido_em`, `duracao_s`, `audio_recusado` | Áudio original, no bucket `mensagens`; recusado se passou de 5 min |
| `foto_caminho`, `foto_recebida_em` | Foto opcional |
| `transcricao`, `transcricao_tentativas`, `transcricao_reserva`, `transcricao_pedida_em` | O que a máquina escreveu (bruto, uma vez) e a reserva com dono |
| `texto`, `texto_enviado` | O texto de hoje (membros ajustam) e o que a pessoa enviou (fixo) |
| `consentimento_em`, `consentimento_versao` | LGPD |
| `enviada_em`, `no_livro`, `no_livro_em`, `no_livro_por`, `editado_em`, `editado_por` | Envio e curadoria |

## 7. SQL

Arquivos: `supabase/migrations/20261122120000_mensagens_familia.sql` (subida) e `supabase/reversao/20261122120000_mensagens_familia.down.sql` (reversão). Resumo da subida:

```sql
-- Espelhados em lib/config.ts (config-banco.test.ts confere)
max_mensagens_por_hora() = 20, max_mensagens_por_dia() = 40 (enviadas), max_rascunhos_por_dia() = 100,
max_rascunhos_por_aparelho() = 3, max_mensagem_audio_s() = 310, max_mensagem_caracteres() = 6000,
max_transcricoes_por_mensagem() = 3, max_transcricoes_por_dia() = 60, mensagem_rascunho_dura_h() = 48

-- 0. Trava: family_messages precisa estar vazia (está: 0 linhas em produção em 14/11).
-- 1. message_access: como family_access (um ativo por livro, revogação definitiva).
--    authenticated lê as colunas sem o hash, só do próprio livro; restritiva nega anon e porta_autor.
-- 2. family_messages ganha as colunas da seção 6 e as regras:
--    caminhos fixos por livro e mensagem (CHECK); enviada tem texto e texto_enviado, e o áudio,
--    se havia, chegou e não foi recusado; FK (book_id, access_id).
--    Gatilho: enviada não volta a rascunho; nome, relação, áudio, foto, transcrição e texto_enviado
--    não mudam; DELETE só de rascunho ou com ecoa.apagar_mensagem = id; nada de truncate.
--    Vale para a chave secreta.
--    authenticated lê 17 colunas (sem aparelho_hash, access_id, transcricao, consentimento),
--    política "membro lê enviadas" (estado <> rascunho, ou seja, enviadas e arquivadas, e membro
--    do livro). Nenhuma escrita direta. A política restritiva do prompt 10 fica como está.
-- 3. privado.link_da_mensagem(token), privado.rascunho_do_aparelho(token, aparelho, id) (trava a linha;
--    só rascunho do mesmo link, aparelho e livro, com menos de 48 h).
-- 4. Só service_role (o servidor): servico_mensagem_pagina, servico_mensagem_criar,
--    servico_mensagem_enviar, servico_caminho_mensagem, servico_confirmar_audio_mensagem,
--    servico_confirmar_foto_mensagem, servico_mensagem_reservar_transcricao (plano ativo, teto por
--    mensagem e por livro, reserva com id), servico_mensagem_transcrita (bruto, só com a reserva,
--    recusa áudio acima do teto), servico_mensagem_transcricao_falhou (só a própria reserva),
--    servico_trocar_link_mensagem (p_usuario da sessão), servico_mensagem_rascunhos_vencidos,
--    servico_mensagem_apagar_rascunhos. Todas as do link conferem token e aparelho.
-- 5. authenticated: mensagem_editar(id, texto), mensagem_no_livro(id, incluir), mensagem_arquivar(id,
--    arquivar) (membro do livro, plano ativo, só enviadas; arquivar tira do livro);
--    mensagem_apagar(id) → (audio_caminho, foto_caminho) (só o responsável, só arquivada, vale com o
--    plano vencido).
-- 6. Bucket privado 'mensagens' (4 MB; audio/webm, audio/mp4, audio/ogg, image/jpeg), sem políticas.
```

Erros novos com frase em `lib/erros-banco.ts`: `limite_mensagens`, `limite_rascunhos`, `mensagem_nao_encontrada`, `mensagem_sem_texto`, `audio_nao_chegou`, `audio_longo`, `limite_transcricao`, `mensagem_imutavel`.

Reversão: trava se houver mensagem ou link; forçada com `set ecoa.reversao_destrutiva = 'sim'`, volta `family_messages` às 3 colunas do prompt 10; o bucket só sai vazio.

**Livro com mensagem não é apagado** (FK `restrict` do prompt 10 e o gatilho). Apagar um livro inteiro não existe no produto; a exclusão por pedido formal (prompt 15) usa a mesma marca de sessão, para o livro todo.

## 8. Testes

**Banco (feitos e passando):** `supabase/tests/mensagens.test.ts`, 58 testes:
- Privilégios: `anon` e `porta_autor` sem nada nas duas tabelas; nenhuma função do link executável por `anon`, `authenticated` ou `porta_autor`; o autor nunca é membro (enum); `authenticated` lê exatamente as 17 colunas e não escreve; as duas políticas; membro vê enviadas e arquivadas do próprio livro (co-facilitador também), nunca rascunho, outro livro, o hash do aparelho ou a transcrição.
- Página: só o apelido; tokens inválido, da família, do autor e curto não abrem; o token `/m` não abre `/f`; livro sem apelido não mostra nome; trocar o link derruba o antigo; só membro gera; co-facilitador não troca o link ativo (P60).
- Criar: caminhos fixos; 8 entradas inválidas; plano vencido; 3 rascunhos por aparelho; 100 por livro por dia.
- Upload, transcrição e envio: caminho só para o mesmo aparelho e antes de chegar; duração declarada acima do teto; reserva de 2 min com dono, grava uma vez, devolve ao mesmo aparelho; falha alheia não libera; 3 tentativas; 60 por livro por dia; áudio longo pela transcrição recusado e não envia; outro aparelho não envia; áudio que não chegou trava; foto que não chegou fica de fora e não entra depois; texto sempre exigido; texto acima do limite; 20 enviadas por hora; rascunho de 49 h.
- Membros: editar, incluir e arquivar; texto vazio; outro livro, rascunho e anon barrados; apagar só pelo responsável e só arquivada.
- Imutável: enviada não é apagada nem truncada pela chave secreta; a marca de apagar vale só para a mensagem marcada; texto enviado, transcrição, nome, áudio, foto, recusar o áudio depois e voltar a rascunho recusados.
- Limpeza: só rascunhos vencidos. Reversão: trava, forçada passa, sobe de novo.
- Também mudaram: `qr.test.ts` (membro agora lê as enviadas; a restritiva continua; a reversão do 12 roda antes da do 10), `rls.test.ts` (4 funções novas de `authenticated`; `anon` sem nenhuma nova), `config-banco.test.ts` (9 números), `lib/familia/tabelas.ts` (`message_access` e `BUCKETS_DA_FAMILIA`), `lib/autor/rotas-autor.test.ts` (bucket e funções de mensagem). Suíte inteira: 721 passando.

**Unidade (a fazer):** `limparTranscricao`; primeiros bytes por tipo; token `mensagem` no HMAC; convite do WhatsApp; ações do `/m` com banco e Scribe falsos (assina só o caminho do banco, tamanho e bytes conferidos, corte de 45 s, `ja_havia` e `audio_longo`, falha libera só a própria reserva); ação de ouvir com membro de outro livro; proxy com `/m` (cookie `path=/m`, cabeçalhos, sem sessão).

**Supabase de verdade (depois de aplicar):** avisos de segurança do projeto, grants de `anon` e `authenticated` nas funções novas, bucket criado com 4 MB e os 4 tipos.

**Tela (Playwright no styleguide, a fazer):** `/m` nos estados (inicial, gravando, transcrevendo, conferir, falhou, áudio longo, enviada, link inválido, fechado); aba *Mensagens* (vazia, com 3, folha aberta, arquivada com *Apagar para sempre*).

**Gate de fim e de design:** como no `CLAUDE.md`. **Aceite do prompt:** 3 pessoas deixam mensagens pelo celular, o responsável inclui 2, e o autor não vê nada (o *Meu livro* não existe ainda, P55: o aceite vale pelos testes de banco e das rotas do autor).

## 9. Ordem de entrega

- **A. Banco:** migration, testes, `lib/config.ts`, frases dos erros. *(Feito no ensaio; aplicar no Supabase depois do OK e conferir os avisos.)*
- **B. Link e envio:** `lib/links.ts`, proxy e rotas, helper de upload (causo e mensagem), `app/m/[token]` (página com `maxDuration = 60` e ações), `lib/mensagens/` (tipos, limpar, transcrever, primeiros bytes), opção `diarizar`, gravador com teto por parâmetro, tela `tela-mensagem`.
- **C. Membros:** `app/livro/[id]/mensagens` (página e ações), `tela-mensagens`, cartão na home, trocar link em *Configurações*, eventos (`gerou_link_mensagem`, `deixou_mensagem`, `mensagem_no_livro`, `mensagem_editada`, `mensagem_arquivada`, `mensagem_apagada`).
- **D. Limpeza:** passo na varredura do Inngest (lista, apaga arquivos, apaga linhas).
- **E. Gate:** build, lint, testes, e2e, design, prévia na Vercel com 3 mensagens de verdade pelo celular.

## 10. Decisões novas para registrar depois do OK

- **P65:** link `/m` próprio, só de escrita, um ativo por livro; rascunho preso ao aparelho por 48 h; enviar exige texto confirmado pela pessoa; só entra no livro o que um membro marcar; membros ajustam o texto, e o enviado e a transcrição ficam fixos; arquivar tira do livro, e só o responsável apaga de vez (exceção à regra do áudio original, só para mensagens); consentimento único com destino, prazo e quem vê (Q2, Q5 a Q8, Q10 a Q13).
- **T48:** transcrição da mensagem só com Scribe (bruto guardado, sugestão sem hesitações), sem Claude; feita na ação do servidor (60 s, corte de 45 s) com reserva com dono no banco e até 3 tentativas, sem Inngest (exceção a T35 só para mensagens); a duração real vem da transcrição; todas as funções do link `/m` só com a chave secreta (Q3, Q4, Q10).
- **T49:** QR de mensagem no prompt 13, junto com a montagem. Substitui a parte de T46 que o punha no prompt 12 (Q9).

## 11. Revisão

Uma rodada, 2 revisores em Sonnet (T28). Os dois disseram "não aprovar ainda".

### Segurança (`critic_report.md`)

Nenhum caminho para o autor ou quem tem o link ler mensagens de outros.

| # | Achado | O que mudou |
| --- | --- | --- |
| 1 | Abuso: funções abertas ao `anon`, cota só por livro, rascunho conta, spam para sempre | Todas as funções do link só com a chave secreta; 3 rascunhos por aparelho; por hora só enviadas; 100 rascunhos por dia; o responsável apaga (Q5, Q8, Q10) |
| 2 | LGPD: exclusão impossível, quem enviou sem saída | `mensagem_apagar` (responsável, arquivada, com evento); a tela final diz a quem pedir; retenção de arquivadas não entrou (o apagar cobre) |
| 3 | Duração do cliente; custo | Bucket de 8 para 4 MB; duração real pela transcrição recusa acima de 5 min e 10 s; 60 transcrições por livro por dia |
| 4 | Mensagem só com áudio atribui texto de membro ao parente | Enviar exige texto; `texto_enviado` sempre preenchido e visível (Q7) |
| 5 | Autor com login no futuro | Teste: o autor nunca é membro (enum); registrado para o "Meu livro" |
| 6 | Consentimento agrupado, transferência | Texto específico (destino, prazo, quem vê). Caixas separadas não entraram (atrito para o avô); DPA, retenção zero e menores no prompt 15 (Q13). Transcrever só depois de *Enviar* não entrou: conferir o texto exige a transcrição antes |
| 7 | Limpeza junta repetições; bruto perdido | Regra de repetição saiu; o banco guarda o bruto; a sugestão só tira hesitações (Q3) |
| 8 | Upload: URL de 2 h, foto órfã, conteúdo | 2 h documentado (a confirmação é que fecha em 30 min); o caminho da foto nunca é apagado e foto atrasada não entra; primeiros bytes conferidos; recodificar no prompt 13 |
| 9 | Reserva sem dono, sem plano | `transcricao_reserva`; `livro_editavel` na reserva |
| 10 | `/m` fora do proxy | Desvio antes do ramo com sessão, cabeçalhos e teste (seção 4.4) |
| 11 | Nome completo, livro ao anon, `p_usuario` | Só o apelido; nada vai ao anon; `p_usuario` da sessão (comentário no SQL e regra no doc) |
| 12 | Evidência do Q1, assinatura do áudio | Conferência no Supabase de verdade depois de aplicar; regra id → RLS → assinatura com teste (4.2, 8) |

### Código (`codebase_details_report.md`)

| # | Achado | O que mudou |
| --- | --- | --- |
| 1 | Sem teto de tempo na transcrição | `maxDuration = 60` na página, corte de 45 s no Scribe, reserva de 2 min com dono (Q4) |
| 2 | 5 min só no cliente | Igual ao achado 3 de segurança |
| 3 | Gravador com teto fixo | Props `maxMin` e textos (4.4) |
| 4 | Ação do causo com constantes embutidas | Helper de upload parametrizado, com foto (4.4) |
| 5 | Diarização forçada | Opção `diarizar` (4.4) |
| 6 | Cookie e proxy só para `/f` | Proxy parametrizado, matcher, rotas (4.4) |
| 7 | Imutabilidade trava apagar livro | Registrado na seção 7; exclusão formal no prompt 15 |
| 8 | "Mesmos tetos do causo" | Q10 corrigida: tetos próprios, com motivo |
| 9 | Dica do apelido não chega | A reserva devolve o apelido |
| 10 | Reserva sem plano ativo | `livro_editavel` na reserva |
| 11 | "Só enviadas" × arquivadas | Doc corrigido (enviadas e arquivadas) |
| 12 | Versão do consentimento; comentário de `hashDoToken` | Doc corrigido; comentário na construção |
