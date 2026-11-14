# Mensagens da família para o livro (prompt 12)

Status: **v1 para revisão** · 2026-11-14 · PRD: M8, Papéis e permissões, Jornadas (Família), Livro pronto para a gráfica (estrutura do miolo), Segurança, LGPD · Decisões: P4, P7, P9, P12, P21, P23, P24, T5, T6, T23, T25, T26, T27, T28, T32, T35, T36, T38, T46

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
3. Áudio vira transcrição **na hora**, sem IA reescrevendo. A pessoa confere, corrige e envia.
4. Aba *Mensagens* para os membros: ouvir, ler, ajustar o texto, pôr ou tirar do livro, arquivar.
5. Segredo: nada do link `/m`, da tabela ou do bucket chega ao token do autor; testes de banco e das rotas.

**Fica de fora (com motivo):**
- **QR de mensagem:** vai para o prompt 13 (Q9). O áudio original fica guardado para sempre, e o QR só é preciso quando o livro é montado.
- **Capítulo no PDF e contagem de páginas:** prompt 13.
- **Editar depois de enviar (quem enviou):** depois de *Enviar*, só os membros mexem. Quem enviou não tem conta para voltar.
- **Áudio retomável (IndexedDB, TUS):** a mensagem tem 5 min. Reaproveita o gravador simples do causo, com envio único por URL assinada (como o causo).

## 3. Decisões que preciso de você

| # | Decisão | Recomendo | Por quê | O que se perde |
| --- | --- | --- | --- | --- |
| Q1 | **SQL (seção 7)** | Aprovar | Ensaiado em PGlite com as migrations reais: 44 testes novos; suíte inteira passando (704) | — |
| Q2 | **Link próprio `/m`**, separado do `/f` | Assim (você confirmou) | O André vai mandar para gente de fora do grupo. Um link separado é revogado sem derrubar o `/f`, e quem recebe não vê enquete nem causos | Mais um link para o André guardar (fica na aba *Mensagens*) |
| Q3 | **Transcrição: só ElevenLabs Scribe**, sem Claude. O código tira hesitações ("ahn", "hum", "éé") e palavras repetidas por gagueira ("eu eu"). Nenhuma palavra é trocada | Assim | É a voz de quem não é o autor. Uma IA "limpando" pode trocar uma palavra e a pessoa não perceber no celular. Tira um processador de dados (Anthropic) e uma chamada. A pessoa corrige o resto | Texto com marcas de fala ("né", "aí"): quem enviou ou o André ajusta |
| Q4 | **Transcrição dentro da ação do servidor**, sem Inngest: até 3 tentativas por mensagem, reservadas no banco por 2 min. Exceção a T35 só para mensagens | Assim | Quem enviou está esperando na tela; 5 min de áudio levam segundos no Scribe. Sem fila, sem consulta a cada 4 s, sem canal ao vivo. Se a resposta se perder na rede, a próxima chamada devolve o texto já gravado | Sem a retomada automática do Inngest: quem enviou toca *Tentar de novo*. Depois de 3 falhas: "Escreva você ou envie só o áudio" |
| Q5 | **O link só escreve.** O rascunho fica preso ao aparelho (cookie da rota `/m`, guardado como hash por livro, como o voto da enquete) e vale 48 h. Depois de *Enviar*, nem quem enviou lê de novo | Assim | O link vai circular fora do grupo. Quem o tiver não lê nada de ninguém, nem a lista. Se o autor receber o link por engano, vê só o convite, nenhuma mensagem | Recarregar a página no meio perde o rascunho (começa de novo) |
| Q6 | **Só entra no livro o que um membro marcar** (padrão: fora). Qualquer membro marca, inclusive co-facilitador | Assim | O capítulo é surpresa e o link circula: um texto ruim ou spam não pode ir para o papel sozinho. O aceite do prompt já pede "o responsável inclui 2". Pôr no livro não está na lista do que o co-facilitador não pode (P7) | Um toque por mensagem |
| Q7 | **Membros ajustam o texto.** O banco guarda para sempre o que a pessoa enviou (`texto_enviado`) e a transcrição da máquina (`transcricao`); o livro usa `texto`. Sem histórico de versões | Assim | Ajuste de mensagem é pequeno (pontuação, um nome). As duas cópias fixas bastam para voltar atrás e para medir o quanto a transcrição precisou de correção | Sem "desfazer" de várias edições (volta-se ao texto enviado) |
| Q8 | **Arquivar em vez de apagar.** Mensagem enviada nunca é apagada, nem pela chave secreta (gatilho). Rascunho não enviado (com áudio e foto) é apagado em 48 h pela varredura | Assim | Regra de ouro do PRD: áudio original nunca é apagado por ação comum. O rascunho nunca foi enviado: guardar seria juntar voz sem propósito (LGPD) | Spam fica guardado, arquivado. A exclusão por pedido formal (LGPD) vem no prompt 15 |
| Q9 | **QR de mensagem vai para o prompt 13.** Substitui a parte de T46 que o punha aqui | Assim | Mexer em `qr_codes` e no player agora seria a 2ª mudança em código impresso sem livro montado. No 13, a montagem cria os QR de histórias e mensagens no mesmo passo | Nada até o livro ser montado. O áudio já fica guardado |
| Q10 | **Limites:** áudio até 5 min, texto até 6.000 caracteres, 1 foto, 20 mensagens por hora e 40 por dia por livro (rascunhos contam), 3 transcrições por mensagem. Plano vencido fecha o link ("Este livro não recebe mensagens agora") | Assim | Os mesmos tetos do causo. O link circula fora do grupo, então o banco segura o abuso. 40 × 5 min = 200 min de transcrição por dia, menos de US$ 2 | Uma família muito grande que mande mais de 40 num dia espera até o dia seguinte |
| Q11 | **Quem gera ou troca o link:** qualquer membro, como o link da família | Assim | Mandar o link para alguém não é "convidar co-facilitador" (P7) | — |
| Q12 | **A página `/m` mostra só o apelido do autor.** Nada do livro, nenhuma foto | Assim | Menos dado exposto num link que circula | A página é mais "seca"; o convite do WhatsApp dá o contexto |

