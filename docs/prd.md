# Ecoa Memórias — PRD da Plataforma do Livro v2

Nov 8, 2026 · @Guilherme Eller

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
| Coleta | Link de pergunta para o autor, gravação livre do autor, modo conversa, upload de 1 áudio e upload em lote com divisão automática em histórias. |
| Processamento | Visível na tela em tempo real: o texto aparece sendo escrito. E-mail só como reforço. |
| Tamanho do texto | Controle por história, de resumido a detalhado. |
| Tom | Só 1ª pessoa no v1. |
| Grupo da família | WhatsApp criado à mão, sem o autor. A plataforma entrega links prontos: sugerir causo (áudio ou texto, sem IA), deixar mensagem para o livro e ouvir uma história. |
| Mensagens da família | Capítulo surpresa com áudio transcrito ou texto, e foto opcional. O autor nunca vê antes do livro impresso. |
| Impressão | Intermediada pela Ecoa, sem integração com gráfica. |
| Design | Referência: Remento. Minimalista, poucas palavras por tela, uma ação principal. |
| Mural e reações | Fora. |

### Ondas

| Onda | Meta | O que entra |
| --- | --- | --- |
| 1. Natal | 2 famílias parceiras gravando na ceia, até 20/12/2026 | Login, passe manual, configuração inicial com contexto, perguntas e causos, as cinco formas de coleta, IA com texto ao vivo, editor completo, modo autor, página de amostra em PDF com QR (para o dia 26) e registro de acessos |
| 2. Lançamento | Primeiros clientes pagantes até março de 2027 | Co-facilitadores, compartilhar histórias, mensagens da família, montar e publicar o livro, pedido de impressão, Mercado Pago e painel de aderência no admin |

## Papéis e permissões

Só o responsável e os co-facilitadores têm login. O autor e a família entram por links com escopo mínimo, e o segredo das mensagens é garantido no banco, não só na tela.

| Papel | Entra por | Pode | Não pode |
| --- | --- | --- | --- |
| Responsável | Google ou link por e-mail | Tudo no livro; convidar e remover co-facilitadores; publicar; enviar para impressão; pagar | Ver outros livros |
| Co-facilitador (até 3, onda 2) | Convite por link, depois Google ou e-mail | Tudo o que o responsável faz, menos convidar, publicar, imprimir e pagar | Ver outros livros |
| Autor | Link pessoal permanente e revogável, sem login | Ver as perguntas para ele, gravar respostas e histórias livres, ouvir e corrigir os próprios textos, ler o livro em modo leitura | Ver mensagens da família, ver causos sugeridos, publicar |
| Família e amigos | Links do grupo, sem login | Sugerir causo (áudio ou texto), deixar mensagem para o livro (onda 2), ouvir histórias compartilhadas | Ver o painel ou editar |
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
2. **Entra com Google.**
3. **Configuração inicial, toda pulável.** Quem é o autor (nome, apelido, parentesco). "Me conte sobre ele", por texto ou áudio, para a IA criar glossário, temas e perguntas sugeridas. Fotos iniciais. Na onda 2, quem mais vai ajudar (co-facilitadores).
4. **Kit de início.** A plataforma entrega dois textos prontos: o convite do grupo de WhatsApp da família, com o link de sugerir causos, e a mensagem para o autor, com o link pessoal dele.
5. **Coleta, em ciclos.** Escolhe uma pergunta ou um causo e decide: *Enviar ao autor* (abre o WhatsApp do responsável com a mensagem pronta), *Gravar agora* (modo conversa) ou *Subir áudios* (um ou vários).
6. **Acompanha na tela.** O card da história mostra "Ouvindo" e depois "Escrevendo", e o texto aparece sendo escrito.
7. **Edita.** Ajusta o tamanho, corrige, acrescenta áudio, marca como pronta.
8. **Onda 2:** monta o livro, publica e envia para impressão.

### Autor

1. Recebe o link pessoal pelo WhatsApp de quem o ajuda e pode salvá-lo na tela inicial do celular.
2. Abre e vê "Olá, Jair", as perguntas para ele e o botão *Contar uma história*, para gravar o que quiser, sem pergunta.
3. Grava, vê a história aparecer, ouve e corrige o texto se quiser.
4. Em *Meu livro*, lê o livro como ele está, sem o capítulo de mensagens da família.

### Família

1. Recebe no grupo o link *Sugira um causo*, informa o nome e grava um áudio ou escreve: "Pede pra ele contar aquela vez em Guarapari que dormiu demais e perdeu a praia".
2. A sugestão chega ao responsável exatamente como foi enviada, sem IA. Com 1 toque ela vira pergunta, e o áudio de quem sugeriu pode tocar para o autor na tela de gravação ("A Ana pediu:").
3. Onda 2: recebe o link *Deixe uma mensagem para o livro*, grava ou escreve, anexa uma foto e confere o texto antes de enviar.

