// npm run lab — ver lab/README.md e docs/designs/laboratorio-ia.md.
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { extname, join } from "node:path";
import { MODELOS_TRANSCRICAO } from "@/lib/config";
import { leitorDeDiretorio } from "@/lib/ai/carregar-prompt";
import { ClienteAnthropic } from "@/lib/ai/claude";
import { TRANSCRITORES } from "@/lib/ai/transcricao";
import { EXTENSOES_AUDIO, normalizarAudio } from "./audio";
import { executarComparacao } from "./comparar";
import { AMOSTRAS, ClienteFalso, transcreverFalso } from "./fakes";
import { ErroUsuario, carregarGlossario } from "./glossario";
import { lerOpcoes } from "./opcoes";
import { rodarLab, type Dependencias } from "./pipeline";
import { gerarRelatorio } from "./relatorio";
import { gravarSaidas } from "./saidas";

async function main() {
  const raiz = process.cwd();
  const o = lerOpcoes(process.argv.slice(2), process.env, raiz);
  const dirLab = join(raiz, "lab");
  const ler = leitorDeDiretorio(join(raiz, "lib/ai/prompts"));
  const ia = o.simulado ? new ClienteFalso() : new ClienteAnthropic();

  if (!o.simulado && !process.env.ANTHROPIC_API_KEY) {
    throw new ErroUsuario(
      "Falta ANTHROPIC_API_KEY no .env.local (veja .env.example).",
    );
  }

  if (o.comparar) {
    await executarComparacao(join(dirLab, "saidas", o.comparar), {
      ia,
      ler,
      dirLab,
    });
    return;
  }

  const glossario = carregarGlossario(dirLab, o.simulado);
  const dirAudios = join(dirLab, "audios");
  let audios = existsSync(dirAudios)
    ? readdirSync(dirAudios)
        .filter((a) => EXTENSOES_AUDIO.includes(extname(a).toLowerCase()))
        .map((a) => join(dirAudios, a))
    : [];

  let deps: Dependencias;
  const provedor = o.simulado ? "simulado" : o.provedor;
  if (o.simulado) {
    if (audios.length === 0)
      audios = Object.keys(AMOSTRAS).map((a) => join(dirAudios, a));
    deps = {
      ia,
      transcrever: transcreverFalso,
      chaveProvedor: "",
      modeloTranscricao: "simulado",
      carregarAudio: async (c) => ({
        audio: new TextEncoder().encode(c),
        minutos: 0.5,
      }),
      ler,
      dirCache: join(dirLab, ".cache", "simulado"),
    };
  } else {
    const t = TRANSCRITORES[provedor];
    if (!t)
      throw new ErroUsuario(
        `Provedor desconhecido: ${provedor}. Use ${Object.keys(TRANSCRITORES).join(" ou ")}.`,
      );
    const chave = process.env[t.variavelChave];
    if (!chave)
      throw new ErroUsuario(`Falta ${t.variavelChave} no .env.local.`);
    if (audios.length === 0)
      throw new ErroUsuario(
        `Nenhum áudio em ${dirAudios} (${EXTENSOES_AUDIO.join(", ")}).`,
      );
    deps = {
      ia,
      transcrever: t.transcrever,
      chaveProvedor: chave,
      modeloTranscricao: MODELOS_TRANSCRICAO[provedor],
      carregarAudio: normalizarAudio,
      ler,
      dirCache: join(dirLab, ".cache", "transcricao"),
    };
  }

  console.log(
    `Processando ${audios.length} áudio(s) com ${provedor}, tamanho(s): ${o.tamanhos.join(", ")}…`,
  );
  const rodada = await rodarLab(
    audios,
    {
      provedor,
      tamanhos: o.tamanhos,
      semCache: o.semCache,
      glossario,
      concorrencia: o.concorrencia,
      simulado: o.simulado,
    },
    deps,
  );

  mkdirSync(dirLab, { recursive: true });
  for (const h of rodada.historias) {
    gravarSaidas(join(dirLab, "saidas"), rodada, h);
    console.log(
      h.erro
        ? `  ✗ ${h.arquivo}: ${h.erro}`
        : `  ✓ ${h.arquivo} → lab/saidas/${h.id}/ia.md`,
    );
  }
  writeFileSync(join(dirLab, "relatorio.md"), gerarRelatorio(rodada));
  console.log(
    `Relatório: lab/relatorio.md (${(rodada.msTotal / 1000).toFixed(1)} s)`,
  );
  if (rodada.historias.some((h) => h.erro)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e instanceof ErroUsuario ? `\n${e.message}\n` : e);
  process.exitCode = 1;
});
