# Ecoa Memórias — PRD da Plataforma do Livro v2

2026-11-08 · Guilherme Eller · ajustes aprovados em 2026-11-09 (P30 a P34 de `docs/decisoes.md`)

## Resumo, decisões e ondas

A plataforma permite que a família (um responsável e até 3 co-facilitadores) ou o próprio autor criem um livro de memórias do primeiro áudio ao PDF de gráfica, sem a Ecoa no circuito, exceto na impressão. Gravar conversando é o centro da experiência. Gravar sozinho é igualmente simples.

**Vocabulário:** *autor* é quem conta as histórias. *Responsável* é quem comprou e publica o livro. *Co-facilitadores* são irmãos ou parentes com acesso total. *Família* é quem participa pelos links do grupo de WhatsApp.

### Decisões

| Tema | Decisão |
| --- | --- |
| Preço | R$ 467 por ano: gravações ilimitadas e 1 livro de 80 páginas com histórias, fotos e mensagens. Página extra com valor configurável. Frete e cópias extras à parte. |
| Pagamento | Onda 1: Pix manual, passe ativado no admin. Onda 2: link do Mercado Pago com Pix e cartão em até 12x, ativação automática. Exige CNPJ. |
| Renovação | Sem cobrança recorrente. Ao vencer, o passe fica em somente leitura e renova com novo pagamento. |
| Login | Google como entrada principal e link por e-mail como alternativa. O autor entra por link pessoal, sem login. |
| Papéis | 1 responsável (publica e envia à impressão), até 3 co-facilitadores com acesso total e o autor, em modo autor. |
| Coleta | Link de pergunta para o autor, gravação livre do autor, modo conversa e upload de 1 ou vários áudios. A pergunta é opcional em todas as portas, e lotes ou gravações longas com vários assuntos são divididos automaticamente em histórias. |
| Processamento | Visível na tela em tempo real: o texto aparece sendo escrito. E-mail só como reforço. |
| Tamanho do texto | Controle por história, de resumido a detalhado. |
| Tom | Só 1ª pessoa no v1. |
| Grupo da família | WhatsApp criado à mão, sem o autor. A plataforma entrega links prontos: o link da família (enquete de perguntas e sugestão de causos, sem IA), deixar mensagem para o livro e ouvir uma história. |
| Mensagens da família | Capítulo surpresa com áudio transcrito ou texto, e foto opcional. O autor nunca vê antes do livro impresso. |
| Impressão | Intermediada pela Ecoa, sem integração com gráfica. |
| Design | Referência: Remento. Minimalista, poucas palavras por tela, uma ação principal. Onboarding embutido (lista de primeiros passos e dicas de primeira vez), sem tour guiado. |
| Mural e reações | Fora. |

### Ondas

| Onda | Meta | O que entra |
| --- | --- | --- |
| 1. Natal | 2 famílias parceiras gravando na ceia, até 20/12/2026 | Login, passe manual, configuração inicial, perguntas e causos, enquete de perguntas da família, as cinco formas de coleta, IA com texto ao vivo, editor completo, modo autor, página de amostra em PDF com QR (para o dia 26), onboarding com primeiros passos e registro de acessos |
| 2. Lançamento | Primeiros clientes pagantes até março de 2027 | Co-facilitadores, compartilhar histórias, mensagens da família, montar e publicar o livro, pedido de impressão, Mercado Pago e painel de aderência no admin |

## Papéis e permissões

Só o responsável e os co-facilitadores têm login. O autor e a família entram por links com escopo mínimo, e o segredo das mensagens é garantido no banco, não só na tela.

| Papel | Entra por | Pode | Não pode |
| --- | --- | --- | --- |
| Responsável | Google ou link por e-mail | Tudo no livro; convidar e remover co-facilitadores; publicar; enviar para impressão; pagar | Ver outros livros |
| Co-facilitador (até 3, onda 2) | Convite por link, depois Google ou e-mail | Tudo o que o responsável faz, menos convidar, publicar, imprimir e pagar | Ver outros livros |
| Autor | Link pessoal permanente e revogável, sem login | Ver as perguntas para ele, gravar respostas e histórias livres, ouvir e corrigir os próprios textos, ler o livro em modo leitura | Ver mensagens da família, a enquete ou os causos sugeridos; publicar |
| Família e amigos | Links do grupo, sem login | Votar na enquete de perguntas, sugerir causo (áudio ou texto), deixar mensagem para o livro (onda 2), ouvir histórias compartilhadas | Ver o painel ou editar |
| Leitor do livro | QR impresso | Ouvir o áudio original daquela história ou mensagem, para sempre | Qualquer outra coisa |
| Admin Ecoa | Google, com papel admin | Passes, pedidos de impressão, métricas de uso, suporte | Editar conteúdo sem pedido da família |

**Regras**

- **Edição simultânea:** abrir uma história para editar mostra aos outros "Ana está editando" e bloqueia a edição. A trava expira depois de 2 minutos sem atividade.
- **Links sem login:** token aleatório de 128 bits guardado só como hash, um recurso por link, revogável pelo responsável, sem nomes no endereço. Se o link do autor vazar, o responsável gera um novo e o antigo para de funcionar.
- **Segredo das mensagens:** nenhuma consulta feita com o token do autor retorna mensagens da família, nem o capítulo de depoimentos. Isso é garantido por regra no banco (RLS) e coberto por teste automático.