**Lembretes sem API:** uma pergunta enviada há 3 dias sem resposta mostra *Lembrar com carinho*, que abre o WhatsApp do responsável com uma mensagem gentil pronta.

## Design e experiência

A régua: um avô de 80 anos e um filho com pressa entendem cada tela em 3 segundos. Referência principal: Remento. O mockup HTML anterior não serve de referência visual.

- **Uma ação principal por tela**, em destaque. O resto aparece só quando for útil (revelação progressiva).
- **Poucas palavras:** um título curto e no máximo uma linha de apoio. Nenhum parágrafo explicativo na interface.
- **Duas camadas visuais:** o conteúdo do livro (textos, capa, prévias) em Newsreader sobre o fundo pólen; a interface (botões, menus, campos) na fonte do sistema (SF no iPhone, Roboto no Android). Cores herdadas da landing.
- **Estados vazios ensinam:** uma tela sem histórias mostra uma frase e um botão.
- **Movimento só para dar retorno:** gravando, escrevendo, salvo. Respeita a configuração de reduzir movimento do celular.
- **Pular e Depois sempre visíveis** em qualquer passo de configuração. A plataforma lembra depois, sem insistir.
- **Celular primeiro** para coleta e leitura. Editor e montagem do livro funcionam bem também no computador.
- **Autor:** pergunta com no mínimo 28px, texto com 20px, contraste AA, alvos de toque de 56px ou mais e botão de gravar de 120px ou mais.
- **Gate de design:** a skill design-taste-frontend da landing, com inspeção de telas em 390, 768 e 1440 px a cada prompt de interface.

## Requisitos funcionais por módulo

Dez módulos, cada um com a onda em que entra e critérios de aceite verificáveis.

### M1. Acesso, passe e pagamento (onda 1; Mercado Pago na onda 2)

- Login com Google e, como alternativa, link mágico por e-mail.
- O passe tem os estados `pendente`, `ativo` (12 meses a partir da ativação) e `somente_leitura`.
- Onda 1: o admin ativa o passe depois de confirmar o Pix.
- Onda 2: link de pagamento do Mercado Pago com Pix e cartão em até 12x. A confirmação do pagamento ativa o passe e envia o e-mail de acesso, sem ação humana.
- **Aceite:** em `somente_leitura`, gravar, editar, rodar IA e gerar livro ficam bloqueados; ler, baixar e os QR continuam funcionando. Na onda 2, um pagamento aprovado ativa o passe em menos de 1 minuto.

### M2. Configuração inicial (onda 1; co-facilitadores na onda 2)

- **Quem é:** nome (o único campo obrigatório), apelido, parentesco (pai, mãe, avô, avó, tio, tia, outro) e foto.
- **Me conte sobre ele:** texto livre ou áudio de até 5 minutos. A IA extrai o glossário (pessoas, lugares, apelidos), os grandes temas da vida e 10 perguntas personalizadas. O glossário pode ser revisado depois, sem obrigação.
- **Fotos:** várias de uma vez. Ficam no acervo e podem virar perguntas com foto.
- **Quem mais ajuda (onda 2):** convite para até 3 co-facilitadores, por e-mail ou link.
- Todo passo tem *Pular* e *Depois*.
- **Aceite:** configurar só com o nome leva menos de 30 segundos; com tudo preenchido, menos de 5 minutos.

### M3. Perguntas e causos (onda 1)

- Banco de 150 perguntas em 8 temas, mais as perguntas personalizadas do M2, as próprias do responsável e as perguntas com foto.
- **Causos da família:** link fixo para o grupo. A pessoa informa o nome e grava um áudio de até 3 minutos ou escreve. A sugestão chega na aba *Causos* exatamente como foi enviada, sem IA.
- **Causo vira pergunta** com 1 toque. A pergunta pode levar o áudio de quem sugeriu, que toca para o autor na tela de gravação.
- Estados: `para_enviar`, `enviada`, `respondida`, `pulada`.
- *Enviar ao autor* abre o WhatsApp do responsável com a mensagem pronta e o link pessoal do autor aberto naquela pergunta.
- **Aceite:** um causo em áudio enviado pelo link aparece tocável na aba *Causos* em menos de 10 segundos.

### M4. Coleta de áudio (onda 1)

Cinco portas que produzem o mesmo objeto: gravações ligadas a uma história.

