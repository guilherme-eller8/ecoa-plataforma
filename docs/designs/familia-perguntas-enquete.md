# Configuração inicial, perguntas, causos e enquete da família

- **Autor:** Guilherme Eller (com Claude)
- **Status:** Revisado (segurança, prontidão e código), aguardando aprovação
- **Data:** 2026-11-10
- **Origem:** prompt 4 da sessão de 09/11/2026 · PRD: M2 (sem co-facilitadores), M3, jornadas do responsável e da família
- **Revisões:** [segurança](./familia-perguntas-enquete/critic_report.md) · [prontidão](./familia-perguntas-enquete/implementation_readiness_report.md) · [código](./familia-perguntas-enquete/codebase_details_report.md) · [resolução](./familia-perguntas-enquete/resolucao.md)

---

## Visão geral

Este design abastece o livro antes de o autor gravar:

- **Configuração inicial em 3 passos**, todos puláveis: quem é o autor, as primeiras 10 perguntas e as fotos.
- **Tela Perguntas** com 5 abas: Para perguntar, Enviadas, Respondidas, Causos e Enquete.
- **Link permanente da família**, `/f/[token]`, para fixar no grupo de WhatsApp. Por ele a família sugere causos (áudio de até 3 minutos ou texto) e vota na enquete aberta.
- **Kit de início**, que entrega os dois textos prontos: o convite do grupo e a mensagem para o autor.

O banco de perguntas é um rascunho de 150 perguntas em 8 temas, em `supabase/seed/perguntas.json`, para a tia Caia revisar.

## O problema

Depois do prompt 3, o responsável entra e vê um livro vazio. Ainda faltam três coisas:

- dizer à plataforma quem é o autor;
- escolher o que perguntar;
- chamar a família.

O PRD resolvia a escolha com "Me conte sobre ele" e perguntas geradas por IA, mas o laboratório de IA (prompt 1) ainda não existe. Um cliente real já espera para começar o livro. A família dele quer opinar sobre o que perguntar ao autor, e hoje não há como.

## Mudanças em relação ao PRD (decididas na sessão)

| PRD | Este design | Por quê |
| --- | --- | --- |
| Passo "Me conte sobre ele", com IA gerando glossário e 10 perguntas | Sai deste prompt. O passo 2 vira "Primeiras perguntas", com 10 do banco por parentesco | O laboratório (prompt 1) não existe; o passo volta quando a IA estiver provada |
| "Enquetes" fora das duas ondas | Entra no M3 | Um cliente esperando; a família escolhe as perguntas votando |
| Link `/c/[token]`, só para causos | Link `/f/[token]`, da família: enquete e causo | Um link fixado no grupo, não dois |
| Tabelas `book_context` e `glossary_entries` | Ficam para quando o "Me conte sobre ele" voltar | Sem uso neste prompt |
| Aba "Para enviar" | Aba **"Para perguntar"** (o estado no banco continua `para_enviar`) | Decisão do Guilherme em 10/11/2026: a lista é a base do livro, não uma fila de envio. Há duas saídas com o mesmo peso: *Enviar ao autor* (`wa.me`) e *Gravar agora*, com o filho gravando o pai na mesa (modo conversa, prompt 5). Uma pergunta gravada ao vivo vai direto de Para perguntar para Respondidas (pelo servidor, no prompt 5; o trigger já permite) |
| Realtime nas etapas ao vivo | Neste prompt, "ao vivo" é consulta a cada 4 s com a tela visível | O Realtime em tabela com votos vaza eventos de DELETE entre livros (revisão de segurança, M3); com 2 famílias, a consulta é barata e simples. O Realtime volta no prompt 6, com Broadcast por livro |
| CLAUDE.md: token de link com "128 bits aleatórios" | Token **imprevisível** de ≥128 bits, derivado por HMAC com segredo versionado; só o hash no banco | Aprovado pelo Guilherme em 10/11/2026: o link fixado no grupo precisa ser mostrado de novo. O CLAUDE.md já foi ajustado (commit do design) |

O `docs/prd.md` é atualizado no mesmo PR (M2, M3, a jornada da família e "Fora do escopo").

## Hipótese da enquete

- **Hipótese:** com a família votando, o responsável escolhe perguntas que geram histórias melhores, e a família se engaja antes da ceia.
- **Sinal de sucesso:** no livro do cliente que está esperando, em 7 dias,
  - pelo menos 5 pessoas votam;
  - pelo menos 3 perguntas saem da enquete para Para perguntar e depois são enviadas ao autor.
- **Critério de morte:** menos de 3 votantes em 7 dias. A aba Enquete sai do menu, e as tabelas ficam (sem custo).
- **Como medir:** `count(distinct votante)` em `poll_votes` e o estado das perguntas com `origem = 'enquete'`. Os eventos `votou` (com o `votante` em `detalhes`) e `enquete_salvou` dão a linha do tempo.

## Objetivos

1. Configuro o livro só com o nome em menos de 30 s. O caminho é: digitar o nome → Continuar → Salvar 10 perguntas → Pular fotos → kit (3 toques além de digitar).
   - Verificação: cronometrado no aceite; o e2e no styleguide confere que cada passo tem a ação principal visível sem rolar, a 390 px.
2. As 10 perguntas do parentesco chegam marcadas. Posso desmarcar, trocar por outras do banco e escrever perguntas ou causos próprios.
   - Verificação: e2e no styleguide; teste unitário de `iniciaisDo`.
3. Cada passo tem Pular e Depois. Depois deixa um cartão "Continuar configuração" na home do livro.
   - Verificação: teste unitário de `lib/livro/configuracao.ts`.
4. Fotos: várias de uma vez, com progresso. Ficam no acervo com largura e altura.
   - Verificação: manual no aceite.
5. Tela Perguntas: 5 abas. Adicionar do banco, escrever pergunta ou causo próprio, ou pergunta com foto do acervo. Enviar ao autor abre o `wa.me` com a mensagem pronta e marca a pergunta como enviada.
   - Verificação: e2e no styleguide; teste unitário de `lib/whatsapp.ts`.
6. Pelo link da família, alguém sem login sugere um causo com nome, áudio de até 3 min ou texto, e consentimento. O causo chega na aba Causos exatamente como enviado, sem IA, tocável em menos de 10 s (a aba se atualiza a cada 4 s).
   - Verificação: `familia.test.ts`; manual no aceite.
7. Virar pergunta cria a pergunta ligada ao causo, e o áudio de quem sugeriu continua acessível pela pergunta.
   - Verificação: `rls.test.ts` (inserir o prompt com `causo_id` e mudar o causo para `virou_pergunta` com a sessão; com o causo de outro livro, a FK recusa).
8. Enquete:
   - o responsável escolhe de 2 a 30 candidatos e abre;
   - quem abre o link informa o nome e marca até `VOTOS_POR_PESSOA` (5) itens;
   - um conjunto de votos por aparelho;
   - uma enquete aberta por livro.
   - Verificação: `familia.test.ts`.
9. Resultados ao vivo:
   - ranking com votos e nomes;
   - remover os votos de uma pessoa;
   - encerrar;
   - salvar as N mais votadas com 1 toque, ou uma a uma;
   - tudo vai para Para perguntar, sem duplicar.
   - Verificação: `ranking.test.ts`, teste de banco de `enquete_salvar`, aceite com 5 aparelhos.
10. Kit de início: o convite do grupo com o link da família e a mensagem para o autor com o link pessoal, que é um placeholder até o prompt 5. Enviar ao autor abre o `wa.me`.
    - Verificação: `whatsapp.test.ts` (textos e `wa.me`), `links.test.ts` (token estável), e2e do kit no styleguide (os dois `href` começam com `https://wa.me/?text=`).
11. O token do autor não lê `polls`, `poll_votes` nem `causos`. O link da família só alcança a enquete e o envio de causos do próprio livro.
    - Verificação: `familia.test.ts` e `autor-isolamento.test.ts`.

## Não objetivos

- "Me conte sobre ele", glossário e perguntas por IA (volta depois do prompt 1).
- Link pessoal do autor de verdade (prompt 5). Aqui só o placeholder na mensagem.
- Gravador resiliente, com cache no aparelho e upload em partes (prompt 5). O causo usa um gravador simples, de até 3 min, que sobe o áudio inteiro no fim.
- Receber um arquivo de áudio no causo (áudio encaminhado do WhatsApp). Grava-se na hora ou escreve-se.
- Lembrar com carinho (prompt 11) e co-facilitadores (prompt 11).
- Reordenar perguntas por arrastar: entram por ordem de criação.
- Apagar fotos do acervo, editar o texto de um causo e reabrir uma enquete encerrada.
- Seed do banco de perguntas em tabela. O app lê o JSON; o seed vem depois da revisão, se fizer falta.

## Perguntas em aberto

Nenhuma bloqueante. As três decisões da sessão estão nos itens 1 a 3 abaixo.

1. **Base:** P2 e P3 integrados nesta branch (feito, commit `ccdc7ab`).
2. **Enquete:** entra agora, com escopo completo.
3. **Fé:** as perguntas de fé ficam no banco, marcadas e filtráveis. Os 10 iniciais são neutros.

## Riscos e mitigações

| Risco | Mitigação |
| --- | --- |
| O link da família vaza para fora do grupo | Só alcança 3 portas (ver a página, votar e sugerir causo) de um livro; nada é lido além do apelido e da enquete aberta. O responsável troca o link no kit |
| Alguém vota várias vezes trocando de navegador, ou chama a função direto com aparelhos inventados | O cookie é a regra para quem usa a tela. O limite real fica no banco: no máximo 150 votantes por enquete e 300 trocas de voto por hora, sob trava. O responsável vê os nomes e remove votos |
| Spam de causos ou de uploads pelo link (o Storage grátis tem 1 GB para todas as famílias) | O causo nasce antes do áudio, e o limite (20 por hora e 40 por dia por livro, sob trava) vale ali. O servidor só assina o upload de um causo daquele livro que ainda espera áudio, criado há menos de 30 min, sem sobrescrever. Áudio de no máximo 2 MB (48 kbps, 3 min ≈ 1,1 MB). No pior caso, um link vazado ocupa 80 MB por dia |
| Upload ou leitura de áudio de outra família (`../`, `%2e%2e`) | O caminho é gerado pelo banco a partir do `book_id` e do `id` do causo; o CHECK é regex ancorada (`^livros/<livro>/causos/<id>\.(webm\|m4a\|ogg)$`), e o servidor valida a mesma regex antes de assinar |
| `LINKS_SEGREDO_V1` vaza | Com o segredo e os ids dos links, dá para refazer os tokens. Só fica no `.env.local` e na Vercel. Se vazar: criar `LINKS_SEGREDO_V2` e trocar os links; os links novos usam a versão 2 |
| Segredo trocado por engano | O token leva a versão da chave; os links ativos continuam usando a versão gravada em `family_access.chave_versao`. Trocar de verdade é criar uma versão nova, nunca editar a antiga (o guia de setup avisa) |
| Gravação no Safari do iPhone sai em mp4, não webm | O gravador escolhe o tipo com `MediaRecorder.isTypeSupported`; o bucket aceita mp4, webm e ogg |
| A consulta a cada 4 s pesa | Só com a aba Causos ou Enquete visível (`document.visibilityState`); são 2 famílias. O Realtime por livro entra no prompt 6 |
| O voto e o encerramento acontecem ao mesmo tempo | `familia_votar` trava a linha da enquete (`for update`); o voto que chega depois do encerramento recebe "sem enquete" |
| Fotos enchem o Storage grátis | Compressão no navegador (JPEG, lado maior de até 3000 px, cerca de 1,5 MB, suficiente para 21 cm a 300 DPI); no máximo 200 fotos por livro, conferido no banco; bucket com no máximo 5 MB e só JPEG |
| Toque duplo em "Salvar as 3 mais votadas" | `enquete_salvar` trava os itens e só conta o que de fato ligou; a pergunta do banco já na lista não duplica |
| Perguntas de fé reformada soam estranhas para famílias não cristãs | Fora dos 10 iniciais; aparecem com a marca Fé e podem ser filtradas |
| O banco de perguntas sem revisão chega ao cliente | `status: "rascunho"` no JSON. A tia Caia revisa antes do livro do cliente; o arquivo é a única fonte, e a troca de texto não mexe no banco de dados |