## Jornadas

Três pessoas usam a plataforma, e nenhuma precisa de tutorial.

### Responsável

1. **Compra.** Paga (Pix manual na onda 1; Mercado Pago na onda 2) e recebe o e-mail de acesso.
2. **Entra com Google e vê a lista Seu livro em 5 passos.**
3. **Configuração inicial, toda pulável.** Quem é o autor (nome, apelido, celular opcional, parentesco). Primeiras perguntas por fase da vida: 1 já marcada em cada fase, que ele ajusta, mais perguntas e causos escritos por ele. Fotos iniciais. Na onda 2, quem mais vai ajudar (co-facilitadores).
4. **Kit de início.** A plataforma entrega dois textos prontos: o convite do grupo de WhatsApp da família, com o link da família (enquete de perguntas e sugestão de causos), e a mensagem para o autor, com o link pessoal dele. Quando a família termina de votar, o responsável vê o ranking e salva as perguntas que quiser.
5. **Coleta, em ciclos.** Toca em Nova história para gravar uma conversa ou subir áudios (já gravados no celular ou recebidos pelo WhatsApp), com ou sem pergunta. Ou escolhe uma pergunta ou um causo e decide: *Enviar ao autor* (abre o WhatsApp do responsável com a mensagem pronta, direto na conversa com o autor quando o celular dele está cadastrado), *Gravar agora* (modo conversa) ou *Subir áudios* (um ou vários).
6. **Acompanha na tela.** O card da história mostra "Ouvindo" e depois "Escrevendo", e o texto aparece sendo escrito.
7. **Edita.** Ajusta o tamanho, corrige, acrescenta áudio, marca como pronta.
8. **Onda 2:** monta o livro, publica e envia para impressão.

### Autor

1. Recebe o link pessoal pelo WhatsApp de quem o ajuda e pode salvá-lo na tela inicial do celular.
2. Abre e vê "Olá, Jair", as perguntas para ele e o botão *Contar uma história*, para gravar o que quiser, sem pergunta.
3. Grava, vê a história aparecer, ouve e corrige o texto se quiser.
4. Em *Meu livro*, lê o livro como ele está, sem o capítulo de mensagens da família.

### Família

1. Recebe no grupo o link da família, vota nas perguntas da enquete fase por fase (até 2 por fase) e, em *Sugerir pergunta ou causo*, escolhe o tipo, informa o nome e grava um áudio ou escreve: "Pede pra ele contar aquela vez em Guarapari que dormiu demais e perdeu a praia".
2. A sugestão chega ao responsável exatamente como foi enviada, sem IA. Com 1 toque ela vira pergunta, e o áudio de quem sugeriu pode tocar para o autor na tela de gravação ("A Ana pediu:").
3. Onda 2: recebe o link *Deixe uma mensagem para o livro*, grava ou escreve, anexa uma foto e confere o texto antes de enviar.

**Lembretes sem API:** uma pergunta enviada há 3 dias sem resposta mostra *Lembrar com carinho*, que abre o WhatsApp do responsável com uma mensagem gentil pronta.

## Design e experiência

A régua: um avô de 80 anos e um filho com pressa entendem cada tela em 3 segundos. Referência principal: Remento. O mockup HTML anterior não serve de referência visual.

- **Uma ação principal por tela**, em destaque. O resto aparece só quando for útil (revelação progressiva).
- **Poucas palavras:** um título curto e no máximo uma linha de apoio. Nenhum parágrafo explicativo na interface.
- **Duas camadas visuais:** o conteúdo do livro (textos, capa, prévias) em Newsreader sobre o fundo pólen; a interface (botões, menus, campos) na fonte do sistema (SF no iPhone, Roboto no Android). Cores herdadas da landing.
- **Estados vazios ensinam:** uma tela sem histórias mostra uma frase e um botão. Um gesto não óbvio ganha uma dica de 1 linha, mostrada uma única vez.
- **Movimento só para dar retorno:** gravando, escrevendo, salvo. Respeita a configuração de reduzir movimento do celular.
- **Pular e Depois sempre visíveis** em qualquer passo de configuração. A plataforma lembra depois, sem insistir.
- **Celular primeiro** para coleta e leitura. Editor e montagem do livro funcionam bem também no computador.
- **Autor:** pergunta com no mínimo 28px, texto com 20px, contraste AA, alvos de toque de 56px ou mais e botão de gravar de 120px ou mais.
- **Gate de design:** a skill design-taste-frontend da landing, com inspeção de telas em 390, 768 e 1440 px a cada prompt de interface.

## Requisitos funcionais por módulo

Onze módulos, cada um com a onda em que entra e critérios de aceite verificáveis.

### M1. Acesso, passe e pagamento (onda 1; Mercado Pago na onda 2)