- **Resposta do autor:** pelo link pessoal, aberto numa pergunta. Gravador com pausar, retomar, ouvir antes de enviar e regravar, até 30 minutos. Consentimento na primeira gravação.
- **História livre do autor:** *Contar uma história*, sem pergunta. A IA sugere o título.
- **Modo conversa:** o mesmo gravador no celular do responsável, com a pergunta no topo como roteiro.
- **Upload de 1 áudio** ligado a uma pergunta.
- **Upload em lote:** vários áudios de uma vez (por exemplo, 12 áudios encaminhados pelo autor no WhatsApp). A IA identifica os assuntos e propõe histórias: junta áudios do mesmo assunto e separa um áudio que tenha dois assuntos. O responsável confirma, junta ou separa com 1 toque antes da edição.
- **Formatos:** .opus, .ogg, .m4a, .mp3, .wav e .webm, até 100 MB por arquivo e 30 arquivos por lote. No Android, a plataforma aparece no menu *Compartilhar* do WhatsApp, inclusive com vários áudios.
- **Resiliência:** a gravação fica guardada no aparelho enquanto acontece e sobe em partes, retomando quando a internet volta.
- **Aceite:** gravar 10 minutos com o modo avião ligado no meio, no Safari do iPhone e no Chrome do Android, sem perda. Um lote de 8 áudios sobre 3 assuntos vira 3 histórias propostas.

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

- **Onda 1:** lista de livros, ativar e renovar passe, reenviar acesso. Registro de eventos desde o primeiro dia: quem (responsável, co-facilitador, autor, família), o quê (entrou, gravou, editou, sugeriu, gerou) e quando.
- **Onda 2:** painel de aderência com acessos por dia por livro e por pessoa, gravações por semana, livros parados há 7 dias ou mais e o funil configuração → 1ª história → 5 histórias → livro publicado. Fila de pedidos de impressão.
- **Aceite:** consigo ver quem acessou o livro X ontem e o que fez.

## Pipeline de IA

A IA edita como um jornalista que não inventa: cada parágrafo aponta para os trechos do áudio que o sustentam. O fluxo é desenhado para três metas ao mesmo tempo: primeiras palavras na tela em menos de 60 segundos, zero fato inventado e menos de R$ 30 de IA por livro.

### Etapas

1. **Contexto do livro**, montado uma vez e reaproveitado em toda chamada (com cache de prompt, que barateia chamadas repetidas): glossário, temas, o texto "sobre ele" e um resumo curto de cada história já escrita. Esse resumo é a memória do livro: evita repetir histórias e permite ligar uma à outra.
2. **Transcrição:** palavras com marcação de tempo e separação de quem fala. Os nomes do glossário vão como dicas de vocabulário quando o provedor aceitar.
3. **Estruturação** (modelo rápido e barato): identifica autor e entrevistador, marca trechos sem conteúdo e detecta mudanças de assunto.
4. **Divisão em histórias** (só no upload em lote): agrupa trechos do mesmo assunto entre arquivos, separa assuntos misturados num mesmo arquivo e propõe títulos. O responsável confirma antes da edição.
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
- **Me conte sobre ele:** extrai glossário, temas e 10 perguntas personalizadas.
- **Mensagens da família (onda 2):** só transcrição limpa, sem edição de estilo.

### Padrão-ouro e testes

- Antes do primeiro cliente: 5 a 10 histórias reais editadas pela tia Caia a partir da transcrição bruta. Esses pares viram os exemplos do prompt e o conjunto de testes.
- Toda mudança de prompt roda contra esse conjunto. Um avaliador automático pontua fidelidade, voz preservada e legibilidade de 1 a 5, e a tia Caia avalia uma amostra.
- **Critério para liberar:** nenhuma invenção de fato no conjunto e nota média de 4 ou mais em voz preservada.

### Provedores

- **Transcrição:** escolhida por teste com áudios reais dos pais dos parceiros de design (monólogo, conversa, ruído de mesa, áudio do WhatsApp). Critérios: acerto de nomes, separação de vozes, sotaque, velocidade e custo. Candidatos: ElevenLabs Scribe, Deepgram, AssemblyAI e OpenAI.
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

- O QR aponta para `ouvir.ecoa-memorias.com.br/{código}`, com código de 8 caracteres sem letras ambíguas. Esse subdomínio redireciona para o player, onde quer que o áudio esteja.
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
| Domínios | `app.ecoa-memorias.com.br` e `ouvir.ecoa-memorias.com.br` (QR) | O destino do QR pode mudar sem reimprimir livros |

### Tabelas