## 4. Como funciona

### 4.1 Quem deixa a mensagem (`/m/{token}`, celular, sem login)

Uma ação principal por tela:

1. **"Uma mensagem para o livro do Tio Nelson"** · "É surpresa: ele só vai ver no livro impresso." Campos *Seu nome* e *Quem você é para ele*. Botão **Gravar mensagem**; link *Prefiro escrever*.
2. **Gravar** (gravador do causo com teto de 5 min): gravar, pausar, ouvir, regravar. Abaixo: *Pôr uma foto* (opcional, comprimida no aparelho) e o consentimento. Botão **Continuar**.
   - Consentimento (versão 1): "Autorizo guardar minha voz, meu texto e minha foto no livro do {apelido}. A voz é transcrita por um serviço fora do Brasil."
3. **"Escrevendo o que você falou…"** (alguns segundos) → **Confira o texto.** Texto editável; *Ouvir de novo* toca do próprio aparelho. Botão **Enviar mensagem**. Se a transcrição falhar 3 vezes: "Não conseguimos escrever o áudio. Escreva você ou envie só o áudio."
4. **"Mensagem enviada. Obrigado!"** · *Deixar outra mensagem*.

No caminho *Prefiro escrever*, o passo 2 é uma caixa de texto e o 3 não existe.

**Por baixo, na ordem:**
- `mensagem_criar(token, aparelho, nome, relação, tipo do áudio, foto?, consentimento)` cria o rascunho e fixa os caminhos (`livros/{livro}/mensagens/{id}.webm` e `…/{id}-foto.jpg`).
- O servidor assina o upload só para esses caminhos (`servico_caminho_mensagem`, até 30 min, só o aparelho que criou), confere tamanho e tipo no Storage e confirma (`servico_confirmar_audio_mensagem` com a duração; `servico_confirmar_foto_mensagem`).
- Transcrição (Q4): `servico_mensagem_reservar_transcricao` → baixa o áudio → Scribe (sem diarização, com o apelido do autor como dica) → `limparTranscricao` → `servico_mensagem_transcrita` → o texto volta na resposta da ação. Falhou: `servico_mensagem_transcricao_falhou` libera a reserva.
- `mensagem_enviar(token, aparelho, id, texto)` muda para `enviada`, grava `texto` e `texto_enviado` e devolve `alterou` (se a pessoa mexeu na transcrição). A foto que não chegou cai, sem travar o envio.

### 4.2 Os membros (`/livro/[id]/mensagens`)

