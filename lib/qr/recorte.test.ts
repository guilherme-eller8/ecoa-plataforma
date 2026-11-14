import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { caminhoFfmpeg } from "@/lib/audio/ffmpeg";
import { argumentosDoCorte, cortar } from "./cortar";
import {
  FOLGA_S,
  demuxerDoTipo,
  duracaoDosTrechos,
  trechosDaGravacao,
} from "./trechos";

const seg = (id: number, inicio: number, fim: number) => ({ id, inicio, fim });

describe("trechos do recorte", () => {
  const todos = [
    seg(1, 0.5, 4),
    seg(2, 4.2, 9),
    seg(3, 9.1, 10), // de outra história ("não conta isso")
    seg(4, 10.2, 15),
    seg(5, 20, 25),
  ];

  it("gravação inteira (segmentos nulo) = do começo ao fim", () => {
    expect(trechosDaGravacao(null, [], 120)).toEqual([{ inicio: 0, fim: 120 }]);
    expect(trechosDaGravacao(null, [], null)).toEqual([
      { inicio: 0, fim: null },
    ]);
  });

  it("nunca junta por cima de um segmento de fora, por menor que seja", () => {
    const t = trechosDaGravacao([1, 2, 4], todos, 30);
    expect(t).toHaveLength(2);
    expect(t[0].fim!).toBeLessThanOrEqual(9.05); // para antes do segmento 3
    expect(t[1].inicio).toBeGreaterThanOrEqual(10.1); // começa depois dele
  });

  it("folga de até 0,25 s, limitada à metade do espaço até a fala de fora", () => {
    const [a] = trechosDaGravacao([1, 2], todos, 30);
    expect(a.inicio).toBe(0.25); // 0,5 - 0,25 (sem vizinho antes)
    expect(a.fim).toBe(9.05); // metade dos 0,1 s até o segmento 3
    const [, b] = trechosDaGravacao([2, 5], todos, 30);
    expect(b).toEqual({ inicio: 20 - FOLGA_S, fim: 25 + FOLGA_S });
  });

  it("o fim nunca passa da duração do arquivo", () => {
    expect(trechosDaGravacao([5], todos, 25.1)).toEqual([
      { inicio: 19.75, fim: 25.1 },
    ]);
  });

  it("duração somada; sem fim conhecido = null", () => {
    expect(
      duracaoDosTrechos([
        { inicio: 0, fim: 2 },
        { inicio: 5, fim: 6.5 },
      ]),
    ).toBe(3.5);
    expect(duracaoDosTrechos([{ inicio: 0, fim: null }])).toBeNull();
  });

  it("demuxer forçado pelo tipo; tipo estranho = nenhum", () => {
    expect(demuxerDoTipo("audio/mp4")).toBe("mov");
    expect(demuxerDoTipo("audio/webm;codecs=opus")).toBe("matroska");
    expect(demuxerDoTipo("application/vnd.apple.mpegurl")).toBeNull();
    expect(demuxerDoTipo(null)).toBeNull();
  });
});

describe("argumentos do ffmpeg", () => {
  it("cada entrada só lê arquivo local, com demuxer forçado; saída sem metadados", () => {
    const a = argumentosDoCorte(
      [{ arquivo: "/tmp/x", demuxer: "mov", trecho: { inicio: 1, fim: 2 } }],
      "/tmp/y.m4a",
    );
    const i = a.indexOf("-i");
    expect(a.slice(i - 8, i)).toEqual([
      "-protocol_whitelist",
      "file",
      "-f",
      "mov",
      "-ss",
      "1.000",
      "-to",
      "2.000",
    ]);
    for (const x of ["-map_metadata", "-map_chapters"])
      expect(a[a.indexOf(x) + 1]).toBe("-1");
    expect(a).toContain("-vn");
  });
});

describe("recorte de verdade (ffmpeg-static)", () => {
  const pasta = mkdtempSync(join(tmpdir(), "qr-teste-"));
  afterAll(() => rmSync(pasta, { recursive: true, force: true }));
  const ffmpeg = caminhoFfmpeg();

  function audioDeTeste(nome: string) {
    const arq = join(pasta, nome);
    execFileSync(ffmpeg, [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=440:duration=12",
      "-metadata",
      "title=Segredo da ceia",
      "-metadata",
      "location=+19.9-043.9/",
      "-metadata",
      "comment=Gravado no iPhone do André",
      "-c:a",
      "aac",
      "-f",
      "mp4",
      arq,
    ]);
    return arq;
  }

  it("corta só os trechos, sem metadados, com a duração medida", async () => {
    const original = audioDeTeste("original.m4a");
    const saida = join(pasta, "recorte.m4a");
    const dur = await cortar(
      [
        { arquivo: original, demuxer: "mov", trecho: { inicio: 1, fim: 3 } },
        { arquivo: original, demuxer: "mov", trecho: { inicio: 6, fim: 7.5 } },
      ],
      saida,
    );
    expect(dur).toBeGreaterThan(3.3);
    expect(dur).toBeLessThan(3.7);
    const bytes = readFileSync(saida).toString("latin1");
    for (const x of ["Segredo da ceia", "iPhone", "+19.9-043.9"])
      expect(bytes).not.toContain(x);
  }, 60_000);

  it("uma playlist disfarçada de áudio não abre URL nenhuma: falha", async () => {
    const falso = join(pasta, "falso.m4a");
    writeFileSync(
      falso,
      "#EXTM3U\n#EXT-X-TARGETDURATION:1\n#EXTINF:1,\nhttp://169.254.169.254/latest\n#EXT-X-ENDLIST\n",
    );
    await expect(
      cortar(
        [{ arquivo: falso, demuxer: "mov", trecho: { inicio: 0, fim: 1 } }],
        join(pasta, "x.m4a"),
      ),
    ).rejects.toThrow("recorte:ffmpeg_falhou");
  }, 30_000);
});