| Tabela | Guarda |
| --- | --- |
| `books` | Livro: autor (nome, apelido, parentesco, foto), estado e vencimento do passe, capa |
| `book_members` | Responsável e co-facilitadores, com papel |
| `author_access` | Link pessoal do autor (hash do token, revogado em) |
| `book_context` | "Sobre ele" em texto ou áudio, temas extraídos, resumo de cada história (memória do livro) |
| `glossary_entries` | Pessoas e lugares, com apelido e observação |
| `photos` | Acervo de fotos do livro, com dimensões e legenda |
| `prompts` | Perguntas: texto, foto, origem (banco, IA, própria, causo), áudio de quem sugeriu, estado |
| `causos` | Sugestões da família: nome, texto ou áudio, estado |
| `recordings` | Áudios: origem (autor, livre, conversa, upload, lote), duração, estado do upload |
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
- Limite de requisições nas rotas públicas (autor, causo, mensagem, ouvir). Limite de tamanho no upload.
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

**Fora das duas ondas:** mural com reações e comentários, checkout próprio de cartão, integração com gráfica, gravação em vídeo, app nativo, e-book, enquetes, indicação e cartão-presente, API do WhatsApp, 3ª pessoa, leitura de conversa exportada do WhatsApp, versão B2B para residenciais.

### Pendências do fundador

- [ ] **Abrir CNPJ e conta no Mercado Pago.** Bloqueia o pagamento automático da onda 2.
- [ ] **Parcelamento:** 12x sem juros (a Ecoa absorve a taxa) ou com juros para o cliente.
- [ ] **Cotação da gráfica:** 80 páginas, capa dura, colorido, 21 × 21 cm. Define a margem dos R$ 467, o valor por página e por cópia extra, o modo de cor, a lombada e o múltiplo de páginas.
- [ ] **Domínio `ecoa-memorias.com.br`** registrado e apontado para a Vercel (os subdomínios `app` e `ouvir` dependem dele).
- [ ] **Banco de 150 perguntas:** rascunho gerado no prompt 4, revisão da tia Caia.
- [ ] **Padrão-ouro:** 5 a 10 histórias editadas pela tia Caia antes do prompt 1 terminar.
- [ ] **Áudios de teste:** 5 áudios reais dos pais dos 2 parceiros de design, incluindo conversa, ruído e áudio encaminhado do WhatsApp.

## Sequência de prompts para o Claude Code

São 16 prompts: 11 na onda 1 e 5 na onda 2, ordenados pelo maior risco primeiro. **O mínimo para gravar na ceia são os prompts 0 a 6.** Se o prompt 10 não estiver pronto até o dia 26, a página de amostra sai do laboratório do prompt 1.

### Como usar

- **Um prompt por sessão.** Rode `/clear` entre prompts. O contexto vem do `CLAUDE.md` e do `docs/prd.md`, não da conversa anterior.
- **Prompts com \[EGM\]** começam pelo fluxo do Elephant-Goldfish e gravam um design doc em `docs/designs/`. Você aprova o design doc em português antes de qualquer código.
- **Toda alteração de banco** mostra o SQL de subida e de reversão e espera o seu OK.
- **Gate de fim de prompt:** `npm run build`, `npm run lint` e `npm test` sem erro, e um commit em português no padrão Conventional Commits.
- **Gate de design** (prompts com tela): build de produção, `npm run taste:lint` e `npm run taste:inspect` em 390, 768 e 1440 px. Corrigir todo FAIL, criticar as screenshots e corrigir os 3 maiores problemas, em no máximo 3 rodadas.
- **Ao fim de cada prompt**, peça: "Me explique em 5 linhas, sem jargão, o que foi construído e como eu testo no celular." Esse resumo vira o seu diário de portfólio.

### Onda 1: Natal

### Prompt 0. Fundação

```
O repositório github.com/guilherme-eller8/ecoa-plataforma já existe, privado e vazio. Construa a fundação.

1. Next.js na mesma versão da landing (16.x), TypeScript strict, Tailwind, ESLint, Prettier e zod. Leia node_modules/next/dist/docs antes de escrever código: esta versão difere do seu treino.
2. Vitest (unidade) e Playwright (ponta a ponta), com 1 teste de exemplo cada.
3. Salve o PRD que vou colar a seguir em docs/prd.md.
4. lib/config.ts com: PRECO_PASSE=467, PAGINAS_INCLUSAS=80, VALOR_PAGINA_EXTRA e VALOR_COPIA_EXTRA (placeholders), FORMATO_LIVRO='21x21', SANGRIA_MM=3, DURACAO_PASSE_MESES=12, MAX_GRAVACAO_MIN=30, MAX_ARQUIVOS_LOTE=30, MAX_COFACILITADORES=3, DOMINIO_APP e DOMINIO_QR.
5. Copie de github.com/guilherme-eller8/ecoa-memorias a pasta .claude/skills/design-taste-frontend e os scripts taste:lint e taste:inspect do package.json.
6. Instale o plugin Elephant-Goldfish Model (github.com/google/elephant-goldfish-model) conforme o README dele.
7. Escreva um CLAUDE.md curto: o produto em 1 parágrafo, a stack, o vocabulário (autor, responsável, co-facilitador, família), as regras de segurança (RLS em toda tabela, tokens só como hash, token do autor nunca lê family_messages, segredos só no .env.local), o gate de fim de tarefa, o gate de design e a regra de mostrar o SQL de subida e reversão antes de alterar o banco.
8. Compare Inngest e Trigger.dev (plano grátis, Next.js na Vercel, jobs de até 10 minutos, novas tentativas, eventos em tempo real) e recomende um em 5 linhas. Não instale ainda.

Aceite: npm run dev abre uma página com a fonte Newsreader; npm test e npm run test:e2e passam.
```

