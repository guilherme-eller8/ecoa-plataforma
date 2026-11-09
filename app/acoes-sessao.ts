"use server";

import { redirect } from "next/navigation";
import { clienteSessao } from "@/lib/supabase/servidor";

export async function sair() {
  const supabase = await clienteSessao();
  await supabase.auth.signOut();
  redirect("/entrar");
}
