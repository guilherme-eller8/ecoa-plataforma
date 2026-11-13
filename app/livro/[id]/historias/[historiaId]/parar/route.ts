// Saiu da tela do editor (fechou a guia, trocou de app): o navegador avisa com sendBeacon,
// que leva os cookies da sessão. Guarda a sessão como versão e solta a trava (prompt 8).
// Sem efeito para quem não é a tela dona da trava: a função do banco confere usuário e aba.
import { pararDeEditar } from "@/app/livro/[id]/historias/editor-acoes";

export async function POST(
  pedido: Request,
  { params }: RouteContext<"/livro/[id]/historias/[historiaId]/parar">,
) {
  const { id, historiaId } = await params;
  const aba = (await pedido.text()).trim().slice(0, 64);
  await pararDeEditar(id, historiaId, aba);
  return new Response(null, { status: 204 });
}