### Prompt 1. Laboratório de IA, sem tela \[EGM\]

```
Leia docs/prd.md, seção Pipeline de IA. Antes de qualquer tela, quero provar a qualidade do texto. Use o EGM para desenhar e depois construa em scripts/lab/ o comando npm run lab, que:

1. Lê os áudios de lab/audios/ (.opus, .ogg, .m4a, .mp3, .wav).
2. Transcreve em 2 ou 3 provedores configuráveis (entre ElevenLabs Scribe, Deepgram, AssemblyAI e OpenAI), com tempo por palavra e separação de falantes.
3. Estrutura com um modelo rápido do Claude: autor ou entrevistador, trechos vazios, mudanças de assunto.
4. Com a flag --lote, trata todos os arquivos como um lote e propõe a divisão em histórias (quais trechos de quais arquivos formam cada uma, com título).
5. Edita com um modelo mais capaz do Claude, usando lab/contexto.json (glossário e "sobre ele") e os pares de lab/exemplos/. Saída em JSON validado por zod: título e parágrafos com os ids dos segmentos de origem. Gera 3 tamanhos: resumido, médio e detalhado.
6. Verifica a fidelidade numa chamada independente e marca os parágrafos sem sustentação.
7. Gera lab/relatorio.md com: transcrições lado a lado, divisão proposta, os 3 tamanhos, trechos marcados, custo em reais e tempo de cada etapa, e o tempo até a primeira palavra com streaming.
8. Com a flag --amostra, gera também um PDF simples de 1 página da melhor história, com um QR apontando para o arquivo de áudio.

Guarde os prompts de IA como arquivos .md em lib/ai/prompts/, para eu ler e ajustar.
Aceite: com 5 áudios reais, recebo o relatório em menos de 10 minutos, e nenhum fato inventado aparece sem marcação.
```

### Prompt 2. Design system

```
Leia docs/prd.md, seção Design e experiência, e a skill .claude/skills/design-taste-frontend. Referência principal: o app Remento (calmo, espaçoso, foco na história). Quero uma interface que pareça feita por um time de design de primeira linha.

1. Tokens em CSS variables: cores herdadas da landing (pólen, papel, tinta, tinta-2, floresta), duas camadas tipográficas (Newsreader para o conteúdo do livro e a fonte do sistema para a interface), escala de espaçamento, raios, sombras mínimas e movimento com fallback de reduzir movimento.
2. Componentes base em components/ui: botão principal e secundário, campo, seletor, abas, folha inferior para celular, aviso de "salvo", estado vazio, cartão de história com as etapas ao vivo, gravador visual (botão de 120px, cronômetro, ponto pulsando) e controle deslizante de tamanho.
3. Página /styleguide (só em desenvolvimento) com todos os componentes e estados.
4. Duas telas de exemplo com dados falsos, sem lógica: a home do responsável e a área do autor.

Gate de design completo. Aceite: me mostre as screenshots de 390 px e 1440 px das duas telas, com a nota da crítica.
```

### Prompt 3. Acesso, passe, admin e registro de uso \[EGM\]

```
Leia docs/prd.md: Papéis e permissões, M1, M10 (parte da onda 1) e Modelo de dados. Use o EGM.

1. Projeto Supabase na região São Paulo. Me guie nas variáveis de ambiente e na configuração do login com Google.
2. Migrations de books, book_members (papel responsável ou co-facilitador), author_access e events, com RLS. Mostre o SQL de subida e reversão antes de aplicar.
3. Login com Google e link mágico por e-mail (e-mails pelo Resend).
4. Estados do passe (pendente, ativo, somente_leitura) e um job diário que move os vencidos.
5. /admin (só papel admin): lista de livros, ativar, renovar e reenviar acesso. Ativar cria o livro e o responsável, e envia o e-mail de acesso.
6. Uma função única registrarEvento(quem, papel, ação, livro), usada em toda ação relevante daqui em diante.
7. Testes de RLS: um responsável não lê, não altera e não apaga nada de outro livro.

Gate de design. Aceite: ativo um passe no admin, recebo o e-mail, entro com Google e vejo a home vazia do livro.
```