- Login com Google e, como alternativa, link mágico por e-mail.
- O passe tem os estados `pendente`, `ativo` (12 meses a partir da ativação) e `somente_leitura`.
- Onda 1: o admin ativa o passe depois de confirmar o Pix.
- Onda 2: link de pagamento do Mercado Pago com Pix e cartão em até 12x. A confirmação do pagamento ativa o passe e envia o e-mail de acesso, sem ação humana.
- **Aceite:** em `somente_leitura`, gravar, editar, rodar IA e gerar livro ficam bloqueados; ler, baixar e os QR continuam funcionando. Na onda 2, um pagamento aprovado ativa o passe em menos de 1 minuto.

### M2. Configuração inicial (onda 1; co-facilitadores na onda 2)

- **Quem é:** nome (o único campo obrigatório), apelido, celular do autor (opcional: com ele, *Enviar ao autor* abre a conversa direto no WhatsApp; sem ele, o WhatsApp pede o contato), parentesco (pai, mãe, avô, avó, tio, tia, outro) e foto.
- **Primeiras perguntas, por fase da vida:** Família e raízes, Infância, Escola, Juventude, Trabalho, Amor e casamento, Filhos, Maturidade e legado. 1 pergunta por fase já vem marcada (8, escolhidas pelo parentesco); *Ver mais* abre a fase toda. O responsável desmarca, marca outras e escreve perguntas ou causos próprios em texto livre ("A viagem pra Guarapari em que você dormiu e perdeu a praia").
- **Fotos:** várias de uma vez. Ficam no acervo e podem virar perguntas com foto.
- **Quem mais ajuda (onda 2):** convite para até 3 co-facilitadores, por e-mail ou link.
- **Glossário sem formulário:** nasce das próprias histórias. A IA sugere os nomes de pessoas e lugares citados, e o responsável ajusta em Configurações quando quiser.
- Todo passo tem *Pular* e *Depois*.
- **Aceite:** configurar só com o nome leva menos de 30 segundos; ajustando as primeiras perguntas, menos de 3 minutos.

### M3. Perguntas, causos e enquete da família (onda 1)

- **Dois tipos de item, mesmo fluxo:** *pergunta* ("Como você conheceu a mamãe?") e *causo*, o pedido de uma história específica ("Conta da viagem pra Guarapari").
- **A lista é a base do livro, não uma fila de envio:** cada pergunta pode ser enviada ao autor ou feita ao vivo (modo conversa).
- **Fontes:** banco de 150 perguntas em 8 fases da vida, itens próprios do responsável em texto livre, perguntas com foto do acervo e sugestões da família.
- **Link da família:** um link permanente para fixar no grupo de WhatsApp, sem login. Mostra a enquete aberta (se houver) e o botão *Sugerir pergunta ou causo*.
- **Enquete, por fase da vida (P35):** o responsável escolhe como abrir: *Todas as perguntas* (a família vê as 150 do banco, mais as sugestões) ou *Eu escolho antes*, marcando fase por fase (8 fases e *Outras perguntas*, para as próprias e as sugestões da família). Antes de abrir, revisa tudo agrupado por fase, com *Mudar* em cada uma. A família vota em etapas, uma fase por tela, até 2 por fase, e revisa antes de votar; informa o nome. Um conjunto de votos por aparelho; o responsável pode remover um voto. Uma enquete aberta por livro, com até 200 opções.
- **Resultados:** ranking ao vivo agrupado por fase, com o número de votos e quem votou; perguntas sem voto ficam recolhidas. O responsável encerra a enquete e salva com 1 toque as mais votadas, ou escolhe uma a uma. Tudo vai para *Para perguntar*.
- **Sugestões da família:** a pessoa escolhe *Uma pergunta para ele* ou *Um causo para ele contar*, informa o nome e manda áudio de até 3 minutos ou texto. Chegam na aba *Sugestões* exatamente como enviadas, sem IA, com o selo do tipo. Com 1 toque viram item da lista ou opção da enquete, e o áudio de quem sugeriu pode tocar para o autor na tela de gravação ("A Ana pediu:").
- **Segredo:** o autor nunca vê a enquete nem as sugestões.
- Abas: *Para perguntar*, *Enviadas*, *Respondidas*, *Sugestões* e *Enquete*.
- Estados do item: `para_enviar`, `enviada`, `respondida`, `pulada`. Estados da enquete: `aberta`, `encerrada`.
- *Enviar ao autor* abre o WhatsApp do responsável com a mensagem pronta e o link pessoal do autor aberto naquele item.
- **Aceite:** 5 pessoas votam de celulares diferentes, o ranking aparece na hora para o responsável, e as 3 mais votadas entram em *Para perguntar* com 1 toque. Um causo em áudio aparece tocável na aba *Sugestões* em menos de 10 segundos.

### M4. Coleta de áudio (onda 1)

Cinco portas que produzem o mesmo objeto: gravações ligadas a uma história. A pergunta é opcional em todas, e o botão principal da home é Nova história. A IA decide o formato pelo conteúdo, não pela porta: 1 assunto vira 1 história; vários assuntos passam pela divisão.

