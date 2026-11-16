// Fonte única de configuração da plataforma. Preço, limites, formato do livro e domínios saem daqui.
// Mudou um número de negócio? Muda só aqui.

export const MARCA = "Ecoa Memórias";

// ── Plano ────────────────────────────────────────────────────────────────
// R$ 467 por ano: gravações ilimitadas e 1 livro de 80 páginas.
export const PRECO_PLANO = 467; // exibir como "R$ 467"
export const DURACAO_PLANO_MESES = 12; // conta a partir da ativação

// ── Livro ────────────────────────────────────────────────────────────────
export const PAGINAS_INCLUSAS = 80;
// A definir pela cotação da gráfica (pendência do fundador). null = ainda não definido;
// a interface não deve mostrar valor enquanto for null.
export const VALOR_PAGINA_EXTRA: number | null = null;
export const VALOR_COPIA_EXTRA: number | null = null;
// ── Especificação da gráfica (prompt 13, P66, T50) ───────────────────────
// Tudo o que a gráfica não confirmou fica aqui, num lugar só, com versão. Mudou um número:
// suba `versao`. Cada publicação grava a especificação usada; o prompt 14 só envia para a
// impressão a versão feita com a especificação atual (Q3).
export const ESPEC_GRAFICA = {
  versao: 1,
  confirmada: false, // vira true quando a gráfica devolver o gabarito
  // Miolo (confirmado: formato, páginas, papel e cor).
  miolo: {
    larguraMm: 148,
    alturaMm: 210, // A5 vertical
    sangriaMm: 3, // em cada lado (provisório, PRD)
    multiploPaginas: 4, // provisório: capa dura costurada costuma pedir cadernos de 16
    espessuraFolhaMm: 0.1, // couché fosco 115 g; uma folha = 2 páginas (provisório)
  },
  // Capa dura 4x0 com laminação fosca na frente (confirmado); o gabarito é provisório.
  capa: {
    papelaoMm: 2, // espessura do papelão
    projecaoMm: 3, // o papelão passa do miolo na cabeça, no pé e na frente
    canalMm: 8, // vinco entre a lombada e cada papelão
    dobraMm: 15, // papel que se dobra para dentro do papelão
    folgaLombadaMm: 1,
    lombadaMinTextoMm: 6, // lombada mais estreita não leva texto
    margemTextoMm: 8, // título e foto a esta distância das bordas do papelão
  },
  // Texto e QR em 100% preto (K); cores da capa em CMYK; fotos em RGB (T52, Q13).
  cor: "texto K, capa CMYK, fotos RGB",
} as const;
export const FORMATO_LIVRO = `${ESPEC_GRAFICA.miolo.larguraMm}x${ESPEC_GRAFICA.miolo.alturaMm}`; // em mm
export const SANGRIA_MM = ESPEC_GRAFICA.miolo.sangriaMm; // em cada lado
// Capa impressa: 5 cores prontas em CMYK (Q2). `claro` = texto branco sobre a cor.
export const CAPA_CORES = {
  terracota: { nome: "Terracota", cmyk: [0, 62, 70, 28], claro: true },
  oliva: { nome: "Oliva", cmyk: [35, 18, 90, 45], claro: true },
  azul: { nome: "Azul", cmyk: [85, 55, 20, 40], claro: true },
  areia: { nome: "Areia", cmyk: [6, 12, 28, 0], claro: false },
  grafite: { nome: "Grafite", cmyk: [0, 0, 0, 85], claro: true },
} as const;
export type CorDaCapa = keyof typeof CAPA_CORES;
export const COR_CAPA_PADRAO: CorDaCapa = "terracota";

