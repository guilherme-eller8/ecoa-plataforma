import type { Parentesco } from "@/lib/supabase/tipos";

// Mensagens prontas para o WhatsApp do responsável. Sem API: o botão abre o wa.me e a
// pessoa escolhe o contato ou o grupo.

/** Com o celular, abre a conversa com a pessoa; sem ele, o WhatsApp pede o contato. */
export function linkWhatsApp(texto: string, celular?: string | null): string {
  const numero = celular?.replace(/\D/g, "") ?? "";
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
}

/** Quebra o texto em trechos de texto e de link, para a tela mostrar o link clicável. */
export function partesComLinks(
  texto: string,
): { texto: string; link: boolean }[] {
  return texto
    .split(/(https?:\/\/[^\s]+)/g)
    .filter((t) => t !== "")
    .map((t) => ({ texto: t, link: /^https?:\/\//.test(t) }));
}

export function conviteDoGrupo({
  autor,
  link,
}: {
  autor: string;
  link: string;
}) {
  return [
    `Estamos fazendo o livro de memórias do ${autor}.`,
    `Por este link você vota nas perguntas e sugere um causo para ele contar:`,
    link,
    `Fixe esta mensagem no grupo. O link vale até o livro ficar pronto.`,
  ].join("\n\n");
}

export function mensagemAoAutor({
  autor,
  link,
}: {
  autor: string;
  link: string;
}) {
  return [
    `${autor}, estamos fazendo o livro das suas histórias.`,
    `Neste link estão as perguntas para você. É só tocar e gravar falando, como numa conversa:`,
    link,
    `Salve o link na tela do celular para achar fácil.`,
  ].join("\n\n");
}

export function mensagemPergunta({
  autor,
  pergunta,
  link,
}: {
  autor: string;
  pergunta: string;
  link: string;
}) {
  return [
    `${autor}, uma pergunta para o seu livro:`,
    `"${pergunta}"`,
    `Responda gravando aqui: ${link}`,
  ].join("\n\n");
}

/** Marco da 1ª história (M11): o responsável conta no grupo da família. */
export function mensagemPrimeiraHistoria({
  autor,
  link,
}: {
  autor: string;
  link: string;
}) {
  return [
    `A primeira história do livro do ${autor} está escrita!`,
    `Ainda dá tempo de sugerir causos e votar nas próximas perguntas:`,
    link,
  ].join("\n\n");
}

// ── Prompt 11 ────────────────────────────────────────────────────────────

/** Convite de co-facilitador para colar no WhatsApp (o link só vale para o e-mail convidado). */
export function mensagemConvite({
  autor,
  link,
}: {
  autor: string;
  link: string;
}) {
  return [
    `Estou fazendo o livro de memórias de ${autor} e quero sua ajuda.`,
    `Mandei um convite para o seu e-mail. Entre com ele por este link:`,
    link,
  ].join("\n\n");
}

const VOZ: Partial<Record<Parentesco, "dele" | "dela">> = {
  pai: "dele",
  avo: "dele",
  tio: "dele",
  mae: "dela",
  avoa: "dela",
  tia: "dela",
};

/** Compartilhar no grupo (P61). Sem voz, a mensagem não fala em voz. */
export function mensagemCompartilhar({
  autor,
  titulo,
  parentesco,
  comVoz,
  link,
}: {
  autor: string;
  titulo: string;
  parentesco: Parentesco | null;
  comVoz: boolean;
  link: string;
}) {
  const inicio = `${autor} contou: "${titulo}".`;
  if (!comVoz) return `${inicio} Leia aqui: ${link}`;
  const voz = (parentesco && VOZ[parentesco]) || "original";
  return `${inicio} Ouça na voz ${voz} e leia aqui: ${link}`;
}

/** Lembrar com carinho (P62): pergunta enviada há 3 dias ou mais. */
export function mensagemLembrete({
  autor,
  pergunta,
  link,
}: {
  autor: string;
  pergunta: string;
  link: string;
}) {
  return `Oi, ${autor}! Lembrei daquela pergunta: "${pergunta}". Quando tiver um tempinho, grava pra gente? É só tocar aqui: ${link}`;
}