- **Resposta do autor:** pelo link pessoal, aberto numa pergunta. Gravador com pausar, retomar, ouvir antes de enviar e regravar, até 30 minutos. Consentimento na primeira gravação.
- **História livre do autor:** *Contar uma história*, sem pergunta. A IA sugere o título.
- **Modo conversa:** o mesmo gravador no celular do responsável, com a pergunta no topo como roteiro ou em conversa livre, sem pergunta. Sem teto de duração: a gravação segue em partes de 30 minutos, sem parar o microfone (P39).
- **Upload de 1 áudio**, com pergunta opcional.
- **Lotes e conversas longas:** vários áudios de uma vez (por exemplo, 12 áudios encaminhados pelo autor no WhatsApp) ou uma gravação longa com vários assuntos (por exemplo, 1 hora de conversa na ceia). A IA identifica os assuntos e propõe histórias: junta áudios do mesmo assunto e separa um áudio que tenha dois assuntos. O responsável confirma, junta ou separa com 1 toque antes da edição.
- **Formatos:** .opus, .ogg, .m4a, .mp3, .wav e .webm, até 50 MB por arquivo (limite do plano grátis do Supabase; 100 MB quando o plano mudar) e 30 arquivos por lote.
- **Áudios recebidos (prompt 5A):** antes do gravador e da IA, o responsável sobe áudios gravados fora da plataforma, com pergunta e título opcionais. Eles ficam guardados como "aguardando processamento", tocáveis e sem botão de apagar. Ligar um áudio a uma pergunta passa a pergunta para *Respondidas*. No Android, a plataforma aparece no menu *Compartilhar* do WhatsApp, inclusive com vários áudios.
- **Resiliência:** a gravação fica guardada no aparelho enquanto acontece e sobe em partes, retomando quando a internet volta.
- **Aceite:** gravar 10 minutos com o modo avião ligado no meio, no Safari do iPhone e no Chrome do Android, sem perda. Um lote de 8 áudios sobre 3 assuntos vira 3 histórias propostas, e 1 gravação de 40 minutos com 4 assuntos vira 4. Uma história sem pergunta que responde a uma pergunta pendente gera a sugestão de marcá-la como respondida.

### M5. Processamento visível (onda 1)

- O card da história mostra as etapas ao vivo: *Enviando*, *Ouvindo*, *Escrevendo*, *Pronta para revisar*.
- Em *Escrevendo*, o texto aparece sendo escrito na tela, como numa conversa com IA.
- Quem sai e volta encontra o estado atual. O e-mail só é enviado se ninguém estiver com a tela aberta.
- **Aceite:** para um áudio de 5 minutos, as primeiras palavras aparecem em menos de 60 segundos depois do fim do upload, e o texto completo em menos de 3 minutos.

### M6. Editor de histórias (onda 1)

Tela inspirada no Remento: o áudio com a transcrição navegável de um lado e o texto editável do outro. No celular, as duas partes viram abas.

- **Edição manual** com salvamento automático e trava "Ana está editando".
- **Tamanho do texto:** controle deslizante de 5 posições, de *Resumido* a *Detalhado*. Gera uma nova versão da IA. Parágrafos editados à mão ficam travados, e o controle avisa quantos estão travados.
- **Revisar um trecho:** selecionar o texto e escolher *Mais curto*, *Mais fiel à fala*, *Corrigir* ou escrever uma instrução. A IA propõe; o usuário aceita ou descarta.
- **Acrescentar áudio ao mesmo assunto:** *Gravar mais sobre isso* ou *Subir mais um áudio*. A IA propõe a integração como diferença sobre o texto atual. Edição manual nunca é sobrescrita sem aceite.
- **Clicar numa frase** toca o trecho correspondente do áudio.
- **Trechos sem sustentação** no áudio aparecem grifados com *Confira*.
- **Versões restauráveis**, com a origem de cada uma (IA, responsável, co-facilitador, autor).
- **Fotos:** até 4 por história, com legenda e alerta abaixo de 1200 px no lado menor.
- Estados: `processando`, `rascunho`, `pronta`.
- **Aceite:** depois de editar à mão o 2º parágrafo, acrescentar um áudio e mudar o tamanho, o 2º parágrafo continua idêntico.

### M7. Modo autor (onda 1)

- Link pessoal permanente, revogável, que pode ser salvo na tela inicial do celular.
- Quatro telas: *Perguntas para você*, *Contar uma história*, *Minhas histórias* (ouvir, ler, corrigir) e *Meu livro* (leitura, sem as mensagens da família).
- As correções do autor entram como versão "editada pelo autor", com um selo visível para o responsável.
- **Aceite:** com o token do autor, nenhuma rota ou consulta retorna mensagens da família. Coberto por teste automático.

### M8. Mensagens da família (onda 2)

- O responsável recebe um link *Deixe uma mensagem para o livro do Jair* com um texto pronto para enviar a quem quiser.
- Quem recebe informa nome e relação, grava um áudio de até 5 minutos ou escreve, e anexa uma foto se quiser.
- O áudio vira transcrição limpa (sem reescrever). A pessoa confere o texto antes de enviar.
- O responsável escolhe quais entram no livro. Elas contam nas 80 páginas e cada uma tem o seu QR.
- **Aceite:** o autor não vê mensagens em nenhuma tela, nem em *Meu livro*.

