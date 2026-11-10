// Texto de uma sugestão da família quando vira pergunta ou opção da enquete. Sem texto
// (só áudio), entra uma frase que aponta para o áudio de quem sugeriu.
import { TEXTO_PERGUNTA_MAX } from "@/lib/config";
import type { CausoDaTela } from "@/lib/livro/tipos";

export function textoSugerido(c: Pick<CausoDaTela, "texto" | "tipo" | "nome">) {
  const t = c.texto?.trim();
  return t && t.length >= 3
    ? t.slice(0, TEXTO_PERGUNTA_MAX)
    : c.tipo === "pergunta"
      ? `Pergunta de ${c.nome} (ouça o áudio).`
      : `Conte a história que ${c.nome} pediu.`;
}
