import "server-only";
import { tipoPelosBytes, type TipoPorBytes } from "@/lib/mensagens/bytes";
import { clienteAdmin } from "@/lib/supabase/admin";

// Upload por URL assinada só para um caminho que o banco fixou (T27), e a conferência do que
// chegou antes de confirmar: tamanho e primeiros bytes (o tipo de verdade). Arquivo recusado é
// apagado na hora. Usado pelo causo (/f) e pela mensagem (/m).

type BucketDeUpload = "causos" | "mensagens";

export async function assinarUpload(bucket: BucketDeUpload, caminho: string) {
  const { data } = await clienteAdmin()
    .storage.from(bucket)
    .createSignedUploadUrl(caminho);
  return data ? { caminho, token: data.token } : null;
}

export type Conferencia = "ok" | "nao_chegou" | "grande" | "tipo_errado";

export async function conferirArquivo(
  bucket: BucketDeUpload,
  caminho: string,
  { maxBytes, tipo }: { maxBytes: number; tipo: TipoPorBytes },
): Promise<Conferencia> {
  const armazem = clienteAdmin().storage.from(bucket);
  const { data } = await armazem.download(caminho);
  if (!data) return "nao_chegou";
  let motivo: Conferencia = "ok";
  if (data.size > maxBytes) motivo = "grande";
  else {
    const cabeca = new Uint8Array(await data.slice(0, 16).arrayBuffer());
    if (tipoPelosBytes(cabeca) !== tipo) motivo = "tipo_errado";
  }
  if (motivo !== "ok") await armazem.remove([caminho]);
  return motivo;
}

/** Baixa o arquivo inteiro (a mensagem tem até 4 MB). */
export async function baixar(bucket: BucketDeUpload, caminho: string) {
  const { data } = await clienteAdmin().storage.from(bucket).download(caminho);
  return data ? new Uint8Array(await data.arrayBuffer()) : null;
}
