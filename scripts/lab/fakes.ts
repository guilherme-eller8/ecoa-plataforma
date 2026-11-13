// Modo simulado (LAB_FAKE=1): sem chaves, sem áudio real, resultado determinístico.
// Serve para testar o lab de ponta a ponta. NUNCA é evidência de qualidade.
import type { ChamadaIA, ClienteIA, RespostaIA } from "@/lib/ai/claude";
import type { Palavra } from "@/lib/ai/schemas";
import type { Transcritor } from "@/lib/ai/transcricao";

// Conversas sintéticas (personagens fictícios).
export const AMOSTRAS: Record<string, [string, string][]> = {
  "amostra-trem.ogg": [
    ["B", "Tá gravando. Pai, conta aquela do trem."],
    [
      "A",
      "Ah, o trem. Eu tinha dezoito anos, né. Peguei o trem de ferro lá em Cachoeiro, ainda escuro.",
    ],
    [
      "A",
      "Levava uma mala de papelão e um pão com mortadela que a mãe fez. Fui pra Vitória procurar serviço.",
    ],
    ["B", "E deu certo?"],
    [
      "A",
      "Deu nada. Cheguei e o homem da oficina falou que a vaga já era de outro. Dormi na rodoviária.",
    ],
    [
      "A",
      "No outro dia o Tião, meu primo, me arrumou um bico de ajudante de pedreiro. Fiquei três anos lá.",
    ],
  ],
  "amostra-casamento.ogg": [
    ["B", "E a mãe, como vocês se conheceram?"],
    [
      "A",
      "Foi num baile na roça do seu Antônio. Ela tava de vestido azul. Eu chamei pra dançar e ela disse que não.",
    ],
    [
      "A",
      "Aí eu voltei no outro sábado. E no outro. Na terceira vez ela dançou. Casamos em mil novecentos e sessenta e dois.",
    ],
    ["B", "Ok."],
  ],
};

export const transcreverFalso: Transcritor = async (_audio, nomeArquivo) => {
  const falas = AMOSTRAS[nomeArquivo] ?? AMOSTRAS["amostra-trem.ogg"];
  const palavras: Palavra[] = [];
  let t = 0;
  for (const [falante, frase] of falas) {
    for (const texto of frase.split(" ")) {
      palavras.push({
        texto,
        inicio: t,
        fim: t + 0.35,
        falante,
        confianca: 0.9,
      });
      t += 0.4;
    }
    t += 2; // pausa entre falas
  }
  return {
    provedor: "simulado",
    modelo: "simulado",
    palavras,
    bruto: { simulado: true },
  };
};

type LinhaSeg = { id: number; quem: string; vazio: boolean; texto: string };

function lerSegmentos(usuario: string): LinhaSeg[] {
  return [...usuario.matchAll(/^S(\d+) \[([^\]]+)\]( \(vazio\))? (.*)$/gm)].map(
    (m) => ({
      id: Number(m[1]),
      quem: m[2],
      vazio: Boolean(m[3]),
      texto: m[4],
    }),
  );
}

function palavrasSignificativas(t: string): string[] {
  return (
    t
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .match(/\p{L}{5,}/gu) ?? []
  );
}

/** Verificador simulado: "padrao" marca frases com <50% de palavras na transcrição; "cego" não marca nada. */
export type ModoVerificador = "padrao" | "cego";

export class ClienteFalso implements ClienteIA {
  chamadas: string[] = [];
  constructor(
    private modo: { verificador: ModoVerificador; inventar: boolean } = {
      verificador: "padrao",
      inventar: true,
    },
  ) {}

