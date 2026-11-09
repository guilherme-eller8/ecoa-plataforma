> **Histórico.** A fonte da verdade das decisões agora é `docs/decisoes.md`. Este arquivo guarda o raciocínio das decisões até o prompt 4 e não recebe mais entradas.

# Decisões de produto e arquitetura (com o porquê)

Data: 2026-11-09 · Status: **registro**. O `docs/prd.md` continua sendo a fonte da verdade do que construir; este arquivo guarda **por que** cada decisão foi tomada e **o que se perde** com ela. Se um prompt contradisser algo aqui, pare e pergunte antes de seguir.

## Lógica da ordem dos 16 prompts

Primeiro o que pode matar o produto (qualidade do texto da IA e gravação no celular), depois o que é só trabalho. Como numa obra: sondagem do solo, fundação, acabamento.

| # | O que constrói | Por que existe e por que nesta posição |
| --- | --- | --- |
| 0 | Fundação: projeto configurado, regras do Claude Code (CLAUDE.md), testes, plugin EGM | O "canteiro". Sem regras escritas, cada sessão reinventa padrões e gera regressão. |
| 1 | Laboratório de IA: script sem tela que pega áudios reais e devolve o texto editado, com custo e tempo | O teste mais importante. Se o texto não ficar bom, nada mais importa. Custa 1 a 2 dias e valida a tese antes de semanas de telas. |
| 2 | Design system: cores, fontes, botões, cartões, gravador visual, página de vitrine | Define o visual uma vez. Sem isso, cada tela sai com um estilo e o "wow" não acontece por acidente. |
| 3 | Login (Google), passe anual, painel admin, registro de cada acesso | Segurança e isolamento entre famílias existem antes de entrar dado real. O registro de acessos mede a adesão dos 2 amigos desde o dia 1. |
| 4 | Configuração inicial ("me conte sobre ele"), banco de perguntas, link de causos para o grupo | Abastecimento do livro: o que perguntar e o contexto para a IA acertar nomes. |
| 5 | Gravador: área do autor, modo conversa, upload | Segundo maior risco: gravar no iPhone com sinal ruim sem perder nada. Vem com roteiro de teste em aparelhos reais. |
| 6 | Pipeline em produção, texto aparecendo ao vivo | Liga o laboratório (1) ao app. Com 0 a 6 prontos, a ceia funciona. |
| 7 | Upload em lote, IA dividindo vários áudios em histórias | O autor manda 12 áudios no WhatsApp e a plataforma organiza. Depois do 6 porque reaproveita a esteira. |
| 8 | Editor, parte 1: texto ao lado do áudio, edição manual, versões, trava "Ana está editando" | Editor profissional estilo Remento, sem IA ainda. Primeiro a base, depois os poderes. |
| 9 | Editor, parte 2: tamanho do texto, revisar trecho, acrescentar áudio | Parte mais delicada: a IA mexer no texto sem apagar o que foi editado à mão. Isolada num prompt, com teste automático. |
| 10 | Modo autor completo, QR permanente, página de amostra em PDF | Fecha a onda 1 e garante a entrega de 26/12. Escolhe o motor de PDF com 1 página antes de diagramar o livro todo. |
| 11 | Co-facilitadores, compartilhar histórias, lembretes | Onda 2. Com 2 famílias não é necessário para validar. |
| 12 | Mensagens secretas da família | Capítulo surpresa, com o segredo garantido no banco. |
| 13 | Montar e publicar o livro (capa, ordem, PDFs) | Usa o motor de PDF testado no 10. |
| 14 | Pedido de impressão via Ecoa e pagamento Mercado Pago | Último de propósito: depende do CNPJ, e com poucos clientes o Pix manual resolve. |
| 15 | Painel de adesão, LGPD (exportar e apagar), teste ponta a ponta | O "habite-se" antes de vender para estranhos. |

## Arquitetura

| Decisão | Por quê | O que se perde |
| --- | --- | --- |
| Repo separado da landing | Regras opostas (a landing proíbe login), segurança diferente, um bug não derruba o outro | Copiar os tokens de design uma vez |
| Mesma stack da landing (Next.js, Supabase, Vercel, Resend) | Terreno já conhecido; trocar zera o aprendizado | Nada relevante neste estágio |
| Supabase em São Paulo | LGPD e latência menor | Nada |
| Sem API do WhatsApp | Custo por mensagem, aprovação da Meta, grupos limitados a 8. O botão abre o WhatsApp do próprio filho com a mensagem pronta: custo zero | O lembrete não sai sozinho; o filho toca em "enviar" |