## Jornadas críticas (CUJs)

### CUJ 1: Configurar só com o nome (menos de 30 s)

1. O responsável entra pela primeira vez. `/livro/[id]` vê `configuracao = {}` e leva a `/livro/[id]/configurar/quem`.
2. Digita "Jair" e toca em Continuar. Sem parentesco, vale o conjunto `outro`.
3. Vê as 10 perguntas marcadas e toca em "Salvar 10 perguntas".
4. Nas fotos, toca em Pular e cai no kit.

### CUJ 2: Escolher as perguntas com cuidado

1. No passo 2, desmarca 3 perguntas.
2. Toca em Trocar e escolhe 2 do tema Infância.
3. Toca em "Escrever a minha", escolhe Causo e digita "Conta da vez em Guarapari".
4. Salva: 10 itens em Para perguntar.

### CUJ 3: A família sugere um causo

1. A Ana abre o link fixado no grupo e vê "Livro do Jair" e Sugerir um causo.
2. Toca em Sugerir, escreve o nome e grava 40 s.
3. Ouve, marca o consentimento e envia.
4. O responsável, com a aba Causos aberta, vê o causo aparecer e toca o áudio.

### CUJ 4: Enquete com 5 celulares

1. Na aba Enquete, o responsável toca em "Nova enquete", marca 8 candidatos (do banco e 1 causo) e toca em Abrir.
2. Cinco pessoas abrem o link, cada uma informa o nome, marca até 5 itens e toca em Votar.
3. O responsável vê o ranking subir sem recarregar e toca em Encerrar.
4. Toca em "Salvar as 3 mais votadas". As 3 aparecem em Para perguntar.

### CUJ 5: Enviar ao autor

1. Em Para perguntar, toca em "Enviar ao autor".
2. O WhatsApp abre com "Pai, uma pergunta para o seu livro: … Responda gravando aqui: [link]".
3. A pergunta vai para Enviadas.

### CUJ 6: Voto duplicado

1. O responsável vê "Ana" duas vezes no ranking (dois aparelhos).
2. Toca no nome e confirma "Remover os votos de Ana".
3. Os votos daquele aparelho somem.

## Plano técnico

```text
Responsável (sessão)                              Família (sem login)
  /livro/[id]                                        /f/[token]   (proxy grava o cookie ecoa_aparelho)
   ├─ configuracao vazia → /configurar/quem           │  servidor → cliente anon → familia_pagina(token, aparelho)
   ├─ /configurar/{quem,perguntas,fotos}              ├─ Votar → server action → familia_votar(...)
   ├─ /perguntas  (5 abas; consulta a cada 4 s)       └─ Sugerir causo → server action → familia_enviar_causo(...)
   └─ /kit        (link da família por HMAC)               com áudio: devolve o caminho fixo do causo
                                                            → servico_caminho_audio_causo → URL assinada (chave secreta)
  escrita simples: cliente da sessão (RLS)                  → navegador sobe → servidor confere o arquivo
  enquete_*: funções que conferem membro + plano            → servico_confirmar_audio_causo
  link da família: servico_trocar_link_familia (chave secreta, confere membro)

Banco: photos · prompts · causos · family_access · polls · poll_items · poll_votes  (RLS em todas)
Storage: buckets privados acervo e causos, sem políticas; só URLs assinadas pelo servidor
```

### Quem pode o quê no banco

| Tabela | anon (com ou sem token) | authenticated, membro do livro | service_role |
| --- | --- | --- | --- |
| `books` (colunas novas) | nada | altera apelido, parentesco, foto e `configuracao` com o plano ativo | tudo |
| `photos` | nada | lê; cria (até 200 por livro); altera a legenda | tudo |
| `prompts` | nada | lê; cria; altera texto, tipo, foto, ordem e estado (só nas transições da tela); apaga só em `para_enviar` | tudo |
| `causos` | nada (só por `familia_enviar_causo`) | lê os completos (texto, ou áudio já recebido); altera **só** `estado` | tudo |
| `family_access` | nada | lê **sem** `token_hash` | tudo (por `servico_trocar_link_familia`) |
| `polls` | nada | lê (sem os contadores internos) | tudo |
| `poll_items` | nada | lê | tudo |
| `poll_votes` | nada (só por `familia_votar`) | lê **sem** `aparelho_hash` | tudo |
| `porta_autor` (papel) | — | — | Sem grant em nenhuma das tabelas acima: será o dono das funções `autor_*` do prompt 5 |

- Toda escrita de membro passa por `privado.livro_editavel`. Com o plano vencido, UPDATE e DELETE afetam 0 linhas, e INSERT dá erro de RLS. A tela não chega a oferecer o botão (`estadoEfetivo`).
- Toda tabela filha aponta para o pai pelo par `(book_id, id)`. Uma pergunta nunca aponta para a foto ou o causo de outro livro, nem um voto para o item de outra enquete.
- Enquete e link da família **não têm** grant de escrita para `authenticated`. Só as funções abaixo, que conferem membro e plano ativo, mexem nelas. Assim, os invariantes não dependem de o código usar a porta certa: de 2 a 30 itens, nada entra em enquete encerrada, uma enquete encerrada não reabre e um link revogado não volta.
- Transições de `prompts.estado` com a sessão: `para_enviar ↔ pulada` e `para_enviar ↔ enviada`. O banco preenche `enviada_em`. `respondida` só vem do servidor (fluxo do autor, prompt 5).

**Funções:**

| Função | Quem executa | O que faz |
| --- | --- | --- |
| `familia_pagina(token, aparelho)` | anon | Apelido do autor, se o livro aceita envios, `votos_por_pessoa` e a enquete aberta (itens, meus votos, meu nome). `null` se o token é inválido ou foi revogado |
| `familia_votar(token, aparelho, nome, itens[])` | anon | Troca o conjunto de votos do aparelho na enquete aberta do livro do token. Tetos: 5 itens, 150 votantes, 300 trocas por hora |
| `familia_enviar_causo(token, nome, texto, audio_tipo, consentimento, versao)` | anon | Grava o causo, com até 20 por hora e 40 por dia por livro. Com áudio, devolve o caminho fixo do arquivo |
| `servico_caminho_audio_causo(token, causo)` | service_role | O caminho para assinar o upload, só para um causo daquele token que ainda espera áudio, criado há menos de 30 min |
| `servico_confirmar_audio_causo(token, causo, duracao)` | service_role | Marca o áudio como recebido, depois de o servidor conferir que o arquivo existe |
| `servico_trocar_link_familia(livro, usuario, id, hash, versao)` | service_role | Confere membro e plano ativo, revoga o link ativo e cria o novo, numa transação |
| `enquete_abrir(livro, itens)` | authenticated | Cria a enquete e os itens; marca os causos como `na_enquete` |
| `enquete_adicionar_item(enquete, item)` | authenticated | Acrescenta um candidato à enquete aberta (até 30) |
| `enquete_encerrar(enquete)` | authenticated | Encerra |
| `enquete_remover_votos(enquete, votante)` | authenticated | Remove os votos de uma pessoa |
| `enquete_salvar(enquete, itens[])` | authenticated | Cria as perguntas e liga os itens, sem duplicar, mesmo com toque duplo |

- Todas são `security definer`, com `search_path = ''`. As de `authenticated` começam com `privado.membro_editando(livro)`, que confere `eh_membro` e `livro_editavel`.
- Os erros saem só como códigos: `link_invalido`, `livro_fechado`, `dados_invalidos`, `quantidade_invalida`, `sem_enquete`, `item_invalido`, `limite_votantes`, `limite_por_hora`, `limite_causos`, `sem_consentimento`, `sem_permissao`, `enquete_aberta`, `enquete_encerrada`, `limite_itens`, `cota_fotos`, `transicao_invalida` e `link_ja_revogado`. Os erros que o Postgres levanta sozinho (constraint, cast, RLS) têm uma frase de reserva por SQLSTATE (ver Comportamento detalhado). `lib/erros-banco.ts` traduz cada um para uma frase da tela. Um teste confere que todo código levantado no SQL tem tradução.
- A entrada tem o tamanho conferido antes de qualquer processamento.
- O servidor chama as funções `familia_*` com um cliente **anon** (chave pública, sem sessão). Se o código do servidor errar, a única porta continua sendo a função. A chave secreta só chama as funções `servico_*` e cria URLs assinadas no Storage.

### Token do autor e isolamento

O token do autor ainda não tem uso (prompt 5). O isolamento pedido é garantido por privilégio e por testes que já valem para o prompt 5:

- `anon` não tem nenhum grant em tabela. As únicas funções executáveis por `anon` são as 3 `familia_*`, numa lista fechada testada.
- As funções `familia_*` só aceitam tokens de `family_access`: um token do autor (`author_access`) não abre nada.
- O papel `porta_autor` (sem login) nasce agora, sem grant em `polls`, `poll_items`, `poll_votes`, `causos` e `family_access`. O prompt 5 cria as funções `autor_*` como `security definer` **com dono `porta_autor`**: mesmo com um erro no SQL delas, o Postgres nega a leitura. O teste confere `has_table_privilege('porta_autor', …) = false` em cada tabela da família, e o prompt 10 acrescenta `family_messages` à lista.
- Teste complementar: a busca por essas tabelas no corpo de toda função `autor_*` (`pg_proc.prosrc`).

### Links sem login: token derivado por HMAC, com versão de chave

- `token = "v" + versao + "_" + base64url(HMAC-SHA256(LINKS_SEGREDO_V{versao}, "familia:" + family_access.id))`, com o HMAC cortado em 22 caracteres (132 bits). O token inteiro tem 25 caracteres. Exemplo: `v1_Xk3…`. Sem ponto: o `matcher` do `proxy.ts` exclui caminhos que terminam em `.<letras>` (arquivos estáticos).
- O banco guarda `token_hash = sha256(token)` em hexadecimal e `chave_versao`. O token puro nunca é gravado.
- **Gerar** (toque em "Pegar o link do grupo", na primeira visita ao kit, numa server action e não no GET):
  1. O servidor confere a sessão.
  2. Cria o `id` e calcula o token e o hash com a versão atual (`LINKS_VERSAO_ATUAL`).
  3. Chama `servico_trocar_link_familia`, que confere membro e plano ativo de novo.
- **Mostrar de novo:** o servidor lê `id` e `chave_versao` do link ativo (o membro lê esses dois, não o hash) e recalcula o token.
- **Trocar o link:** a mesma função revoga o ativo e cria um novo. Um link revogado não volta: um trigger impede `revogado_em` de mudar depois de preenchido.
- **Rotação do segredo:**
  - criar `LINKS_SEGREDO_V2` e mudar `LINKS_VERSAO_ATUAL` para 2;
  - os links ativos continuam valendo com a V1 até serem trocados;
  - nunca editar o valor de uma versão existente.
- **Por quê:** um link fixado no grupo precisa ser mostrado de novo semanas depois. Mostrar só uma vez obrigaria a trocar o link do grupo toda vez que alguém o perdesse.
- O CLAUDE.md já diz "imprevisíveis, com 128 bits ou mais, só o hash". O prompt 5 usa o mesmo esquema para o autor (`"autor:" + id`).
- `envLinks()`, em `lib/env-links.ts` (separado de `envServidor()`, para que faltar o segredo não derrube o admin nem o e-mail), valida `LINKS_VERSAO_ATUAL` e toda `LINKS_SEGREDO_V1` … `V{atual}` (≥32 caracteres cada).

### Voto por aparelho

- O `proxy.ts`, só nas rotas `/f/*`, grava o cookie `ecoa_aparelho` (`crypto.randomUUID()`), caso ainda não exista. Ele é httpOnly, SameSite=Lax, Secure em produção e dura 400 dias.
- O cookie entra na resposta **e** na requisição. Assim a página já o lê no primeiro acesso.
- O proxy também acrescenta `Referrer-Policy: no-referrer` e `X-Robots-Tag: noindex` em `/f/*`.
- O banco guarda `sha256("aparelho:" + livro + ":" + valor)`, nunca o valor. O mesmo celular tem hashes diferentes em livros diferentes.
- `votante` é um uuid por aparelho e enquete: é o que agrupa os votos de uma pessoa no ranking e o que o responsável remove.
- Votar de novo com a enquete aberta troca o conjunto inteiro. A tela mostra "Seu voto foi registrado" e "Mudar meu voto".
- **O cookie é a regra para quem usa a tela, não uma defesa.** A função é pública e aceita qualquer valor de aparelho. O limite real fica no banco:
  - 150 votantes por enquete;
  - 300 trocas de voto por hora por enquete;
  - tudo sob a trava da enquete.
