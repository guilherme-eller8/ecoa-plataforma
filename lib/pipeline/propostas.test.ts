// Item 5 do prompt 9, no pipeline: com uma IA simulada que tenta reescrever o 2º parágrafo em
// toda chamada, editar o 2º à mão → acrescentar áudio → aceitar → mudar o tamanho → aceitar:
// o 2º parágrafo continua idêntico. O mesmo cenário pelo banco: supabase/tests/propostas.test.ts.
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { leitorDeDiretorio } from "@/lib/ai/carregar-prompt";
import type { ChamadaIA, ClienteIA, RespostaIA } from "@/lib/ai/claude";
import type { Estrutura, Segmento } from "@/lib/ai/schemas";
import type { Paragrafo } from "@/lib/editor/conteudo";
import {
  comporProposta,
  type MarcacaoProposta,
  type Mudanca,
  type Proposta,
} from "@/lib/editor/propostas";
import type { BancoPipeline, Passos } from "./processar";
import {
  proporAudio,
  proporTamanho,
  revisarTrecho,
  type BancoPropostas,
  type DependenciasPropostas,
  type PropostaDoBanco,
} from "./propostas";

const ler = leitorDeDiretorio(join(process.cwd(), "lib/ai/prompts"));
const H = "22222222-2222-2222-2222-222222222222";
const L = "33333333-3333-3333-3333-333333333333";
const G2 = "44444444-4444-4444-4444-444444444444";

const seg = (id: number, arquivo: string, texto: string): Segmento => ({
  id,
  arquivo,
  inicio: id * 5,
  fim: id * 5 + 4,
  falante: `${arquivo}:speaker_0`,
  texto,
});

const uso = { entrada: 10, saida: 10, cacheLido: 0, cacheGravado: 0 };
function resposta<T>(dados: T): RespostaIA<T> {
  return {
    dados,
    uso,
    ms: 1,
    msPrimeiraPalavra: null,
    idRequisicao: null,
    tentativas: 1,
  };
}

/** IA que sempre tenta mexer no p2 (travado), além do trabalho pedido. */
class IAMaliciosa implements ClienteIA {
  etapas: string[] = [];
  async gerar<T>(c: ChamadaIA<T>): Promise<RespostaIA<T>> {
    this.etapas.push(c.etapa);
    const r = (x: unknown) => {
      const dados = c.schema.parse(x);
      const invalido = c.validar?.(dados);
      if (invalido) throw new Error(invalido);
      return resposta(dados);
    };
    switch (c.etapa) {
      case "estruturar":
        return r({
          falantes: [{ falante: "g2:speaker_0", papel: "autor" }],
          vazios: [],
          mudancasDeAssunto: [],
        });
      case "integrar":
        return r({
          operacoes: [
            {
              tipo: "substituir",
              alvo: "p2",
              paragrafos: [{ texto: "Dois, reescrito pela IA.", fontes: [2] }],
            },
            {
              tipo: "inserir",
              alvo: "p3",
              paragrafos: [{ texto: "Quatro, do áudio novo.", fontes: [4] }],
            },
          ],
        });
      case "tamanho":
        return r({
          titulo: "Outro título",
          paragrafos: [
            { travado: null, texto: "Um, bem mais longo.", fontes: [1] },
            { travado: null, texto: "Dois, reescrito de novo.", fontes: [2] },
            { travado: null, texto: "Três e quatro.", fontes: [3, 4] },
          ],
          lacunas: [],
        });
      case "revisar":
        return r({ substituto: "Dois" });
      case "verificar":
        return r({ marcadas: [] });
      default:
        throw new Error(`etapa inesperada: ${c.etapa}`);
    }
  }
}

