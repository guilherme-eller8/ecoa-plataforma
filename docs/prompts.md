# Ecoa Memórias — Sequência de prompts para o Claude Code

Saiu de `docs/prd.md` em 14/11/2026. Os prompts citam seções do PRD pelo nome: leia só essas.

São 16 prompts: 11 na onda 1 e 5 na onda 2, ordenados pelo maior risco primeiro. **O mínimo para gravar na ceia são os prompts 0 a 7, porque a gravação da ceia precisa da divisão em histórias.** Se o prompt 10 não estiver pronto até o dia 26, a página de amostra sai do laboratório do prompt 1.

## Como usar

- **Um prompt por sessão.** Rode `/clear` entre prompts. O contexto vem do `CLAUDE.md`, de `docs/mapa.md`, de `docs/decisoes-resumo.md` e das seções do PRD citadas, não da conversa anterior.
- **Prompts com [EGM] em duas sessões:** a primeira termina no seu OK do design doc; a segunda começa com `/clear` e constrói a partir do design aprovado.
- **Prompts com [EGM]** começam pelo fluxo do Elephant-Goldfish e gravam um design doc em `docs/designs/`. Você aprova o design doc em português antes de qualquer código.
- **Toda alteração de banco** mostra o SQL de subida e de reversão e espera o seu OK.
- **Gate de fim de prompt:** `npm run build`, `npm run lint` e `npm test` sem erro, e um commit em português no padrão Conventional Commits.
- **Gate de design** (prompts com tela): build de produção, `npm run taste:lint` e `npm run taste:inspect` em 390, 768 e 1440 px. Corrigir todo FAIL, criticar as screenshots e corrigir os 3 maiores problemas, em no máximo 3 rodadas.
- **Ao fim de cada prompt**, peça: "Me explique em 5 linhas, sem jargão, o que foi construído e como eu testo no celular." Esse resumo vira o seu diário de portfólio.

## Onda 1: Natal

## Prompt 0. Fundação

```
O repositório github.com/guilherme-eller8/ecoa-plataforma já existe, privado e vazio. Construa a fundação.

1. Next.js na mesma versão da landing (16.x), TypeScript strict, Tailwind, ESLint, Prettier e zod. Leia node_modules/next/dist/docs antes de escrever código: esta versão difere do seu treino.
2. Vitest (unidade) e Playwright (ponta a ponta), com 1 teste de exemplo cada.
3. Salve o PRD que vou colar a seguir em docs/prd.md.
4. lib/config.ts com: PRECO_PASSE=467, PAGINAS_INCLUSAS=80, VALOR_PAGINA_EXTRA e VALOR_COPIA_EXTRA (placeholders), FORMATO_LIVRO='21x21', SANGRIA_MM=3, DURACAO_PASSE_MESES=12, MAX_GRAVACAO_MIN=30, MAX_ARQUIVOS_LOTE=30, MAX_COFACILITADORES=3, VOTOS_POR_PESSOA=5, DOMINIO_APP e DOMINIO_QR.
5. Copie de github.com/guilherme-eller8/ecoa-memorias a pasta .claude/skills/design-taste-frontend e os scripts taste:lint e taste:inspect do package.json.
6. Instale o plugin Elephant-Goldfish Model (github.com/google/elephant-goldfish-model) conforme o README dele.
7. Escreva um CLAUDE.md curto: o produto em 1 parágrafo, a stack, o vocabulário (autor, responsável, co-facilitador, família), as regras de segurança (RLS em toda tabela, tokens só como hash, token do autor nunca lê family_messages, segredos só no .env.local), o gate de fim de tarefa, o gate de design, a regra de onboarding (toda tela nova tem estado vazio e, se tiver um gesto não óbvio, uma dica de primeira vez de no máximo 1 linha) e a regra de mostrar o SQL de subida e reversão antes de alterar o banco.
8. Compare Inngest e Trigger.dev (plano grátis, Next.js na Vercel, jobs de até 10 minutos, novas tentativas, eventos em tempo real) e recomende um em 5 linhas. Não instale ainda.

Aceite: npm run dev abre uma página com a fonte Newsreader; npm test e npm run test:e2e passam.
```

## Prompt 1. Laboratório de IA, sem tela [EGM]