- Remover os votos de alguém não impede um novo voto. A confirmação diz: "Remover os votos de Ana? Ela ainda pode votar de novo."
- `lib/config.ts` (`VOTOS_POR_PESSOA` = 5, `MAX_VOTANTES_POR_ENQUETE` = 150, `MAX_TROCAS_VOTO_POR_HORA` = 300, `MAX_ITENS_ENQUETE` = 30) é espelhado em `privado.*`. Um teste garante que os valores batem.

### Ranking

- `lib/enquete/ranking.ts` (função pura) recebe os itens e os votos e devolve, por item: total, uma entrada por `votante` (nome e id, em ordem de chegada) e posição. Ordem: mais votos primeiro; no empate, `poll_items.ordem`.
- `topN(ranking, n)` devolve os itens com pelo menos 1 voto, até N. "Salvar as N mais votadas" usa esse resultado. Um empate na fronteira não estica a lista: o critério é a ordem, mostrado na tela.
- Na tela, N começa em 3 e vai de 1 a 10 (`− 3 +`).
- "Ao vivo": `components/livro/atualizar-sozinho.tsx` chama `router.refresh()` a cada 4 s enquanto a aba Enquete ou Causos está aberta e a página visível.

### Causos

- **Formulário em `/f/[token]`:** nome (lembrado no aparelho), Gravar ou Escrever, e a caixa de consentimento com a frase "Concordo em enviar meu áudio ou texto para o livro do Jair, que a família vai guardar." A frase tem versão (`CONSENTIMENTO_CAUSO_VERSAO` = 1 em `lib/config.ts`), gravada em `consentimento_versao`.
- **Gravador simples** (`components/familia/gravador-causo.tsx`):
  - MediaRecorder com gravar, parar, ouvir e regravar, a 48 kbps (`audioBitsPerSecond`);
  - um cronômetro que para sozinho em 3:00 (`MAX_CAUSO_AUDIO_MIN`);
  - tipo `audio/webm;codecs=opus` se o aparelho suporta, senão `audio/mp4` (iPhone).
- **Envio com áudio:**
  1. A server action chama `familia_enviar_causo` com `audio_tipo` (`webm` ou `m4a`), que devolve `{ id, audio_caminho }`. O limite por hora e por dia já vale aqui.
  2. `POST /f/[token]/audio` com `causo` e o tamanho (≤ 2 MB):
     - chama `servico_caminho_audio_causo`; sem caminho, devolve 404;
     - confere o caminho com a regex de `lib/arquivos.ts`;
     - cria a URL assinada de upload no bucket `causos`, sem sobrescrever.
  3. O navegador sobe o arquivo.
  4. A server action `confirmarAudio`:
     - confere no Storage que o arquivo existe e tem até 2 MB;
     - chama `servico_confirmar_audio_causo` com a duração medida no aparelho.
  - Até o passo 4, o causo não aparece na aba. Se o upload falhar, a tela oferece "Tentar de novo" (passos 2 a 4, por até 30 min).
- **Envio só com texto:** passo 1, sem áudio, e pronto.
- **Aba Causos:** nome, quando chegou, texto ou player. A URL assinada de 1 hora é pedida no toque em Ouvir, depois de a sessão ler o causo pela RLS (ver Comportamento detalhado). Botões Virar pergunta e Pôr na enquete. Os causos já usados mostram o selo do estado.
- **Virar pergunta:** abre a folha com o texto pré-preenchido (o texto do causo, ou "Conte a história que {nome} pediu"), editável. Salvar faz duas coisas:
  - insere o prompt com `origem = 'causo'` e `causo_id`;
  - muda o causo para `virou_pergunta`.
  - O áudio continua no causo; o prompt 5 toca "A Ana pediu:" a partir de `causo_id`.
- **Pôr na enquete:** se há enquete aberta, chama `enquete_adicionar_item`. Se não há, abre "Nova enquete" com o causo já marcado.

### Fotos

O Supabase está no plano grátis: 1 GB de Storage para todas as famílias e sem redimensionamento no servidor.

- No passo 3 e na folha "Com foto": `<input type="file" accept="image/*" multiple>`.
- **No navegador** (`lib/fotos/comprimir.ts`):
  - cada foto é desenhada num canvas com o lado maior de até 3000 px e salva em JPEG 0,9 (cerca de 1,5 MB);
  - isso converte HEIC no iPhone e mantém o suficiente para 21 cm a 300 DPI (2480 px);
  - a largura e a altura vêm do próprio canvas.
- A server action `prepararFotos(livro, quantidade)` confere membro, plano ativo e a cota (200 por livro) e devolve URLs assinadas de upload em `acervo`, no caminho `livros/{livro}/acervo/{uuid}.jpg` (até 30 por vez).
- O navegador sobe 3 por vez, com uma barra de progresso.
- A action `registrarFotos` insere as linhas em `photos` com a sessão. O banco também confere a cota.
- **Miniatura:** o próprio arquivo, por URL assinada de 1 hora, com `object-cover` e `loading="lazy"`.
- **Foto do autor (passo 1):** o mesmo caminho, com 1 arquivo; grava `books.autor_foto_id`.

### Configuração inicial

- **Estado em `books.configuracao`:** `{ "quem": "feito"|"pulado"|"depois", "perguntas": …, "fotos": … }`.
- **Regras** em `lib/livro/configuracao.ts`, funções puras e testadas:
  - `proximoPasso(cfg)`: o primeiro passo sem estado, ou `null`;
  - `precisaConfigurar(cfg, plano)`: só `{}` com plano ativo leva ao passo 1 na primeira entrada;
  - `pendentes(cfg)`: os passos `depois` e os sem estado, para o cartão da home.
- **Rodapé de todo passo:** a ação principal; **Pular** (texto) marca `pulado` e avança; **Depois** (texto) marca `depois` e volta para a home.
- **Passo 1, Quem é:**
  - Nome (já preenchido com `autor_nome`, obrigatório), Apelido ("Como a família chama", opcional) e Parentesco: `Seletor` do P2 (`<select>`) com Pai, Mãe, Avô, Avó, Tio, Tia e Outro, opcional.
  - "Pôr uma foto" é opcional, um botão secundário.
- **Passo 2, Primeiras perguntas:**
  - lista com caixas, as 10 de `iniciaisDo(parentesco ?? "outro")` marcadas;
  - botões Trocar (folha com o banco: temas em chips, filtro Fé e busca simples) e "Escrever a minha" (folha: Pergunta ou Causo, e o texto);
  - ação principal: "Salvar N perguntas", que insere em `prompts` (`origem` banco ou propria) e ignora as do banco que já estão na lista (lê os `banco_id` antes e filtra). Com N = 0, o botão fica desabilitado.
- **Passo 3, Fotos:** "Escolher fotos", progresso e miniaturas. Ação principal Continuar.
- **Fim:** vai para `/livro/[id]/kit`.
- O texto das perguntas troca "ele/ela" pelo apelido quando o JSON usa `{apelido}`. No rascunho, nenhuma pergunta usa `{apelido}`: todas estão em 2ª pessoa, porque o autor é quem lê.

### Banco de perguntas

- **`supabase/seed/perguntas.json`:**

```json
{
  "status": "rascunho",
  "revisado_por": null,
  "temas": [{ "id": "raizes", "nome": "Pais, raízes e origens" }],
  "perguntas": [{ "id": "raizes-01", "tema": "raizes", "texto": "…", "fe": false }],
  "iniciais": { "pai": ["…10 ids"], "mae": [], "avo": [], "avoa": [], "tio": [], "tia": [], "outro": [] }
}
```

- **8 temas:** `raizes`, `infancia`, `estudos`, `juventude`, `trabalho`, `amor`, `filhos`, `legado`.
- **Origem:** as 127 do anexo "Banco de Perguntas-Gatilho", mais 23 novas, todas neutras, nos temas mais curtos (`estudos`, `infancia`, `amor`).
- **Marca `fe: true`:** as 30 marcadas como Fé & Aliança no anexo.
- **Ids estáveis:** a revisão pode mudar o texto, mas não o id (`prompts.banco_id` aponta para ele).
- **`lib/perguntas/banco.ts`:** valida o JSON com zod ao importar e exporta:
  - `TEMAS`;
  - `PERGUNTAS`;
  - `perguntaPorId`;
  - `perguntasDoTema(tema, { fe })`;
  - `iniciaisDo(parentesco)`.
- **Teste:**
  - exatamente 150 perguntas, 8 temas e ids únicos;
  - todo `tema` existe;
  - 7 conjuntos de exatamente 10 ids válidos;
  - nenhum `fe: true` nos conjuntos;
  - nenhum texto com mais de 300 caracteres.

### Telas

| Rota | Ação principal | Resto |
| --- | --- | --- |
| `/livro/[id]` | Perguntas | Cartão "Continuar configuração" (se houver passo em Depois); "Convidar a família" (kit); estado somente leitura do P3 |
| `/livro/[id]/configurar/quem` | Continuar | Pular, Depois, Pôr uma foto |
| `/livro/[id]/configurar/perguntas` | Salvar N perguntas | Trocar, Escrever a minha, Pular, Depois |
| `/livro/[id]/configurar/fotos` | Escolher fotos → Continuar | Pular, Depois |
| `/livro/[id]/kit` | Pegar o link do grupo (1ª vez), depois Enviar ao grupo (WhatsApp) | Copiar convite; Enviar ao autor; Copiar mensagem; Trocar o link (dois passos, avisa que o link antigo para) |
| `/livro/[id]/perguntas` | Adicionar | Abas: Para perguntar (Enviar ao autor, ⋯ Apagar/Pular), Enviadas, Respondidas, Causos, Enquete |
| `/livro/[id]/perguntas?aba=enquete` | Nova enquete, ou Encerrar / Salvar as N mais votadas | Ranking ao vivo, nomes tocáveis para remover, Salvar uma a uma |
| `/f/[token]` | Votar (se há enquete), senão Sugerir um causo | Sugerir um causo como secundário, quando há enquete |
| `/f/[token]` (inválido) | — | "Este link não vale mais. Peça o novo no grupo." (404) |

- Ações do responsável: server actions em `app/livro/[id]/*/acoes.ts`. Todas leem o livro com `livrosDoMembro` (filtro explícito), escrevem com o cliente da sessão e registram o evento em `after()`.
- Ações novas em `lib/eventos-acoes.ts`:
  - `configurou`, `subiu_fotos`, `adicionou_pergunta`, `enviou_pergunta`;
  - `gerou_link_familia`, `trocou_link_familia`, `virou_pergunta`;
  - `abriu_enquete`, `encerrou_enquete`, `enquete_salvou`, `removeu_voto`, `votou`.
  - `sugeriu` já existe. Na família, `quem` é `null` e `papel` é `familia`.
- **Mensagens de WhatsApp** em `lib/whatsapp.ts`, funções puras: `linkWhatsApp(texto)`, `conviteDoGrupo({ autor, link })` e `mensagemAoAutor({ autor, link })`.
- **Placeholder do link do autor** em `lib/links.ts`: `linkDoAutor()` devolve `urlDoApp() + "/a/em-breve"` com o comentário `// TODO(prompt 5)`. A rota `/a/em-breve` mostra "Seu link chega em breve".

### Comportamento detalhado (revisão de prontidão)

**Erros na tela:**
- Toda server action devolve o `Resultado` de `lib/resultado.ts` (`{ ok, mensagem }`). O erro aparece como `Aviso` logo abaixo da ação que o gerou, e o formulário mantém o que foi digitado.
- `lib/erros-banco.ts` traduz:
  - primeiro o código nosso (a lista de "Quem pode o quê", mais `link_ja_revogado`);
  - depois o SQLSTATE de reserva: `23505` "Isso já foi feito, atualize a tela"; `23514`/`22P02` "Algo não está certo, confira e tente de novo"; `42501` "Este livro não aceita mudanças agora";
  - por fim, uma frase genérica.
