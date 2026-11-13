// Textos dos e-mails enviados pelo app. O e-mail de link de entrada é do Supabase (ver guia de setup).

export type Email = { assunto: string; html: string; texto: string };

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
          <tr><td style="font-family:Georgia,serif;color:#6e6259;font-size:14px;line-height:1.5;padding-top:32px;">Ecoa Memórias</td></tr>
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