```
Leia docs/prd.md, seção Pipeline de IA. Antes de qualquer tela, quero provar a qualidade do texto. Use o EGM para desenhar e depois construa em scripts/lab/ o comando npm run lab, que:

1. Lê os áudios de lab/audios/ (.opus, .ogg, .m4a, .mp3, .wav).
2. Transcreve em 2 ou 3 provedores configuráveis (entre ElevenLabs Scribe, Deepgram, AssemblyAI e OpenAI), com tempo por palavra e separação de falantes.
3. Estrutura com um modelo rápido do Claude: autor ou entrevistador, trechos vazios, mudanças de assunto.
4. Com a flag --lote, trata todos os arquivos como um lote e propõe a divisão em histórias (quais trechos de quais arquivos formam cada uma, com título).
5. Edita com um modelo mais capaz do Claude, usando lab/glossario.json (nomes de pessoas e lugares) e os pares de lab/exemplos/. Saída em JSON validado por zod: título e parágrafos com os ids dos segmentos de origem. Gera 3 tamanhos: resumido, médio e detalhado.
6. Verifica a fidelidade numa chamada independente e marca os parágrafos sem sustentação.
7. Gera lab/relatorio.md com: transcrições lado a lado, divisão proposta, os 3 tamanhos, trechos marcados, custo em reais e tempo de cada etapa, e o tempo até a primeira palavra com streaming.
8. Com a flag --amostra, gera também um PDF simples de 1 página da melhor história, com um QR apontando para o arquivo de áudio.

Guarde os prompts de IA como arquivos .md em lib/ai/prompts/, para eu ler e ajustar.
Aceite: com 5 áudios reais, recebo o relatório em menos de 10 minutos, e nenhum fato inventado aparece sem marcação.
```

## Prompt 2. Design system

```
Leia docs/prd.md, seção Design e experiência, e a skill .claude/skills/design-taste-frontend. Referência principal: o app Remento (calmo, espaçoso, foco na história). Quero uma interface que pareça feita por um time de design de primeira linha.

1. Tokens em CSS variables: cores herdadas da landing (pólen, papel, tinta, tinta-2, floresta), duas camadas tipográficas (Newsreader para o conteúdo do livro e a fonte do sistema para a interface), escala de espaçamento, raios, sombras mínimas e movimento com fallback de reduzir movimento.
2. Componentes base em components/ui: botão principal e secundário, campo, seletor, abas, folha inferior para celular, aviso de "salvo", estado vazio, lista de primeiros passos com progresso, dica de primeira vez, momento de celebração, cartão de história com as etapas ao vivo, gravador visual (botão de 120px, cronômetro, ponto pulsando) e controle deslizante de tamanho.
3. Página /styleguide (só em desenvolvimento) com todos os componentes e estados.
4. Duas telas de exemplo com dados falsos, sem lógica: a home do responsável e a área do autor.

Gate de design completo. Aceite: me mostre as screenshots de 390 px e 1440 px das duas telas, com a nota da crítica.
```

## Prompt 3. Acesso, passe, admin e registro de uso [EGM]

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

## Prompt 4. Configuração inicial, perguntas, causos e enquete da família [EGM]