- UPDATE e DELETE pela sessão usam `.select("id")`. Zero linhas devolvidas vira `livro_fechado` (plano vencido) e nunca "salvo".
- Leituras listam as colunas: `select('*')` em `poll_votes`, `polls` e `family_access` dá permission denied por causa do grant por coluna.

**Estados vazios** (uma frase e, quando cabe, um botão):

| Lugar | Texto | Botão |
| --- | --- | --- |
| Para perguntar | "Escolha o que perguntar ao Jair." | Adicionar |
| Enviadas | "Nada enviado ainda." | — |
| Respondidas | "As respostas do Jair aparecem aqui." (fica vazia até o prompt 5) | — |
| Causos | "Os causos que a família sugerir chegam aqui." | Convidar a família (kit) |
| Enquete, nunca aberta | "Deixe a família votar no que perguntar." | Nova enquete |
| Enquete encerrada | Mostra o resultado da última | Nova enquete |
| `/f` sem enquete | Só "Sugerir um causo" | — |
| `/f` com o livro fechado | "Este livro não está recebendo sugestões agora." | nenhum |
| `/f` com token inválido | "Este link não vale mais. Peça o novo no grupo." | nenhum |

- `/f` com token inválido sai com status 200 e `noindex`. Com `cacheComponents`, o `notFound()` dentro de `<Suspense>` vira 200 (o `lib/rotas.ts` já registra isso). Validar no proxy custaria uma chamada ao banco por acesso.

**Perguntas:**
- **A lista é a base, não uma fila de envio.** O cartão mostra o texto e as ações discretas ("Enviar ao autor" e ⋯). Neste prompt não há botão desabilitado de "Gravar agora": ele entra no prompt 5, ao lado de "Enviar ao autor", com o mesmo peso.
- **Puladas:** ficam em Para perguntar, num grupo recolhido "Puladas (n)" no fim, com "Voltar para a lista".
- **Enviadas:** cada cartão tem "Desfazer envio" (`enviada → para_enviar`).
- **Enviar ao autor:** é um `<a href="https://wa.me/?text=…" target="_blank">`, para o celular abrir o WhatsApp no toque. No mesmo toque, sem esperar, a action marca a pergunta como `enviada`. Se a action falhar, um aviso diz "Não marquei como enviada" e oferece "Marcar agora".
- **Mensagens:** todas saem de `lib/whatsapp.ts`. O `demo-folha.tsx` do styleguide passa a usar a mesma função.

**Passo 2 (primeiras perguntas):**
- "Salvar N perguntas" fica desabilitado com N = 0. Nesse caso a saída é Pular.
- Antes do insert, a action lê os `banco_id` já existentes no livro e filtra. O upsert do PostgREST não alcança o índice parcial.
- Uma pergunta escrita com mais de 500 caracteres é recusada no campo, com o contador visível.

**Configuração:**
- `precisaConfigurar(cfg, plano)` é verdadeiro só com `cfg = {}` **e** plano ativo. Só nesse caso a primeira entrada leva ao passo 1.
- `pendentes(cfg)` lista os passos `depois` **e** os sem estado. O cartão "Continuar configuração" da home mostra o primeiro deles.
- Quem fecha o app no meio do caminho encontra o cartão, não um redirecionamento: a plataforma lembra sem insistir.

**Nova enquete:**
- Os candidatos vêm de três fontes:
  - do banco (as que ainda não estão em perguntas);
  - texto próprio;
  - causos `novo` ou `na_enquete`.
- Perguntas que já estão em Para perguntar não entram como candidatas (evita duplicata, porque o `on conflict` só protege `banco_id`).
- Um causo vira candidato com o texto dele cortado em 500 caracteres. Um causo só de áudio vira "Conte a história que {nome} pediu".
- "Salvar" funciona com a enquete aberta ou encerrada.
- Um item de causo salvo muda o causo para `virou_pergunta`.

**Ranking:**
- Uma entrada por `votante`: duas "Ana" aparecem duas vezes, como no CUJ 6.
- No empate, vale `poll_items.ordem`.

**Áudio do causo:**
- **Player:** a URL assinada é pedida só no toque em Ouvir (server action `urlDoAudio(causo)`). Fica guardada no cliente por `causo.id` até vencer (1 hora). O `router.refresh()` a cada 4 s não reinicia o player, e a atualização pausa enquanto há áudio tocando.
- **Tentar de novo:** primeiro chama `confirmarAudio`. Só pede uma nova URL se o arquivo não existir (`storage.from('causos').info(caminho)`).
- **`contentType`:** sobe sem `;codecs=` (`audio/webm` ou `audio/mp4`). O tamanho é conferido pelo `info()` antes de confirmar.
- **Gravar e Escrever são exclusivos:** o banco recusa os dois juntos (`dados_invalidos`).
- **Nome lembrado:** fica em `localStorage` (`ecoa_nome`), dentro de try/catch.

**Fotos:**
- `prepararFotos` e `registrarFotos` ficam em `app/livro/[id]/fotos/acoes.ts` e servem ao passo 1, ao passo 3 e à folha "Com foto".
- `registrarFotos` registra só as que subiram. Cada falha mostra "Tentar de novo" na miniatura.
- Um arquivo que subiu e não foi registrado fica órfão. É aceito, porque só membro sobe e o limite de 30 por envio vale.

**Eventos e medição:**
- `familia_votar` e `familia_enviar_causo` devolvem o `livro` (e o `votante`). O evento sai com `book_id` e `detalhes: { votante }`.
- A hipótese é medida por `count(distinct votante)` em `poll_votes` e pelas perguntas com `origem = 'enquete'`.

**Next 16:**
- As rotas novas seguem o padrão de `app/livro/[id]/page.tsx`: `params.then` dentro de `<Suspense>`.
- `cookies()` e `searchParams` (`?aba=`) são lidos dentro do Suspense.
- `POST /f/[token]/audio` usa `RouteContext` com `await params`.
- `router.refresh()` e `after()` existem na 16.4.3.

**Proxy:**
- `/f/*` entra explicitamente no `matcher` (`/f/:path*`), além do padrão atual.
- O cookie entra em `request.cookies.set` **antes** de `getClaims()` e de qualquer `NextResponse.next({ request })`.
- Na resposta final, inclusive em redirect e 404, entram o `Set-Cookie` e os cabeçalhos `Referrer-Policy` e `X-Robots-Tag`.
- `Secure` quando `request.nextUrl.protocol === "https:"`.

**Home do livro:**
- `components/telas/tela-livro.tsx` substitui `tela-livro-vazio.tsx`, que é apagada.
- As telas `livro` e `livro-somente-leitura` da vitrine (`lib/styleguide.ts`, `vitrine.tsx`, `scripts/inspecionar-telas.mjs`) passam a renderizar a nova home com os dados de `lib/exemplos/livro-jair.ts`.

**Interface reaproveitada:**
- O `gravador-causo.tsx` compõe o visual de `components/ui/gravador.tsx` com `formatarCronometro` e `falarDuracao` de `lib/ui/tempo.ts`. Só acrescenta o MediaRecorder.
- `Abas` ganha `ativa` e `aoMudar` (controle externo), para `?aba=` e para a atualização a cada 4 s saber qual aba está aberta.
- O parentesco usa o `Seletor` do P2 (`<select>` nativo, com 7 opções), não chips.
- Os cartões de causo e a folha "Enviar ao Jair" partem dos exemplos do styleguide do P2 (`app/(dev)/styleguide/responsavel/page.tsx`).
- `Causo.relacao` sai de `lib/exemplos/livro-jair.ts`: o formulário não pergunta a relação, e uma pergunta a menos ajuda quem está com pressa.
- "Pode escrever" usa `podeEscrever` de `lib/plano.ts`.

## Alternativas consideradas

### A: Token aleatório guardado só como hash, mostrado uma vez

- **Prós:** nenhum segredo novo.
- **Contras:** o link fixado no grupo não pode ser mostrado de novo; perdeu, tem que gerar outro e refixar.
- **Motivo da escolha (HMAC):** o kit precisa estar sempre disponível.

### B: Token guardado cifrado no banco

- **Prós:** dá para mostrar de novo.
- **Contras:** o token fica no banco (cifrado), contrariando a regra, e exige gestão de chave igual.
- **Motivo:** o HMAC dá o mesmo resultado sem guardar nada além do hash.

### C: Família lendo as tabelas por RLS com claim do token (JWT próprio)

- **Prós:** consultas diretas.
- **Contras:** obriga a emitir JWT próprio, assinar com o segredo do Supabase e manter políticas para `anon` em várias tabelas.
- **Motivo:** 3 funções fechadas são mais fáceis de testar e auditar.

### D: Banco de perguntas numa tabela com seed

- **Prós:** consulta no SQL.
- **Contras:** cada revisão da tia Caia vira migration; o PRD pede revisão antes do seed.
- **Motivo:** JSON validado no build; vira tabela se um dia a IA precisar consultar.

### E: Um voto por pessoa (nome) em vez de por aparelho

- **Contras:** nomes repetem ("Ana" e "ana") e não impedem nada.
- **Motivo:** o aparelho é o que o pedido descreve; o nome serve para o responsável ver quem votou.

### F: Supabase Realtime para o "ao vivo"

- **Prós:** atualização instantânea.
- **Contras:** eventos DELETE não passam pela RLS nem por filtro (vazam ids entre livros); o comportamento com grant por coluna (`aparelho_hash`) não é garantido; não dá para testar no PGlite.
- **Motivo:** consulta a cada 4 s cumpre os aceites com 2 famílias. O prompt 6 traz o Realtime por Broadcast em canal privado por livro, e a enquete passa a usar o mesmo canal.

## Requisitos não funcionais

- **Celular primeiro:** cada tela cabe em 390 px sem rolagem lateral; alvos ≥ 48 px (`min-h-alvo`).
- **`/f/[token]`** carrega em menos de 2 s em 4G: é uma rota servidor, com uma chamada ao banco, sem JavaScript pesado. O gravador é carregado só ao tocar em Gravar.
- **Storage grátis (1 GB):** foto ≈ 1,5 MB e áudio de causo ≤ 2 MB; cota de 200 fotos por livro. Passar de 10 livros ativos pede o plano Pro (já previsto no PRD).
- **LGPD:**
  - consentimento obrigatório no causo, com data gravada;
  - nome de quem vota e sugere só no livro dele;
  - eventos sem nome nem texto (regra do P3);
  - áudio em bucket privado em São Paulo.
- **Plano vencido:**
  - a família vê "Este livro não está recebendo sugestões agora";
  - o responsável vê tudo, sem os botões de escrita (`estadoEfetivo`).

## SQL de subida

As revisões de segurança do prompt 3 seguem valendo: funções com `search_path = ''`, revogação explícita de EXECUTE, nenhum grant para `anon` em tabela. Validado no PGlite: sobe, reverte e sobe de novo sem erro. Um teste de fumaça, feito com os papéis reais (`anon`, `authenticated`, `porta_autor`), cobriu o isolamento entre livros, os limites, as travas, as fotos inseridas pela sessão e os caminhos com `%2e%2e`.

### `supabase/migrations/20261110120000_perguntas_causos_enquete.sql`