- Entrada na home do livro: cartão *Mensagens da família* com a contagem ("3 mensagens · 2 no livro").
- **Ação principal:** *Convidar pelo WhatsApp*: abre `wa.me/?text=` com o convite e o link. Na primeira vez, gera o link.
  - Convite: "Estamos fazendo um livro com as histórias do {apelido}. É surpresa: não conte para ele. Deixe uma mensagem para o livro, gravada ou escrita: {link}"
- **Lista:** nome · relação, data, ▶ quando há áudio, as 2 primeiras linhas do texto e a chave **No livro**.
- **Tocar na mensagem** abre a folha inferior: ouvir (URL assinada de 10 min), texto editável (salva ao sair do campo), *Arquivar*.
- **Estado vazio:** "Ninguém deixou mensagem ainda." + *Convidar pelo WhatsApp*.
- **Dica de primeira vez (1 linha):** "Só entra no livro o que você marcar."
- **Trocar o link:** em *Configurações*, ao lado do link da família ("O link antigo para de funcionar").
- A lista se atualiza ao abrir a tela (sem tempo real; mensagem não é urgente).

### 4.3 Transcrição limpa (`lib/mensagens/limpar.ts`)

Entrada: as palavras do Scribe (`normalizarScribe`, já sem eventos de áudio). Saída: texto corrido.
- Remove, sem trocar nada: hesitações isoladas (`ahn`, `hã`, `hum`, `hmm`, `éé`, `ãã`…) com a pontuação que vier presa nelas.
- Junta repetição imediata da mesma palavra sem pontuação entre elas ("eu eu fui" → "eu fui"). "Muito, muito" fica.
- Nada mais. "Né", "aí" e "tipo" ficam (podem ter sentido); quem enviou decide.
- Teste com casos reais em português, incluindo "é" verbo (fica) e "éé" hesitação (sai).

## 5. Segurança

| Ameaça | Defesa |
| --- | --- |
| **O autor vê as mensagens** (a surpresa é o produto) | 4 camadas: (1) `porta_autor` e `anon` sem nenhum privilégio em `family_messages` e `message_access`; (2) política restritiva do prompt 10, intocada, também na tabela nova; (3) nenhuma função `autor_*` cita as tabelas (teste existente, agora com `message_access`); (4) as rotas `/a` não citam as tabelas, o bucket `mensagens` nem funções de mensagem (teste das rotas, estendido) |
| O autor recebe o link `/m` por engano | O link só escreve: vê o convite com o próprio apelido, nenhuma mensagem. O convite diz "É surpresa: não conte para ele" |
| Token do autor ou da família usado em `/m` (e o contrário) | Cada link tem a sua tabela de hashes; o HMAC usa o tipo (`mensagem:{id}`). Testado nos dois sentidos |
| Quem tem o link lê mensagens dos outros | Nenhuma função devolve mensagem; o único texto que volta é a transcrição do próprio rascunho, ao aparelho que o criou, enquanto é rascunho |
| Spam ou abuso pelo link que circula | 20/h e 40/dia por livro no banco (rascunhos contam), 3 transcrições por mensagem, áudio de 5 min e 8 MB; o membro arquiva e troca o link |
| Upload de outra coisa no caminho | Caminho fixado pelo banco, URL assinada só para ele, bucket privado que aceita só áudio e JPEG, tamanho conferido antes de confirmar |
| Mensagem enviada apagada ou alterada | Gatilho: enviada não volta a rascunho e não é apagada, nem pela chave secreta; nome, relação, áudio, `transcricao` e `texto_enviado` não mudam |
| Texto da família vira código no PDF (prompt 13) | Entra como JSON lido pelo template (T43) |
| Voz de terceiros fora do Brasil (LGPD) | Consentimento no formulário, com versão; só ElevenLabs processa (Q3); rascunho não enviado é apagado em 48 h |
| Texto da mensagem em logs ou no Inngest | Não passa pelo Inngest (Q4); os eventos guardam só ids e booleanos (`audio`, `foto`, `alterou`) |
| Link com nome na URL | Token de 132 bits, sem nome; `Referrer-Policy: no-referrer` e `noindex` na rota `/m`, como em `/f` |

## 6. Modelo de dados

`message_access` (novo, igual a `family_access`): `id`, `book_id`, `token_hash`, `chave_versao`, `criado_em`, `criado_por`, `revogado_em`. Um ativo por livro.

`family_messages` (a tabela vazia do prompt 10 ganha as colunas):