```
Leia docs/prd.md: M2 (sem co-facilitadores), M3 e as jornadas do responsável e da família. Use o EGM.

1. Tabelas photos, prompts (tipo pergunta ou causo), causos, family_access, polls, poll_items e poll_votes, com RLS. SQL antes de aplicar.
2. Banco de 150 perguntas em 8 temas: gere um rascunho em supabase/seed/perguntas.json, com um conjunto inicial de 10 por parentesco, para revisão humana antes do seed.
3. Configuração inicial em 3 passos, todos com Pular e Depois: Quem é (só o nome é obrigatório), Primeiras perguntas (as 10 do parentesco já marcadas; desmarcar, trocar por outras do banco e escrever perguntas ou causos próprios em texto livre) e Fotos (várias de uma vez).
4. Tela Perguntas com as abas Para enviar, Enviadas, Respondidas, Causos e Enquete. Adicionar do banco, próprio (pergunta ou causo) ou com foto do acervo.
5. Link da família /f/[token], permanente e sem login, para fixar no grupo de WhatsApp: mostra a enquete aberta, se houver, e o botão Sugerir um causo (nome, áudio de até 3 minutos ou texto, e consentimento).
6. Enquete: o responsável escolhe os candidatos e abre a enquete. Quem abre o link informa o nome e marca até VOTOS_POR_PESSOA itens (5, em lib/config.ts). Um conjunto de votos por aparelho; uma enquete aberta por livro.
7. Resultados para o responsável: ranking atualizado ao vivo com votos e nomes, remover um voto, encerrar a enquete, salvar as N mais votadas com 1 toque ou escolher uma a uma. Tudo vai para Para enviar.
8. Causos sugeridos chegam na aba Causos exatamente como enviados, sem IA, com os botões Virar pergunta e Pôr na enquete. A pergunta pode levar o áudio de quem sugeriu.
9. Kit de início ao fim da configuração: convite do grupo de WhatsApp com o link da família e mensagem para o autor com o link pessoal (placeholder até o prompt 5). Enviar ao autor abre wa.me com a mensagem pronta.
10. Lista Seu livro em 5 passos na home (M11), com os passos 1 a 3 funcionando, e dicas de primeira vez na configuração e na enquete.
11. Testes automáticos: o token do autor não lê polls, poll_votes nem causos; o link da família só alcança a enquete e o envio de causos do próprio livro.

Gate de design. Aceite: configuro o livro só com o nome em menos de 30 segundos; 5 pessoas votam de celulares diferentes; vejo o ranking na hora, salvo as 3 mais votadas com 1 toque e elas aparecem em Para perguntar.
```

## Prompt 5A. Backlog de áudios (antes do gravador) [EGM]

```
Leia docs/prd.md: M4 e Modelo de dados. Objetivo: o responsável sobe áudios gravados fora da plataforma (gravador do celular ou WhatsApp) e eles ficam guardados em segurança, aguardando processamento. Sem IA, sem transcrição e sem gravador nesta etapa. Use o EGM.

1. Tabela recordings exatamente como o PRD define (livro, origem, duração, estado do upload, pergunta opcional), com RLS, e bucket privado no Supabase Storage. Mostre o SQL antes. O prompt 5 vai estender esta tabela, nunca recriá-la.
2. Botão Nova história > Subir áudios: 1 ou vários arquivos (.opus, .ogg, .m4a, .mp3, .wav, .webm; até 30 por vez), com progresso por arquivo e retomada se a internet cair. Respeite o limite de tamanho do plano do Supabase e me avise se ele for menor que 100 MB. Pergunta opcional por arquivo (escolhida da fila) e título livre opcional.
3. Tela Áudios recebidos: data, duração, pergunta (se houver), player para ouvir e o estado "aguardando processamento". Nada pode ser apagado pelo usuário nesta fase.
4. Ao ligar um áudio a uma pergunta, ela passa para Respondidas.
5. Cada upload registra um evento com registrarEvento.
6. Testes: um livro não lê áudios de outro; arquivo acima do limite é recusado com mensagem clara.

Gate de design. Aceite: pelo meu iPhone e por um Android, subo 3 áudios encaminhados do WhatsApp e 1 do gravador do celular, ouço os 4 na plataforma, e um deles aparece ligado à pergunta certa.
```

## Prompt 5. Gravador, área do autor e modo conversa [EGM]

```
Leia docs/prd.md: M4 (menos a divisão em histórias), M11 (tela de primeira abertura do autor), M7 (só a parte de gravar) e Design e experiência (regras do autor). É o prompt de maior risco técnico no celular. Use o EGM.

1. As colunas que faltarem em recordings (criada no prompt 5A: estender, nunca recriar), com RLS. SQL antes de aplicar. stories e story_recordings foram para o prompt 6 (P36).
2. Gravador único com MediaRecorder: gravar, pausar, retomar, ouvir, regravar, até 30 minutos, vibração ao iniciar. Pedaços guardados no IndexedDB durante a gravação e upload TUS retomável para o Supabase Storage.
3. Área do autor em /a/[token]: "Olá, [apelido]", as perguntas para ele (com foto e áudio de quem sugeriu, quando houver) e Contar uma história, livre. Na primeira abertura, uma tela única ("Toque no círculo e conte. Pode pausar quando quiser.") e o consentimento.
4. Botão principal Nova história no painel do responsável, com Gravar conversa (pergunta no topo como roteiro, ou conversa livre sem pergunta) e Subir áudio.
5. Upload de 1 áudio, com pergunta opcional (.opus, .ogg, .m4a, .mp3, .wav, .webm, até 100 MB).
6. PWA instalável com share_target, para receber áudios do WhatsApp no Android.
7. Troque o placeholder do link do autor no kit de início e no Enviar ao autor.

Gate de design. Aceite: me entregue um roteiro para eu testar no iPhone (Safari) e num Android (Chrome), incluindo gravar 10 minutos com modo avião ligado no meio. Nenhuma gravação pode se perder.
```

