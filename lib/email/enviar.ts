import "server-only";
import { Resend } from "resend";
import { EMAIL_REMETENTE } from "@/lib/config";
import { envServidor } from "@/lib/env-servidor";
import type { Email } from "./modelos";

/** Envia pelo Resend. Nunca lança: devolve ok=false e loga sem o endereço. */
export async function enviarEmail(
  para: string,
  email: Email,
): Promise<{ ok: boolean }> {
  try {
    const resend = new Resend(envServidor().RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: EMAIL_REMETENTE,
      to: para,
      subject: email.assunto,
      html: email.html,
      text: email.texto,
    });
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