## Segurança

- **RLS em toda tabela.** Em vez de confiar que o código nunca erre, cada andar tem catraca própria: se um bug pedir dados de outra família, o banco recusa. É o que torna o segredo das mensagens confiável, e não só "escondido na tela".
- **Links sem login, token só como hash.** O banco guarda a impressão digital do link, não o link. Se vazar, os links continuam inúteis. Cada link abre uma única porta e é revogável.
- **Pagamento por link do Mercado Pago, sem checkout próprio.** Dado de cartão nunca passa pela Ecoa: elimina a parte mais pesada de segurança e regulação.

## IA

- **Rastreabilidade por parágrafo.** Cada parágrafo guarda de quais trechos do áudio veio. Sustenta todas as outras decisões: verificar fidelidade, tocar o áudio da frase clicada, integrar áudio novo sem perder edições.
- **Dois modelos.** Um rápido e barato faz a triagem (quem fala, onde muda o assunto); um mais capaz escreve. Custo cai sem perder qualidade.
- **Verificação independente.** Uma segunda IA, sem ver o raciocínio da primeira, confere cada parágrafo contra o áudio. Defesa contra invenção de fatos, o risco nº 1 de livro de memória.
- **Texto transmitido ao vivo.** A pessoa vê o texto nascer em segundos em vez de esperar e-mail.
- **Tamanho sempre a partir da base original, nunca da versão anterior.** Senão cada ajuste resume o resumo e o texto perde detalhe (xerox de xerox).
- **Parágrafo editado à mão fica travado.** A IA só propõe, mostrada como diferença (verde e riscado). Nada entra sem aceite.
- **Memória do livro.** Resumo de cada história já escrita entra no contexto, para a IA não repetir histórias e conseguir ligar uma à outra.
- **Padrão-ouro da tia Caia + testes automáticos.** "Texto excelente" vira critério mensurável. Toda mudança de prompt é testada contra os exemplos dela.
- **Provedor de transcrição escolhido por teste, não por marca.** Sotaque mineiro de idoso com barulho de ceia é caso específico; quem vence em áudio limpo em inglês pode perder aqui.

## Coleta e infraestrutura

- **Gravação guardada no aparelho e enviada em pedaços.** Se a estrada fecha, as caixas que já chegaram estão salvas e o resto segue depois. Garante zero perda de áudio com sinal ruim.
- **PWA, sem loja de apps.** O idoso não instala nada. No Android o app aparece no "Compartilhar" do WhatsApp; no iPhone a Apple não permite, por isso o upload manual existe.
- **Fila de processamento (Inngest ou Trigger.dev).** Transcrever e editar leva minutos e servidores web cortam tarefas longas. A fila recebe, processa em etapas e tenta de novo. Comparação e recomendação em `docs/decisoes/fila-de-jobs.md` (recomendação: Trigger.dev, **aguardando OK**; ainda não decidido).

## Livro e impressão

- **Typst como motor de PDF.** Feito para diagramar impressos, resultado sempre igual, leve no servidor. Confirmar com teste de 1 página (prompt 10) antes do livro inteiro.
- **Mesma renderização gera a estimativa de páginas e o PDF final.** O cliente nunca leva surpresa de página extra.
- **QR aponta para subdomínio próprio** (`ouvir.ecoamemorias.com.br`). O livro dura 50 anos; trocando de fornecedor, muda o destino do endereço e os livros impressos continuam tocando.
- **Cada publicação é uma versão congelada.** Reimpressão daqui a 3 anos sai idêntica, mesmo com o texto editado depois.

## Processo de desenvolvimento

- **EGM nos prompts complexos.** O plano é aprovado em português antes de existir código; fica em `docs/designs` como registro de decisão.
- **SQL de subida e reversão antes de mexer no banco.** Toda mudança nasce com o "desfazer".
- **Um prompt por sessão, com `/clear`.** Conversa longa degrada a qualidade; o contexto certo vem dos arquivos.
- **Resumo de 5 linhas ao fim de cada prompt.** Vira diário de aprendizado e narrativa de portfólio.
