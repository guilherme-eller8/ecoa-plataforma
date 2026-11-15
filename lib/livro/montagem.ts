// O livro como o banco o devolve (privado.conteudo_do_livro): a montagem em andamento
// (montagem_conteudo) e a versão congelada (book_exports.conteudo) têm o mesmo formato.
// zod confere na entrada: a fonte é o banco, mas o PDF nunca deve quebrar por um campo estranho.
import { z } from "zod";
import { CAPA_CORES, type CorDaCapa } from "@/lib/config";

const Foto = z.object({
  caminho: z.string(),
  largura: z.number().int().positive().nullable(),
  altura: z.number().int().positive().nullable(),
});
const FotoDaCapa = Foto.extend({
  // Onde a foto "foca" no retângulo da capa, em % da foto (50/50 = centro). Versões antigas não têm.
  foco_x: z.number().int().min(0).max(100).default(50),
  foco_y: z.number().int().min(0).max(100).default(50),
});
const Qr = z.object({ codigo: z.string(), ligado: z.boolean() }).nullable();

export const HistoriaDoLivro = z.object({
  id: z.string().uuid(),
  titulo: z.string().nullable(),
  ano: z.number().int().nullable(),
  revisada: z.boolean(),
  incluida: z.boolean(),
  palavras: z.number().int().nonnegative(),
  paragrafos: z.array(z.string()),
  fotos: z.array(Foto),
  qr: Qr,
});

export const MensagemDoLivro = z.object({
  id: z.string().uuid(),
  nome: z.string(),
  relacao: z.string(),
  incluida: z.boolean(),
  texto: z.string().nullable(),
  foto: z.string().nullable(),
  com_audio: z.boolean(),
  qr: Qr,
});

export const ConteudoDoLivro = z.object({
  livro: z.object({
    titulo: z.string().nullable(),
    subtitulo: z.string().nullable(),
    dedicatoria: z.string().nullable(),
    autor: z.string().nullable(),
    capa_cor: z.string(),
    rev: z.number().int(),
    capa_foto: FotoDaCapa.nullable(),
  }),
  historias: z.array(HistoriaDoLivro),
  mensagens: z.array(MensagemDoLivro),
  hash: z.string().optional(),
});

export type HistoriaDoLivro = z.infer<typeof HistoriaDoLivro>;
export type MensagemDoLivro = z.infer<typeof MensagemDoLivro>;
export type ConteudoDoLivro = z.infer<typeof ConteudoDoLivro>;

export function lerConteudo(json: unknown): ConteudoDoLivro {
  return ConteudoDoLivro.parse(json);
}

/** A cor da capa que a paleta conhece; qualquer outra volta ao padrão. */
export function corDaCapa(chave: string): CorDaCapa {
  return chave in CAPA_CORES ? (chave as CorDaCapa) : "terracota";
}

/** O que entra no papel: só o incluído. */
export function soIncluidas(c: ConteudoDoLivro): ConteudoDoLivro {
  return {
    ...c,
    historias: c.historias.filter((h) => h.incluida),
    mensagens: c.mensagens.filter((m) => m.incluida),
  };
}

/** Parágrafos de uma mensagem: o texto enviado, quebrado nas linhas em branco. */
export function paragrafosDaMensagem(texto: string | null): string[] {
  return (texto ?? "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Esta história ou mensagem vai com QR impresso (só o que toca, Q10)? */
export function saiComQr(x: { qr: { ligado: boolean } | null }): boolean {
  return x.qr != null && x.qr.ligado;
}
