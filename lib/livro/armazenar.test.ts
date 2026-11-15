// A geração dos PDFs nunca deixa texto da família chegar ao Inngest nem ao banco de eventos (T36).
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, eventos } = vi.hoisted(() => ({
  rpc: vi.fn(),
  eventos: vi.fn(async (..._args: unknown[]) => ({ ok: true })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  clienteAdmin: () => ({
    rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { book_id: "b", versao: 3 } }),
        }),
      }),
    }),
    storage: {
      from: () => ({
        list: async () => ({ data: [] }),
        remove: async () => ({}),
      }),
    },
  }),
}));
vi.mock("@/lib/eventos", () => ({ registrarEvento: eventos }));

import { ErroLivro, paraFila } from "./erros";
import { marcarFalha } from "./armazenar";

beforeEach(() => {
  rpc.mockReset();
  eventos.mockClear();
});

describe("erros que saem da geração", () => {
  it("o Inngest só recebe o código fixo", () => {
    expect(paraFila(new ErroLivro("falhou_typst")).message).toBe(
      "falhou_typst",
    );
    expect(
      paraFila(new Error("erro do Typst citando o texto SECRETO da família"))
        .message,
    ).toBe("falhou_montar");
  });

  it("marcarFalha grava só um código no formato do banco, nunca a mensagem", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await marcarFalha("id", "Typst falhou em: TEXTO SECRETO da família");
    expect(rpc).toHaveBeenCalledWith("servico_export_falhou", {
      p_id: "id",
      p_erro: "falhou_montar",
    });
    await marcarFalha("id", "qr_nao_conferido");
    expect(rpc).toHaveBeenLastCalledWith("servico_export_falhou", {
      p_id: "id",
      p_erro: "qr_nao_conferido",
    });
    expect(JSON.stringify(eventos.mock.calls)).not.toContain("SECRETO");
  });

  it("versão que já não está 'gerando' não gera evento", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    await marcarFalha("id", "falhou_typst");
    expect(eventos).not.toHaveBeenCalled();
  });
});
