import "server-only";
import { Resend } from "resend";
import { EMAIL_REMETENTE } from "@/lib/config";
import { envServidor } from "@/lib/env-servidor";
import { ehRepeticao } from "./repeticao";
import type { Email } from "./modelos";

/**
 * Envia pelo Resend. Nunca lança: devolve ok=false e loga sem o endereço. Com chave de
 * idempotência, o Resend recusa a mesma chave com outro texto (o alerta de 19% depois do de
 * 18%): é a regra "1 por condição e dia" funcionando, então volta ok com `repetido`, sem log.
 */
export async function enviarEmail(
  para: string,
  email: Email,
  opcoes: { idempotencyKey?: string } = {},
): Promise<{ ok: boolean; repetido?: boolean }> {
  try {
    const resend = new Resend(envServidor().RESEND_API_KEY);
    const { error } = await resend.emails.send(
      {
        from: EMAIL_REMETENTE,
        to: para,
        subject: email.assunto,
        html: email.html,
        text: email.texto,
        headers: email.cabecalhos,
      },
      opcoes.idempotencyKey
        ? { idempotencyKey: opcoes.idempotencyKey }
        : undefined,
    );
    if (error && opcoes.idempotencyKey && ehRepeticao(error.name))
      return { ok: true, repetido: true };
    if (error) throw new Error(error.message);
    return { ok: true };
  } catch (e) {
    console.error("[email] falha no envio", {
      assunto: email.assunto,
      erro: (e as Error).message,
    });
    return { ok: false };
  }
}
