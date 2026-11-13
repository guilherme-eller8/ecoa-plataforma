import { describe, expect, it } from "vitest";
import type { Marcacao } from "@/lib/ai/schemas";
import {
  doDocumento,
  lerAno,
  normalizarTexto,
  paraDocumento,
  paraSalvar,
  type DocTiptap,
} from "./conteudo";
import {
  fraseEm,
  minutos,
  segmentoDaFrase,
  type SegmentoDaTela,
} from "./ouvir";

const daIA = {
  titulo: "A viagem",
  paragrafos: [
    { texto: "Saímos de Guarapari cedo. O ônibus quebrou.", fontes: [1, 2] },
    { texto: "Dormi demais e perdi a praia.", fontes: [3] },
  ],
  lacunas: [{ pergunta: "Quem foi?", motivo: "x" }],
};

const grifo: Marcacao = {
  paragrafo: 1,
  inicio: 10,
  fim: 24,
  trecho: "Guarapari cedo",
  tipo: "lugar",
  origem: "verificador",
  motivo: "Confira o lugar.",
};

describe("normalizarTexto", () => {
  it("dá id por posição à versão da IA e marca nada como editado", () => {
    const t = normalizarTexto(daIA);
    expect(t.paragrafos.map((p) => [p.id, p.editado])).toEqual([
      ["p1", false],
      ["p2", false],
    ]);
    expect(t.ano).toBeNull();
    expect(t.lacunas).toHaveLength(1);
  });

  it("troca id repetido ou inválido e nunca devolve zero parágrafos", () => {
    const t = normalizarTexto({
      titulo: "x",
      paragrafos: [
        { id: "a", texto: "1", fontes: [] },
        { id: "a", texto: "2", fontes: [] },
        { id: "X!", texto: "3", fontes: ["1", 2] },
      ],
    });
    expect(new Set(t.paragrafos.map((p) => p.id)).size).toBe(3);
    expect(t.paragrafos[2].fontes).toEqual([2]);
    expect(normalizarTexto(null).paragrafos).toHaveLength(1);
  });
});

describe("ida e volta com o documento do Tiptap", () => {
  const texto = normalizarTexto(daIA);
  const originais = new Map(texto.paragrafos.map((p) => [p.id, p.texto]));

  it("sem mudança, volta igual, com o grifo no mesmo lugar", () => {
    const doc = paraDocumento(texto, [grifo]);
    const volta = doDocumento(doc, texto, originais);
    expect(volta.texto.paragrafos).toEqual(texto.paragrafos);
    expect(volta.marcacoes).toEqual([grifo]);
  });

  it("parágrafo mudado fica editado; grifo do 2º parágrafo anda com ele", () => {
    const doc = paraDocumento(texto, [
      { ...grifo, paragrafo: 2, inicio: 0, fim: 4, trecho: "Dorm" },
    ]);
    doc.content[0].content = [{ type: "text", text: "Saímos cedo." }];
    const volta = doDocumento(doc, texto, originais);
    expect(volta.texto.paragrafos.map((p) => p.editado)).toEqual([true, false]);
    expect(volta.marcacoes[0]).toMatchObject({
      paragrafo: 2,
      inicio: 0,
      fim: 4,
    });
  });

  it("Enter divide: as duas metades ficam editadas e a nova ganha id novo com as fontes", () => {
    const doc = paraDocumento(texto, []);
    const [a] = doc.content;
    doc.content = [
      { ...a, content: [{ type: "text", text: "Saímos de Guarapari cedo." }] },
      {
        ...a,
        attrs: { ...a.attrs, pid: null },
        content: [{ type: "text", text: "O ônibus quebrou." }],
      },
      doc.content[1],
    ];
    const volta = doDocumento(doc, texto, originais);
    const [p1, p2] = volta.texto.paragrafos;
    expect(p1.id).toBe("p1");
    expect(p2.id).not.toBe("p1");
    expect(p2.fontes).toEqual([1, 2]);
    expect([p1.editado, p2.editado]).toEqual([true, true]);
  });

  it("tira parágrafos vazios e junta pedaços do mesmo grifo", () => {
    const doc: DocTiptap = {
      type: "doc",
      content: [
        { type: "paragraph", attrs: { pid: "p1", fontes: [1] }, content: [] },
        {
          type: "paragraph",
          attrs: { pid: "p2", fontes: [3] },
          content: [
            {
              type: "text",
              text: "Dor",
              marks: [
                {
                  type: "confira",
                  attrs: {
                    id: "c1",
                    tipo: "fato",
                    origem: "verificador",
                    motivo: "m",
                    trecho: "Dormi",
                  },
                },
              ],
            },
            {
              type: "text",
              text: "mi",
              marks: [
                {
                  type: "confira",
                  attrs: {
                    id: "c1",
                    tipo: "fato",
                    origem: "verificador",
                    motivo: "m",
                    trecho: "Dormi",
                  },
                },
              ],
            },
            { type: "text", text: " demais e perdi a praia." },
          ],
        },
      ],
    };
    const volta = doDocumento(doc, texto, originais);
    expect(volta.texto.paragrafos).toHaveLength(1);
    expect(volta.marcacoes).toEqual([
      {
        paragrafo: 1,
        inicio: 0,
        fim: 5,
        trecho: "Dormi",
        tipo: "fato",
        origem: "verificador",
        motivo: "m",
      },
    ]);
  });

  it("paraSalvar tira o ano vazio e corta o título", () => {
    expect(
      paraSalvar({ ...texto, titulo: " x ".repeat(100) }).titulo.length,
    ).toBe(200);
    expect("ano" in paraSalvar(texto)).toBe(false);
    expect(paraSalvar({ ...texto, ano: 1962 }).ano).toBe(1962);
  });
});

describe("lerAno", () => {
  it.each([
    ["", null],
    ["1962", 1962],
    ["62", "invalido"],
    ["1700", "invalido"],
    ["19a2", "invalido"],
  ])("%s → %s", (v, r) => expect(lerAno(v)).toBe(r));
});

describe("frase → trecho do áudio", () => {
  const segs = new Map<number, SegmentoDaTela>(
    [
      { id: 1, texto: "a gente saiu de guarapari bem cedinho" },
      { id: 2, texto: "aí o ônibus quebrou na estrada" },
      { id: 3, texto: "eu dormi demais" },
    ].map((s) => [
      s.id,
      {
        ...s,
        gravacao: "g",
        inicio: s.id * 10,
        fim: s.id * 10 + 8,
        falante: "Jair",
      },
    ]),
  );

  it("acha a frase pela posição do cursor", () => {
    const t = "Saímos de Guarapari cedo. O ônibus quebrou. Fim";
    expect(fraseEm(t, 3).texto).toBe("Saímos de Guarapari cedo.");
    expect(fraseEm(t, 30).texto).toBe("O ônibus quebrou.");
    expect(fraseEm(t, t.length).texto).toBe("Fim");
  });

  it("toca o segmento com mais palavras em comum; sem nada, o 1º do parágrafo", () => {
    expect(segmentoDaFrase("O ônibus quebrou.", [1, 2], segs)?.id).toBe(2);
    expect(segmentoDaFrase("Saímos de Guarapari cedo.", [1, 2], segs)?.id).toBe(
      1,
    );
    expect(segmentoDaFrase("Que dia.", [2, 1], segs)?.id).toBe(2);
    expect(segmentoDaFrase("x", [9], segs)).toBeNull();
  });

  it("minutos", () => {
    expect(minutos(187.6)).toBe("3:07");
  });
});