### Prompt 4. Configuração inicial, perguntas e causos

```
Leia docs/prd.md: M2 (sem co-facilitadores), M3 e a jornada do responsável.

1. Configuração inicial em 3 passos, todos com Pular e Depois: Quem é (só o nome é obrigatório), Me conte sobre ele (texto ou áudio de até 5 minutos) e Fotos (várias de uma vez).
2. Tabelas book_context, glossary_entries, photos, prompts e causos, com RLS. SQL antes de aplicar.
3. Job de IA que lê "Me conte sobre ele" e gera glossário, temas e 10 perguntas personalizadas, reaproveitando os prompts do laboratório.
4. Banco de 150 perguntas em 8 temas: gere um rascunho em supabase/seed/perguntas.json para revisão humana antes do seed.
5. Tela Perguntas com as abas Para enviar, Enviadas, Respondidas e Causos. Adicionar do banco, das sugeridas pela IA, própria ou com foto do acervo.
6. Link público /c/[token], Sugira um causo: nome, áudio de até 3 minutos ou texto, e consentimento. Chega na aba Causos exatamente como foi enviado, sem IA. Botão Virar pergunta, que pode anexar o áudio de quem sugeriu.
7. Kit de início ao fim da configuração: convite do grupo de WhatsApp com o link de causos e mensagem para o autor com o link pessoal (placeholder até o prompt 5).
8. Enviar ao autor: abre wa.me com a mensagem pronta.

Gate de design. Aceite: no celular, configuro o livro só com o nome em menos de 30 segundos, envio um causo pelo link de outro aparelho e o vejo tocável na aba Causos.
```

### Prompt 5. Gravador, área do autor e modo conversa \[EGM\]

```
Leia docs/prd.md: M4 (menos o lote), M7 (só a parte de gravar) e Design e experiência (regras do autor). É o prompt de maior risco técnico no celular. Use o EGM.

1. Tabelas recordings, stories e story_recordings, com RLS. SQL antes de aplicar.
2. Gravador único com MediaRecorder: gravar, pausar, retomar, ouvir, regravar, até 30 minutos, vibração ao iniciar. Pedaços guardados no IndexedDB durante a gravação e upload TUS retomável para o Supabase Storage.
3. Área do autor em /a/[token]: "Olá, [apelido]", as perguntas para ele (com foto e áudio de quem sugeriu, quando houver) e Contar uma história, livre. Consentimento na primeira gravação.
4. Modo conversa no painel do responsável, com a pergunta no topo como roteiro.
5. Upload de 1 áudio ligado a uma pergunta (.opus, .ogg, .m4a, .mp3, .wav, .webm, até 100 MB).
6. PWA instalável com share_target, para receber áudios do WhatsApp no Android.
7. Troque o placeholder do link do autor no kit de início e no Enviar ao autor.

Gate de design. Aceite: me entregue um roteiro para eu testar no iPhone (Safari) e num Android (Chrome), incluindo gravar 10 minutos com modo avião ligado no meio. Nenhuma gravação pode se perder.
```

### Prompt 6. Pipeline com texto ao vivo \[EGM\]

```
Leia docs/prd.md: M5 e Pipeline de IA. Reaproveite o código e os prompts do laboratório. Use o EGM.

1. Instale o serviço de fila escolhido no prompt 0.
2. Tabelas transcripts, story_versions e ai_usage, com RLS. SQL antes de aplicar.
3. Ao concluir um upload: transcrição (provedor vencedor do laboratório), estruturação, edição e verificação, com até 3 tentativas por etapa e erro visível no admin.
4. Etapas ao vivo no cartão da história via Supabase Realtime: Enviando, Ouvindo, Escrevendo, Pronta para revisar. Em Escrevendo, o texto aparece sendo escrito (streaming da edição).
5. Contexto do livro com cache de prompt. Ao fim de cada história, atualize o resumo dela em book_context.
6. E-mail só se ninguém do livro estiver com a tela aberta.
7. npm run eval roda o padrão-ouro contra os prompts atuais e falha se houver fato inventado.

Gate de design. Aceite: gravo 5 minutos pelo link do autor e, com a tela aberta no computador, vejo as primeiras palavras em menos de 60 segundos e o texto completo em menos de 3 minutos.
```

### Prompt 7. Upload em lote com divisão em histórias \[EGM\]

