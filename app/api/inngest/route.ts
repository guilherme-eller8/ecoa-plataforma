// Rota que o Inngest chama para rodar cada passo (T34). O SDK confere a assinatura de toda
// chamada com INNGEST_SIGNING_KEY; lib/pipeline/env.ts trava INNGEST_DEV na nuvem.
// Preview da Vercel responde 404 (lib/inngest/ambiente.ts): nunca vira o app de produção.
import { serve } from "inngest/next";
import { inngestAtendeAqui } from "@/lib/inngest/ambiente";
import { inngest } from "@/lib/inngest/cliente";
import { funcoes } from "@/lib/inngest/funcoes";

// Teto de cada passo (Hobby: 300 s). Com cacheComponents, só maxDuration (sem runtime/dynamic).
export const maxDuration = 300;

const rota = serve({
  client: inngest,
  functions: funcoes,
});

function soForaDoPreview<A extends unknown[]>(
  atender: (...args: A) => Promise<Response>,
) {
  return async (...args: A): Promise<Response> =>
    inngestAtendeAqui(process.env)
      ? atender(...args)
      : new Response(null, { status: 404 });
}

export const GET = soForaDoPreview(rota.GET);
export const POST = soForaDoPreview(rota.POST);
export const PUT = soForaDoPreview(rota.PUT);
