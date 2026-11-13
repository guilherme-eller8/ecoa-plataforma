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
  gravacoes: string[]; // do contêiner, em ordem (prompt 7)
  transcritas: Map<string, Segmento[]>;
  proposta: unknown;
  sugerida: string | null;
  pendentes: { id: string; texto: string }[];
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
    gravacoes: [G],
    transcritas: new Map(),
    proposta: null,
    sugerida: null,
    pendentes: [],
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
        gravacoes: s.gravacoes,
      };
    },
    async info() {
      if (!s.estado) return null;
      return {
        livro: L,
        estado: s.estado,
        temDivisao: s.proposta !== null,
        divisaoDe: null,
        promptId: null,
        sugestaoDecidida: s.sugerida !== null,
      };
    },
    async fixarSegmentoInicial(_h, g) {
      const i = s.gravacoes.indexOf(g);
      let maior = 0;
      for (const ant of s.gravacoes.slice(0, Math.max(0, i)))
        for (const seg of s.transcritas.get(ant) ?? [])
          maior = Math.max(maior, seg.id);
      return maior + 1;
    },
    async gravacoesDaHistoria() {
      return s.gravacoes.map((_, i) => ({
        rotulo: `g${i + 1}`,
        minutos: 1,
        pergunta: null,
        perguntaId: null,
      }));
    },
    async perguntasPendentes() {
      return s.pendentes;
    },
    async proporDivisao(_h, p) {
      if (s.estado !== "dividindo") return false;
      s.proposta = p;
      s.estado = "separar";
      return true;
    },
    async sugerirPergunta(_h, p) {
      s.sugerida = p;
      return true;
    },
    async gravacaoParaTranscrever(g) {
      const i = Math.max(0, s.gravacoes.indexOf(g));
      return {
        livro: L,
        caminho: "x",
        nomeArquivo: "amostra-trem.ogg",
        duracaoS: 60,
        segmentoInicial: 1,
        rotulo: `g${i + 1}`,
      };
    },
    async temTranscricao(g) {
      return s.transcritas.has(g) || (g === G && s.transcricao !== null);
    },
    async gravarTranscricao(t) {
      s.transcritas.set(t.gravacao, t.segmentos);
      s.transcricao = s.gravacoes.flatMap((g) => s.transcritas.get(g) ?? []);
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
      if (
        para === "escrevendo" &&
        (s.estado === "ouvindo" || s.estado === "dividindo")
      ) {
        s.estado = "escrevendo";
        return true;
      }
      if (para === "dividindo" && s.estado === "ouvindo") {
        s.estado = "dividindo";
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
      if (m.tipo !== "proposta") canal.push(m);
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
      "decidir",
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
    const m = montar({ estado: null, motivo: "lote_incompleto" });
    const r = await processarGravacao(G, m.d, m.step);
    expect(r).toEqual({ fim: "esperando", motivo: "lote_incompleto" });
    expect(m.passos).toEqual(["iniciar"]);
    expect(m.s.usos).toEqual([]);
  });

  it("história já pronta ou com falha não é refeita", async () => {
    for (const estado of ["pronta", "falhou", "separar"] as const) {
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

describe("divisão em histórias (prompt 7)", () => {
  const G2 = "44444444-4444-4444-4444-444444444444";
  const G3 = "55555555-5555-5555-5555-555555555555";

  it("lote de 3: transcreve em ordem, com ids contínuos, e para em separar", async () => {
    const m = montar({ gravacoes: [G, G2, G3] });
    const r = await processarGravacao(G, m.d, m.step);
    expect(r).toMatchObject({ fim: "separar", historia: H });
    expect(m.passos).toEqual([
      "iniciar",
      "transcrever",
      "transcrever:2",
      "transcrever:3",
      "estruturar",
      "decidir",
      "dividir",
      "esperar-divisao",
      "avisar-divisao",
    ]);
    const ids = m.s.transcricao!.map((x) => x.id);
    expect(ids).toEqual(ids.map((_, i) => i + 1)); // 1, 2, 3… sem repetir entre gravações
    expect(new Set(m.s.transcricao!.map((x) => x.arquivo))).toEqual(
      new Set(["g1", "g2", "g3"]),
    );
    expect(m.s.estado).toBe("separar");
    expect(
      m.canal.filter((c) => c.tipo === "etapa").map((c) => c.etapa),
    ).toEqual(["ouvindo", "separando", "conferir"]);
    expect(m.eventos).toEqual(["divisao_proposta"]);
    expect(m.s.usos.map((u) => u.etapa)).toContain("dividir");
    // Nada de texto da fala nos resultados dos passos (T36).
    const tudo = JSON.stringify([...m.resultados.values()]);
    for (const palavra of ["trem", "mortadela", "Cachoeiro"])
      expect(tudo).not.toContain(palavra);
  });

  it("repetir o passo dividir com a proposta já gravada não chama a IA de novo", async () => {
    const m = montar({ gravacoes: [G, G2] });
    await processarGravacao(G, m.d, m.step);
    const antes = m.s.usos.filter((u) => u.etapa === "dividir").length;
    const r = await processarGravacao(G, m.d, m.step);
    expect(r).toMatchObject({ fim: "ja_estava", estado: "separar" });
    expect(m.s.usos.filter((u) => u.etapa === "dividir").length).toBe(antes);
  });

  it("gravação única com mudança de assunto e 1 história segue direto, com a sugestão", async () => {
    const m = montar({
      pendentes: [{ id: "p1", texto: "Como era a escola?" }],
    });
    // A estruturação marca uma mudança de assunto; a divisão acha 1 história só.
    const falso = new ClienteFalso();
    m.d.ia = {
      gerar: async (c) => {
        if (c.etapa === "estruturar") {
          const r = await falso.gerar(c);
          const e = r.dados as unknown as Estrutura;
          return {
            ...r,
            dados: { ...e, mudancasDeAssunto: [2] } as typeof r.dados,
          };
        }
        if (c.etapa !== "dividir") return falso.gerar(c);
        const dados = c.schema.parse({
          historias: [
            { titulo: "Escola", trechos: [{ de: 1, ate: 999 }], pergunta: 1 },
          ],
        });
        return {
          dados,
          uso: { entrada: 1, saida: 1, cacheLido: 0, cacheGravado: 0 },
          ms: 1,
          msPrimeiraPalavra: null,
          idRequisicao: null,
          tentativas: 1,
        };
      },
    };
    const r = await processarGravacao(G, m.d, m.step);
    expect(r).toMatchObject({ fim: "pronta" });
    expect(m.passos).toContain("dividir");
    expect(m.passos).toContain("editar");
    expect(m.s.sugerida).toBe("p1");
  });

  it("gravação única sem mudança de assunto não passa pela divisão (como no prompt 6)", async () => {
    const m = montar();
    await processarGravacao(G, m.d, m.step);
    expect(m.passos).not.toContain("dividir");
  });
});

describe("áudio sem fala (achado no deploy de prévia)", () => {
  it("para antes da escrita, com código fixo, sem chamar o modelo capaz", async () => {
    const m = montar({
      estrutura: {
        falantes: [{ falante: "g1:speaker_0", papel: "autor" }],
        vazios: Array.from({ length: 200 }, (_, i) => i + 1),
        mudancasDeAssunto: [],
      },
    });
    const erro = await processarGravacao(G, m.d, m.step).catch((e) => e);
    expect(erro).toBeInstanceOf(ErroPipeline);
    expect(erro.message).toBe("editar:audio_sem_fala");
    expect(m.s.usos.map((u) => u.etapa)).not.toContain("editar");
    expect(m.passos).not.toContain("dividir");
  });
});