// ── Montar e publicar (prompt 13, docs/designs/montar-publicar-livro.md) ──
// Os quatro primeiros são espelhados no banco (supabase/tests/config-banco.test.ts confere).
export const MAX_ITENS_LIVRO = 150; // histórias ou mensagens na montagem (por lista)
export const MAX_PUBLICACOES_DIA = 10; // por livro em 24 h; as que falharam não contam
export const PUBLICACAO_EXPIRA_MIN = 30; // 'gerando' há mais que isso é dada como presa
export const MAX_USOS_MONTAGEM_MINUTO = 30; // contagem e prévia, por pessoa e livro
export const TITULO_LIVRO_MAX = 90; // CHECK de book_layouts
export const SUBTITULO_LIVRO_MAX = 120;
export const DEDICATORIA_MAX = 600;
export const TITULO_CAPA_LINHAS = 3; // mais que isso não cabe na capa: bloqueia
export const HISTORIA_CURTA_PALAVRAS = 120; // abaixo disso: alerta amarelo
export const FOTO_DPI_ALVO = 300; // fotos reduzidas a isso no PDF; abaixo: alerta amarelo
export const FOTO_PDF_QUALIDADE_JPEG = 88;
export const FOTO_PDF_MAX_PIXELS = 40_000_000; // limite de entrada do sharp (foto de quem tem o link)
export const FOTOS_BAIXADAS_JUNTAS = 4;
export const PREVIA_PAGINA_DPI = 100; // prévia página a página (JPEG)
export const CONFERIR_QR_DPI = 150; // rasterização para ler cada QR por software
export const PREVIA_CAPA_MINIATURA_PX = 600;
export const CONTAR_APOS_MS = 800; // contagem de páginas depois da última mudança salva
export const PREVIA_CAPA_APOS_MS = 600; // prévia da capa depois da última tecla
export const CONSULTAR_PUBLICACAO_S = 3; // versão 'gerando' é conferida nesse intervalo
export const EXPORT_DOWNLOAD_URL_S = 60; // validade da URL assinada do PDF
export const EXPORT_PREVIA_URL_S = 10 * 60; // validade da URL assinada das prévias
export const EXPORT_PREVIAS_POR_PEDIDO = 4;
export const EXPORT_BUCKET = "exportacoes";

// Página do miolo (A5 com sangria). Margens em mm, corpo em pt. A interna é maior porque a capa
// dura abre menos. Texto e QR em 100% K (T52).
export const LAYOUT_MIOLO = {
  margemInternaMm: 20,
  margemExternaMm: 15,
  margemCabecaMm: 18,
  margemPeMm: 20,
  corpoPt: 11,
  fotoAlturaMaxMm: 85, // foto mais alta que isso entra menor, sem cortar
  fotoMensagemMm: { largura: 36, altura: 36 }, // caixa fixa da foto de uma mensagem
} as const;

// ── Coleta ───────────────────────────────────────────────────────────────
export const MAX_GRAVACAO_MIN = 30; // por gravação (espelhado em privado.max_gravacao_s); a conversa segue em partes (P39)
export const GRAVACAO_KBPS = 48; // voz em Opus/AAC; 30 min ≈ 11 MB
export const MAX_GRAVACOES_AUTOR_DIA = 30; // espelhado, por livro, pelo link do autor (T29)
export const MAX_MB_AUTOR_DIA = 300; // espelhado, por livro, pelo link do autor (T29)
export const MAX_ENVIOS_ABERTOS_AUTOR = 5; // espelhado no SQL de autor_preparar_gravacao
export const CONSENTIMENTO_AUTOR_VERSAO = 2; // mudou a frase? suba a versão (v2 cita a IA, P41)
export const MAX_ARQUIVOS_LOTE = 30; // por upload em lote

// ── Áudios recebidos (prompt 5A) ─────────────────────────────────────────
// 50 MB é o teto por arquivo do plano grátis do Supabase (o PRD pede 100; muda com o Pro).
// Espelhado em privado.max_audio_bytes() e no limite do bucket "audios".
export const MAX_AUDIO_MB = 50;
export const FORMATOS_AUDIO = [
  "opus",
  "ogg",
  "m4a",
  "mp3",
  "wav",
  "webm",
] as const;
export const SUBIDAS_SIMULTANEAS = 2; // arquivos subindo ao mesmo tempo

