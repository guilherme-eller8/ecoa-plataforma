// Rota que o Inngest chama para rodar cada passo (T34). O SDK confere a assinatura de toda
// chamada com INNGEST_SIGNING_KEY; lib/pipeline/env.ts trava INNGEST_DEV na nuvem.
import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/cliente";
import { funcoes } from "@/lib/inngest/funcoes";

// Teto de cada passo (Hobby: 300 s). Com cacheComponents, só maxDuration (sem runtime/dynamic).
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client: inngest, functions: funcoes });