## Prompt 6. Pipeline com texto ao vivo [EGM]

```
Leia docs/prd.md: M5 e Pipeline de IA. Reaproveite o código e os prompts do laboratório. Use o EGM.

1. Instale o serviço de fila escolhido no prompt 0.
2. Tabelas stories, story_recordings, transcripts, story_versions, ai_usage, book_context e glossary_entries, com RLS. SQL antes de aplicar. stories e story_recordings saíram do prompt 5 (P36): quem cria a história é o pipeline, que decide pelo conteúdo (P27). As gravações que já existem em recordings ("aguardando processamento", inclusive as do 5A e as partes de uma conversa, ligadas por lote_id) entram na fila na primeira execução.
3. Ao concluir um upload: transcrição (ElevenLabs Scribe, T32), estruturação, edição e verificação, com até 3 tentativas por etapa e erro visível no admin.
4. Etapas ao vivo no cartão da história via Supabase Realtime: Enviando, Ouvindo, Escrevendo, Pronta para revisar. Em Escrevendo, o texto aparece sendo escrito (streaming da edição).
5. Contexto do livro com cache de prompt. Ao fim de cada história, atualize o resumo dela em book_context e sugira nomes de pessoas e lugares para o glossário, que o responsável ajusta em Configurações.
6. E-mail só se ninguém do livro estiver com a tela aberta. Na primeira história do livro, mostre o marco do M11 com o botão de compartilhar no grupo.
7. A versão da IA de cada história fica guardada sem alteração, e a comparação com a versão corrigida pelo responsável (o `--comparar` do laboratório) mede parágrafos corrigidos, escapes de invenção e acerto do "Confira" (T31). Provedor: ElevenLabs Scribe (T32).

Gate de design. Aceite: gravo 5 minutos pelo link do autor e, com a tela aberta no computador, vejo as primeiras palavras em menos de 60 segundos e o texto completo em menos de 3 minutos.
```

## Prompt 7. Divisão em histórias: lotes e conversas longas [EGM]

```
Leia docs/prd.md: M4 (lotes e conversas longas), M11 e Pipeline de IA (divisão em histórias). É o que faz a gravação da ceia funcionar. Use o EGM.

1. Subir vários áudios: até 30 arquivos, envio em paralelo com progresso por arquivo. No Android, receber vários áudios pelo Compartilhar do WhatsApp.
2. Detecção automática: depois da estruturação, se um lote ou uma gravação única (conversa, autor ou upload) tiver mais de um assunto, ela vai para a divisão em vez de ir direto para a edição. Com 1 assunto, segue direto.
3. Job de divisão que agrupa trechos do mesmo assunto entre arquivos, separa assuntos misturados no mesmo arquivo e propõe títulos, reaproveitando o modo --lote do laboratório.
4. Tela de divisão simples: lista de histórias propostas, cada uma com os trechos de origem tocáveis. Ações de 1 toque: juntar duas histórias, separar uma em duas no ponto escolhido, renomear e descartar um trecho. Dica de primeira vez explicando juntar e separar.
5. Ligação com a fila: para toda história sem pergunta, sugira a pergunta pendente que ela parece responder, com Marcar como respondida ou Ignorar.
6. Ao confirmar, cada história segue para a edição com as etapas ao vivo do prompt 6.

Gate de design. Aceite: subo 8 áudios sobre 3 assuntos e recebo 3 histórias propostas; gravo 40 minutos de conversa livre sobre 4 assuntos e recebo 4; junto 2 delas e o resultado é editado como uma só.
```

## Prompt 8. Editor de histórias, parte 1