### M9. Livro e impressão (onda 2; página de amostra na onda 1)

- **Página de amostra (onda 1):** 1 história vira um PDF de 1 página com foto e QR, para o dia 26.
- **Montar:** histórias e mensagens (incluir, excluir, ordenar), capa (título, subtítulo, foto, cor do tecido, prévia ao vivo) e conferência (alertas e páginas sobre 80, com o valor extra).
- **Publicar:** só o responsável. Gera uma versão congelada com os PDFs de miolo e capa.
- **Enviar para impressão:** endereço e número de cópias. O pedido aparece no admin, e o responsável acompanha o status: *recebido*, *aguardando pagamento*, *na gráfica*, *enviado* (com rastreio).
- **Aceite:** o QR de 2 cm impresso abre o player a 20 cm de distância.

### M10. Admin e aderência (registro na onda 1; painel na onda 2)

- **Onda 1:** lista de livros, ativar e renovar passe, reenviar acesso. Registro de eventos desde o primeiro dia: quem (responsável, co-facilitador, autor, família), o quê (entrou, gravou, editou, sugeriu, votou, gerou) e quando.
- **Onda 2:** painel de aderência com acessos por dia por livro e por pessoa, gravações por semana, livros parados há 7 dias ou mais e o funil configuração → 1ª história → 5 histórias → livro publicado. Fila de pedidos de impressão.
- **Aceite:** consigo ver quem acessou o livro X ontem e o que fez.

### M11. Onboarding (onda 1)

O produto ensina no momento do uso, não antes. Sem tour guiado nem carrossel de boas-vindas.

- **Seu livro em 5 passos:** cartão na home do responsável, com progresso. Passos: dizer quem é o autor, abrir a enquete no grupo, enviar a primeira pergunta ou gravar uma conversa, ver a primeira história nascer, revisar e marcar como pronta. Cada passo tem 1 botão que leva direto à ação. O cartão some ao concluir e volta se o livro ficar parado por 7 dias.
- **Dicas de primeira vez:** uma linha com "Entendi", mostrada uma única vez por tela e por pessoa, só para gestos não óbvios (tocar numa frase para ouvir, arrastar o controle de tamanho, juntar e separar histórias).
- **Marco da primeira história:** um momento simples ("A primeira história do Jair está pronta") com o botão de compartilhar no grupo.
- **Autor:** na primeira abertura, uma tela única ("Toque no círculo e conte. Pode pausar quando quiser.") e o consentimento.
- **Família:** o link da família se explica em uma linha ("Escolha as histórias que você quer ouvir do Jair. Até 2 por fase.").
- Cada passo concluído vira evento em `events`.
- **Aceite:** um responsável novo chega à primeira história em menos de 48 horas sem ajuda da Ecoa, e o admin mostra em qual passo cada livro está.

## Pipeline de IA

A IA edita como um jornalista que não inventa: cada parágrafo aponta para os trechos do áudio que o sustentam. O fluxo é desenhado para três metas ao mesmo tempo: primeiras palavras na tela em menos de 60 segundos, zero fato inventado e menos de R$ 30 de IA por livro.

### Etapas

1. **Contexto do livro**, montado uma vez e reaproveitado em toda chamada (com cache de prompt, que barateia chamadas repetidas): glossário, temas e um resumo curto de cada história já escrita. Esse resumo é a memória do livro: evita repetir histórias e permite ligar uma à outra.
2. **Transcrição:** palavras com marcação de tempo e separação de quem fala. Os nomes do glossário vão como dicas de vocabulário quando o provedor aceitar.
3. **Estruturação** (modelo rápido e barato): identifica autor e entrevistador, marca trechos sem conteúdo e detecta mudanças de assunto.
4. **Divisão em histórias** (em lotes e em gravações longas com mais de um assunto): agrupa trechos do mesmo assunto entre arquivos, separa assuntos misturados num mesmo arquivo e propõe títulos e a pergunta pendente que cada uma parece responder. O responsável confirma antes da edição.
5. **Edição** (modelo mais capaz), transmitida para a tela palavra por palavra: título e parágrafos, cada parágrafo com os seus segmentos de origem, no tamanho escolhido no controle.
6. **Verificação independente:** uma chamada sem o contexto da edição compara cada parágrafo com os seus segmentos e marca o que não tem sustentação, nomes duvidosos e datas inconsistentes.
7. **Aprendizado com as edições:** a diferença entre o texto da IA e a versão final do usuário é guardada. Ela alimenta os exemplos do prompt e o conjunto de testes, e é o ativo de dados que cresce a cada livro.

### Regras de edição (vão no prompt e nos testes)

- Nunca acrescentar fato, data, nome ou emoção que não esteja no áudio.
- Preservar expressões e regionalismos do autor. Tirar vícios, repetições, falsos começos e digressões vazias.
- No modo conversa, absorver as perguntas do entrevistador na narrativa.
- Ordem cronológica quando a fala vai e volta, sem reordenar além do necessário.
- Tamanho conforme o controle: de cerca de 30% (Resumido) a cerca de 90% (Detalhado) das palavras da transcrição limpa.

