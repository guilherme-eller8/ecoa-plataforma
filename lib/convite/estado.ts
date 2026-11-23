// Estado da tela /convite/{token} (P59, P81; design convite-pelo-nome 4.2). Puro: o servidor
// decide aqui e passa ao cliente só o que pode ver. O e-mail do convite sai sempre mascarado.
import { mascararEmail } from "./textos";

/** O que o servidor leu do convite. `email` é completo: nunca vai para o cliente. */
export type DadosDoConvite =
  | { estado: "invalido" }
  | {
      estado: "pendente";
      conviteId: string;
      livroId: string;
      autor: string;
      quem: string | null;
      nome: string | null; // convite pelo nome; null nos antigos, por e-mail
      email: string | null;
      trocasRestantes: number;
      eDono: boolean; // o cookie deste aparelho é o do dono
    };

export type EstadoTelaConvite =
  | { tipo: "invalido" }
  | { tipo: "pedir_email"; nome: string; quem: string | null; autor: string }
  | {
      tipo: "entrar";
      nome: string;
      emailMascarado: string;
      podeCorrigir: boolean;
    }
  | { tipo: "em_uso"; quem: string | null }
  | { tipo: "entrar_antigo"; quem: string | null; autor: string }
  | { tipo: "aceitar"; quem: string | null; autor: string; email: string }
  | { tipo: "outro_email"; emailMascarado: string };

/** `sessao` é o e-mail de quem está logado (o próprio), ou null. */
export function estadoDaTelaConvite(
  c: DadosDoConvite,
  sessao: string | null,
): EstadoTelaConvite {
  if (c.estado !== "pendente") return { tipo: "invalido" };
  const eu = sessao?.trim().toLowerCase() || null;

  if (!eu) {
    if (!c.nome) return { tipo: "entrar_antigo", quem: c.quem, autor: c.autor };
    if (!c.email)
      return {
        tipo: "pedir_email",
        nome: c.nome,
        quem: c.quem,
        autor: c.autor,
      };
    if (!c.eDono) return { tipo: "em_uso", quem: c.quem };
    return {
      tipo: "entrar",
      nome: c.nome,
      emailMascarado: mascararEmail(c.email),
      podeCorrigir: c.trocasRestantes > 0,
    };
  }

  const podeAceitar =
    c.email === eu ||
    (c.nome !== null &&
      (c.email === null || (c.eDono && c.trocasRestantes > 0)));
  if (podeAceitar)
    return { tipo: "aceitar", quem: c.quem, autor: c.autor, email: eu };
  return {
    tipo: "outro_email",
    emailMascarado: c.email ? mascararEmail(c.email) : "•••",
  };
}