| Coluna | O quê |
| --- | --- |
| `access_id`, `aparelho_hash` | De que link e de que aparelho veio (o membro não lê o hash) |
| `nome`, `relacao` | Quem escreveu e quem é para o autor |
| `estado` | `rascunho` → `enviada` ⇄ `arquivada` |
| `audio_caminho`, `audio_recebido_em`, `duracao_s` | Áudio original, no bucket `mensagens` |
| `foto_caminho`, `foto_recebida_em` | Foto opcional |
| `transcricao`, `transcricao_tentativas`, `transcricao_pedida_em` | O que a máquina escreveu (uma vez) e a reserva |
| `texto`, `texto_enviado` | O texto de hoje (membros ajustam) e o que a pessoa enviou (fixo) |
| `consentimento_em`, `consentimento_versao` | LGPD |
| `enviada_em`, `no_livro`, `no_livro_em`, `no_livro_por`, `editado_em`, `editado_por` | Envio e curadoria |

## 7. SQL

Arquivos: `supabase/migrations/20261121120000_mensagens_familia.sql` (subida) e `supabase/reversao/20261121120000_mensagens_familia.down.sql` (reversão). Resumo da subida:

```sql
-- Espelhados em lib/config.ts (config-banco.test.ts confere)
max_mensagens_por_hora() = 20, max_mensagens_por_dia() = 40, max_mensagem_audio_s() = 310,
max_mensagem_caracteres() = 6000, max_transcricoes_por_mensagem() = 3, mensagem_rascunho_dura_h() = 48

-- 0. Trava: family_messages precisa estar vazia (está: 0 linhas em produção em 14/11).
-- 1. message_access: como family_access (um ativo por livro, revogação definitiva).
--    authenticated lê as colunas sem o hash, só do próprio livro; restritiva nega anon e porta_autor.
-- 2. family_messages ganha as colunas da seção 6 e as regras:
--    caminhos fixos por livro e mensagem (CHECK); enviada completa (áudio e foto que ficaram
--    chegaram; tem texto ou áudio); no_livro só com texto; FK (book_id, access_id).
--    Gatilho: enviada não volta a rascunho nem é apagada; nome, relação, áudio, transcrição e
--    texto_enviado não mudam; nada de truncate. Vale para a chave secreta.
--    authenticated lê 17 colunas (sem aparelho_hash, access_id, transcricao, consentimento),
--    política "membro lê enviadas" (estado <> rascunho e membro do livro). Nenhuma escrita direta.
--    A política restritiva do prompt 10 fica como está.
-- 3. privado.link_da_mensagem(token), privado.rascunho_do_aparelho(token, aparelho, id) (trava a linha;
--    só rascunho do mesmo link, aparelho e livro, com menos de 48 h).
-- 4. anon: mensagem_pagina(token) → {autor, aberto} | null
--          mensagem_criar(token, aparelho, nome, relação, áudio?, foto?, consentimento, versão)
--          mensagem_enviar(token, aparelho, id, texto) → {id, livro, audio, foto, alterou}
-- 5. service_role: servico_caminho_mensagem, servico_confirmar_audio_mensagem,
--    servico_confirmar_foto_mensagem, servico_mensagem_reservar_transcricao,
--    servico_mensagem_transcrita, servico_mensagem_transcricao_falhou,
--    servico_trocar_link_mensagem, servico_mensagem_rascunhos_vencidos, servico_mensagem_apagar_rascunhos
--    (todas as do link ainda conferem token e aparelho).
-- 6. authenticated: mensagem_editar(id, texto), mensagem_no_livro(id, incluir), mensagem_arquivar(id, arquivar)
--    (membro do livro, plano ativo, só enviadas; arquivar tira do livro).
-- 7. Bucket privado 'mensagens' (8 MB; audio/webm, audio/mp4, audio/ogg, image/jpeg), sem políticas.
```

Erros novos com frase em `lib/erros-banco.ts`: `limite_mensagens`, `mensagem_nao_encontrada`, `mensagem_sem_texto`, `audio_nao_chegou`, `limite_transcricao`, `mensagem_imutavel`.

Reversão: trava se houver mensagem ou link; forçada com `set ecoa.reversao_destrutiva = 'sim'`, volta `family_messages` às 3 colunas do prompt 10; o bucket só sai vazio.

## 8. Testes

