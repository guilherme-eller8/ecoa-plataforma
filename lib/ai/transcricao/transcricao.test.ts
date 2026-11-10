import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizarAssembly, transcreverAssembly } from "./assemblyai";
import { normalizarScribe, transcreverScribe } from "./elevenlabs";

const fixture = (n: string) =>
  JSON.parse(
    readFileSync(join(__dirname, "__fixtures__", `${n}.json`), "utf8"),
  );
const opcoes = { chave: "x", modelo: "m", dicas: ["Nelson"], esperarMs: 0 };

describe("Scribe", () => {
  it("normaliza só palavras, com falante e confiança", () => {
    const p = normalizarScribe(fixture("elevenlabs"));
    expect(p.map((x) => x.texto)).toEqual(["Pai,", "conta", "Eu", "peguei"]);
    expect(p[0]).toMatchObject({ inicio: 0.1, fim: 0.4, falante: "speaker_1" });
    expect(p[0].confianca).toBeCloseTo(Math.exp(-0.05));
  });

  it("chama a API com chave e devolve o bruto", async () => {
    const chamadas: string[] = [];
    const f = (async (url: string, init: RequestInit) => {
      chamadas.push(`${url} ${JSON.stringify(init.headers)}`);
      return new Response(JSON.stringify(fixture("elevenlabs")));
    }) as unknown as typeof fetch;
    const t = await transcreverScribe(new Uint8Array([1]), "a.flac", {
      ...opcoes,
      fetch: f,
    });
    expect(chamadas[0]).toContain("speech-to-text");
    expect(chamadas[0]).toContain("xi-api-key");
    expect(t.palavras).toHaveLength(4);
  });

  it("explica o erro do provedor", async () => {
    const f = (async () =>
      new Response("quota", { status: 429 })) as unknown as typeof fetch;
    await expect(
      transcreverScribe(new Uint8Array(), "a", { ...opcoes, fetch: f }),
    ).rejects.toThrow(/429/);
  });
});

describe("AssemblyAI", () => {
  it("converte milissegundos em segundos", () => {
    const p = normalizarAssembly(fixture("assemblyai"));
    expect(p[0]).toMatchObject({
      texto: "Pai,",
      inicio: 0.1,
      fim: 0.4,
      falante: "B",
      confianca: 0.95,
    });
  });

  it("faz upload, cria e consulta até completar", async () => {
    let consultas = 0;
    const f = (async (url: string) => {
      if (url.endsWith("/upload"))
        return new Response(JSON.stringify({ upload_url: "u" }));
      if (url.endsWith("/transcript"))
        return new Response(JSON.stringify({ id: "abc" }));
      consultas++;
      return new Response(
        JSON.stringify(
          consultas < 2 ? { status: "processing" } : fixture("assemblyai"),
        ),
      );
    }) as unknown as typeof fetch;
    const t = await transcreverAssembly(new Uint8Array([1]), "a", {
      ...opcoes,
      fetch: f,
    });
    expect(consultas).toBe(2);
    expect(t.palavras).toHaveLength(3);
  });
});
