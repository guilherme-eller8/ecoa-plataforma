import { desligarResumo } from "@/lib/resumo/sair";

// List-Unsubscribe-Post (RFC 8058): o provedor de e-mail manda POST com
// "List-Unsubscribe=One-Click". Só desliga o resumo daquele membro.
export async function POST(
  _req: Request,
  { params }: RouteContext<"/resumo/sair/[membro]/[token]/um-clique">,
) {
  const { membro, token } = await params;
  const ok = await desligarResumo(membro, token);
  return new Response(null, {
    status: ok ? 200 : 404,
    headers: { "Cache-Control": "no-store" },
  });
}