// ── Pessoas ──────────────────────────────────────────────────────────────
export const MAX_COFACILITADORES = 5; // além do responsável; convites pendentes contam (espelhado)
export const MAX_CONVITES_DIA = 10; // por livro e por responsável, em 24 h (espelhado)
export const MAX_CONVITES_POR_EMAIL_DIA = 3; // o mesmo e-mail, somando todos os livros (espelhado)
export const CONVITE_VALIDADE_DIAS = 7; // espelhado em privado.convite_validade_dias

// ── Domínios ─────────────────────────────────────────────────────────────
export const DOMINIO_APP = "app.ecoa-memorias.com.br";
// O QR impresso aponta para cá. Nunca mudar: livros impressos dependem dele.
export const DOMINIO_QR = "ouvir.ecoa-memorias.com.br";

// ── E-mail ───────────────────────────────────────────────────────────────
// Domínio verificado no Resend. Ver docs/decisoes/dominio.md.
export const EMAIL_REMETENTE = "Ecoa Memórias <acesso@ecoa-memorias.com.br>";

// ── Lembretes e estimativas ──────────────────────────────────────────────
// Pergunta enviada há este número de dias sem resposta mostra "Lembrar com carinho".
export const LEMBRETE_APOS_DIAS = 3;
// Estimativa de páginas no A5 a 11 pt enquanto o livro não é paginado de verdade (era 320 no 21x21).
export const PALAVRAS_POR_PAGINA_ESTIMADA = 220; // espelhado em privado.palavras_por_pagina
export const PAGINAS_POR_FOTO_ESTIMADA = 0.5;

// ── Perguntas e configuração inicial ─────────────────────────────────────
export const PERGUNTAS_INICIAIS = 8; // marcadas no passo 2: 1 por fase da vida, por parentesco
export const ATUALIZAR_A_CADA_S = 4; // releitura da tela: abas Causos e Enquete, gravações e histórias em andamento

// ── Fotos do acervo ──────────────────────────────────────────────────────
// Comprimidas no navegador: JPEG, lado maior até 3000 px (a largura do A5, 148 mm a 300 DPI, pede 1748).
export const FOTO_LADO_MAX_PX = 3000;
export const FOTO_QUALIDADE_JPEG = 0.9;
export const MAX_FOTO_MB = 5; // igual ao limite do bucket acervo
export const MAX_FOTOS_POR_ENVIO = 30;
export const MAX_FOTOS_POR_LIVRO = 200; // espelhado em privado.max_fotos_por_livro()

// ── Família: causos e enquete ────────────────────────────────────────────
// Os que têm "espelhado" também são conferidos no banco; supabase/tests/config-banco.test.ts
// garante que os valores batem.
// Enquete por fase (P35): até 2 por fase; teto total = 2 × 9 categorias (8 fases + outras).
export const VOTOS_POR_FASE = 2; // espelhado em privado.votos_por_fase()
export const VOTOS_POR_PESSOA = 18; // espelhado em privado.votos_por_pessoa()
// A lista inteira do banco (150) mais as próprias e as sugestões da família.
export const MAX_ITENS_ENQUETE = 200; // espelhado em privado.max_itens_enquete()
export const MAX_VOTANTES_POR_ENQUETE = 150; // espelhado
export const MAX_TROCAS_VOTO_POR_HORA = 300; // espelhado
export const MAX_CAUSOS_POR_HORA = 20; // espelhado, por livro
export const MAX_CAUSOS_POR_DIA = 40; // espelhado, por livro
export const MAX_CAUSO_AUDIO_MIN = 3;
export const MAX_CAUSO_AUDIO_MB = 2; // igual ao limite do bucket causos
export const CONSENTIMENTO_CAUSO_VERSAO = 1; // mudou a frase? suba a versão

