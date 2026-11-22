// Textos dos e-mails enviados pelo app. O e-mail de link de entrada é do Supabase (ver guia de setup).

import { CONVITE_VALIDADE_DIAS } from "@/lib/config";
import { fraseDoAlerta } from "@/lib/pagamento/estado";

export type Email = {
  assunto: string;
  html: string;
  texto: string;
  cabecalhos?: Record<string, string>;
};

const escapar = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function moldura(
  titulo: string,
  frase: string,
  botao: { rotulo: string; url: string },
  rodape?: { frase: string; rotulo: string; url: string },
) {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f5efe4;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5efe4;">
      <tr><td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">
          <tr><td style="font-family:Georgia,serif;color:#26211d;font-size:26px;line-height:1.3;padding-bottom:16px;">${titulo}</td></tr>
          <tr><td style="font-family:Georgia,serif;color:#26211d;font-size:18px;line-height:1.5;padding-bottom:28px;">${frase}</td></tr>
          <tr><td>
            <a href="${botao.url}" style="display:inline-block;background:#1f3d33;color:#fffdf8;font-family:Arial,sans-serif;font-size:17px;text-decoration:none;padding:16px 28px;border-radius:999px;">${botao.rotulo}</a>
          </td></tr>
          <tr><td style="font-family:Georgia,serif;color:#6e6259;font-size:14px;line-height:1.5;padding-top:32px;">Ecoa Memórias${
            rodape
              ? `<br><br>${rodape.frase} <a href="${rodape.url}" style="color:#6e6259;">${rodape.rotulo}</a>`
              : ""
          }</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function emailAcesso({
  autorNome,
  urlEntrar,
}: {
  autorNome: string | null;
  urlEntrar: string;
}): Email {
  const nome = autorNome?.trim() || null;
  const assunto = nome
    ? `O livro do ${nome} está pronto para começar`
    : "Seu livro de memórias está pronto";
  const titulo = nome
    ? `O livro do ${escapar(nome)} está pronto.`
    : "Seu livro de memórias está pronto.";
  const frase =
    "Entre com a sua conta Google, ou receba um link neste e-mail, e comece quando quiser.";
  return {
    assunto,
    html: moldura(titulo, frase, { rotulo: "Abrir meu livro", url: urlEntrar }),
    texto: `${nome ? `O livro do ${nome} está pronto.` : "Seu livro de memórias está pronto."}\n\n${frase}\n\nAbrir meu livro: ${urlEntrar}\n\nEcoa Memórias`,
  };
}

/** História pronta (P42): sem título nem trecho, que podem ser sensíveis. */
export function emailHistoriaPronta({
  apelido,
  urlHistoria,
}: {
  apelido: string;
  urlHistoria: string;
}): Email {
  const nome = apelido.trim() || "seu livro";
  const assunto = `Uma história do livro de ${nome} ficou pronta`;
  const frase =
    "O texto já está escrito. Leia com calma e confira os trechos grifados com o áudio.";
  return {
    assunto,
    html: moldura(
      `Uma história do livro de ${escapar(nome)} ficou pronta.`,
      frase,
      {
        rotulo: "Ler a história",
        url: urlHistoria,
      },
    ),
    texto: `Uma história do livro de ${nome} ficou pronta.\n\n${frase}\n\nLer a história: ${urlHistoria}\n\nEcoa Memórias`,
  };
}

/**
 * Aviso ao admin: uma história falhou. Só ids e códigos fixos (T36, T50): nunca título, nome
 * ou trecho da fala.
 */
export function emailFalha({
  livro,
  etapa,
  codigo,
  urlAdmin,
}: {
  livro: string;
  etapa: string;
  codigo: string;
  urlAdmin: string;
}): Email {
  const assunto = `Ecoa: uma história falhou (${etapa} · ${codigo})`;
  const frase = `Livro ${livro.slice(0, 8)}. Etapa: ${etapa}. Código: ${codigo}. Chega no máximo 1 aviso por livro a cada hora; a lista completa fica no admin.`;
  return {
    assunto,
    html: moldura("Uma história falhou.", escapar(frase), {
      rotulo: "Abrir o admin",
      url: urlAdmin,
    }),
    texto: `Uma história falhou.\n\n${frase}\n\nAbrir o admin: ${urlAdmin}\n\nEcoa Memórias`,
  };
}

/**
 * Divisão esperando confirmação há 10 min (prompt 7, D8). Como em historiaPronta (P42), sem
 * título nem trecho: o título sai da fala e pode ser sensível.
 */
export function emailDivisaoPronta({
  apelido,
  urlDivisao,
}: {
  apelido: string;
  urlDivisao: string;
}): Email {
  const nome = apelido.trim() || "seu livro";
  const assunto = `As histórias da conversa de ${nome} estão prontas para conferir`;
  const frase =
    "Separamos a gravação em histórias. Confira, junte ou separe o que precisar, e elas vão para a escrita.";
  return {
    assunto,
    html: moldura(
      `As histórias da conversa de ${escapar(nome)} estão prontas para conferir.`,
      frase,
      { rotulo: "Conferir as histórias", url: urlDivisao },
    ),
    texto: `As histórias da conversa de ${nome} estão prontas para conferir.\n\n${frase}\n\nConferir as histórias: ${urlDivisao}\n\nEcoa Memórias`,
  };
}

/**
 * Convite de co-facilitador (P59). Assunto fixo e nomes já saneados por nomeSeguro: o e-mail
 * sai do nosso domínio para alguém que não pediu, então nada do texto vem solto da pessoa.
 */
export function emailConvite({
  quem,
  apelido,
  urlConvite,
}: {
  quem: string; // primeiro nome de quem convidou, saneado (pode ser vazio)
  apelido: string; // saneado
  urlConvite: string;
}): Email {
  const assunto = "Convite para ajudar num livro de memórias";
  const sujeito = quem || "Uma pessoa da sua família";
  const livro = apelido
    ? `o livro de memórias de ${apelido}`
    : "um livro de memórias";
  const frase = `${sujeito} chamou você para ajudar a fazer ${livro}. Entre com este e-mail para aceitar. O convite vale por ${CONVITE_VALIDADE_DIAS} dias.`;
  return {
    assunto,
    html: moldura(escapar(assunto) + ".", escapar(frase), {
      rotulo: "Ver o convite",
      url: urlConvite,
    }),
    texto: `${frase}\n\nVer o convite: ${urlConvite}\n\nEcoa Memórias`,
  };
}

/** Resumo semanal (P63): só números, sem título nem trecho (P42), descadastro de 1 clique. */
export function emailResumo({
  apelido,
  historiasNovas,
  perguntasEsperando,
  paginasEstimadas,
  urlLivro,
  urlSair,
}: {
  apelido: string;
  historiasNovas: number;
  perguntasEsperando: number;
  paginasEstimadas: number;
  urlLivro: string;
  urlSair: { pagina: string; umClique: string };
}): Email {
  const nome = apelido.trim() || "seu livro";
  const plural = (n: number, um: string, varios: string) =>
    `${n} ${n === 1 ? um : varios}`;
  const numeros = [
    plural(historiasNovas, "história nova", "histórias novas"),
    plural(perguntasEsperando, "pergunta esperando", "perguntas esperando"),
    `~${plural(paginasEstimadas, "página", "páginas")}`,
  ].join(" · ");
  const assunto = `Esta semana no livro de ${nome}`;
  const rodape = {
    frase: "Não quer mais este resumo?",
    rotulo: "Parar de receber",
    url: urlSair.pagina,
  };
  return {
    assunto,
    html: moldura(
      `Esta semana no livro de ${escapar(nome)}`,
      escapar(numeros) + ".",
      { rotulo: "Abrir o livro", url: urlLivro },
      rodape,
    ),
    texto: `Esta semana no livro de ${nome}: ${numeros}.\n\nAbrir o livro: ${urlLivro}\n\nNão quer mais este resumo? ${urlSair.pagina}\n\nEcoa Memórias`,
    cabecalhos: {
      "List-Unsubscribe": `<${urlSair.umClique}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/** Alerta de Evals 1A ao admin (lib/evals/alertas.ts): só ids curtos e números. */
export function emailAlerta({
  titulo,
  linhas,
  urlAdmin,
}: {
  titulo: string;
  linhas: string[];
  urlAdmin: string;
}): Email {
  const frase = linhas.map(escapar).join("<br>");
  return {
    assunto: `Ecoa: ${titulo}`,
    html: moldura(escapar(titulo), frase, {
      rotulo: "Abrir Evals",
      url: urlAdmin,
    }),
    texto: `${titulo}\n\n${linhas.join("\n")}\n\nAbrir Evals: ${urlAdmin}\n\nEcoa Memórias`,
  };
}

/** Alerta de compra ao admin (prompt 14, CUJ 7): só o id e o que aconteceu. */
export function emailAlertaCompra({
  referencia,
  alerta,
  urlAdmin,
}: {
  referencia: string;
  alerta: string;
  urlAdmin: string;
}): Email {
  const titulo = "Compra para conferir";
  const frase = fraseDoAlerta(alerta);
  return {
    assunto: `Ecoa: ${titulo}`,
    html: moldura(
      titulo,
      `${escapar(frase)}<br><br>Compra: ${escapar(referencia)}`,
      { rotulo: "Abrir o admin", url: urlAdmin },
    ),
    texto: `${titulo}\n\n${frase}\nCompra: ${referencia}\n\nAbrir o admin: ${urlAdmin}\n\nEcoa Memórias`,
  };
}