  async gerar<T>(c: ChamadaIA<T>): Promise<RespostaIA<T>> {
    this.chamadas.push(c.etapa);
    const segs = lerSegmentos(c.usuario);
    let dados: unknown;

    if (c.etapa === "estruturar") {
      const contagem = new Map<string, number>();
      for (const s of segs)
        contagem.set(
          s.quem,
          (contagem.get(s.quem) ?? 0) + s.texto.split(" ").length,
        );
      const autor = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
      dados = {
        falantes: [...contagem.keys()].map((f) => ({
          falante: f,
          papel: f === autor ? "autor" : "entrevistador",
        })),
        vazios: segs
          .filter((s) => s.texto.split(" ").length < 3)
          .map((s) => s.id),
        mudancasDeAssunto: [],
      };
    } else if (c.etapa === "editar") {
      const doAutor = segs.filter((s) => s.quem === "autor" && !s.vazio);
      const paragrafos = [];
      for (let i = 0; i < doAutor.length; i += 2) {
        const grupo = doAutor.slice(i, i + 2);
        paragrafos.push({
          texto: grupo.map((s) => s.texto.replace(/,? né,?/g, "")).join(" "),
          fontes: grupo.map((s) => s.id),
        });
      }
      if (this.modo.inventar && paragrafos.length > 0) {
        paragrafos[paragrafos.length - 1].texto +=
          " Por isso, até hoje fico emocionado quando lembro.";
      }
      dados = {
        titulo: "História simulada",
        paragrafos,
        lacunas: [
          {
            pergunta: "Em que ano isso aconteceu?",
            motivo: "o áudio não diz o ano",
          },
        ],
      };
      c.aoPrimeiraPalavra?.();
      await c.aoTexto?.(JSON.stringify(dados), 1);
    } else if (c.etapa === "verificar") {
      const transcricao = new Set(
        palavrasSignificativas(segs.map((s) => s.texto).join(" ")),
      );
      const marcadas = [];
      if (this.modo.verificador === "padrao") {
        for (const m of c.usuario.matchAll(/^\[(\d+)\] (.*)$/gm)) {
          for (const frase of m[2].split(/(?<=[.!?])\s+/)) {
            const ps = palavrasSignificativas(frase);
            const dentro = ps.filter((p) => transcricao.has(p)).length;
            if (ps.length > 0 && dentro / ps.length < 0.5) {
              marcadas.push({
                paragrafo: Number(m[1]),
                trecho: frase,
                tipo: "emocao",
                status: "sem_sustentacao",
                motivo: "simulado: frase sem apoio na transcrição",
              });
            }
          }
        }
      }
      dados = { marcadas };
    } else if (c.etapa === "memoria") {
      const nomes = [
        ...new Set(
          c.usuario.match(/\b[A-ZÁÉÍÓÚÂÊÔÃÕ][a-záéíóúâêôãõç]+/g) ?? [],
        ),
      ];
      dados = {
        resumo: "Resumo simulado da história.",
        temas: ["simulado"],
        nomes: nomes
          .filter((n) => !["Título", "Texto", "Perguntas"].includes(n))
          .slice(0, 3)
          .map((nome) => ({ nome, tipo: "pessoa" })),
        // Sugere a 1ª pergunta pendente, se houver lista.
        pergunta: /^P1\. /m.test(c.usuario) ? 1 : null,
      };
    } else if (c.etapa === "dividir") {
      // Metade dos segmentos em cada história (com 4 ou mais); senão, uma só.
      const ids = segs.map((s) => s.id);
      const meio = ids.length >= 4 ? Math.ceil(ids.length / 2) : ids.length;
      const faixas = [ids.slice(0, meio), ids.slice(meio)].filter(
        (f) => f.length > 0,
      );
      dados = {
        historias: faixas.map((f, i) => ({
          titulo: `História simulada ${i + 1}`,
          trechos: [{ de: f[0], ate: f.at(-1)! }],
          pergunta: null,
        })),
      };
    } else {
      // classificar: emoção removida vira invenção; o resto, estilo
      const pares = [
        ...c.usuario.matchAll(/^\[(\d+)\]\nIA: (.*)\nFAMÍLIA: (.*)$/gm),
      ];
      dados = {
        mudancas: pares.map((m) => {
          const invencao = /emocion/i.test(m[2]) && !/emocion/i.test(m[3]);
          return {
            paragrafo: Number(m[1]),
            categoria: invencao ? "invencao_removida" : "estilo",
            tipo: invencao ? "emocao" : null,
            antes: m[2],
            depois: m[3],
            sugestao: invencao
              ? "não acrescentar emoção que o autor não disse"
              : "preferência de redação",
          };
        }),
      };
    }

    const parsed = c.schema.parse(dados);
    const invalido = c.validar?.(parsed);
    if (invalido) throw new Error(`simulado inválido: ${invalido}`);
    const entrada = Math.ceil(
      (c.sistemaFixo.length +
        (c.sistemaLivro?.length ?? 0) +
        c.usuario.length) /
        4,
    );
    return {
      dados: parsed,
      uso: {
        entrada,
        saida: Math.ceil(JSON.stringify(dados).length / 4),
        cacheLido: 0,
        cacheGravado: 0,
      },
      ms: 5,
      msPrimeiraPalavra: c.campoPrimeiraPalavra ? 2 : null,
      idRequisicao: null,
      tentativas: 1,
    };
  }
}