// Mensagens da família (prompt 12, link /m). Os espelhados conferem em config-banco.test.ts.
export const MAX_MENSAGENS_POR_HORA = 20; // espelhado: enviadas, por livro
export const MAX_MENSAGENS_POR_DIA = 40; // espelhado: enviadas, por livro
export const MAX_RASCUNHOS_POR_DIA = 100; // espelhado: rascunhos criados, por livro
export const MAX_RASCUNHOS_POR_APARELHO = 3; // espelhado: rascunhos abertos ao mesmo tempo
export const MAX_MENSAGEM_AUDIO_MIN = 5; // o banco aceita até 5 min + 10 s (max_mensagem_audio_s)
export const MAX_MENSAGEM_AUDIO_MB = 4; // igual ao limite do bucket mensagens (5 min a 48 kbps ≈ 1,8 MB)
export const MAX_MENSAGEM_FOTO_MB = 4; // a foto vem comprimida do aparelho (comprimirFoto)
export const MAX_MENSAGEM_CARACTERES = 6000; // espelhado
export const MAX_TRANSCRICOES_POR_MENSAGEM = 3; // espelhado
export const MAX_TRANSCRICOES_POR_DIA = 60; // espelhado: tentativas por livro, em 24 h
export const MENSAGEM_OUVIR_URL_S = 10 * 60; // validade da URL assinada que o membro ouve
export const MENSAGEM_TRANSCREVER_TIMEOUT_S = 45; // corte do pedido ao Scribe (a reserva dura 2 min)
export const MENSAGEM_RASCUNHO_DURA_H = 48; // espelhado: rascunho não enviado é apagado depois disso
export const CONSENTIMENTO_MENSAGEM_VERSAO = 1; // mudou a frase? suba a versão
export const TEXTO_PERGUNTA_MAX = 500; // igual ao CHECK de prompts e poll_items

// ── IA (laboratório e pipeline) ──────────────────────────────────────────
// Ver docs/designs/laboratorio-ia.md. Preços em US$; conferir antes de decidir.

export const MODELO_RAPIDO = "claude-haiku-5-5"; // estruturar, classificar edições
export const MODELO_CAPAZ = "claude-opus-5-5"; // editar e verificar
export const MODELO_ALTERNATIVO = "claude-sonnet-5-5"; // alavanca de custo, medir antes de usar

// Preço por milhão de tokens (US$). Escrita de cache custa 1,25× a entrada.
export const PRECOS_MODELOS_USD_MTOK: Record<
  string,
  { entrada: number; saida: number; cacheLido: number }
> = {
  "claude-haiku-5-5": { entrada: 0.1, saida: 0.5, cacheLido: 0.01 },
  "claude-sonnet-5-5": { entrada: 2, saida: 10, cacheLido: 0.1 },
  "claude-opus-5-5": { entrada: 4, saida: 20, cacheLido: 0.2 },
};
export const FATOR_ESCRITA_CACHE = 1.25;

// Transcrição: preço por minuto de áudio (US$). NÃO CONFIRMADO: estimativa de mercado,
// conferir no site de cada provedor e virar a flag abaixo para true.
export const PRECOS_TRANSCRICAO_USD_MIN: Record<string, number> = {
  elevenlabs: 0.0067, // ~US$ 0,40 por hora
  assemblyai: 0.0045, // ~US$ 0,27 por hora
};
export const PRECOS_TRANSCRICAO_CONFIRMADOS = false;
export const MODELOS_TRANSCRICAO: Record<string, string> = {
  elevenlabs: "scribe_v1",
  assemblyai: "universal",
};
export const PROVEDOR_PADRAO = "elevenlabs";

export const COTACAO_USD_BRL = 5.5; // premissa; atualizar quando decidir preço

// Tamanho do texto: fração das palavras com conteúdo da transcrição.
export const TAMANHOS_TEXTO = {
  resumido: 0.3,
  curto: 0.45,
  medio: 0.6,
  longo: 0.75,
  detalhado: 0.9,
} as const;
export const TAMANHO_PADRAO = "medio";

// Segmentação da transcrição.
export const PAUSA_SEGMENTO_S = 1.5;
// Evals: palavra com confiança do provedor abaixo disso conta como "duvidosa" (T54).
export const CONFIANCA_DUVIDOSA = 0.5;
export const MAX_PALAVRAS_SEGMENTO = 40;

// Metas do PRD.
export const META_PRIMEIRAS_PALAVRAS_S = 60;
export const META_CUSTO_LIVRO_BRL = 30;