### Fluxos especiais

- **Mudar o tamanho:** a nova versão sai da mesma base estruturada, nunca da versão anterior, para não acumular perda. Parágrafos travados ficam como estão.
- **Acrescentar áudio:** o áudio novo continua a numeração de segmentos. O modelo recebe o texto atual com os parágrafos travados e devolve só inserções e alterações, mostradas como diferença.
- **Revisar um trecho:** entra o trecho, um parágrafo de contexto antes e depois, os segmentos de origem e a instrução. Sai um único substituto, que passa pela verificação.
- **Glossário automático:** ao fim de cada história, a IA sugere os nomes de pessoas e lugares citados. O responsável aceita ou corrige em Configurações, sem passo obrigatório. Os nomes aceitos melhoram a transcrição das histórias seguintes.
- **Mensagens da família (onda 2):** só transcrição limpa, sem edição de estilo.

### Padrão-ouro e testes

Sem padrão-ouro editado à mão antes do lançamento (T31). A qualidade melhora com o **uso real do design partner**: André grava o pai, Nelson, e as correções da família sobre o texto da IA viram a base de regras, estilo, glossário e testes (design doc `docs/designs/laboratorio-ia.md`).

- **Desde o dia 1, sem simplificar:** a regra de não inventar, a marcação "Confira" e o consentimento. A versão da IA de cada história fica guardada sem alteração, para comparar com a versão corrigida.
- **Hipótese do teste:** a família aceita o texto corrigindo no máximo 1 de cada 3 parágrafos, sem nenhuma invenção que passe sem "Confira".
- **Métricas:** percentual de parágrafos corrigidos, invenções removidas em parágrafos sem "Confira" (escapes), percentual de "Confira" que eram invenção de verdade, custo e tempo por história.
- **Critério de morte:** 1 escape de invenção que a família perceba, ou mais de 50% do texto reescrito em 3 histórias seguidas. Se acontecer, as telas param e a prioridade volta para regras e verificação.
- **Voltam por gatilho:** rubrica e juiz de IA com 5 histórias corrigidas pelo André; canários e auditoria formal no 1º escape ou antes do 1º cliente pagante; exemplos no prompt com o 1º par com consentimento de reuso.

### Provedores

- **Transcrição:** ElevenLabs Scribe (T32), escolhido por avaliação de mercado (acerto em português, falantes separados, tempo por palavra). AssemblyAI fica pronto atrás da mesma interface. A comparação com áudio real volta se o Scribe errar muitos nomes nas correções do André.
- **Estruturação, edição e verificação:** Claude via API, com um modelo rápido para estruturar e um mais capaz para editar e verificar. Saídas em JSON validadas por zod.
- **Custo:** registrado por etapa e por livro e visível no admin.

## Livro pronto para a gráfica

O resultado são dois PDFs, o miolo e a capa aberta, que a Ecoa envia à gráfica sem retrabalho. Cada publicação é uma versão congelada, então reimprimir depois sai idêntico.

### Estrutura do miolo

1. Folha de rosto (título, nome do autor).
2. Dedicatória opcional, escrita pelo responsável.
3. Sumário automático.
4. Capítulos, um por história: título, ano (se houver), foto, texto e QR com "aponte e ouça" e o código curto impresso embaixo.
5. **Mensagens da família** (onda 2): capítulo final, uma mensagem por página ou meia página, com nome, relação, foto opcional e QR quando houver áudio.
6. Colofão: "Livro feito com a Ecoa Memórias" e a data.

### Regras de paginação

- Todo capítulo começa em página ímpar, com páginas em branco intencionais quando necessário.
- O total é completado até o múltiplo exigido pela gráfica (normalmente 4).
- **O mesmo motor gera a estimativa e o PDF final.** A contagem de páginas vem de uma renderização real, para o valor extra nunca surpreender.

### Especificação técnica (confirmar com a gráfica)

| Item | Valor inicial | Onde mora |
| --- | --- | --- |
| Formato | 21 × 21 cm | `config.ts` |
| Sangria | 3 mm em cada lado | `config.ts` |
| Páginas incluídas | 80 | `config.ts` |
| Valor por página extra | a definir | `config.ts` |
| Valor por cópia extra | a definir | `config.ts` |
| Resolução mínima de foto | 300 DPI no tamanho impresso | validação |
| Fontes | Newsreader, embutida | template |
| Cor | RGB ou CMYK, conforme a gráfica | a decidir |
| Lombada | páginas × espessura do papel, pela fórmula da gráfica | `config.ts` |

### QR codes permanentes

- O QR aponta para `ouvir.ecoa-memorias.com.br/{código}` (com hífen, `docs/decisoes/dominio.md`), com código de 8 caracteres sem letras ambíguas. Esse subdomínio redireciona para o player, onde quer que o áudio esteja.
- Correção de erro nível Q, mínimo de 2 × 2 cm, preto sobre o papel, com margem de silêncio.
- O player abre sem login, toca o áudio original e mostra o título. Funciona com o passe vencido.
- **Teste automático:** cada QR do PDF é decodificado por software antes de liberar o download.

