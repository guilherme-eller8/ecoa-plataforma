import "server-only";
// Resumo semanal (P63): só ids e números saem dos passos (T36). E-mail e apelido ficam aqui.
import { nomeDoAutor } from "@/lib/livro/acesso";
import { emailResumo } from "@/lib/email/modelos";
import { enviarEmail } from "@/lib/email/enviar";
import { urlDoApp } from "@/lib/env-servidor";
import { urlSairDoResumo } from "@/lib/links";
import { clienteAdmin } from "@/lib/supabase/admin";

export type NumerosDoResumo = {
  historiasNovas: number;
  perguntasEsperando: number;
  paginasEstimadas: number;
};

export async function livrosParaResumo(): Promise<string[]> {
  const { data, error } = await clienteAdmin().rpc(
    "servico_livros_para_resumo",
  );
  if (error) throw new Error("resumo:livros");
  return data ?? [];
}

export async function numerosDoResumo(livro: string): Promise<NumerosDoResumo> {
  const { data, error } = await clienteAdmin().rpc("servico_resumo_semanal", {
    p_livro: livro,
  });
  if (error || !data?.[0]) throw new Error("resumo:numeros");
  const r = data[0];
  return {
    historiasNovas: r.historias_novas,
    perguntasEsperando: r.perguntas_esperando,
    paginasEstimadas: r.paginas_estimadas,
  };
}

/** Só se houver algo: história que ficou pronta na semana ou pergunta esperando. */
export function temAlgo(n: NumerosDoResumo): boolean {
  return n.historiasNovas > 0 || n.perguntasEsperando > 0;
}

export async function membrosParaResumo(
  livro: string,
): Promise<{ membro: string; usuario: string }[]> {
  const { data, error } = await clienteAdmin().rpc(
    "servico_membros_para_resumo",
    { p_livro: livro },
  );
  if (error) throw new Error("resumo:membros");
  return (data ?? []).map((m) => ({ membro: m.membro_id, usuario: m.user_id }));
}

/** Um membro: busca e-mail e apelido, monta e envia. Devolve só se saiu. */
export async function enviarResumoAoMembro(
  livro: string,
  membro: { membro: string; usuario: string },
  numeros: NumerosDoResumo,
  chave: string,
): Promise<boolean> {
  const db = clienteAdmin();
  const [{ data: u }, { data: b }] = await Promise.all([
    db.auth.admin.getUserById(membro.usuario),
    db
      .from("books")
      .select("autor_nome, autor_apelido")
      .eq("id", livro)
      .maybeSingle(),
  ]);
  const email = u.user?.email;
  if (!email || !b) return false;
  const r = await enviarEmail(
    email,
    emailResumo({
      apelido: nomeDoAutor(b),
      ...numeros,
      urlLivro: `${urlDoApp()}/livro/${livro}`,
      urlSair: urlSairDoResumo(membro.membro),
    }),
    { idempotencyKey: chave },
  );
  if (!r.ok) throw new Error("resumo:email"); // o Inngest tenta de novo só este membro
  return true;
}