// Premissas para projetar o custo de IA por livro (ajustar com o uso real).
export const PREMISSA_HISTORIAS_POR_LIVRO = 25;
export const PREMISSA_MIN_AUDIO_POR_HISTORIA = 6;
export const PREMISSA_TROCAS_TAMANHO_POR_HISTORIA = 2;

// ── Pipeline (prompt 6, docs/designs/pipeline-texto-ao-vivo.md) ───────────
// Os quatro primeiros são espelhados no banco (supabase/tests/config-banco.test.ts confere).
export const MAX_HISTORIA_MIN = 30; // gravação avulsa mais longa que isso espera a divisão (P40)
export const MAX_MINUTOS_IA_DIA = 240; // áudio processado por livro em 24 h (T38)
export const MAX_NOMES_GLOSSARIO = 300; // sugeridos + aceitos por livro
export const MAX_NOMES_POR_HISTORIA = 10; // sugestões da IA por história
export const CONSENTIMENTO_IA_VERSAO = 1; // confirmação do responsável (P41); mudou a frase? suba
export const ESPERA_EMAIL_MIN = 2; // e-mail só se ninguém viu a história pronta nesse tempo (P42)
export const INTERVALO_TEXTO_MS = 400; // texto ao vivo: no máximo 1 mensagem por intervalo
export const MAX_RESUMOS_CONTEXTO = 40; // histórias prontas no contexto do livro
export const TENTATIVAS_POR_PASSO = 3; // Inngest: 1 + 2 novas tentativas
// Corte do pedido de transcrição no pipeline: base + por minuto de áudio, até o teto (o passo
// inteiro tem 300 s). Sem corte, um pedido travado só morria no teto da função, 3 vezes.
export const TRANSCREVER_TIMEOUT_BASE_S = 60;
export const TRANSCREVER_TIMEOUT_POR_MIN_S = 10;
export const TRANSCREVER_TIMEOUT_MAX_S = 270;
export const VARREDURA_GRAVACAO_MIN = 5; // gravação recebida sem história há mais que isso: reenvia
// Gravação recebida que não começou a virar história há mais que isso: a tela admite a demora
// (em vez de "já vai começar") e oferece Tentar de novo. O normal é começar em segundos.
export const ESPERA_COMECAR_MIN = 10;
// Tentar de novo: cliques na mesma janela viram um evento só (o Inngest ignora id repetido).
export const TENTAR_DE_NOVO_JANELA_MIN = 2;
export const VARREDURA_PARADA_MIN = 20;
// Previsão mostrada no cartão (sem ansiedade): base + segundos por segundo de áudio, por fase.
// Calibrar com ai_usage.ms quando houver histórias reais.
export const PREVISAO_OUVIR_BASE_S = 15; // transcrever + estruturar
export const PREVISAO_OUVIR_POR_S = 0.08;
export const PREVISAO_ESCREVER_BASE_S = 25; // editar + verificar
export const PREVISAO_ESCREVER_POR_S = 0.35; // história em andamento há mais que isso: falhou ("parada")

// ── Divisão em histórias (prompt 7, docs/designs/divisao-historias.md) ────
// Os sete primeiros são espelhados no banco (supabase/tests/config-banco.test.ts confere).
export const MAX_HISTORIAS_DIVISAO = 30; // histórias por divisão
export const ESPERA_LOTE_H = 6; // lote incompleto: depois disso, divide o que chegou
export const MAX_MIN_CONTEINER = 120; // minutos de áudio numa divisão; o resto do lote segue sozinho
export const MIN_FALA_HISTORIA_S = 30; // fala mínima de uma história confirmada
export const MAX_HISTORIAS_DIA = 60; // histórias criadas por livro em 24 h
export const MAX_ARQUIVO_MIN = 120; // arquivo único processado inteiro, sem cortar o original (D9)
export const MAX_HISTORIA_ESCRITA_MIN = 60; // fala de uma história: cabe numa escrita só
export const ESPERA_EMAIL_DIVISAO_MIN = 10; // divisão esperando confirmação: e-mail depois disso
export const TRECHO_ALVO_S = 60; // tamanho de um trecho na tela de divisão
export const EDICOES_SIMULTANEAS = 4; // escrever-historia: no máximo isso ao mesmo tempo
export const MAX_PERGUNTAS_SUGESTAO = 100; // perguntas pendentes mostradas à IA
export const VARREDURA_CONFIRMADA_MIN = 5; // filha parada em "ouvindo" há mais que isso: reenvia
// A varredura só olha o que chegou nessas horas: cobre a cota diária adiada (24 h) e nunca
// reprocessa áudios de teste antigos (D3 do prompt 6).
export const VARREDURA_JANELA_H = 48;
export const MIN_PALAVRAS_HISTORIA = 8; // menos que isso do autor: "audio_sem_fala", sem chamar a escrita
export const PREVISAO_DIVIDIR_BASE_S = 20;
export const PREVISAO_DIVIDIR_POR_S = 0.02;

