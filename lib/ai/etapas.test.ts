import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { leitorDeDiretorio } from "./carregar-prompt";
import type { ChamadaIA, ClienteIA, RespostaIA } from "./claude";
import { completarFalantes, estruturar } from "./etapas";
import type { Segmento } from "./schemas";

const ler = leitorDeDiretorio(join(process.cwd(), "lib/ai/prompts"));
const segmentos: Segmento[] = [
  {
    id: 1,
    arquivo: "g1",
    inicio: 0,
    fim: 2,
    falante: "g1:speaker_0",
    texto: "Tá gravando?",
  },
  {
    id: 2,
    arquivo: "g1",
    inicio: 2,
    fim: 9,
    falante: "g1:speaker_1",
    texto: "Eu nasci em Cachoeiro.",
  },
];

/** Cliente que devolve sempre a mesma resposta e aplica a validação, como o real. */
function clienteCom(dados: unknown): ClienteIA {
  return {
    async gerar<T>(c: ChamadaIA<T>): Promise<RespostaIA<T>> {
      const parsed = c.schema.parse(dados);
      const invalido = c.validar?.(parsed);
      if (invalido) throw new Error(invalido);
      return {
        dados: parsed,
        uso: { entrada: 0, saida: 0, cacheLido: 0, cacheGravado: 0 },
        ms: 1,
        msPrimeiraPalavra: null,
        idRequisicao: null,
        tentativas: 1,
      };
    },
  };
}

describe("estruturar", () => {
  it("descarta falante e ids inventados, sem derrubar a história", async () => {
    const r = await estruturar(
      clienteCom({
        falantes: [
          { falante: "g1:speaker_1", papel: "autor" },
          { falante: "5ab0e24b-…:speaker_0", papel: "entrevistador" },
        ],
        vazios: [1, 7],
        mudancasDeAssunto: [9],
      }),
      ler,
      "g1",
      segmentos,
    );
    // Prompt 7: quem ficou sem papel entra como "outro" (a edição nunca vê falante sem papel).
    expect(r.dados).toEqual({
      falantes: [
        { falante: "g1:speaker_0", papel: "outro" },
        { falante: "g1:speaker_1", papel: "autor" },
      ],
      vazios: [1],
      mudancasDeAssunto: [],
    });
  });

  it("com várias gravações, o falante esquecido herda o papel do mesmo speaker", () => {
    expect(
      completarFalantes(
        [{ falante: "g1:speaker_0", papel: "autor" }],
        ["g1:speaker_0", "g2:speaker_0", "g2:speaker_1"],
      ),
    ).toEqual([
      { falante: "g1:speaker_0", papel: "autor" },
      { falante: "g2:speaker_0", papel: "autor" },
      { falante: "g2:speaker_1", papel: "outro" },
    ]);
  });

  it("recusa só quando nenhum falante bate", async () => {
    await expect(
      estruturar(
        clienteCom({
          falantes: [{ falante: "speaker_0", papel: "autor" }],
          vazios: [],
          mudancasDeAssunto: [],
        }),
        ler,
        "g1",
        segmentos,
      ),
    ).rejects.toThrow("nenhum falante conhecido");
  });
});
