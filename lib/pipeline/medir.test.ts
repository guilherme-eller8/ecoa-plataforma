import { describe, expect, it } from "vitest";
import { argumentosDaMedida, duracaoDoProgresso } from "./medir";

describe("medir a duração (T56)", () => {
  it("só arquivo local, demuxer forçado, sem decodificar", () => {
    const a = argumentosDaMedida("/tmp/x", "matroska");
    expect(a.join(" ")).toContain(
      "-protocol_whitelist file -f matroska -i /tmp/x",
    );
    expect(a.join(" ")).toContain("-c copy");
  });
  it("lê o último out_time_us; sem ele, null", () => {
    expect(
      duracaoDoProgresso("out_time_us=1000000\nout_time_us=65500000\n"),
    ).toBe(65.5);
    expect(duracaoDoProgresso("out_time_us=N/A\n")).toBeNull();
    expect(duracaoDoProgresso("")).toBeNull();
  });
});
