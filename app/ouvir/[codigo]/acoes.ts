"use server";

// O primeiro "Ouvir" da página conta 1 vez por código, rede e hora (P57). Sem login.
import { headers } from "next/headers";
import { codigoValido } from "@/lib/qr/codigo";
import { registrarTocou } from "@/lib/qr/player";

export async function tocou(codigo: string): Promise<void> {
  if (!codigoValido(codigo)) return;
  await registrarTocou(codigo, await headers());
}
