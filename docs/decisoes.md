# Ecoa Memórias — Registro de decisões

Fonte da verdade das decisões de produto e de arquitetura da plataforma. O detalhe de cada uma está em `docs/prd.md`.

**Regra para o Claude Code:** leia este arquivo antes de propor qualquer mudança de produto ou de arquitetura. Se uma tarefa contrariar uma decisão daqui, pare e pergunte. Toda decisão nova aprovada pelo fundador entra no fim da tabela correspondente, com data e motivo. Decisões antigas não são apagadas: quando mudam, ganham a marca "Substituída por #N".

## Decisões de produto

| # | Data | Decisão | Por quê | Alternativa descartada |
| --- | --- | --- | --- | --- |
| P1 | 2026-11 | Plataforma de autosserviço: a família (ou o próprio autor) faz o livro do primeiro áudio ao PDF, sem a Ecoa no circuito, exceto na impressão | Escala sem o fundador como gargalo; o filho quer ser protagonista do presente | Serviço feito à mão pela Ecoa ("a Ecoa cuida de tudo") |
| P2 | 2026-11 | Gravar conversando (modo conversa) é o centro da experiência; gravar sozinho é igualmente simples | O idoso conta melhor para alguém do que para um microfone | Só gravação solitária, como no Remento |
| P3 | 2026-11 | R$ 467 por passe anual: gravações ilimitadas e 1 livro de 80 páginas com histórias, fotos e mensagens. Página e cópia extras com valor configurável; frete à parte | Prazo natural para terminar o livro e porta para renovação | Preço por livro sem prazo |
| P4 | 2026-11 | Sem cobrança recorrente. Ao vencer, o passe fica em somente leitura e renova com novo pagamento; QR e leitura continuam funcionando | Simplicidade e menos atrito com o consumidor | Assinatura com renovação automática |
| P5 | 2026-11 | Pagamento: Pix manual na onda 1; link do Mercado Pago (Pix e cartão em até 12x) com ativação automática na onda 2 | Cartão parcelado sem construir checkout nem tocar em dado de cartão | Checkout próprio |
| P6 | 2026-11 | Login com Google como entrada principal e link por e-mail como alternativa; o autor entra por link pessoal, sem login | Entrada em 2 toques; o idoso não lida com senha | Login com senha |
| P7 | 2026-11 | Papéis: 1 responsável (publica, imprime, paga, convida), até 3 co-facilitadores com acesso total (onda 2) e o autor em modo autor | Irmãos querem ajudar, mas alguém precisa ter a palavra final | Todos com poderes iguais |
| P8 | 2026-11 | Modo autor: o autor vê as perguntas para ele, grava histórias livres, ouve e corrige os próprios textos e lê o livro, sem o capítulo de mensagens | O autor pode fazer tudo sozinho, sem estragar a surpresa | Autor só grava |
| P9 | 2026-11 | Zero integração com a API do WhatsApp. A plataforma gera mensagens e links; o responsável envia do próprio WhatsApp | Sem custo por mensagem, sem aprovação da Meta, sem risco de banimento | API oficial ou bibliotecas não oficiais |
| P10 | 2026-11 | Grupo de WhatsApp da família criado à mão, sem o autor, com um link permanente da família | Engaja a família sem expor o segredo ao autor | Mural dentro da plataforma |
| P11 | 2026-11 | Mural, reações e comentários fora do produto | O grupo de WhatsApp já cumpre esse papel | Feed social estilo Remento |
| P12 | 2026-11 | Causos sugeridos pela família chegam exatamente como enviados (áudio ou texto), sem IA | Preserva a voz de quem sugeriu; o áudio pode tocar para o autor ("A Ana pediu:") | IA reescrevendo a sugestão como pergunta |
| P13 | 2026-11 | Sem passo "Me conte sobre ele" na configuração. O glossário nasce das histórias: a IA sugere nomes e o responsável ajusta quando quiser | Menos atrito no início | Formulário de contexto obrigatório ou sugerido |
| P14 | 2026-11 | ~~Primeiras perguntas: 10 do banco já marcadas por parentesco, mais perguntas e causos próprios em texto livre~~ **Substituída por P30** | Começar em segundos, sem tela em branco | Escolher do zero num banco de 150 |
| P15 | 2026-11 | ~~Enquete da família: o responsável abre uma votação no link da família, cada pessoa marca até 5 itens, e ele salva as mais votadas com 1 toque~~ **Substituída por P35** | Envolve a família na escolha e aumenta o engajamento antes da gravação | Só o responsável escolhe |
| P16 | 2026-11 | Itens têm dois tipos com o mesmo fluxo: pergunta e causo | Causos específicos ("Guarapari") geram as melhores histórias | Só perguntas genéricas |
| P17 | 2026-11 | Upload em lote: vários áudios do WhatsApp viram histórias separadas por assunto, com confirmação do responsável | O autor manda muitos áudios soltos; organizar à mão é inviável | Um áudio por história |
| P18 | 2026-11 | O processamento aparece ao vivo na tela, com o texto sendo escrito; e-mail só se ninguém estiver com a tela aberta | Retorno imediato gera confiança e encantamento | Aviso só por e-mail |
| P19 | 2026-11 | Controle de tamanho do texto por história, de Resumido a Detalhado | Cada família quer um nível de detalhe | Tamanho fixo |
| P20 | 2026-11 | Só 1ª pessoa no v1 | Menos decisões e menos complexidade | 1ª e 3ª pessoa |
| P21 | 2026-11 | Mensagens da família: capítulo surpresa, áudio com transcrição limpa ou texto, foto opcional; contam nas 80 páginas; o autor nunca vê antes do livro impresso | É o diferencial emocional do livro | Sem mensagens |
| P22 | 2026-11 | Impressão intermediada pela Ecoa, sem integração com gráfica | Controle de qualidade e margem nos primeiros livros, sem integração cara | Integração direta ou família encomendando sozinha |
| P23 | 2026-11 | Design minimalista com referência no Remento: uma ação principal por tela, poucas palavras, revelação progressiva | A régua é um avô de 80 anos e um filho com pressa entenderem cada tela em 3 segundos | Interface densa de texto (o mockup HTML anterior foi descartado) |
| P24 | 2026-11 | Duas ondas: onda 1 até o Natal de 2026 (coleta, IA, editor, modo autor, página de amostra); onda 2 até março de 2027 (co-facilitadores, mensagens, livro, impressão, pagamento, painel) | Gravar na ceia com 2 famílias parceiras antes de vender para estranhos | Lançar tudo de uma vez |
| P25 | 2026-11 | Onboarding embutido: lista "Seu livro em 5 passos" na home, dicas de 1 linha mostradas uma única vez e o marco da primeira história. Sem tour guiado | Ensina no momento do uso e mede onde as famílias travam | Tour guiado ou carrossel de boas-vindas |
| P26 | 2026-11 | A pergunta é opcional em todas as portas de coleta; o botão principal da home é "Nova história" (gravar conversa ou subir áudios) | A conversa real não segue roteiro; muita história boa surge sem pergunta | Toda gravação presa a uma pergunta |
| P27 | 2026-11 | A IA decide o formato pelo conteúdo: 1 assunto vira 1 história; lotes e gravações longas com vários assuntos (como 1 hora de ceia) passam pela divisão em histórias | Uma conversa de mesa cobre vários assuntos e não pode virar uma história gigante | Divisão só para lotes de vários arquivos |
| P28 | 2026-11 | Mínimo para gravar na ceia: prompts 0 a 7 (antes eram 0 a 6) | A gravação da ceia depende da divisão em histórias | Deixar a divisão para depois do Natal |
| P29 | 2026-11 | História sem pergunta que responde a uma pergunta pendente gera a sugestão "Marcar como respondida" | A fila de perguntas não fica desatualizada | Fila mantida à mão |
| P30 | 2026-11-09 | Primeiras perguntas por fase da vida (Família e raízes, Infância, Escola, Juventude, Trabalho, Amor e casamento, Filhos, Maturidade e legado): 1 marcada por fase, 8 no total, escolhidas pelo parentesco; *Ver mais* abre a fase | No teste no celular, 10 perguntas soltas pareciam aleatórias; por fase, a lista mostra que o livro cobre a vida inteira | 10 marcadas sem agrupamento (P14) |
| P31 | 2026-11-09 | Celular do autor opcional na configuração; com ele, *Enviar ao autor* abre o WhatsApp direto na conversa | Sem o número, o WhatsApp obriga a escolher o contato a cada envio | Campo obrigatório ou sem campo |
| P32 | 2026-11-09 | A família sugere pergunta ou causo pelo mesmo link; tudo chega na aba *Sugestões* e o responsável faz a curadoria | Quem conhece as histórias também sabe o que perguntar | Família só vota e sugere causo |
| P33 | 2026-11-09 | A lista de perguntas é a base do livro, não uma fila de envio: a primeira aba se chama *Para perguntar* | O filho pode fazer a pergunta ao vivo, na mesa de jantar, sem mandar link ao autor | Aba *Para enviar* |
| P34 | 2026-11-09 | Prompt 5A antes do gravador: o responsável sobe áudios já gravados (WhatsApp, gravador do celular), que ficam guardados como "aguardando processamento", sem IA | MVP para o primeiro cliente: guardar as vozes que já existem antes da transcrição | Esperar o gravador e a IA (prompts 5 e 6) |
| P35 | 2026-11-10 | Enquete por fase da vida. O responsável abre com "Todas as perguntas" (a família vê as 150, incluindo as de fé, mais as sugestões) ou "Eu escolho antes" (uma fase por etapa); nos dois casos revisa, agrupado por fase, antes de abrir. A família vota em etapas, uma fase por tela, até 2 por fase, e revisa antes de votar. Resultados agrupados por fase. Substitui P15 | Agrupado por fase fica mais fácil de entender; o limite por fase espalha os votos pela vida inteira, em vez de concentrar em Infância | 5 votos no total, numa lista única de até 30 |