### Alertas antes de publicar

- Foto abaixo de 300 DPI no tamanho impresso: amarelo, pode seguir.
- História sem título: vermelho, bloqueia.
- História com menos de 120 palavras: amarelo (página vazia).
- Mais de 80 páginas: mostra o valor extra antes de publicar.

### Impressão intermediada pela Ecoa

1. O responsável publica e toca em *Enviar para impressão*, com endereço e número de cópias.
2. O pedido entra no admin. A Ecoa calcula frete e extras e envia um link de pagamento.
3. Com o pagamento confirmado, a Ecoa baixa os PDFs e envia à gráfica manualmente.
4. A Ecoa atualiza o status e o rastreio no admin, e o responsável acompanha na plataforma.

### Motor de PDF

Recomendação inicial: **Typst**, uma linguagem de diagramação feita para impressão. É rápida, gera sempre o mesmo resultado e roda sem navegador. A alternativa é HTML com Paged.js num Chromium sem tela. A decisão sai de um teste de 1 dia no prompt da página de amostra, ainda na onda 1.

## Modelo de dados e arquitetura

A stack repete a da landing e acrescenta só o que o produto exige: tempo real na tela, fila de processamento, upload retomável, editor rico e motor de PDF. O modelo de dados já nasce com co-facilitadores e mensagens, mesmo que as telas cheguem só na onda 2.

### Stack

| Camada | Escolha | Por quê |
| --- | --- | --- |
| App | Next.js (mesma versão da landing), TypeScript strict, Tailwind, zod | Continuidade de aprendizado |
| Login | Supabase Auth com Google e link mágico por e-mail | Entrada em 2 toques |
| Banco e arquivos | Supabase Postgres e Storage privado, região São Paulo | Um fornecedor, dados no Brasil |
| Isolamento | RLS: regra no próprio banco que impede uma família de ler dados de outra, como uma catraca por andar | Segurança mesmo se o código errar |
| Tempo real | Supabase Realtime | Etapas ao vivo e texto sendo escrito na tela |
| Fila | Serviço gerenciado de jobs (Inngest ou Trigger.dev, escolher no prompt 0) | Transcrição e IA levam minutos |
| Upload | TUS (upload em partes com retomada) e cache local no aparelho | Gravação sem perda com sinal ruim |
| Editor | Tiptap | Parágrafos com identificador, propostas como diferença, histórico |
| PDF | Typst (a confirmar no prompt 10) | Saída determinística, qualidade de impressão |
| Pagamento (onda 2) | Link de pagamento do Mercado Pago com notificação automática | Pix e cartão em 12x, sem dado de cartão na Ecoa |
| E-mail | Resend | Já usado na landing |
| App instalável | PWA com atalho de compartilhamento no Android | Sem loja de apps |
| Domínios | `app.ecoa-memorias.com.br` e `ouvir.ecoa-memorias.com.br` (QR; substitui a grafia sem hífen, ver `docs/decisoes/dominio.md`) | O destino do QR pode mudar sem reimprimir livros |

### Tabelas

| Tabela | Guarda |
| --- | --- |
| `books` | Livro: autor (nome, apelido, celular opcional, parentesco, foto), estado e vencimento do passe, capa |
| `book_members` | Responsável e co-facilitadores, com papel e dicas de primeira vez já vistas |
| `author_access` | Link pessoal do autor (hash do token, revogado em) |
| `family_access` | Link permanente da família para o grupo (hash do token, revogado em) |
| `book_context` | Temas e resumo de cada história (memória do livro) |
| `glossary_entries` | Pessoas e lugares sugeridos pela IA a partir das histórias, com apelido, observação e estado (sugerido ou aceito) |
| `photos` | Acervo de fotos do livro, com dimensões e legenda |
| `prompts` | Perguntas e causos: tipo, texto, foto, origem (banco, própria, família, enquete), áudio de quem sugeriu, estado |
| `causos` | Sugestões da família: tipo (pergunta ou causo), nome, texto ou áudio, estado |
| `polls` | Enquete: estado (aberta ou encerrada), aberta em, encerrada em. Até 2 votos por fase por pessoa; a fase de cada opção vem do banco_id |
| `poll_items` | Opções da enquete, cada uma ligada a uma pergunta ou causo |
| `poll_votes` | Votos: nome de quem votou, identificador do aparelho, opção |
| `recordings` | Áudios: origem (autor, livre, conversa, upload, lote), pergunta e título opcionais, duração, estado do upload, processado em |
| `transcripts` | Segmentos com id, tempo, falante, texto e confiança |
| `stories` e `story_recordings` | História e as gravações que a compõem, em ordem |
| `story_versions` | Histórico: conteúdo, fontes por parágrafo, parágrafos travados, tamanho, origem (IA, responsável, co-facilitador, autor) |
| `edit_locks` | Quem está editando qual história, com expiração |
| `family_messages` | Mensagens: nome, relação, texto, áudio, foto, incluída no livro (onda 2) |
| `qr_codes` | Código de 8 caracteres, história ou mensagem. **Nunca apagados.** |
| `book_exports` | Versões publicadas: PDFs, páginas, retrato congelado do conteúdo |
| `print_orders` e `payments` | Pedidos de impressão e pagamentos (onda 2) |
| `events` | Registro de uso: quem, papel, ação, livro, quando |
| `ai_usage` | Custo por etapa e por livro |