function montar() {
  const p2: Paragrafo = {
    id: "p2",
    texto: "Dois, do jeito que o pai contava.",
    fontes: [2],
    editado: true,
  };
  let texto: Paragrafo[] = [
    { id: "p1", texto: "Um.", fontes: [1], editado: false },
    p2,
    { id: "p3", texto: "Três.", fontes: [3], editado: false },
  ];
  let estrutura: Estrutura = {
    falantes: [{ falante: "g1:speaker_0", papel: "autor" }],
    vazios: [],
    mudancasDeAssunto: [],
  };
  const segmentos = [
    seg(1, "g1", "um"),
    seg(2, "g1", "dois"),
    seg(3, "g1", "três"),
    seg(4, "g2", "quatro"),
  ];
  const propostas = new Map<
    string,
    PropostaDoBanco & {
      mudancas: Mudanca[] | null;
      ordem: string[] | null;
      marcacoes: MarcacaoProposta[];
    }
  >();
  const nova = (
    id: string,
    tipo: PropostaDoBanco["tipo"],
    pedido: Record<string, unknown> = {},
  ) =>
    propostas.set(id, {
      id,
      historia: H,
      livro: L,
      tipo,
      estado: "gerando",
      tamanho: "longo",
      pedido,
      gravacoes: tipo === "audio" ? [G2] : [],
      mudancas: null,
      ordem: null,
      marcacoes: [],
    });

  const banco = {
    segmentosDaHistoria: async () => segmentos,
    estrutura: async () => estrutura,
    contexto: async () => ({
      glossario: {
        autor: { nome: "Nelson" },
        sobre: "",
        pessoas: [],
        lugares: [],
      },
      historias: "(nenhuma ainda)",
    }),
    temTranscricao: async () => true,
    gravacaoParaTranscrever: async (g: string) =>
      g === G2 ? { rotulo: "g2" } : null,
    registrarUso: async () => {},
  } as unknown as BancoPipeline;

  const bancoPropostas: BancoPropostas = {
    proposta: async (id) => {
      const p = propostas.get(id);
      return p ? { ...p } : null;
    },
    propostaDeAudio: async () =>
      [...propostas.values()].find(
        (p) => p.tipo === "audio" && p.estado === "gerando",
      )?.id ?? null,
    textoAtual: async () => texto,
    mesclarEstrutura: async (_h, e) => {
      estrutura = {
        ...estrutura,
        falantes: [...estrutura.falantes, ...e.falantes],
      };
    },
    gravar: async (id, r) => {
      const p = propostas.get(id)!;
      if (p.estado !== "gerando") return false;
      Object.assign(p, {
        mudancas: r.mudancas,
        ordem: r.ordem,
        marcacoes: r.marcacoes,
      });
      if (r.pronta) p.estado = "pronta";
      return true;
    },
    mudancas: async (id) => {
      const p = propostas.get(id)!;
      return p.mudancas ? { mudancas: p.mudancas, ordem: p.ordem } : null;
    },
    falhar: async (id) => {
      propostas.get(id)!.estado = "falhou";
      return true;
    },
  };

  const ia = new IAMaliciosa();
  const d = {
    banco,
    propostas: bancoPropostas,
    ia,
    ler,
    transcrever: async () => {
      throw new Error("não deveria transcrever");
    },
    provedor: "elevenlabs",
    modeloTranscricao: "scribe_v1",
    chaveTranscricao: "",
    baixarAudio: async () => new Uint8Array(),
    publicar: async () => {},
    avisarPorEmail: async () => false,
    registrarEvento: async () => {},
  } as unknown as DependenciasPropostas;
  const passos: Passos = { run: (_id, fn) => fn(), sleep: async () => {} };

  /** Aceitar tudo, como a ação do servidor faria. */
  function aceitarTudo(id: string) {
    const p = propostas.get(id)!;
    const proposta: Proposta = {
      id,
      tipo: p.tipo,
      mudancas: p.mudancas!,
      ordem: p.ordem,
      marcacoes: p.marcacoes,
      pedido: p.pedido,
    };
    const r = comporProposta(
      texto,
      [],
      proposta,
      proposta.mudancas.map((m) => m.id),
    );
    texto = r.paragrafos;
    p.estado = "aplicada";
  }
  return {
    p2,
    d,
    ia,
    passos,
    nova,
    propostas,
    aceitarTudo,
    texto: () => texto,
  };
}

describe("o aceite do M6 no pipeline (item 5)", () => {
  it("editar o 2º à mão, acrescentar áudio, mudar o tamanho e aceitar tudo: o 2º continua idêntico", async () => {
    const t = montar();

    t.nova("pa", "audio");
    await proporAudio("pa", t.d, t.passos);
    expect(t.propostas.get("pa")!.estado).toBe("pronta");
    // A troca do travado pedida pela IA foi descartada; só a inserção ficou.
    expect(t.propostas.get("pa")!.mudancas!.map((m) => m.tira.length)).toEqual([
      0,
    ]);
    t.aceitarTudo("pa");
    expect(t.texto().map((x) => x.texto)).toEqual([
      "Um.",
      "Dois, do jeito que o pai contava.",
      "Três.",
      "Quatro, do áudio novo.",
    ]);

    t.nova("pt", "tamanho");
    await proporTamanho("pt", t.d, t.passos);
    t.aceitarTudo("pt");

    const final = t.texto();
    expect(final.find((x) => x.id === "p2")).toEqual(t.p2);
    // A IA "esqueceu" o travado e recontou o conteúdo dele: o travado volta, a repetição sai.
    expect(final.map((x) => x.texto)).toEqual([
      "Um, bem mais longo.",
      "Dois, do jeito que o pai contava.",
      "Três e quatro.",
    ]);
    expect(t.ia.etapas).toEqual([
      "estruturar",
      "integrar",
      "verificar",
      "tamanho",
      "verificar",
    ]);
  });

  it("revisar trecho troca só o trecho e o parágrafo continua travado", async () => {
    const t = montar();
    t.nova("pr", "trecho", {
      paragrafo: "p2",
      inicio: 0,
      fim: 4,
      instrucao: "corrigir",
    });
    await revisarTrecho("pr", t.d);
    t.aceitarTudo("pr");
    expect(t.texto()[1]).toMatchObject({
      texto: "Dois, do jeito que o pai contava.",
      editado: true,
      fontes: [2],
    });
  });

  it("revisar que falha marca a proposta como falhou", async () => {
    const t = montar();
    t.nova("px", "trecho", {
      paragrafo: "p9",
      inicio: 0,
      fim: 2,
      instrucao: "curto",
    });
    await expect(revisarTrecho("px", t.d)).rejects.toThrow();
    expect(t.propostas.get("px")!.estado).toBe("falhou");
  });
});