```
Leia docs/prd.md: M4 (upload em lote) e Pipeline de IA (divisão em histórias). Use o EGM.

1. Botão Subir vários áudios: até 30 arquivos, envio em paralelo com progresso por arquivo. No Android, receber vários áudios pelo Compartilhar do WhatsApp.
2. Job que transcreve todos, estrutura e propõe a divisão em histórias com título, reaproveitando o modo --lote do laboratório.
3. Tela de confirmação simples: lista de histórias propostas, cada uma com os trechos de origem tocáveis. Ações de 1 toque: juntar duas histórias, separar uma em duas no ponto escolhido, renomear e descartar um trecho.
4. Ao confirmar, cada história segue para a edição com as etapas ao vivo do prompt 6.

Gate de design. Aceite: subo 8 áudios sobre 3 assuntos e recebo 3 histórias propostas; junto 2 delas e o resultado é editado como uma só.
```

### Prompt 8. Editor de histórias, parte 1

```
Leia docs/prd.md: M6 e Design e experiência. Inspiração: o editor do Remento.

1. Tela da história: áudio com transcrição navegável de um lado e texto editável (Tiptap) do outro; abas no celular.
2. Cada parágrafo guarda os seus segmentos de origem. Clicar numa frase toca o trecho correspondente.
3. Trechos marcados pela verificação aparecem grifados com Confira, que some ao editar ou confirmar.
4. Salvamento automático, versões em story_versions com a origem, e tela de histórico com restaurar.
5. Tabela edit_locks e trava "Ana está editando", com expiração de 2 minutos.
6. Título, ano e até 4 fotos (do acervo ou novas), com legenda e alerta abaixo de 1200 px.
7. Botão Marcar como pronta.

Gate de design. Aceite: edito no celular e no computador, restauro uma versão antiga e nada se perde; com dois navegadores abertos, o segundo vê a trava.
```

### Prompt 9. Editor de histórias, parte 2: IA sob controle \[EGM\]

```
Leia docs/prd.md: M6 e Fluxos especiais do Pipeline de IA. Edição manual nunca pode ser perdida. Use o EGM.

1. Controle de tamanho com 5 posições, de Resumido a Detalhado. Gera nova versão a partir da base estruturada; parágrafos editados à mão ficam travados, e o controle mostra quantos.
2. Revisar um trecho: seleção, depois Mais curto, Mais fiel à fala, Corrigir ou instrução livre. A proposta passa pela verificação e pode ser aceita ou descartada.
3. Acrescentar áudio: Gravar mais sobre isso e Subir mais um áudio, anexando à mesma história.
4. Propostas da IA mostradas como diferença (inserido em verde, removido riscado), com aceitar tudo, aceitar por parágrafo ou descartar. Cada aceite gera uma versão.
5. Teste automático: editar o 2º parágrafo à mão, acrescentar áudio, mudar o tamanho e aceitar tudo; o 2º parágrafo continua idêntico.

Gate de design. Aceite: o teste do item 5 passa, e eu repito o cenário à mão no celular.
```

### Prompt 10. Modo autor completo e página de amostra \[EGM\]

```
Leia docs/prd.md: M7, M9 (página de amostra) e Livro pronto para a gráfica (QR e motor de PDF). Use o EGM.

1. Complete a área do autor: Minhas histórias (ouvir, ler e corrigir o texto, gerando uma versão "editada pelo autor" com selo para o responsável) e Meu livro (leitura das histórias prontas, sem mensagens da família).
2. Crie desde já a tabela family_messages, vazia, com RLS (SQL antes), e um teste automático provando que nenhuma rota acessada com o token do autor retorna dados dela.
3. Tabela qr_codes (8 caracteres sem letras ambíguas, nunca apagados) e player público em ouvir.ecoa-memorias.com.br/[código]. Me guie na configuração do subdomínio.
4. Teste de 1 dia: a mesma página (título, ano, foto, texto, QR) em Typst e em HTML com Paged.js. Compare tipografia, sangria, tempo de geração e facilidade de rodar no servidor; recomende um em 5 linhas e espere o meu OK.
5. Botão Gerar página de amostra numa história pronta: PDF de 1 página no tamanho do livro, com o QR decodificado por software antes do download.

Gate de design. Aceite: imprimo a página numa impressora comum e o QR de 2 cm abre o player a 20 cm de distância.
```

### Onda 2: Lançamento

### Prompt 11. Co-facilitadores, compartilhar e lembretes

```
Leia docs/prd.md: Papéis e permissões, M2 (co-facilitadores) e Jornadas.

1. Convite de até 3 co-facilitadores por e-mail ou link, aceito com Google ou e-mail. Passo Quem mais ajuda na configuração inicial (pulável) e tela de membros onde o responsável remove pessoas.
2. Permissões: o co-facilitador faz tudo, menos convidar, publicar, imprimir e pagar. Teste de RLS para cada regra.
3. Compartilhar no grupo em cada história pronta: link /o/[token] com áudio, título e texto, e mensagem pronta para colar no WhatsApp. Revogável.
4. Lembrar com carinho em perguntas enviadas há 3 dias, abrindo wa.me com uma mensagem gentil.
5. Resumo semanal por e-mail aos membros: histórias novas, perguntas sem resposta e páginas estimadas.

Gate de design. Aceite: convido meu irmão, ele edita uma história e não consegue convidar outra pessoa.
```