```sql
-- 20261110120000_perguntas_causos_enquete.sql
-- Fotos, perguntas, causos, link da família e enquete, com RLS.
--
-- Regras deste arquivo:
-- * A família (sem login) só entra por 3 funções familia_*, que recebem o token do link,
--   calculam o hash aqui dentro e alcançam um livro só. Nenhuma tabela tem grant para anon.
-- * Toda tabela filha guarda book_id e aponta para o pai pelo par (book_id, id): uma linha
--   nunca liga duas famílias, mesmo que o código erre.
-- * Enquete e link da família só mudam por funções que conferem membro e plano ativo;
--   quem está logado só lê essas tabelas.
-- * Caminhos de arquivo são validados por regex ancorada (nada de "..", "%2e" etc.).

create type public.parentesco as enum ('pai', 'mae', 'avo', 'avoa', 'tio', 'tia', 'outro');
create type public.prompt_tipo as enum ('pergunta', 'causo');
create type public.prompt_origem as enum ('banco', 'propria', 'causo', 'enquete');
create type public.prompt_estado as enum ('para_enviar', 'enviada', 'respondida', 'pulada');
create type public.causo_estado as enum ('novo', 'virou_pergunta', 'na_enquete', 'arquivado');
create type public.enquete_estado as enum ('aberta', 'encerrada');

-- Papel sem login que será o dono das funções autor_* (prompt 5). Não recebe grant em
-- nenhuma tabela da família: o isolamento do autor vem de privilégio, não de convenção.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'porta_autor') then
    create role porta_autor nologin noinherit;
  end if;
end $$;

-- ── Números de negócio que o banco também confere ──────────────────────────
-- Espelham lib/config.ts. supabase/tests/config-banco.test.ts garante que batem.
create function privado.votos_por_pessoa() returns integer
language sql immutable set search_path = '' as $$ select 5 $$;
create function privado.max_itens_enquete() returns integer
language sql immutable set search_path = '' as $$ select 30 $$;
create function privado.max_votantes_por_enquete() returns integer
language sql immutable set search_path = '' as $$ select 150 $$;
create function privado.max_trocas_voto_por_hora() returns integer
language sql immutable set search_path = '' as $$ select 300 $$;
create function privado.max_causos_por_hora() returns integer
language sql immutable set search_path = '' as $$ select 20 $$;
create function privado.max_causos_por_dia() returns integer
language sql immutable set search_path = '' as $$ select 40 $$;
create function privado.max_fotos_por_livro() returns integer
language sql immutable set search_path = '' as $$ select 200 $$;

-- ── Fotos (acervo) ─────────────────────────────────────────────────────────
-- Comprimidas no navegador para JPEG de até 3000 px antes de subir.
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  caminho text not null unique,
  largura integer check (largura between 1 and 10000),
  altura integer check (altura between 1 and 10000),
  legenda text check (legenda is null or char_length(legenda) <= 300),
  criado_por uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  unique (book_id, id),
  constraint photos_caminho_do_livro check (
    -- regex literal: um CHECK roda com o usuário corrente, que não executa funções de privado
    caminho ~ ('^livros/' || book_id::text || '/acervo/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$')
  )
);
create index photos_livro_data on public.photos (book_id, criado_em desc);

create function privado.cota_de_fotos() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.photos where book_id = new.book_id) >= privado.max_fotos_por_livro() then
    raise exception 'cota_fotos';
  end if;
  return new;
end $$;
create trigger photos_cota before insert on public.photos
  for each row execute function privado.cota_de_fotos();

-- ── Autor: apelido, parentesco, foto e estado da configuração inicial ──────
alter table public.books
  add column autor_apelido text
    check (autor_apelido is null or char_length(btrim(autor_apelido)) between 1 and 60),
  add column autor_parentesco public.parentesco,
  add column autor_foto_id uuid,
  -- {"quem": "feito"|"pulado"|"depois", "perguntas": ..., "fotos": ...}
  add column configuracao jsonb not null default '{}'::jsonb
    check (jsonb_typeof(configuracao) = 'object' and pg_column_size(configuracao) < 500),
  add constraint books_autor_foto_do_livro foreign key (id, autor_foto_id)
    references public.photos (book_id, id) on delete set null (autor_foto_id);

-- ── Causos sugeridos pela família: guardados exatamente como chegaram ──────
-- Com áudio, o causo nasce antes do arquivo: o caminho é fixado aqui, o servidor assina
-- o upload só para ele e confirma o recebimento. Sem confirmação, ninguém vê o causo.
create table public.causos (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  texto text check (texto is null or char_length(btrim(texto)) between 1 and 2000),
  audio_caminho text unique,
  audio_recebido_em timestamptz,
  duracao_s integer check (duracao_s is null or duracao_s between 1 and 190),
  consentimento_em timestamptz not null,
  consentimento_versao smallint not null check (consentimento_versao between 1 and 99),
  estado public.causo_estado not null default 'novo',
  criado_em timestamptz not null default now(),
  unique (book_id, id),
  constraint causos_texto_ou_audio check (texto is not null or audio_caminho is not null),
  constraint causos_recebido_tem_audio check (
    audio_recebido_em is null or (audio_caminho is not null and duracao_s is not null)
  ),
  constraint causos_audio_do_livro check (
    audio_caminho is null
    or audio_caminho ~ ('^livros/' || book_id::text || '/causos/' || id::text || '\.(webm|m4a|ogg)$')
  )
);
create index causos_livro_data on public.causos (book_id, criado_em desc);

-- ── Perguntas e causos a enviar ao autor ───────────────────────────────────
create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  tipo public.prompt_tipo not null default 'pergunta',
  texto text not null check (char_length(btrim(texto)) between 3 and 500),
  origem public.prompt_origem not null,
  banco_id text check (banco_id is null or banco_id ~ '^[a-z]+-[0-9]{2,3}$'),
  causo_id uuid,
  photo_id uuid,
  estado public.prompt_estado not null default 'para_enviar',
  enviada_em timestamptz,
  ordem integer not null default 0,
  criado_por uuid default auth.uid() references auth.users (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (book_id, id),
  foreign key (book_id, causo_id) references public.causos (book_id, id) on delete set null (causo_id),
  foreign key (book_id, photo_id) references public.photos (book_id, id) on delete set null (photo_id),
  constraint prompts_banco_tem_id check (origem <> 'banco' or banco_id is not null),
  constraint prompts_causo_tem_id check (origem <> 'causo' or causo_id is not null)
);
create unique index prompts_banco_uma_vez on public.prompts (book_id, banco_id) where banco_id is not null;
create index prompts_livro_estado on public.prompts (book_id, estado, ordem);
create trigger prompts_atualizado_em before update on public.prompts
  for each row execute function privado.tocar_atualizado_em();

-- Quem está logado só faz as transições da tela; "respondida" vem do fluxo do autor
-- (servidor). enviada_em é sempre o banco que preenche.
create function privado.transicao_da_pergunta() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.estado is distinct from old.estado then
    if current_user = 'authenticated' and not (
      (old.estado, new.estado) in (
        ('para_enviar', 'pulada'), ('pulada', 'para_enviar'),
        ('para_enviar', 'enviada'), ('enviada', 'para_enviar'))
    ) then
      raise exception 'transicao_invalida';
    end if;
    new.enviada_em := case when new.estado = 'enviada' then now()
                           when new.estado = 'para_enviar' then null
                           else old.enviada_em end;
  end if;
  return new;
end $$;
create trigger prompts_transicao before update on public.prompts
  for each row execute function privado.transicao_da_pergunta();

-- ── Link da família (fixado no grupo de WhatsApp) ──────────────────────────
-- Só o hash do token. O servidor deriva o token de id e chave_versao com um segredo
-- (HMAC) para mostrar o link de novo; o banco sozinho nunca permite reconstruí-lo.
create table public.family_access (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  chave_versao smallint not null default 1 check (chave_versao between 1 and 99),
  criado_em timestamptz not null default now(),
  criado_por uuid references auth.users (id) on delete set null,
  revogado_em timestamptz
);
create unique index family_access_um_ativo on public.family_access (book_id) where revogado_em is null;

create function privado.revogacao_definitiva() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.revogado_em is not null and new.revogado_em is distinct from old.revogado_em then
    raise exception 'link_ja_revogado';
  end if;
  return new;
end $$;
create trigger family_access_revogacao before update on public.family_access
  for each row execute function privado.revogacao_definitiva();

-- ── Enquete ────────────────────────────────────────────────────────────────
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books (id) on delete cascade,
  estado public.enquete_estado not null default 'aberta',
  aberta_em timestamptz not null default now(),
  encerrada_em timestamptz,
  -- janela de 1 hora para o teto de trocas de voto (só as funções mexem)
  trocas_desde timestamptz not null default now(),
  trocas integer not null default 0,
  unique (book_id, id),
  constraint polls_encerrada_tem_data check ((estado = 'encerrada') = (encerrada_em is not null))
);
create unique index polls_uma_aberta on public.polls (book_id) where estado = 'aberta';

create table public.poll_items (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null,
  poll_id uuid not null,
  tipo public.prompt_tipo not null default 'pergunta',
  texto text not null check (char_length(btrim(texto)) between 3 and 500),
  banco_id text check (banco_id is null or banco_id ~ '^[a-z]+-[0-9]{2,3}$'),
  causo_id uuid,
  ordem integer not null default 0,
  prompt_id uuid, -- preenchido quando o item é salvo em Para enviar
  unique (poll_id, id),
  foreign key (book_id, poll_id) references public.polls (book_id, id) on delete cascade,
  foreign key (book_id, causo_id) references public.causos (book_id, id) on delete set null (causo_id),
  foreign key (book_id, prompt_id) references public.prompts (book_id, id) on delete set null (prompt_id)
);
create index poll_items_enquete on public.poll_items (poll_id, ordem);

-- Um voto = um item escolhido por um aparelho. "votante" agrupa o conjunto de um aparelho
-- (é o que o responsável remove); aparelho_hash nunca é lido por quem está logado.
create table public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null,
  poll_id uuid not null,
  poll_item_id uuid not null,
  votante uuid not null,
  aparelho_hash text not null check (aparelho_hash ~ '^[0-9a-f]{64}$'),
  nome text not null check (char_length(btrim(nome)) between 1 and 80),
  criado_em timestamptz not null default now(),
  unique (poll_item_id, votante),
  foreign key (book_id, poll_id) references public.polls (book_id, id) on delete cascade,
  foreign key (poll_id, poll_item_id) references public.poll_items (poll_id, id) on delete cascade
);
create index poll_votes_enquete_aparelho on public.poll_votes (poll_id, aparelho_hash);

-- ── RLS e grants ───────────────────────────────────────────────────────────
alter table public.photos enable row level security;
alter table public.causos enable row level security;
alter table public.prompts enable row level security;
alter table public.family_access enable row level security;
alter table public.polls enable row level security;
alter table public.poll_items enable row level security;
alter table public.poll_votes enable row level security;

revoke all on public.photos, public.causos, public.prompts, public.family_access,
  public.polls, public.poll_items, public.poll_votes from anon, authenticated, porta_autor;
grant all on public.photos, public.causos, public.prompts, public.family_access,
  public.polls, public.poll_items, public.poll_votes to service_role;

grant update (autor_apelido, autor_parentesco, autor_foto_id, configuracao) on public.books to authenticated;

grant select, insert (book_id, caminho, largura, altura, legenda), update (legenda)
  on public.photos to authenticated;
grant select (id, book_id, nome, texto, audio_caminho, audio_recebido_em, duracao_s,
  consentimento_em, consentimento_versao, estado, criado_em), update (estado)
  on public.causos to authenticated;
grant select, delete, insert (book_id, tipo, texto, origem, banco_id, causo_id, photo_id, ordem),
  update (tipo, texto, photo_id, estado, ordem) on public.prompts to authenticated;
grant select (id, book_id, chave_versao, criado_em, criado_por, revogado_em)
  on public.family_access to authenticated;
grant select (id, book_id, estado, aberta_em, encerrada_em) on public.polls to authenticated;
grant select on public.poll_items to authenticated;
grant select (id, book_id, poll_id, poll_item_id, votante, nome, criado_em)
  on public.poll_votes to authenticated;

-- Membro lê o próprio livro; causo com áudio só aparece depois que o áudio chegou.
create policy "membro lê" on public.photos for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê" on public.prompts for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê" on public.family_access for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê" on public.polls for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê" on public.poll_items for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê" on public.poll_votes for select to authenticated using (privado.eh_membro(book_id));
create policy "membro lê causo completo" on public.causos for select to authenticated
  using (privado.eh_membro(book_id) and (texto is not null or audio_recebido_em is not null));

-- Escrever exige plano ativo e no prazo.
create policy "membro cria com plano ativo" on public.photos for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
create policy "membro altera com plano ativo" on public.photos for update to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id))
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
create policy "membro cria com plano ativo" on public.prompts for insert to authenticated
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
create policy "membro altera com plano ativo" on public.prompts for update to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id))
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));
create policy "membro apaga pergunta ainda não enviada" on public.prompts for delete to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id) and estado = 'para_enviar');
create policy "membro altera estado com plano ativo" on public.causos for update to authenticated
  using (privado.eh_membro(book_id) and privado.livro_editavel(book_id))
  with check (privado.eh_membro(book_id) and privado.livro_editavel(book_id));

-- ── Auxiliares das portas da família ───────────────────────────────────────
create function privado.livro_da_familia(p_token text) returns uuid
language sql stable security definer set search_path = '' as $$
  select f.book_id from public.family_access f
  where p_token is not null and octet_length(p_token) between 16 and 128
    and f.token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
    and f.revogado_em is null
$$;

-- O mesmo aparelho tem um hash diferente em cada livro: não dá para cruzar famílias.
create function privado.hash_aparelho(p_livro uuid, p_aparelho text) returns text
language sql immutable set search_path = '' as $$
  select case when p_livro is not null and p_aparelho is not null
                   and octet_length(p_aparelho) between 32 and 64
    then encode(sha256(convert_to('aparelho:' || p_livro::text || ':' || p_aparelho, 'UTF8')), 'hex') end
$$;

-- Erro com nome de código, sem detalhe do esquema.
create function privado.membro_editando(p_livro uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_livro is null or not privado.eh_membro(p_livro) then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then
    raise exception 'livro_fechado';
  end if;
end $$;

-- ── Portas da família (anon, com o token do link) ──────────────────────────
-- O que a página /f/[token] mostra. null = link inválido ou revogado.
create function public.familia_pagina(p_token text, p_aparelho text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_livro uuid := privado.livro_da_familia(p_token);
  v_hash text;
  v_enquete jsonb;
begin
  if v_livro is null then
    return null;
  end if;
  v_hash := privado.hash_aparelho(v_livro, p_aparelho);
  select jsonb_build_object(
    'id', p.id,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'texto', i.texto, 'tipo', i.tipo) order by i.ordem, i.id)
      from public.poll_items i where i.poll_id = p.id), '[]'::jsonb),
    'meus_votos', coalesce((
      select jsonb_agg(v.poll_item_id) from public.poll_votes v
      where v.poll_id = p.id and v.aparelho_hash = v_hash), '[]'::jsonb),
    'meu_nome', (
      select v.nome from public.poll_votes v
      where v.poll_id = p.id and v.aparelho_hash = v_hash limit 1)
  ) into v_enquete
  from public.polls p
  where p.book_id = v_livro and p.estado = 'aberta';

  return jsonb_build_object(
    'autor', (select coalesce(b.autor_apelido, b.autor_nome) from public.books b where b.id = v_livro),
    'aberto', privado.livro_editavel(v_livro),
    'votos_por_pessoa', privado.votos_por_pessoa(),
    'enquete', v_enquete
  );
end $$;

-- Grava (ou troca) o conjunto de votos de um aparelho na enquete aberta do livro do token.
-- Devolve {votos, livro, votante} para o servidor registrar o evento.
create function public.familia_votar(p_token text, p_aparelho text, p_nome text, p_itens uuid[])
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
  v_hash text;
  v_itens uuid[];
  v_enquete public.polls;
  v_votante uuid;
begin
  -- Tamanho da entrada antes de qualquer outra coisa.
  if p_itens is null or cardinality(p_itens) > privado.max_itens_enquete()
     or p_nome is null or octet_length(p_nome) > 320 then
    raise exception 'dados_invalidos';
  end if;
  v_livro := privado.livro_da_familia(p_token);
  if v_livro is null then
    raise exception 'link_invalido';
  end if;
  if not privado.livro_editavel(v_livro) then
    raise exception 'livro_fechado';
  end if;
  v_hash := privado.hash_aparelho(v_livro, p_aparelho);
  if v_hash is null or char_length(btrim(p_nome)) not between 1 and 80 then
    raise exception 'dados_invalidos';
  end if;
  v_itens := array(select distinct x from unnest(p_itens) x where x is not null);
  if cardinality(v_itens) not between 1 and privado.votos_por_pessoa() then
    raise exception 'quantidade_invalida';
  end if;

  -- Trava a enquete: votos, trocas e encerramento ficam em fila.
  select * into v_enquete from public.polls p
  where p.book_id = v_livro and p.estado = 'aberta'
  for update;
  if v_enquete.id is null then
    raise exception 'sem_enquete';
  end if;
  if exists (
    select 1 from unnest(v_itens) x
    where not exists (select 1 from public.poll_items i where i.id = x and i.poll_id = v_enquete.id)
  ) then
    raise exception 'item_invalido';
  end if;

  select v.votante into v_votante from public.poll_votes v
  where v.poll_id = v_enquete.id and v.aparelho_hash = v_hash limit 1;
  if v_votante is null and (
    select count(distinct v.votante) from public.poll_votes v where v.poll_id = v_enquete.id
  ) >= privado.max_votantes_por_enquete() then
    raise exception 'limite_votantes';
  end if;

  if v_enquete.trocas_desde < now() - interval '1 hour' then
    update public.polls set trocas_desde = now(), trocas = 1 where id = v_enquete.id;
  elsif v_enquete.trocas >= privado.max_trocas_voto_por_hora() then
    raise exception 'limite_por_hora';
  else
    update public.polls set trocas = trocas + 1 where id = v_enquete.id;
  end if;

  v_votante := coalesce(v_votante, gen_random_uuid());
  delete from public.poll_votes where poll_id = v_enquete.id and aparelho_hash = v_hash;
  insert into public.poll_votes (book_id, poll_id, poll_item_id, votante, aparelho_hash, nome)
  select v_livro, v_enquete.id, x, v_votante, v_hash, btrim(p_nome) from unnest(v_itens) x;
  return jsonb_build_object('votos', cardinality(v_itens), 'livro', v_livro, 'votante', v_votante);
end $$;

-- Recebe um causo exatamente como a pessoa enviou. Com áudio (p_audio_tipo), devolve o
-- caminho fixo onde o servidor vai autorizar o upload; o causo só aparece depois da
-- confirmação (servico_confirmar_audio_causo).
create function public.familia_enviar_causo(
  p_token text, p_nome text, p_texto text, p_audio_tipo text,
  p_consentimento boolean, p_consentimento_versao smallint
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
  v_id uuid := gen_random_uuid();
  v_caminho text;
begin
  if p_nome is null or octet_length(p_nome) > 320
     or (p_texto is not null and octet_length(p_texto) > 8000)
     or (p_audio_tipo is not null and p_audio_tipo not in ('webm', 'm4a', 'ogg'))
     or ((nullif(btrim(coalesce(p_texto, '')), '') is null) = (p_audio_tipo is null)) -- um ou outro
     or char_length(btrim(p_nome)) not between 1 and 80
     or (p_texto is not null and char_length(btrim(p_texto)) > 2000)
     or p_consentimento_versao is null or p_consentimento_versao not between 1 and 99 then
    raise exception 'dados_invalidos';
  end if;
  if p_consentimento is not true then
    raise exception 'sem_consentimento';
  end if;
  v_livro := privado.livro_da_familia(p_token);
  if v_livro is null then
    raise exception 'link_invalido';
  end if;
  if not privado.livro_editavel(v_livro) then
    raise exception 'livro_fechado';
  end if;

  -- Uma fila por livro: a contagem e o insert não correm em paralelo.
  perform pg_advisory_xact_lock(hashtextextended('causos:' || v_livro::text, 0));
  if (select count(*) from public.causos c
      where c.book_id = v_livro and c.criado_em > now() - interval '1 hour') >= privado.max_causos_por_hora()
     or (select count(*) from public.causos c
      where c.book_id = v_livro and c.criado_em > now() - interval '1 day') >= privado.max_causos_por_dia() then
    raise exception 'limite_causos';
  end if;

  if p_audio_tipo is not null then
    v_caminho := 'livros/' || v_livro::text || '/causos/' || v_id::text || '.' || p_audio_tipo;
  end if;
  insert into public.causos (id, book_id, nome, texto, audio_caminho, consentimento_em, consentimento_versao)
  values (v_id, v_livro, btrim(p_nome), nullif(btrim(p_texto), ''), v_caminho, now(), p_consentimento_versao);
  return jsonb_build_object('id', v_id, 'livro', v_livro, 'audio_caminho', v_caminho);
end $$;

-- ── Funções do servidor (chave secreta), que ainda conferem o token ou o membro ──
-- Caminho para assinar o upload: só causo do livro do token, aguardando áudio, de até 30 min.
create function public.servico_caminho_audio_causo(p_token text, p_causo uuid)
returns text language sql stable security definer set search_path = '' as $$
  select c.audio_caminho from public.causos c
  where c.id = p_causo
    and c.book_id = privado.livro_da_familia(p_token)
    and c.audio_caminho is not null and c.audio_recebido_em is null
    and c.criado_em > now() - interval '30 minutes'
$$;

-- O servidor chama depois de conferir que o arquivo existe no Storage.
create function public.servico_confirmar_audio_causo(p_token text, p_causo uuid, p_duracao_s integer)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if p_duracao_s is null or p_duracao_s not between 1 and 190 then
    raise exception 'dados_invalidos';
  end if;
  update public.causos c
  set audio_recebido_em = now(), duracao_s = p_duracao_s
  where c.id = p_causo
    and c.book_id = privado.livro_da_familia(p_token)
    and c.audio_caminho is not null and c.audio_recebido_em is null
    and c.criado_em > now() - interval '30 minutes';
  return found;
end $$;

-- Gera ou troca o link da família. Revoga o ativo e cria o novo na mesma transação.
create function public.servico_trocar_link_familia(
  p_livro uuid, p_usuario uuid, p_id uuid, p_token_hash text, p_chave_versao smallint
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.book_members m where m.book_id = p_livro and m.user_id = p_usuario) then
    raise exception 'sem_permissao';
  end if;
  if not privado.livro_editavel(p_livro) then
    raise exception 'livro_fechado';
  end if;
  update public.family_access set revogado_em = now()
  where book_id = p_livro and revogado_em is null;
  insert into public.family_access (id, book_id, token_hash, chave_versao, criado_por)
  values (p_id, p_livro, p_token_hash, p_chave_versao, p_usuario);
end $$;

-- ── Ações do responsável na enquete (conferem membro e plano ativo) ────────
-- Candidato da enquete. O causo, quando há, precisa ser do mesmo livro.
create function privado.item_valido(p_livro uuid, p_item jsonb) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  if jsonb_typeof(p_item) is distinct from 'object'
     or jsonb_typeof(p_item -> 'texto') is distinct from 'string'
     or octet_length(p_item ->> 'texto') > 2000
     or char_length(btrim(p_item ->> 'texto')) not between 3 and 500
     or coalesce(p_item ->> 'tipo', 'pergunta') not in ('pergunta', 'causo')
     or (p_item ? 'banco_id' and jsonb_typeof(p_item -> 'banco_id') <> 'null'
         and coalesce(p_item ->> 'banco_id', '') !~ '^[a-z]+-[0-9]{2,3}$')
     or (p_item ? 'causo_id' and jsonb_typeof(p_item -> 'causo_id') <> 'null'
         and coalesce(p_item ->> 'causo_id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    return false;
  end if;
  if p_item ->> 'causo_id' is not null and not exists (
    select 1 from public.causos c where c.id = (p_item ->> 'causo_id')::uuid and c.book_id = p_livro
  ) then
    return false;
  end if;
  return true;
end $$;

-- Abre a enquete com os candidatos: [{"texto", "tipo", "banco_id", "causo_id"}].
create function public.enquete_abrir(p_livro uuid, p_itens jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_enquete uuid;
begin
  perform privado.membro_editando(p_livro);
  if p_itens is null or jsonb_typeof(p_itens) is distinct from 'array'
     or jsonb_array_length(p_itens) not between 2 and privado.max_itens_enquete() then
    raise exception 'dados_invalidos';
  end if;
  if exists (select 1 from jsonb_array_elements(p_itens) i where not privado.item_valido(p_livro, i)) then
    raise exception 'item_invalido';
  end if;
  if exists (select 1 from public.polls where book_id = p_livro and estado = 'aberta') then
    raise exception 'enquete_aberta';
  end if;
  insert into public.polls (book_id) values (p_livro) returning id into v_enquete;
  insert into public.poll_items (book_id, poll_id, tipo, texto, banco_id, causo_id, ordem)
  select p_livro, v_enquete, coalesce(i ->> 'tipo', 'pergunta')::public.prompt_tipo,
         btrim(i ->> 'texto'), i ->> 'banco_id', (i ->> 'causo_id')::uuid, (n - 1)::integer
  from jsonb_array_elements(p_itens) with ordinality as e (i, n);
  update public.causos set estado = 'na_enquete'
  where book_id = p_livro and estado = 'novo'
    and id in (select (i ->> 'causo_id')::uuid from jsonb_array_elements(p_itens) i);
  return v_enquete;
end $$;

-- Acrescenta um candidato à enquete aberta (ex.: "Pôr na enquete" num causo).
create function public.enquete_adicionar_item(p_enquete uuid, p_item jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_enquete public.polls;
  v_id uuid;
begin
  select * into v_enquete from public.polls where id = p_enquete for update;
  perform privado.membro_editando(v_enquete.book_id);
  if v_enquete.estado <> 'aberta' then
    raise exception 'enquete_encerrada';
  end if;
  if not privado.item_valido(v_enquete.book_id, p_item) then
    raise exception 'item_invalido';
  end if;
  if (select count(*) from public.poll_items where poll_id = p_enquete) >= privado.max_itens_enquete() then
    raise exception 'limite_itens';
  end if;
  insert into public.poll_items (book_id, poll_id, tipo, texto, banco_id, causo_id, ordem)
  values (v_enquete.book_id, p_enquete, coalesce(p_item ->> 'tipo', 'pergunta')::public.prompt_tipo,
          btrim(p_item ->> 'texto'), p_item ->> 'banco_id', (p_item ->> 'causo_id')::uuid,
          (select coalesce(max(ordem), -1) + 1 from public.poll_items where poll_id = p_enquete))
  returning id into v_id;
  update public.causos set estado = 'na_enquete'
  where book_id = v_enquete.book_id and estado = 'novo' and id = (p_item ->> 'causo_id')::uuid;
  return v_id;
end $$;

create function public.enquete_encerrar(p_enquete uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
begin
  select book_id into v_livro from public.polls where id = p_enquete for update;
  perform privado.membro_editando(v_livro);
  update public.polls set estado = 'encerrada', encerrada_em = now()
  where id = p_enquete and estado = 'aberta';
end $$;

-- Remove o conjunto de votos de uma pessoa (votante).
create function public.enquete_remover_votos(p_enquete uuid, p_votante uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
  v_total integer;
begin
  select book_id into v_livro from public.polls where id = p_enquete for update;
  perform privado.membro_editando(v_livro);
  delete from public.poll_votes where poll_id = p_enquete and votante = p_votante;
  get diagnostics v_total = row_count;
  return v_total;
end $$;

-- Salva itens em Para enviar. Item já salvo, ou pergunta do banco já na lista, não duplica,
-- nem com toque duplo: os itens ficam travados até o fim. Devolve quantos itens foram ligados.
create function public.enquete_salvar(p_enquete uuid, p_itens uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_livro uuid;
  r record;
  v_prompt uuid;
  v_total integer := 0;
begin
  select book_id into v_livro from public.polls where id = p_enquete;
  perform privado.membro_editando(v_livro);
  if p_itens is null or cardinality(p_itens) > privado.max_itens_enquete() then
    raise exception 'dados_invalidos';
  end if;
  for r in
    select i.id, i.tipo, i.texto, i.banco_id, i.causo_id from public.poll_items i
    where i.poll_id = p_enquete and i.id = any (p_itens) and i.prompt_id is null
    order by i.ordem
    for update
  loop
    v_prompt := null;
    insert into public.prompts (book_id, tipo, texto, origem, banco_id, causo_id)
    values (v_livro, r.tipo, r.texto, 'enquete', r.banco_id, r.causo_id)
    on conflict (book_id, banco_id) where banco_id is not null do nothing
    returning id into v_prompt;
    if v_prompt is null then
      select p.id into v_prompt from public.prompts p where p.book_id = v_livro and p.banco_id = r.banco_id;
    end if;
    update public.poll_items set prompt_id = v_prompt where id = r.id and prompt_id is null;
    if found then
      v_total := v_total + 1;
      update public.causos set estado = 'virou_pergunta'
      where id = r.causo_id and book_id = v_livro and estado in ('novo', 'na_enquete');
    end if;
  end loop;
  return v_total;
end $$;

-- ── Quem executa o quê ─────────────────────────────────────────────────────
revoke all on function
  public.familia_pagina(text, text),
  public.familia_votar(text, text, text, uuid[]),
  public.familia_enviar_causo(text, text, text, text, boolean, smallint),
  public.servico_caminho_audio_causo(text, uuid),
  public.servico_confirmar_audio_causo(text, uuid, integer),
  public.servico_trocar_link_familia(uuid, uuid, uuid, text, smallint),
  public.enquete_abrir(uuid, jsonb),
  public.enquete_adicionar_item(uuid, jsonb),
  public.enquete_encerrar(uuid),
  public.enquete_remover_votos(uuid, uuid),
  public.enquete_salvar(uuid, uuid[])
  from public, anon, authenticated;
grant execute on function
  public.familia_pagina(text, text),
  public.familia_votar(text, text, text, uuid[]),
  public.familia_enviar_causo(text, text, text, text, boolean, smallint)
  to anon, service_role;
grant execute on function
  public.servico_caminho_audio_causo(text, uuid),
  public.servico_confirmar_audio_causo(text, uuid, integer),
  public.servico_trocar_link_familia(uuid, uuid, uuid, text, smallint)
  to service_role;
grant execute on function
  public.enquete_abrir(uuid, jsonb),
  public.enquete_adicionar_item(uuid, jsonb),
  public.enquete_encerrar(uuid),
  public.enquete_remover_votos(uuid, uuid),
  public.enquete_salvar(uuid, uuid[])
  to authenticated, service_role;
revoke all on function
  privado.votos_por_pessoa(), privado.max_itens_enquete(), privado.max_votantes_por_enquete(),
  privado.max_trocas_voto_por_hora(), privado.max_causos_por_hora(), privado.max_causos_por_dia(),
  privado.max_fotos_por_livro(), privado.cota_de_fotos(),
  privado.transicao_da_pergunta(), privado.revogacao_definitiva(),
  privado.livro_da_familia(text), privado.hash_aparelho(uuid, text),
  privado.membro_editando(uuid), privado.item_valido(uuid, jsonb)
  from public, anon, authenticated;

-- ── Storage (pulado nos testes com PGlite) ─────────────────────────────────
-- Buckets privados, sem políticas em storage.objects: só URLs assinadas pelo servidor.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('acervo', 'acervo', false, 5242880, array['image/jpeg']),
      ('causos', 'causos', false, 2097152, array['audio/webm', 'audio/mp4', 'audio/ogg'])
    on conflict (id) do nothing;
  end if;
end $$;
```