```
Leia docs/prd.md: M6 e Design e experiência. Inspiração: o editor do Remento.

1. Tela da história: áudio com transcrição navegável de um lado e texto editável (Tiptap) do outro; abas no celular.
2. Cada parágrafo guarda os seus segmentos de origem. Clicar numa frase toca o trecho correspondente.
3. Trechos marcados pela verificação aparecem grifados com Confira, que some ao editar ou confirmar.
4. Salvamento automático, versões em story_versions com a origem, e tela de histórico com restaurar.
5. Tabela edit_locks e trava "Ana está editando", com expiração de 2 minutos.
6. Título, ano e até 4 fotos (do acervo ou novas), com legenda e alerta abaixo de 1200 px.
7. Botão Marcar como pronta, que conclui o passo 5 da lista de primeiros passos.
8. Dicas de primeira vez: tocar numa frase para ouvir e restaurar uma versão.

Gate de design. Aceite: edito no celular e no computador, restauro uma versão antiga e nada se perde; com dois navegadores abertos, o segundo vê a trava.
```

## Prompt 9. Editor de histórias, parte 2: IA sob controle [EGM]

```
Leia docs/prd.md: M6 e Fluxos especiais do Pipeline de IA. Edição manual nunca pode ser perdida. Use o EGM.

1. Controle de tamanho com 5 posições, de Resumido a Detalhado. Gera nova versão a partir da base estruturada; parágrafos editados à mão ficam travados, e o controle mostra quantos. Dica de primeira vez: "Arraste para ter mais ou menos detalhe."
2. Revisar um trecho: seleção, depois Mais curto, Mais fiel à fala, Corrigir ou instrução livre. A proposta passa pela verificação e pode ser aceita ou descartada.
3. Acrescentar áudio: Gravar mais sobre isso e Subir mais um áudio, anexando à mesma história.
4. Propostas da IA mostradas como diferença (inserido em verde, removido riscado), com aceitar tudo, aceitar por parágrafo ou descartar. Cada aceite gera uma versão.
5. Teste automático: editar o 2º parágrafo à mão, acrescentar áudio, mudar o tamanho e aceitar tudo; o 2º parágrafo continua idêntico.

Gate de design. Aceite: o teste do item 5 passa, e eu repito o cenário à mão no celular.
```

## Prompt 10. Modo autor completo e página de amostra [EGM]

```
Leia docs/prd.md: M7, M9 (página de amostra) e Livro pronto para a gráfica (QR e motor de PDF). Use o EGM.

1. Complete a área do autor: Minhas histórias (ouvir, ler e corrigir o texto, gerando uma versão "editada pelo autor" com selo para o responsável) e Meu livro (leitura das histórias prontas, sem mensagens da família).
2. Crie desde já a tabela family_messages, vazia, com RLS (SQL antes), e um teste automático provando que nenhuma rota acessada com o token do autor retorna dados dela.
3. Tabela qr_codes (8 caracteres sem letras ambíguas, nunca apagados) e player público em ouvir.ecoamemorias.com.br/[código]. Me guie na configuração do subdomínio.
4. Teste de 1 dia: a mesma página (título, ano, foto, texto, QR) em Typst e em HTML com Paged.js. Compare tipografia, sangria, tempo de geração e facilidade de rodar no servidor; recomende um em 5 linhas e espere o meu OK.
5. Botão Gerar página de amostra numa história pronta: PDF de 1 página no tamanho do livro, com o QR decodificado por software antes do download.

Gate de design. Aceite: imprimo a página numa impressora comum e o QR de 2 cm abre o player a 20 cm de distância.
```

## Onda 2: Lançamento

## Prompt 11. Co-facilitadores, compartilhar e lembretes

```
Leia docs/prd.md: Papéis e permissões, M2 (co-facilitadores) e Jornadas.

1. Convite de até 3 co-facilitadores por e-mail ou link, aceito com Google ou e-mail. Passo Quem mais ajuda na configuração inicial (pulável) e tela de membros onde o responsável remove pessoas.
2. Permissões: o co-facilitador faz tudo, menos convidar, publicar, imprimir e pagar. Teste de RLS para cada regra.
3. Compartilhar no grupo em cada história pronta: link /o/[token] com áudio, título e texto, e mensagem pronta para colar no WhatsApp. Revogável.
4. Lembrar com carinho em perguntas enviadas há 3 dias, abrindo wa.me com uma mensagem gentil.
5. Resumo semanal por e-mail aos membros: histórias novas, perguntas sem resposta e páginas estimadas.

Gate de design. Aceite: convido meu irmão, ele edita uma história e não consegue convidar outra pessoa.
```