### Prompt 12. Mensagens da família \[EGM\]

```
Leia docs/prd.md: M8 e Livro pronto para a gráfica (capítulo de mensagens). Use o EGM.

1. Link /m/[token], Deixe uma mensagem para o livro de [apelido], com mensagem pronta para o responsável enviar pelo WhatsApp a quem quiser.
2. Formulário: nome, relação, áudio de até 5 minutos ou texto, foto opcional e consentimento. O áudio vira transcrição limpa, sem reescrita, e a pessoa confere antes de enviar.
3. Aba Mensagens para os membros: ouvir, ler, ajustar o texto e incluir ou não no livro.
4. Reforce e teste: nenhuma tela ou consulta do autor mostra mensagens.

Gate de design. Aceite: 3 pessoas deixam mensagens pelo celular, o responsável inclui 2, e o autor não vê nada em Meu livro.
```

### Prompt 13. Montar e publicar o livro \[EGM\]

```
Leia docs/prd.md: M9 e Livro pronto para a gráfica. Use o motor de PDF aprovado no prompt 10 e o EGM.

1. Tabela book_exports. SQL antes de aplicar.
2. Fluxo em 3 passos: Conteúdo (histórias e mensagens: incluir, excluir riscando, ordenar), Capa (título até 3 linhas, subtítulo, foto, cor do tecido, prévia ao vivo de capa e lombada) e Conferir (alertas do PRD).
3. Contador de páginas sobre 80 a partir de renderização real em segundo plano; acima de 80, mostra o valor extra com VALOR_PAGINA_EXTRA.
4. Templates do miolo (folha de rosto, dedicatória, sumário, capítulos em página ímpar, mensagens, colofão) e da capa aberta, com os valores de lib/config.ts.
5. Publicar (só o responsável): versão congelada, prévia página a página e download dos dois PDFs, com todo QR decodificado antes.

Gate de design. Aceite: com 6 histórias e 2 mensagens reais, publico, e os PDFs abrem no Acrobat com fontes embutidas e sangria de 3 mm.
```

### Prompt 14. Impressão intermediada e Mercado Pago \[EGM\]

```
Leia docs/prd.md: M1 (onda 2), M9 (impressão) e Impressão intermediada pela Ecoa. Pré-requisito: CNPJ e conta no Mercado Pago criados. Use o EGM.

1. Tabelas print_orders e payments. SQL antes de aplicar.
2. Compra do passe por link de pagamento do Mercado Pago (Pix e cartão em até 12x). A notificação do Mercado Pago, com assinatura validada, cria o livro, ativa o passe e envia o e-mail de acesso.
3. Enviar para impressão (só o responsável): endereço e número de cópias. Pedido no admin com os status recebido, aguardando pagamento, na gráfica e enviado, e campo de rastreio. O responsável acompanha na plataforma.
4. No admin: gerar link de pagamento de frete e extras para um pedido e baixar os PDFs da versão publicada.

Aceite: compro um passe no modo de teste do Mercado Pago e o acesso chega sozinho em menos de 1 minuto; um pedido de impressão percorre todos os status.
```

### Prompt 15. Aderência, LGPD e lançamento

```
Leia docs/prd.md: M10 (onda 2) e Requisitos não funcionais. Prepare o lançamento pagante.

1. Painel de aderência no admin a partir de events: acessos por dia por livro e por pessoa, gravações por semana, livros parados há 7 dias ou mais e o funil configuração, 1ª história, 5 histórias, livro publicado.
2. Exportar tudo do livro em .zip e exclusão total por pedido, com aviso de que os QR deixarão de tocar.
3. /termos e /privacidade da plataforma (rascunho para revisão jurídica), com a versão registrada no aceite.
4. Monitoramento de erros e lista de jobs que falharam no admin.
5. Revisão de todas as políticas RLS e teste ponta a ponta no Playwright: comprar, configurar, enviar pergunta, gravar pelo link do autor, editar, receber mensagem, publicar e pedir impressão.
6. Checklist de produção: domínios, variáveis, região e backups.

Aceite: o teste ponta a ponta passa em produção, e eu recebo a checklist marcada.
```

### Depois do prompt 15

Com os parceiros de design usando, registre toda vez que precisar intervir manualmente. Cada intervenção repetida vira o próximo prompt.
