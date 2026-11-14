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