**Banco (feitos e passando):** `supabase/tests/mensagens.test.ts`, 44 testes:
- Privilégios: `anon` e `porta_autor` sem nada nas duas tabelas; `authenticated` lê exatamente as 17 colunas e não escreve; as duas políticas de `family_messages`; membro vê só enviadas do próprio livro (co-facilitador também), nunca rascunho nem outro livro, nem o hash do aparelho ou do link.
- Página: apelido e aberto; tokens inválido, da família, do autor e curto não abrem; o token `/m` não abre `/f`; trocar o link derruba o antigo; só membro troca.
- Criar: caminhos fixos; 8 entradas inválidas; plano vencido; limite por hora contando rascunhos.
- Upload, transcrição e envio: caminho só para o mesmo aparelho e antes de chegar; duração acima de 5 min e 10 s; reserva de 2 min, grava uma vez, devolve ao mesmo aparelho, 3 tentativas; outro aparelho não envia; áudio que não chegou trava; foto que não chegou cai; sem áudio exige texto; texto acima do limite; rascunho de 49 h.
- Membros: editar, incluir e arquivar; sem texto não entra; outro livro, rascunho e anon barrados.
- Imutável: enviada não é apagada nem truncada pela chave secreta; texto enviado, transcrição, nome, áudio e volta a rascunho recusados.
- Limpeza: só rascunhos vencidos. Reversão: trava, forçada passa, sobe de novo.
- Também mudaram: `qr.test.ts` (membro agora lê as enviadas; a restritiva continua; a reversão do 12 roda antes da do 10), `rls.test.ts` (3 funções novas de `anon` e 3 de `authenticated`), `config-banco.test.ts` (6 números), `lib/familia/tabelas.ts` (`message_access` e `BUCKETS_DA_FAMILIA`), `lib/autor/rotas-autor.test.ts` (bucket e funções de mensagem). Suíte inteira: 704 passando.

**Unidade (a fazer):** `limparTranscricao`; token `mensagem` no HMAC (`lib/links.ts`); convite do WhatsApp; ações do `/m` com o banco falso (assinar só o caminho do banco, tamanho e tipo conferidos, transcrição com Scribe falso, falha libera a reserva); proxy com `/m` (cookie com `path=/m`, cabeçalhos).

**Tela (Playwright no styleguide, a fazer):** `/m` nos estados (inicial, gravando, transcrevendo, conferir, falhou, enviada, link inválido, fechado); aba *Mensagens* (vazia, com 3, folha aberta).

**Gate de fim e de design:** como no `CLAUDE.md`. **Aceite do prompt:** 3 pessoas deixam mensagens pelo celular, o responsável inclui 2, e o autor não vê nada (o *Meu livro* não existe ainda, P55: o aceite vale pelos testes de banco e das rotas do autor).

## 9. Ordem de entrega

- **A. Banco:** migration, testes, `lib/config.ts`, frases dos erros. *(Feito no ensaio; aplicar no Supabase depois do OK.)*
- **B. Link e envio:** `lib/links.ts` (tipo `mensagem`, `urlMensagem`), proxy `/m`, `app/m/[token]` (página e ações), `lib/mensagens/` (tipos, limpar, transcrever), gravador do causo com teto por parâmetro, tela `tela-mensagem`.
- **C. Membros:** `app/livro/[id]/mensagens` (página e ações), `tela-mensagens`, cartão na home, trocar link em *Configurações*, eventos (`gerou_link_mensagem`, `deixou_mensagem`, `mensagem_no_livro`, `mensagem_editada`, `mensagem_arquivada`).
- **D. Limpeza:** passo na varredura do Inngest (lista, apaga arquivos, apaga linhas).
- **E. Gate:** build, lint, testes, e2e, design, prévia na Vercel com 3 mensagens de verdade pelo celular.

## 10. Decisões novas para registrar depois do OK

- **P59:** link `/m` próprio, só de escrita, um ativo por livro; rascunho preso ao aparelho por 48 h; só entra no livro o que um membro marcar; membros ajustam o texto, e o enviado e a transcrição ficam fixos; arquivar em vez de apagar (Q2, Q5 a Q8, Q10 a Q12).
- **T47:** transcrição da mensagem só com Scribe e limpeza por código (hesitações e gagueira), sem Claude; feita na ação do servidor, com reserva no banco e até 3 tentativas, sem Inngest (exceção a T35 só para mensagens) (Q3, Q4).
- **T48:** QR de mensagem no prompt 13, junto com a montagem. Substitui a parte de T46 que o punha no prompt 12 (Q9).

## 11. Revisão

*(A preencher depois da rodada dos 2 revisores, T28.)*
