import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { leitorDeDiretorio } from "@/lib/ai/carregar-prompt";
import { ClienteFalso, transcreverFalso } from "@/scripts/lab/fakes";
import type { Edicao, Estrutura, Glossario, Segmento } from "@/lib/ai/schemas";
import { ErroPipeline } from "./erros";
import {
  processarGravacao,
  type BancoPipeline,
  type Dependencias,
  type LinhaUso,
  type Passos,
  type Rascunho,
} from "./processar";
import type { EstadoHistoria, MensagemCanal } from "./regras";

const ler = leitorDeDiretorio(join(process.cwd(), "lib/ai/prompts"));
const G = "11111111-1111-1111-1111-111111111111";
const H = "22222222-2222-2222-2222-222222222222";
const L = "33333333-3333-3333-3333-333333333333";

type Estado = {
  estado: EstadoHistoria | null;
  motivo: string | null;
  transcricao: Segmento[] | null;
  estrutura: Estrutura | null;
  rascunho: Rascunho | null;
  versao: Edicao | null;
  vista: boolean;
  nomes: string[];
  usos: LinhaUso[];
};

function bancoFalso(inicial: Partial<Estado> = {}) {
  const s: Estado = {
    estado: "ouvindo",
    motivo: null,
    transcricao: null,
    estrutura: null,
    rascunho: null,
    versao: null,
    vista: false,
    nomes: [],
    usos: [],
    ...inicial,
  };
  const glossario: Glossario = {
    autor: { nome: "Nelson" },
    sobre: "",
    pessoas: [],
    lugares: [],
  };
  const banco: BancoPipeline = {
    async iniciar() {
      return {
        historia: s.estado ? H : null,
        estado: s.estado,
        motivo: s.motivo,
        livro: L,
      };
    },
    async gravacaoParaTranscrever() {
      return {
        livro: L,
        caminho: "x",
        nomeArquivo: "amostra-trem.ogg",
        duracaoS: 60,
        segmentoInicial: 1,
        rotulo: "g1",
      };
    },
    async temTranscricao() {
      return s.transcricao !== null;
    },
    async gravarTranscricao(t) {
      s.transcricao = t.segmentos;
    },
    async segmentosDaHistoria() {
      return s.transcricao ?? [];
    },
    async estrutura() {
      return s.estrutura;
    },
    async gravarEstrutura(_h, e) {
      s.estrutura = e;
    },
    async mudarEtapa(_h, para) {
      if (para === "escrevendo" && s.estado === "ouvindo") {
        s.estado = "escrevendo";
        return true;
      }
      if (
        para === "falhou" &&
        (s.estado === "ouvindo" || s.estado === "escrevendo")
      ) {
        s.estado = "falhou";
        return true;
      }
      return false;
    },
    async rascunho() {
      return s.rascunho;
    },
    async gravarRascunho(_h, r) {
      s.rascunho = r;
    },
    async concluir() {
      if (s.estado !== "escrevendo" || !s.rascunho) return false;
      s.versao = s.rascunho.edicao;
      s.estado = "pronta";
      s.rascunho = null;
      return true;
    },
    async versaoDaIA() {
      return s.versao;
    },
    async contexto() {
      return { glossario, historias: "(nenhuma ainda)" };
    },
    async gravarMemoria() {},
    async sugerirNomes(_h, nomes) {
      s.nomes.push(...nomes.map((n) => n.nome));
      return nomes.length;
    },
    async registrarUso(l) {
      s.usos.push(l);
    },
    async foiVista() {
      return s.vista;
    },
    async avisoDoLivro() {
      return { email: "r@exemplo.com", apelido: "Nelson" };
    },
  };
  return { s, banco };
}

function montar(
  inicial: Partial<Estado> = {},
  extra: Partial<Dependencias> = {},
) {
  const { s, banco } = bancoFalso(inicial);
  const canal: MensagemCanal[] = [];
  const emails: string[] = [];
  const eventos: string[] = [];
  const passos: string[] = [];
  const d: Dependencias = {
    banco,
    ia: new ClienteFalso(),
    ler,
    transcrever: transcreverFalso,
    provedor: "elevenlabs",
    modeloTranscricao: "scribe_v1",
    chaveTranscricao: "",
    baixarAudio: async () => new Uint8Array([1]),
    publicar: async (_l, m) => {
      canal.push(m);
    },
    avisarPorEmail: async (para) => {
      emails.push(para);
      return true;
    },
    registrarEvento: async (acao) => {
      eventos.push(acao);
    },
    ...extra,
  };
  const resultados = new Map<string, unknown>();
  const step: Passos = {
    async run(id, fn) {
      passos.push(id);
      const r = await fn();
      // O Inngest guarda o resultado de cada passo fora do Brasil: nada de texto (T36).
      resultados.set(id, r);
      return r;
    },
    async sleep(id) {
      passos.push(id);
    },
  };
  return { s, d, step, canal, emails, eventos, passos, resultados };
}

