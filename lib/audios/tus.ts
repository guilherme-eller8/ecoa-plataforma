// Upload retomável (TUS) direto ao Supabase Storage, com o token assinado pelo servidor no
// cabeçalho x-signature: o navegador só consegue gravar naquele caminho. Se a internet cai,
// o cliente tenta de novo sozinho; se a página recarrega e o mesmo arquivo é escolhido,
// continua de onde parou (a impressão digital fica no localStorage).
import * as tus from "tus-js-client";
import { envPublico } from "@/lib/env-publico";
import type { AudioPreparado } from "@/lib/livro/tipos";

const PEDACO = 6 * 1024 * 1024; // o Supabase exige 6 MB
const ESPERAS = [0, 3000, 5000, 10000, 20000, 60000];

/**
 * https://ref.supabase.co → https://ref.storage.supabase.co/storage/v1/upload/resumable/sign
 * Com token assinado (x-signature) o endpoint é o /sign; o /upload/resumable comum ignora o
 * token e trata o envio como anônimo (403 da RLS de storage.objects).
 */
export function endpointTus(urlSupabase: string) {
  const u = new URL(urlSupabase);
  const host = u.hostname.endsWith(".supabase.co")
    ? u.hostname.replace(/\.supabase\.co$/, ".storage.supabase.co")
    : u.host;
  return `${u.protocol}//${host}/storage/v1/upload/resumable/sign`;
}

export type EnviarArquivo = (
  arquivo: File,
  preparado: AudioPreparado,
  aoProgresso: (fracao: number) => void,
) => Promise<void>;

export const enviarPorTus: EnviarArquivo = (arquivo, p, aoProgresso) => {
  const env = envPublico();
  return new Promise((resolve, reject) => {
    const upload = new tus.Upload(arquivo, {
      endpoint: endpointTus(env.NEXT_PUBLIC_SUPABASE_URL),
      retryDelays: ESPERAS,
      chunkSize: PEDACO,
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        "x-signature": p.token,
        "x-upsert": "true",
      },
      metadata: {
        bucketName: "audios",
        objectName: p.caminho,
        contentType: p.contentType,
        cacheControl: "3600",
      },
      onProgress: (enviados, total) =>
        aoProgresso(total ? enviados / total : 0),
      onError: reject,
      onSuccess: () => resolve(),
    });
    upload
      .findPreviousUploads()
      .then((anteriores) => {
        if (anteriores.length) upload.resumeFromPreviousUpload(anteriores[0]);
        upload.start();
      })
      .catch(reject);
  });
};
