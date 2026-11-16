// Rota que o Inngest chama para rodar cada passo (T34). O SDK confere a assinatura de toda
// chamada com INNGEST_SIGNING_KEY; lib/pipeline/env.ts trava INNGEST_DEV na nuvem.
// T56: na prévia a rota responde 404. O Inngest não consegue sincronizar com a URL da prévia
// e os jobs de produção nunca rodam código de branch.
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/cliente";
import { funcoes } from "@/lib/inngest/funcoes";
import { servirInngest } from "@/lib/pipeline/env";

// Teto de cada passo (Hobby: 300 s). Com cacheComponents, só maxDuration (sem runtime/dynamic).
export const maxDuration = 300;

const rota = serve({ client: inngest, functions: funcoes });

type Args = Parameters<typeof rota.GET>;
const fora = () => new Response(null, { status: 404 });

export const GET = (...a: Args) => (servirInngest() ? rota.GET(...a) : fora());
export const POST = (...a: Args) =>
  servirInngest() ? rota.POST(...a) : fora();
export const PUT = (...a: Args) => (servirInngest() ? rota.PUT(...a) : fora());