## SQL de reversão

### `supabase/reversao/20261110120000_perguntas_causos_enquete.down.sql`

```sql
-- Reverte 20261110120000_perguntas_causos_enquete.sql.
-- ATENÇÃO: apaga fotos, perguntas, causos, links da família e enquetes do banco.
-- Os buckets acervo e causos e os arquivos ficam no Storage (apagar à mão, se for o caso).

drop function if exists public.enquete_salvar(uuid, uuid[]);
drop function if exists public.enquete_remover_votos(uuid, uuid);
drop function if exists public.enquete_encerrar(uuid);
drop function if exists public.enquete_adicionar_item(uuid, jsonb);
drop function if exists public.enquete_abrir(uuid, jsonb);
drop function if exists public.servico_trocar_link_familia(uuid, uuid, uuid, text, smallint);
drop function if exists public.servico_confirmar_audio_causo(text, uuid, integer);
drop function if exists public.servico_caminho_audio_causo(text, uuid);
drop function if exists public.familia_enviar_causo(text, text, text, text, boolean, smallint);
drop function if exists public.familia_votar(text, text, text, uuid[]);
drop function if exists public.familia_pagina(text, text);
drop function if exists privado.item_valido(uuid, jsonb);
drop function if exists privado.membro_editando(uuid);
drop function if exists privado.hash_aparelho(uuid, text);
drop function if exists privado.livro_da_familia(text);

drop table if exists public.poll_votes;
drop table if exists public.poll_items;
drop table if exists public.polls;
drop table if exists public.family_access;
drop function if exists privado.revogacao_definitiva();
drop table if exists public.prompts;
drop function if exists privado.transicao_da_pergunta();
drop table if exists public.causos;

alter table public.books
  drop constraint if exists books_autor_foto_do_livro,
  drop column if exists configuracao,
  drop column if exists autor_foto_id,
  drop column if exists autor_parentesco,
  drop column if exists autor_apelido;

drop table if exists public.photos;
drop function if exists privado.cota_de_fotos();

drop function if exists privado.max_fotos_por_livro();
drop function if exists privado.max_causos_por_dia();
drop function if exists privado.max_causos_por_hora();
drop function if exists privado.max_trocas_voto_por_hora();
drop function if exists privado.max_votantes_por_enquete();
drop function if exists privado.max_itens_enquete();
drop function if exists privado.votos_por_pessoa();

drop type if exists public.enquete_estado;
drop type if exists public.causo_estado;
drop type if exists public.prompt_estado;
drop type if exists public.prompt_origem;
drop type if exists public.prompt_tipo;
drop type if exists public.parentesco;

drop role if exists porta_autor;
```