**Regras de ouro:** áudio original, `qr_codes` e `book_exports` nunca são apagados por ação comum do usuário. `family_messages` nunca é legível com o token do autor. Exclusão total só por pedido formal (LGPD), com aviso de que os QR impressos deixarão de tocar.

## Requisitos não funcionais

Voz de idoso e segredo de família são os dados mais sensíveis que a Ecoa vai guardar. Segurança e LGPD entram desde o prompt 0.

### Segurança

- RLS em todas as tabelas, com testes automáticos provando que: um livro não lê outro; o token do autor não lê mensagens da família; links da família só alcançam o próprio recurso.
- Tokens guardados só como hash. Áudios em storage privado, servidos por URL assinada de curta duração. O player do QR é a única porta pública, protegida por código aleatório.
- Limite de requisições nas rotas públicas (autor, família, mensagem, ouvir). Limite de tamanho no upload.
- Dados de cartão nunca passam pela Ecoa: o Mercado Pago processa o pagamento e só avisa o resultado.
- Chaves de API só no servidor e nas variáveis da Vercel.

### LGPD

- **Consentimento do autor** na primeira gravação, em uma frase e com um toque: "Suas histórias vão virar um livro para a sua família. Podemos guardar a sua voz para isso?" O aceite fica registrado com data.
- **Consentimento de quem envia causo ou mensagem**, no próprio formulário.
- Banco e storage na região São Paulo do Supabase.
- Contratos com os provedores de IA garantindo que os dados não treinam modelos de terceiros.
- Termos de uso e política de privacidade próprios da plataforma.
- Exportar tudo (áudios, textos, PDFs) com um clique e exclusão total por pedido.

### Desempenho

- Tela do autor carrega em menos de 2 segundos em 4G.
- Primeiras palavras do texto em menos de 60 segundos após o upload; texto completo de um áudio de 15 minutos em até 5 minutos (95% dos casos).
- PDF de 80 páginas gerado em menos de 2 minutos.
- Funciona no Safari do iOS 16+ e no Chrome do Android 10+.

### Custos mensais estimados (verificar preços atuais)

| Item | Até 10 livros | Até 100 livros |
| --- | --- | --- |
| Vercel | Pro (o plano grátis não permite uso comercial) | Pro |
| Supabase | Grátis (cerca de 1 GB de storage, uns 5 a 10 livros) | Pro (cerca de US$ 25, com 100 GB) |
| Fila de jobs | Plano grátis | Grátis ou de entrada |
| IA | Menos de R$ 30 por livro | Menos de R$ 30 por livro |
| Mercado Pago | Taxa por transação; o parcelamento sem juros sai da margem | Idem |
| Resend | Grátis | Grátis ou de entrada |

**Custo perpétuo:** os áudios dos QR ficam hospedados por décadas. Ao passar de 100 livros, avaliar mover os áudios antigos para storage frio (Cloudflare R2, sem custo de saída), mantendo o mesmo código do QR.

## Fora do escopo e pendências

Tudo abaixo foi cortado de propósito e volta quando um cliente real pedir.

**Fora das duas ondas:** mural com reações e comentários, checkout próprio de cartão, integração com gráfica, gravação em vídeo, app nativo, e-book, indicação e cartão-presente, API do WhatsApp, 3ª pessoa, leitura de conversa exportada do WhatsApp, versão B2B para residenciais.

### Pendências do fundador

- [ ] **Abrir CNPJ e conta no Mercado Pago.** Bloqueia o pagamento automático da onda 2.
- [ ] **Parcelamento:** 12x sem juros (a Ecoa absorve a taxa) ou com juros para o cliente.
- [ ] **Cotação da gráfica:** 80 páginas, capa dura, colorido, 21 × 21 cm. Define a margem dos R$ 467, o valor por página e por cópia extra, o modo de cor, a lombada e o múltiplo de páginas.
- [ ] **Domínio `ecoamemorias.com.br`** registrado e apontado para a Vercel (os subdomínios `app` e `ouvir` dependem dele).
- [ ] **Banco de 150 perguntas:** rascunho gerado no prompt 4, revisão da tia Caia.
- [x] ~~**Padrão-ouro:** 5 a 10 histórias editadas pela tia Caia antes do prompt 1 terminar.~~ Substituído pelo uso real do André (T31).
- [x] ~~**Áudios de teste:** 5 áudios reais dos pais dos 2 parceiros de design.~~ Substituído pelos áudios reais do André (T31).
- [ ] **Preço atual do ElevenLabs Scribe** conferido no site antes da primeira cobrança real.

## Sequência de prompts para o Claude Code

Movida para `docs/prompts.md` (cada sessão lê só o prompt dela).