## Prompt 12. Mensagens da família [EGM]

```
Leia docs/prd.md: M8 e Livro pronto para a gráfica (capítulo de mensagens). Use o EGM.

1. Link /m/[token], Deixe uma mensagem para o livro de [apelido], com mensagem pronta para o responsável enviar pelo WhatsApp a quem quiser.
2. Formulário: nome, relação, áudio de até 5 minutos ou texto, foto opcional e consentimento. O áudio vira transcrição limpa, sem reescrita, e a pessoa confere antes de enviar.
3. Aba Mensagens para os membros: ouvir, ler, ajustar o texto e incluir ou não no livro.
4. Reforce e teste: nenhuma tela ou consulta do autor mostra mensagens.

Gate de design. Aceite: 3 pessoas deixam mensagens pelo celular, o responsável inclui 2, e o autor não vê nada em Meu livro.
```

## Prompt 13. Montar e publicar o livro [EGM]

```
Leia docs/prd.md: M9 e Livro pronto para a gráfica. Use o motor de PDF aprovado no prompt 10 e o EGM.

1. Tabela book_exports. SQL antes de aplicar.
2. Fluxo em 3 passos: Conteúdo (histórias e mensagens: incluir, excluir riscando, ordenar), Capa (título até 3 linhas, subtítulo, foto, cor do tecido, prévia ao vivo de capa e lombada) e Conferir (alertas do PRD).
3. Contador de páginas sobre 80 a partir de renderização real em segundo plano; acima de 80, mostra o valor extra com VALOR_PAGINA_EXTRA.
4. Templates do miolo (folha de rosto, dedicatória, sumário, capítulos em página ímpar, mensagens, colofão) e da capa aberta, com os valores de lib/config.ts.
5. Publicar (só o responsável): versão congelada, prévia página a página e download dos dois PDFs, com todo QR decodificado antes.

Gate de design. Aceite: com 6 histórias e 2 mensagens reais, publico, e os PDFs abrem no Acrobat com fontes embutidas e sangria de 3 mm.
```

## Prompt 14. Impressão intermediada e Mercado Pago [EGM]

```
Leia docs/prd.md: M1 (onda 2), M9 (impressão) e Impressão intermediada pela Ecoa. Pré-requisito: CNPJ e conta no Mercado Pago criados. Use o EGM.

1. Tabelas print_orders e payments. SQL antes de aplicar.
2. Compra do passe por link de pagamento do Mercado Pago (Pix e cartão em até 12x). A notificação do Mercado Pago, com assinatura validada, cria o livro, ativa o passe e envia o e-mail de acesso.
3. Enviar para impressão (só o responsável): endereço e número de cópias. Pedido no admin com os status recebido, aguardando pagamento, na gráfica e enviado, e campo de rastreio. O responsável acompanha na plataforma.
4. No admin: gerar link de pagamento de frete e extras para um pedido e baixar os PDFs da versão publicada.

Aceite: compro um passe no modo de teste do Mercado Pago e o acesso chega sozinho em menos de 1 minuto; um pedido de impressão percorre todos os status.
```

## Prompt 15. Aderência, LGPD e lançamento

```
Leia docs/prd.md: M10 (onda 2) e Requisitos não funcionais. Prepare o lançamento pagante.

1. Painel de aderência no admin a partir de events: acessos por dia por livro e por pessoa, gravações por semana, livros parados há 7 dias ou mais e o funil configuração, 1ª história, 5 histórias, livro publicado, além do passo do onboarding em que cada livro está.
2. Exportar tudo do livro em .zip e exclusão total por pedido, com aviso de que os QR deixarão de tocar.
3. /termos e /privacidade da plataforma (rascunho para revisão jurídica), com a versão registrada no aceite.
4. Monitoramento de erros e lista de jobs que falharam no admin.
5. Revisão de todas as políticas RLS e teste ponta a ponta no Playwright: comprar, configurar, enviar pergunta, gravar pelo link do autor, editar, receber mensagem, publicar e pedir impressão.
6. Checklist de produção: domínios, variáveis, região e backups.

Aceite: o teste ponta a ponta passa em produção, e eu recebo a checklist marcada.
```

## Depois do prompt 15

Com os parceiros de design usando, registre toda vez que precisar intervir manualmente. Cada intervenção repetida vira o próximo prompt.