## Plano de implementação detalhado

### Ordem

1. **Parada 1 (este documento):** aprovar o design e o SQL.
2. Migration, reversão e testes de banco (PGlite). Aplicar no projeto `ecoa-plataforma` (`dhmjaeauhzfniqncmiof`) com `apply_migration`, com `name` igual ao nome do arquivo. Depois, `get_advisors` (segurança) e regenerar `lib/supabase/tipos.ts`.
3. Banco de perguntas (`supabase/seed/perguntas.json`), antes de `lib/perguntas/banco.ts`, que o valida ao importar.
4. `lib/config.ts`, `lib/erros-banco.ts`, `lib/env-links.ts`, `lib/links.ts`, `lib/arquivos.ts`, `lib/whatsapp.ts`, `lib/perguntas/*`, `lib/enquete/ranking.ts` e `lib/livro/configuracao.ts`, com testes unitários. O `config-banco.test.ts` roda aqui, já com o banco do passo 2.
5. Configuração inicial e home do livro.
6. Tela Perguntas e kit.
7. `/f/[token]`: causo.
8. Enquete: abrir, votar e resultados ao vivo.
9. Telas de exemplo no styleguide, e2e, gate de design e atualização do PRD.

### Arquivos

#### Banco

1. **`supabase/migrations/20261110120000_perguntas_causos_enquete.sql` (criar).** Conteúdo da seção SQL de subida.
2. **`supabase/reversao/20261110120000_perguntas_causos_enquete.down.sql` (criar).** Conteúdo da seção de reversão.
3. **`supabase/tests/banco.ts` (alterar).** `como()` passa a aceitar `porta_autor` e `service_role`. Acrescentar:
   - `criarLinkFamilia(db, livro, usuario, token)`, que chama `servico_trocar_link_familia`;
   - `abrirEnquete(db, livro, usuario, textos[])`, que chama `enquete_abrir` com a sessão do usuário.
4. **`supabase/tests/familia.test.ts` (criar).** Livros A e B, cada um com o seu link da família, mais o link do autor de A. Casos:
   - **Página:**
     - `familia_pagina(tokenA)` devolve só a enquete de A;
     - token inválido, curto, do autor ou revogado devolve `null`.
   - **Votar:**
     - com itens de B usando o token de A: `item_invalido`;
     - com 6 itens: `quantidade_invalida`; com 31 itens: `dados_invalidos`;
     - o 151º votante: `limite_votantes`; a 301ª troca na hora: `limite_por_hora`;
     - o retorno traz `livro` e `votante`;
     - um segundo voto do mesmo aparelho troca o conjunto (o mesmo `votante`);
     - outro aparelho cria outro `votante`;
     - com a enquete encerrada: `sem_enquete`;
     - com o plano vencido: `livro_fechado`.
   - **Causo:**
     - texto e áudio juntos: `dados_invalidos`;
     - entra em A, e com áudio devolve `livros/<A>/causos/<id>.webm`;
     - fica invisível para o membro até `servico_confirmar_audio_causo`;
     - `servico_caminho_audio_causo` com o token de B, com causo já confirmado ou com mais de 30 min: `null`;
     - caminho com `../` ou `%2e%2e` inserido direto: erro de constraint;
     - sem consentimento: `sem_consentimento`;
     - o 21º na mesma hora: `limite_causos`; o 41º no dia: `limite_causos`.
   - **`anon` direto nas tabelas novas:** permission denied.
   - **Link:** `servico_trocar_link_familia` por quem não é membro: `sem_permissao`; trocar revoga o antigo; `revogado_em` não volta a nulo.