// ── Editor de histórias (prompt 8, docs/designs/editor-historias.md) ──────
// Os cinco primeiros são espelhados no banco (supabase/tests/config-banco.test.ts confere).
export const TRAVA_EDICAO_MIN = 2; // "Ana está editando" expira depois disso sem atividade
export const VERSAO_A_CADA_MIN = 10; // edição contínua vira versão nesse intervalo
export const MAX_FOTOS_HISTORIA = 4;
export const MAX_PARAGRAFOS = 300; // por história
export const MAX_LETRAS_PARAGRAFO = 6000;
export const RENOVAR_TRAVA_S = 30; // atividade renova a trava no máximo a cada isso
export const CONSULTAR_TRAVA_S = 15; // quem está vendo confere se a trava soltou
export const SALVAR_APOS_MS = 1500; // salvamento automático depois da última tecla
export const SALVAR_NO_MAXIMO_MS = 5000; // digitando sem parar, salva pelo menos nesse intervalo

// ── IA sob controle (prompt 9, docs/designs/ia-sob-controle.md) ───────────
// Os quatro primeiros são espelhados no banco (supabase/tests/config-banco.test.ts confere).
export const MAX_PROPOSTAS_DIA = 40; // pedidos de IA (tamanho, revisar, áudio) por livro em 24 h
export const MAX_AUDIO_EXTRA_MIN = 30; // áudio acrescentado a uma história (também no CHECK do banco)
export const MAX_AUDIOS_HISTORIA = 10; // gravações por história
export const INSTRUCAO_MAX = 300; // letras da instrução escrita em "Revisar"
export const ESPERA_TAMANHO_MS = 1500; // controle parado nessa posição pede a proposta
export const CONSULTAR_PROPOSTA_S = 5; // reserva do canal: proposta gerando é conferida nesse intervalo
export const PREVISAO_PROPOSTA_BASE_S = 20; // tamanho: editar + verificar
export const PREVISAO_PROPOSTA_POR_S = 0.2;
export const PREVISAO_REVISAR_S = 20;

// ── QR e página de amostra (prompt 10, docs/designs/qr-pagina-amostra.md) ──
// O código e o domínio vão impressos: depois da 1ª página impressa, nunca mudam.
export const QR_ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sem 0, 1, I, L, O (CHECK no banco)
export const QR_TAMANHO_CODIGO = 8;
export const QR_LADO_MM = 20; // o símbolo, sem a margem de silêncio (PRD: mínimo 2 × 2 cm)
export const QR_MARGEM_MODULOS = 4; // margem de silêncio, em módulos
export const QR_CORRECAO = "Q"; // correção de erro (PRD)
// Os cinco abaixo são espelhados no banco (supabase/tests/config-banco.test.ts confere).
// Player público: erros e acertos em baldes separados (quem lê o QR certo quase nunca erra).
export const QR_ERROS_POR_CHAVE = 10; // códigos inexistentes por rede em 10 min
export const QR_ERROS_GLOBAL = 3000; // códigos inexistentes de todas as redes em 10 min
export const QR_ACERTOS_POR_MINUTO = 60; // aberturas de códigos válidos por rede por minuto
export const QR_AUDIO_ESPERA_MIN = 10; // um recorte pedido e não terminado é pedido de novo depois disso
export const QR_FOLGA_RECORTE_S = 30; // o recorte pode passar da fala da história só nisso
export const QR_AUDIO_KBPS = 48; // recorte do QR em .m4a (AAC), voz mono
export const QR_AUDIO_URL_S = 10 * 60; // validade da URL assinada que o player toca
// URL do QR em maiúsculas (versão 3, módulo maior) ou minúsculas (versão 4). Confirmar na folha
// de teste com aparelhos reais (Q4) ANTES da 1ª página impressa; depois disso, nunca muda.
export const QR_URL_MAIUSCULA = true;
export const AMOSTRA_ESPERA_VOZ_S = 120; // a folha consulta o recorte até isso; depois pede para voltar
export const AMOSTRA_CONSULTAR_S = 3; // intervalo da consulta do recorte na folha