## Decisões técnicas

| # | Data | Decisão | Por quê | Alternativa descartada |
| --- | --- | --- | --- | --- |
| T1 | 2026-11 | Repositório separado da landing, privado, com projeto Supabase próprio | Regras opostas, segurança diferente e falhas isoladas | Monorepo com a landing |
| T2 | 2026-11 | Mesma stack da landing: Next.js, TypeScript strict, Tailwind, zod, Supabase, Resend, Vercel | Continuidade de aprendizado | Stack nova |
| T3 | 2026-11 | Supabase na região São Paulo | LGPD e latência | Região nos EUA |
| T4 | 2026-11 | RLS em todas as tabelas, com testes automáticos de isolamento | Segurança garantida no banco mesmo se o código errar | Controle de acesso só no código |
| T5 | 2026-11 | Segredo das mensagens garantido por RLS: o token do autor nunca lê `family_messages`, `polls`, `poll_votes` nem `causos` | A surpresa é o produto; esconder só na tela não basta | Filtro apenas na interface |
| T6 | 2026-11 | Links sem login com token aleatório de 128 bits, guardado só como hash, um recurso por link, revogável | Um vazamento do banco não expõe links válidos | Token em texto puro |
| T7 | 2026-11 | Laboratório de IA (sem tela) antes de qualquer interface | A qualidade do texto é o maior risco do produto | Construir as telas primeiro |
| T8 | 2026-11 | Cada parágrafo editado guarda os segmentos do áudio que o sustentam | Permite verificar fidelidade, tocar o áudio de uma frase e integrar áudio novo sem perder edições | Texto livre sem rastreabilidade |
| T9 | 2026-11 | Dois modelos do Claude: um rápido para estruturar, um mais capaz para editar e verificar | Custo menor sem perder qualidade | Um modelo só para tudo |
| T10 | 2026-11 | Verificação independente de fidelidade em chamada separada, sem o contexto da edição | Defesa contra fatos inventados | Confiar na edição |
| T11 | 2026-11 | Mudar o tamanho sempre a partir da base estruturada original, nunca da versão anterior | Evita perda acumulada ("xerox de xerox") | Reescrever a versão atual |
| T12 | 2026-11 | Parágrafos editados à mão ficam travados; a IA só propõe mudanças, mostradas como diferença | Edição manual nunca se perde | IA sobrescrevendo o texto |
| T13 | 2026-11 | Padrão-ouro com histórias editadas pela tia Caia e `npm run eval` contra toda mudança de prompt | Qualidade medida, não opinada | Avaliação subjetiva |
| T14 | 2026-11 | Provedor de transcrição escolhido por teste com áudios reais (ElevenLabs Scribe, Deepgram, AssemblyAI, OpenAI) | O caso real é idoso, sotaque e ruído de mesa | Escolher pela marca |
| T15 | 2026-11 | Gravação guardada no aparelho (IndexedDB) e enviada em partes com retomada (TUS) | Zero perda de áudio com sinal ruim | Upload único no final |
| T16 | 2026-11 | PWA com atalho de compartilhamento no Android, sem loja de apps | O idoso não instala nada | App nativo |
| T17 | 2026-11 | Fila gerenciada de jobs (Inngest ou Trigger.dev, decidido no prompt 0) | Transcrição e IA levam minutos | Processar dentro da requisição |
| T18 | 2026-11 | Supabase Realtime para as etapas ao vivo e o texto sendo escrito | Atende a P18 sem infraestrutura nova | Atualizar a página manualmente |
| T19 | 2026-11 | Typst como motor de PDF, a confirmar por teste de 1 página no prompt 10 | Saída determinística e qualidade de impressão | HTML com Paged.js |
| T20 | 2026-11 | A mesma renderização gera a estimativa de páginas e o PDF final | O valor de página extra nunca surpreende | Estimativa por conta aproximada |
| T21 | 2026-11 | QR aponta para `ouvir.ecoamemorias.com.br/{código}`; códigos nunca são apagados | Livros duram décadas; o destino pode mudar sem reimprimir | QR apontando direto para o arquivo |
| T22 | 2026-11 | Cada publicação do livro é uma versão congelada | Reimpressão idêntica anos depois | Gerar sempre a partir do conteúdo atual |
| T23 | 2026-11 | Registro de eventos (quem, papel, ação, livro, quando) desde o primeiro dia | Medir a adesão dos parceiros de design | Analytics só no lançamento |
| T24 | 2026-11 | EGM nos prompts complexos, SQL de subida e reversão antes de mexer no banco, um prompt por sessão | O fundador aprova o plano antes do código e toda mudança tem desfazer | Codar direto |
| T25 | 2026-11-09 | O link que precisa ser mostrado de novo (família, autor) é derivado por HMAC de um segredo versionado (`LINKS_SEGREDO_V{n}`); o banco guarda só o hash. Complementa T6 | Mostrar o link de novo sem guardar o token puro; trocar o segredo sem quebrar links antigos | Guardar o token cifrado no banco |
| T26 | 2026-11-09 | Enquete e sugestões abertas na tela se atualizam por consulta a cada 4 s, sem Realtime. T18 continua valendo para as etapas das histórias | Simples e suficiente para o ranking; sem canal aberto para a família | Realtime também na enquete |
| T27 | 2026-11-09 | Áudio de até 50 MB por arquivo (limite do plano grátis do Supabase), com upload retomável (TUS) por token assinado pelo servidor, sem política em `storage.objects` | Retomar quando a internet cai sem abrir o bucket para o navegador; 50 MB cobre mais de 45 min de .m4a | Plano Pro só para chegar a 100 MB agora; upload único sem retomada |
