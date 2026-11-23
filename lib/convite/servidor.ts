import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { hashDoToken } from "@/lib/links";
import { tokenValido } from "@/lib/links-formato";
import { clienteAdmin } from "@/lib/supabase/admin";
import type { DadosDoConvite } from "./estado";
import { nomeSeguro, primeiroNome } from "./textos";

export type ConviteLido = DadosDoConvite;

const hex = (v: string) => createHash("sha256").update(v, "utf8").digest("hex");

/** Cookie do aparelho que definiu o e-mail (P81). Só o hash vai para o banco. */
export const nomeDoCookieDeDono = (conviteId: string) =>
  `ecoa_convite_${conviteId}`;

/** Hash do cookie de dono deste aparelho, se houver. */
export async function donoDesteAparelho(
  conviteId: string,
): Promise<string | null> {
  const v = (await cookies()).get(nomeDoCookieDeDono(conviteId))?.value;
  return v && /^[0-9a-f]{32}$/.test(v) ? hex(v) : null;
}

/** Sorteia o dono (128 bits) e grava o cookie. Devolve o hash para o banco. */
export async function novoDono(
  conviteId: string,
  expiraEm: Date,
): Promise<{ hash: string; gravar: () => Promise<void> }> {
  const valor = randomBytes(16).toString("hex");
  return {
    hash: hex(valor),
    gravar: async () => {
      (await cookies()).set(nomeDoCookieDeDono(conviteId), valor, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/convite",
        expires: expiraEm,
      });
    },
  };
}

type Linha = {
  convite_id: string;
  book_id: string;
  email: string | null;
  nome: string | null;
  autor: string | null;
  criado_por: string | null;
  estado: string;
  trocas_restantes: number;
  e_dono: boolean;
};

async function lerLinha(
  hash: string,
  dono: string | null,
): Promise<Linha | null> {
  const { data } = await clienteAdmin().rpc("servico_ler_convite", {
    p_token_hash: hash,
    p_dono_hash: dono,
  });
  return data?.[0] ?? null;
}

/**
 * O que /convite/{token} mostra. Aceito, cancelado, vencido e inexistente são iguais.
 * O dono só é conferido quando este aparelho tem o cookie do convite.
 */
export async function lerConvite(token: string): Promise<ConviteLido> {
  if (!tokenValido.safeParse(token).success) return { estado: "invalido" };
  const hash = hashDoToken(token);
  let c = await lerLinha(hash, null);
  if (!c || c.estado !== "pendente") return { estado: "invalido" };
  const dono = await donoDesteAparelho(c.convite_id);
  if (dono) c = (await lerLinha(hash, dono)) ?? c;

  return {
    estado: "pendente",
    conviteId: c.convite_id,
    livroId: c.book_id,
    autor: nomeSeguro(c.autor) || "alguém da família",
    quem: await quemConvidou(c.criado_por),
    nome: c.nome ? nomeSeguro(c.nome) || c.nome : null,
    email: c.email,
    trocasRestantes: c.trocas_restantes,
    eDono: c.e_dono,
  };
}

/** Primeiro nome de quem convidou, saneado, ou null. */
export async function quemConvidou(
  criadoPor: string | null,
): Promise<string | null> {
  if (!criadoPor) return null;
  const { data: u } = await clienteAdmin().auth.admin.getUserById(criadoPor);
  const meta = u.user?.user_metadata as Record<string, unknown> | undefined;
  return primeiroNome(String(meta?.full_name ?? meta?.name ?? "") || null);
}

/** Validade do convite, para o cookie de dono. */
export async function expiraDoConvite(conviteId: string): Promise<Date> {
  const { data } = await clienteAdmin()
    .from("book_invites")
    .select("expira_em")
    .eq("id", conviteId)
    .maybeSingle();
  return data ? new Date(data.expira_em) : new Date(Date.now() + 86_400_000);
}