// ── Aderência (prompt 15, docs/designs/aderencia-erros.md) ───────────────
export const LIVRO_PARADO_DIAS = 7; // sem ação de pessoa há tanto tempo = "parado" (PRD M10, M11)
export const ADERENCIA_SEMANAS = 8; // gravações por semana, de trás para a frente
export const ADERENCIA_DIAS_ACESSO = 14; // acessos por dia por pessoa
export const ADERENCIA_MAX_EVENTOS = 20000; // teto de leitura de events por consulta do painel
export const ADERENCIA_MAX_HISTORIAS = 20000; // teto de leitura de histórias prontas, idem
export const ADERENCIA_LINHA_DO_TEMPO = 100; // ações mostradas na página de um livro
export const ERROS_DIAS = 30; // jobs que falharam e erros do servidor listados no admin
// Onde abrir o run de um job que falhou (só o id do run vai para events).
export const INNGEST_RUN_URL = "https://app.inngest.com/env/production/runs";

// ── Evals, fase 1A (docs/designs/evals.md): custo, tempo, adoção e alertas ──
export const EVALS_DIAS = 30; // janela dos números principais de custo
export const EVALS_SEMANAS = 8; // barras de gasto por semana
export const EVALS_AMOSTRA_MIN = 5; // abaixo disso a taxa vira "amostra pequena"
export const META_CUSTO_MIN_BRL = 0.2; // R$ por minuto de áudio (R$ 30 por 150 min), provisória
export const EVALS_TROCAS_PROJECAO = [0, 0.5, 1, 2] as const; // trocas de tamanho por história
export const EVALS_FAIXAS_AUDIO_MIN = [5, 20] as const; // faixas da primeira palavra: <5, 5–20, 20+
export const FILA_PARADA_MIN = 30; // espera acima disso é "fila parada": sai dos percentis e alerta
// Ações de criação que fazem um livro contar como ativo na semana (entrou e família não contam).
export const ACOES_DE_CRIACAO = [
  "gravou",
  "subiu_audio",
  "editou",
  "enviou_pergunta",
  "historia_revisada",
  "montou_livro",
] as const;
export const ATIVACAO_DIAS = 7; // 1ª história revisada até tantos dias do plano ativado
export const RETENCAO_SEMANAS = 4; // colunas da retenção por coorte (semana 1 a 4)
// Metas provisórias de adoção (a decidir com o uso real).
export const META_LIVROS_ATIVOS = 0.6;
export const META_ATIVACAO = 0.7;
export const META_RETENCAO_S4 = 0.5;
export const META_HORAS_PRIMEIRA_PRONTA = 48;
// Alertas por e-mail ao admin (lib/inngest/alertas.ts): no máximo 1 por condição e por dia.
export const ALERTA_GASTO_DIA_BRL = 25;
export const ALERTA_GASTO_LIVRO_BRL = 30;
export const ALERTA_PERDA_FALHAS = 0.05; // fração do gasto da semana
export const ALERTA_PERDA_GASTO_MIN_BRL = 1; // abaixo desse gasto na semana, 1 falha não vira alerta
export const ALERTA_COTA_FRACAO = 0.8; // do teto diário de IA de um livro (P54, T38)
