import type { Instrumentation } from "next";

// Prompt 15: erro do servidor vira linha em events (acao `erro_servidor`) para o admin contar
// por rota. O Vercel já guarda o log completo; aqui fica só o que não vaza nada.
export const onRequestError: Instrumentation.onRequestError = async (
  erro,
  _request,
  contexto,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { rotaSegura, digestSeguro, tipoDoErro, limitador } =
      await import("@/lib/erros-servidor-registro");
    const rota = rotaSegura(contexto.routePath);
    if (!limitador(rota)) return;
    const { registrarEvento } = await import("@/lib/eventos");
    await registrarEvento({
      quem: null,
      papel: "sistema",
      acao: "erro_servidor",
      livro: null,
      detalhes: {
        rota,
        tipo: tipoDoErro(erro),
        digest: digestSeguro(erro),
        origem: contexto.routeType,
      },
    });
  } catch {
    // Registrar o erro nunca pode causar outro.
  }
};