describe("processarGravacao", () => {
  it("faz a história inteira, na ordem, e publica as etapas e o texto", async () => {
    const m = montar();
    const r = await processarGravacao(G, m.d, m.step);
    expect(r).toEqual({ fim: "pronta", historia: H, emailEnviado: true });
    expect(m.passos).toEqual([
      "iniciar",
      "transcrever",
      "estruturar",
      "editar",
      "verificar",
      "concluir",
      "memoria",
      "esperar",
      "avisar",
    ]);
    expect(m.s.estado).toBe("pronta");
    expect(m.s.versao?.paragrafos.length).toBeGreaterThan(0);
    const etapas = m.canal
      .filter((c) => c.tipo === "etapa")
      .map((c) => c.etapa);
    expect(etapas).toEqual(["ouvindo", "escrevendo", "revisar"]);
    expect(m.canal.some((c) => c.tipo === "texto")).toBe(true);
    expect(m.emails).toEqual(["r@exemplo.com"]);
    expect(m.eventos).toEqual(["historia_pronta"]);
    expect(m.s.nomes.length).toBeGreaterThan(0);
    expect(m.s.usos.map((u) => u.etapa)).toEqual([
      "transcrever",
      "estruturar",
      "editar",
      "verificar",
      "memoria",
    ]);
  });

  it("nenhum passo devolve texto da fala", async () => {
    const m = montar();
    await processarGravacao(G, m.d, m.step);
    const tudo = JSON.stringify([...m.resultados.values()]);
    for (const palavra of ["trem", "mortadela", "Cachoeiro", "Tião"])
      expect(tudo).not.toContain(palavra);
  });

  it("gravação que espera (divisão, consentimento) não gasta nada", async () => {
    const m = montar({ estado: null, motivo: "divisao" });
    const r = await processarGravacao(G, m.d, m.step);
    expect(r).toEqual({ fim: "esperando", motivo: "divisao" });
    expect(m.passos).toEqual(["iniciar"]);
    expect(m.s.usos).toEqual([]);
  });

  it("história já pronta ou com falha não é refeita", async () => {
    for (const estado of ["pronta", "falhou"] as const) {
      const m = montar({ estado });
      const r = await processarGravacao(G, m.d, m.step);
      expect(r).toEqual({ fim: "ja_estava", estado });
      expect(m.passos).toEqual(["iniciar"]);
    }
  });

  it("não manda e-mail se alguém viu a história na tela", async () => {
    const m = montar({ vista: true });
    const r = await processarGravacao(G, m.d, m.step);
    expect(r).toMatchObject({ emailEnviado: false });
    expect(m.emails).toEqual([]);
  });

  it("transcrição já paga é reaproveitada na nova tentativa", async () => {
    let chamadas = 0;
    const m = montar(
      {},
      {
        transcrever: async (...a) => {
          chamadas++;
          return transcreverFalso(...a);
        },
      },
    );
    await processarGravacao(G, m.d, m.step);
    m.s.estado = "ouvindo";
    m.s.estrutura = null;
    await processarGravacao(G, m.d, m.step);
    expect(chamadas).toBe(1);
  });

  it("falha do Scribe vira código fixo, sem a mensagem do provedor", async () => {
    const m = montar(
      {},
      {
        transcrever: async () => {
          throw new Error('ElevenLabs respondeu 500: {"texto":"a fazenda"}');
        },
      },
    );
    const erro = await processarGravacao(G, m.d, m.step).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroPipeline);
    expect(erro.message).toBe("transcrever:scribe_falhou");
    expect(m.s.usos).toMatchObject([{ etapa: "transcrever", ok: false }]);
  });

  it("falha da memória ou do e-mail não desfaz o pronta", async () => {
    const m = montar(
      {},
      {
        avisarPorEmail: async () => {
          throw new Error("resend fora");
        },
      },
    );
    m.d.banco.gravarMemoria = async () => {
      throw new Error("banco fora");
    };
    const r = await processarGravacao(G, m.d, m.step);
    expect(r).toMatchObject({ fim: "pronta", emailEnviado: false });
    expect(m.s.estado).toBe("pronta");
    expect(m.eventos).toEqual(["memoria_falhou"]);
  });
});

describe("rótulo curto da gravação", () => {
  it("o falante que o modelo repete é g1:…, não o uuid da gravação", async () => {
    const m = montar();
    await processarGravacao(G, m.d, m.step);
    expect(m.s.transcricao?.every((s) => s.falante.startsWith("g1:"))).toBe(
      true,
    );
    expect(m.s.transcricao?.every((s) => s.arquivo === "g1")).toBe(true);
  });
});
