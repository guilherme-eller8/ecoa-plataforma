import "server-only";
import { clienteAdmin } from "@/lib/supabase/admin";

const UMA_HORA = 60 * 60;

/**
 * URLs assinadas de leitura. Só para caminhos que o servidor já leu do banco (pela sessão ou
 * por uma porta com token): nunca um caminho vindo do navegador.
 */
export async function assinarLeitura(
  bucket: "acervo" | "causos" | "audios" | "qr",
  caminhos: string[],
  validadeS: number = UMA_HORA,
) {
  if (caminhos.length === 0) return new Map<string, string>();
  const { data } = await clienteAdmin()
    .storage.from(bucket)
    .createSignedUrls(caminhos, validadeS);
  return new Map(
    (data ?? [])
      .filter((d) => d.signedUrl && d.path)
      .map((d) => [d.path as string, d.signedUrl]),
  );
}
