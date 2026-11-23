// Textos do convite de co-facilitador (P59). Puro: serve ao servidor, às telas e aos testes.

/** "beatriz@gmail.com" → "b•••@gmail.com". Só a 1ª letra do nome e o domínio. */
export function mascararEmail(email: string): string {
  const [nome, dominio] = email.trim().toLowerCase().split("@");
  if (!nome || !dominio) return "•••";
  return `${nome[0]}•••@${dominio}`;
}

/**
 * Nome que pode ir num e-mail do nosso domínio sem virar golpe: só letras, espaço, hífen e
 * apóstrofo, até 30 caracteres. Sem números, links ou quebras. Vazio se não sobrar nada.
 */
export function nomeSeguro(nome: string | null | undefined): string {
  const limpo = (nome ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\s'’-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return limpo.slice(0, 30).trim();
}

/** Primeiro nome saneado, ou null. */
export function primeiroNome(nome: string | null | undefined): string | null {
  return nomeSeguro(nome).split(" ")[0] || null;
}

/**
 * Nome digitado em *Convidar* (P81). Rejeita, sem consertar calado, o que `nomeSeguro`
 * mudaria: número, link, símbolo ou mais de 30 letras. Devolve o nome pronto ou null.
 */
export function nomeDoConvite(
  entrada: string | null | undefined,
): string | null {
  const digitado = (entrada ?? "").normalize("NFC").replace(/\s+/g, " ").trim();
  if (!digitado || nomeSeguro(digitado) !== digitado) return null;
  return digitado;
}

/** Texto do convite pelo nome, para o WhatsApp ou *Copiar mensagem* (P81, P9). */
export function mensagemConviteNome({
  nome,
  autor,
  link,
}: {
  nome: string;
  autor: string;
  link: string;
}): string {
  return [
    `Oi, ${nome}! Chamei você para me ajudar no livro de memórias de ${autor}.`,
    `Abra o link e entre com o seu Gmail: ${link}`,
    "O link é só seu, não repasse no grupo.",
  ].join("\n\n");
}
