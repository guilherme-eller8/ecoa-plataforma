// Mensagens prontas para o WhatsApp do responsável. Sem API: o botão abre o wa.me e a
// pessoa escolhe o contato ou o grupo.

export function linkWhatsApp(texto: string): string {
  return `https://wa.me/?text=${encodeURIComponent(texto)}`;
}

export function conviteDoGrupo({
  autor,
  link,
}: {
  autor: string;
  link: string;
}) {
  return [
    `Estamos fazendo o livro de memórias do ${autor}. 📖`,
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
