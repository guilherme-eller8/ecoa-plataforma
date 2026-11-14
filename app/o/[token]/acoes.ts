"use server";

// O primeiro Ouvir da página conta 1 vez por link, rede e hora (hipótese 2). Sem login.
import { headers } from "next/headers";
import { registrarTocouCompartilhada } from "@/lib/compartilhar/servidor";

export async function tocou(token: string): Promise<void> {
  await registrarTocouCompartilhada(token, await headers());
}