5. **`supabase/tests/autor-isolamento.test.ts` (criar):**
   - `anon` sem nenhum grant em `polls`, `poll_items`, `poll_votes`, `causos` e `family_access`;
   - funções executáveis por `anon` = exatamente as 3 `familia_*`;
   - `has_table_privilege('porta_autor', t, 'select')` = false para `polls`, `poll_items`, `poll_votes`, `causos` e `family_access` (o prompt 10 acrescenta `family_messages`);
   - uma função `autor_teste` com dono `porta_autor` que lê `causos` falha com permission denied (prova o mecanismo do prompt 5);
   - complementar: nenhuma função `autor_*` cita essas tabelas no corpo (`pg_proc.prosrc`);
   - o token do autor, nas 3 funções `familia_*`, não lê nem grava nada.
6. **`supabase/tests/rls.test.ts` (alterar):**
   - o responsável A não lê, altera nem apaga nada de B nas 7 tabelas novas;
   - em A, com o plano vencido, UPDATE e DELETE afetam 0 linhas, INSERT dá erro e as funções `enquete_*` dão `livro_fechado`;
   - `aparelho_hash`, `token_hash` e os contadores de `polls` são negados; INSERT e UPDATE diretos em `polls`, `poll_items`, `poll_votes` e `family_access` são negados;
   - transição `enviada → respondida` com a sessão: `transicao_invalida`; `enviada_em` é preenchido pelo banco;
   - a 201ª foto: `cota_fotos`; caminho de foto fora da regex: erro de constraint;
   - a pergunta só pode ser apagada em `para_enviar`;
   - causos: só `estado` é alterável;
   - `enquete_abrir` com a sessão de A no livro B: `sem_permissao`; com `null`: `dados_invalidos`;
   - `enquete_salvar` chamado duas vezes não duplica, e não duplica uma pergunta do banco já existente; um item de causo muda o causo para `virou_pergunta`;
   - `enquete_remover_votos` apaga só os votos daquele `votante`; o de outro livro dá `sem_permissao`;
   - `enquete_abrir` com causo de outro livro, `causo_id` inválido ou texto com mais de 500 caracteres: `item_invalido`; com `p_itens` nulo: `dados_invalidos`;
   - INSERT válido em `photos` e UPDATE da legenda feitos **pela sessão** passam (o CHECK não pode depender de função sem grant);
   - virar pergunta: insert com `causo_id` e mudança do causo para `virou_pergunta` com a sessão;
   - a lista de funções de `authenticated` passa a ter as 5 `enquete_*`, e o título do teste vira "authenticated executa só as funções da lista";
   - a lista fechada de tabelas negadas a `anon` (`rls.test.ts:273`) ganha as 7 novas;
   - a lista de `anon` passa a ter as 3 `familia_*` (a regra genérica muda de "nenhuma" para "lista fechada");
   - a regra "toda função definer tem `search_path` fixo" vale para as novas.
7. **`supabase/tests/config-banco.test.ts` (criar).** Cada `privado.max_*()` e `privado.votos_por_pessoa()` bate com a constante de `lib/config.ts`. Todo código de erro levantado no SQL (`raise exception '<codigo>'`) tem tradução em `lib/erros-banco.ts`.

#### Configuração e bibliotecas

8. **`lib/config.ts`.** Acrescentar:
   - `VOTOS_POR_PESSOA = 5`, `MAX_ITENS_ENQUETE = 30`, `MAX_VOTANTES_POR_ENQUETE = 150`, `MAX_TROCAS_VOTO_POR_HORA = 300`;
   - `MAX_CAUSOS_POR_HORA = 20`, `MAX_CAUSOS_POR_DIA = 40`, `MAX_CAUSO_AUDIO_MIN = 3`, `MAX_CAUSO_AUDIO_MB = 2`, `CAUSO_AUDIO_KBPS = 48`, `CONSENTIMENTO_CAUSO_VERSAO = 1`;
   - `PERGUNTAS_INICIAIS = 10`, `MAX_FOTOS_POR_ENVIO = 30`, `MAX_FOTOS_POR_LIVRO = 200`, `FOTO_LADO_MAX_PX = 3000`, `MAX_FOTO_MB = 5`;
   - `ATUALIZAR_A_CADA_S = 4`.
9. **`lib/env-links.ts` (criar).** `envLinks()` separado de `envServidor()`: valida `LINKS_VERSAO_ATUAL` (padrão 1) e de `LINKS_SEGREDO_V1` até a versão atual (mínimo de 32 caracteres cada), com o comentário "nunca edite o valor de uma versão; crie outra". Mais o `.env.example`, o guia `docs/setup/supabase-google-resend.md` (como gerar: `openssl rand -base64 32`) e um valor falso no `env` do `playwright.config.ts`.
10. **`lib/links.ts` (criar, server-only).**
    - `tokenDoLink(tipo: "familia" | "autor", id, versao)` → `v{versao}.{hmac}`;
    - `hashDoToken(token)`;
    - `urlFamilia(token)`;
    - `linkDoAutor()` (placeholder).
    - Testado com um segredo fixo: o token é determinístico, tem 25 caracteres (`v1_` + 22), não tem ponto, e o hash bate com o `sha256` do banco (vetor fixo conferido no PGlite).
11. **`lib/supabase/anonimo.ts` (criar).** Cliente com a chave pública, sem sessão, só para as funções `familia_*`.
    - **`lib/erros-banco.ts`:** código de erro do banco → frase da tela.
    - **`lib/arquivos.ts`:** regex dos caminhos de foto e áudio (as mesmas do SQL), com teste que inclui `../` e `%2e%2e`.
    - **`lib/fotos/comprimir.ts`** (navegador): canvas → JPEG de até 3000 px.
12. **`lib/whatsapp.ts`**, **`lib/perguntas/banco.ts`**, **`lib/enquete/ranking.ts`** e **`lib/livro/configuracao.ts`**, cada um com o seu `.test.ts`.
13. **`lib/livro/dados.ts` (criar, server-only).** Leituras do responsável, com a sessão e com as colunas listadas (grant por coluna):
    - `perguntasDoLivro`;
    - `causosDoLivro` (sem URL; o áudio é assinado no toque por `urlDoAudio`);
    - `enqueteDoLivro` (enquete aberta ou a última, itens, votos);
    - `fotosDoLivro`;
    - `linkDaFamilia` (só lê; gerar é a server action `pegarLinkDaFamilia`).
14. **`lib/eventos-acoes.ts` (alterar).** As ações novas.
    - **`lib/sessao.ts` (alterar):** `livrosDoMembro` e `LivroDoMembro` passam a trazer `autor_apelido`, `autor_parentesco` e `configuracao`.
15. **`proxy.ts` (alterar).** `/f/:path*` explícito no `matcher`; cookie e cabeçalhos conforme Comportamento detalhado. `lib/rotas.ts` não muda (`/f/*` já é público); `lib/rotas.test.ts` (alterar) ganha o caso `/f/v1_abc` sem sessão.

#### Telas e rotas

16. **`app/livro/[id]/page.tsx` (alterar).** Leva a `/configurar/quem` se `precisaConfigurar`. Senão, mostra a nova home **`components/telas/tela-livro.tsx` (criar)**. `components/telas/tela-livro-vazio.tsx` é apagada.
17. **Criar:** `app/livro/[id]/configurar/[passo]/page.tsx`, `acoes.ts`, `app/livro/[id]/fotos/acoes.ts` (`prepararFotos`, `registrarFotos`) e `components/telas/configurar-{quem,perguntas,fotos}.tsx`.
18. **Criar:** **`app/livro/[id]/perguntas/page.tsx`**, **`acoes.ts`**, **`components/telas/tela-perguntas.tsx`** e **`components/perguntas/*`.**
    - cartão de pergunta;
    - folha de adicionar;
    - folha do banco;
    - cartão de causo;
    - criar enquete;
    - resultados da enquete.
19. **Criar:** **`app/livro/[id]/kit/page.tsx`**, **`acoes.ts`** e **`components/telas/tela-kit.tsx`.**
20. **Criar:** **`app/f/[token]/page.tsx`**, **`acoes.ts`**, **`audio/route.ts`**, **`components/telas/tela-familia.tsx`** e **`components/familia/{votar,sugerir-causo,gravador-causo}.tsx`.**
21. **`app/a/em-breve/page.tsx` (criar).** Placeholder do link do autor.
22. **`components/livro/atualizar-sozinho.tsx` (criar).** Chama `router.refresh()` a cada `ATUALIZAR_A_CADA_S` segundos, só com a página visível; para quando a aba muda.
23. **`components/ui/upload-fotos.tsx` (criar)** e **`components/ui/abas.tsx` (alterar:** `ativa` e `aoMudar`). Escolher várias, comprimir no navegador, subir 3 por vez, progresso.
24. **Styleguide (alterar `lib/styleguide.ts`, `app/(dev)/styleguide/[tela]/page.tsx` e `vitrine.tsx`, `lib/exemplos/livro-jair.ts`, `_demos/demo-folha.tsx`).** As telas `livro` e `livro-somente-leitura` passam a usar `tela-livro.tsx`. Telas novas, com os dados de `lib/exemplos/livro-jair.ts`:
    - `configurar-quem`, `configurar-perguntas`, `configurar-fotos`;
    - `kit`;
    - `perguntas`, `perguntas-causos`, `perguntas-enquete`;
    - `familia`, `familia-causo`.
    - Mais `scripts/inspecionar-telas.mjs`.

#### Testes de ponta a ponta e documentação

25. **`supabase/seed/perguntas.json` (criar).** O banco de perguntas (ver seção própria).
26. **`e2e/configurar.spec.ts`.** No styleguide: no passo 2, 10 caixas marcadas; Salvar mostra "Salvar 10 perguntas"; desmarcar muda para 9.
27. **`e2e/familia.spec.ts`.** No styleguide:
    - marcar 6 itens deixa o 6º desabilitado;
    - Votar exige o nome;
    - o causo exige consentimento;
    - nenhuma rolagem lateral a 390 px.
28. **`e2e/perguntas.spec.ts`.** No styleguide:
    - 5 abas;
    - "Enviar ao autor" tem um `href` `https://wa.me/?text=`;
    - na enquete, "Salvar as 3 mais votadas" existe e o N muda;
    - no kit, os dois `href` começam com `https://wa.me/?text=`.
29. **`docs/prd.md`.** Mudanças da seção "Mudanças em relação ao PRD".
30. **`docs/setup/supabase-google-resend.md`.** `LINKS_SEGREDO_V1`, `LINKS_VERSAO_ATUAL`, a regra de rotação e a conferência dos buckets.
31. **`CLAUDE.md`.** Já ajustado no commit do design.

### Plano de verificação

- `npm run build`, `npm run lint`, `npm test` (inclui PGlite) e `npm run test:e2e`.
- **Gate de design:**
  - `ECOA_STYLEGUIDE=1 npm run build && npm run start`;
  - `npm run taste:lint`;
  - `npm run taste:inspect` nas telas novas, a 390, 768 e 1440 px;
  - corrigir todo FAIL, criticar as screenshots e corrigir os 3 maiores problemas, em até 3 rodadas.
- **Banco real:**
  - `get_advisors` sem alerta de segurança novo;
  - buckets `acervo` (5 MB, só JPEG) e `causos` (2 MB, webm/mp4/ogg) privados;
  - papel `porta_autor` sem grant nas tabelas da família;
  - com a chave pública e sem token, a API REST nega todas as tabelas novas.
- **Aceite (preview da Vercel, no celular):**
  1. Livro novo: só o nome → Salvar 10 → Pular fotos → kit, em menos de 30 s.
  2. Fixar o link da família num grupo de teste e abrir em 5 aparelhos. Cada um vota com um nome.
  3. Com Perguntas → Enquete aberta no computador, o ranking muda sem recarregar.
  4. Encerrar, "Salvar as 3 mais votadas" e ver as 3 em Para perguntar.
  5. De outro aparelho, gravar um causo de 20 s. Ele aparece tocável na aba Causos em menos de 10 s. Virar pergunta leva a pergunta para Para perguntar.

---

_Rascunhado com EGM_
