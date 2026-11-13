// Texto ao vivo (prompt 6): tira o título e os parágrafos de um JSON de Edicao ainda
// incompleto, enquanto o modelo escreve. Não valida nada: só mostra o que já chegou.

export type TextoParcial = { titulo: string | null; paragrafos: string[] };

const ESCAPES: Record<string, string> = {
  '"': '"',
  "\\": "\\",
  "/": "/",
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
};

/** Lê uma string JSON a partir de `i` (logo depois da aspa de abertura), mesmo cortada. */
function lerString(
  json: string,
  i: number,
): { valor: string; fim: number; fechada: boolean } {
  let valor = "";
  while (i < json.length) {
    const c = json[i];
    if (c === '"') return { valor, fim: i + 1, fechada: true };
    if (c !== "\\") {
      valor += c;
      i++;
      continue;
    }
    const e = json[i + 1];
    if (e === undefined) break; // escape cortado: espera o próximo pedaço
    if (e === "u") {
      const hex = json.slice(i + 2, i + 6);
      if (hex.length < 4 || !/^[0-9a-fA-F]{4}$/.test(hex)) break;
      valor += String.fromCharCode(parseInt(hex, 16));
      i += 6;
      continue;
    }
    valor += ESCAPES[e] ?? e;
    i += 2;
  }
  return { valor, fim: json.length, fechada: false };
}

function valoresDoCampo(json: string, campo: string): string[] {
  const padrao = new RegExp(`"${campo}"\\s*:\\s*"`, "g");
  const valores: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = padrao.exec(json))) {
    const lido = lerString(json, m.index + m[0].length);
    valores.push(lido.valor);
    padrao.lastIndex = lido.fim;
    if (!lido.fechada) break;
  }
  return valores;
}

export function extrairTextoParcial(json: string): TextoParcial {
  const [titulo] = valoresDoCampo(json, "titulo");
  // Só os "texto" depois de "paragrafos" (lacunas vêm depois e não têm "texto").
  const inicio = json.search(/"paragrafos"\s*:/);
  const paragrafos =
    inicio < 0
      ? []
      : valoresDoCampo(json.slice(inicio), "texto").map((p) => p.trim());
  return {
    titulo: titulo?.trim() || null,
    paragrafos: paragrafos.filter((p) => p !== ""),
  };
}
