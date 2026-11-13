// IA sob controle (prompt 9): propostas, aceite com parágrafos travados, áudio acrescentado,
// tetos e isolamento. Design: docs/designs/ia-sob-controle.md.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ativarPlano, como, criarBanco, criarUsuario, tenta } from "./banco";

const RAIZ = path.resolve(__dirname, "..");
const up = readFileSync(
  path.join(RAIZ, "migrations/20261119120000_ia_sob_controle.sql"),
  "utf8",
);
const down = readFileSync(
  path.join(RAIZ, "reversao/20261119120000_ia_sob_controle.down.sql"),
  "utf8",
);

let db: PGlite;
let ana: string; // responsável do livro A
let beto: string; // responsável do livro B
let livroA: string;
let livroB: string;

type Par = { id: string; texto: string; fontes: number[]; editado: boolean };
type Mudanca = {
  id: string;
  tira: { id: string; texto: string }[];
  poe: Par[];
  depois_de: string | null;
};

const aba = () => crypto.randomUUID();
const par = (id: string, texto: string, fontes: number[], editado = false) => ({
  id,
  texto,
  fontes,
  editado,
});

async function sql<T = Record<string, unknown>>(q: string, p: unknown[] = []) {
  return (await db.query<T>(q, p)).rows;
}

/** Roda como membro logado; erro volta como { erro }. */
type Resposta =
  | { linhas: Record<string, unknown>[]; erro?: undefined }
  | { erro: string; linhas?: undefined };

async function comoMembro(
  usuario: string,
  q: string,
  p: unknown[] = [],
): Promise<Resposta> {
  return como(
    db,
    "authenticated",
    { sub: usuario, user_metadata: { full_name: "Ana" } },
    async (tx) => {
      await tx.exec("savepoint membro");
      try {
        const linhas = (await tx.query<Record<string, unknown>>(q, p)).rows;
        await tx.exec("release savepoint membro");
        return { linhas };
      } catch (e) {
        await tx.exec("rollback to savepoint membro");
        return { erro: (e as Error).message };
      }
    },
  );
}

async function historiaPronta(
  livro: string,
  textos = ["Um.", "Dois.", "Três."],
) {
  const [{ id }] = await sql<{ id: string }>(
    `insert into public.stories (book_id, estado, pronta_em, titulo) values ($1, 'pronta', now(), 'O trem') returning id`,
    [livro],
  );
  await sql(
    `insert into public.story_versions (story_id, book_id, numero, origem, tamanho, conteudo)
     values ($1, $2, 1, 'ia', 'medio', $3::jsonb)`,
    [
      id,
      livro,
      JSON.stringify({
        titulo: "O trem",
        paragrafos: textos.map((texto, i) => ({ texto, fontes: [i + 1] })),
        lacunas: [],
      }),
    ],
  );
  return id;
}

async function pegarTrava(usuario: string, story: string, a: string) {
  const r = await comoMembro(
    usuario,
    `select editando from public.editar_historia($1, $2)`,
    [story, a],
  );
  expect(r.linhas?.[0]).toEqual({ editando: true });
}

async function texto(story: string) {
  const [s] = await sql<{
    texto: { titulo: string; ano?: number; paragrafos: Par[] } | null;
    texto_rev: number;
  }>(`select texto, texto_rev from public.stories where id = $1`, [story]);
  return s;
}

async function salvar(
  usuario: string,
  story: string,
  a: string,
  rev: number,
  paragrafos: Par[],
  extra: Record<string, unknown> = {},
) {
  return comoMembro(
    usuario,
    `select public.salvar_historia($1, $2, $3, $4::jsonb, '[]'::jsonb) as rev`,
    [
      story,
      a,
      rev,
      JSON.stringify({ titulo: "O trem", paragrafos, lacunas: [], ...extra }),
    ],
  );
}

async function pedir(
  usuario: string,
  story: string,
  a: string,
  tipo: string,
  tamanho: string | null = null,
  pedido: object = {},
) {
  const r = await comoMembro(
    usuario,
    `select public.pedir_proposta($1, $2, $3::public.proposta_tipo, $4, $5::jsonb) as id`,
    [story, a, tipo, tamanho, JSON.stringify(pedido)],
  );
  return r.erro ?? (r.linhas![0] as { id: string }).id;
}

async function gravar(
  proposta: string,
  mudancas: Mudanca[],
  ordem: string[] | null = null,
  pronta = true,
) {
  return (
    await sql<{ ok: boolean }>(
      `select public.servico_gravar_proposta($1, $2::jsonb, $3, '[]'::jsonb, $4,
         '{"capaz":"modelo"}'::jsonb, '{"editar":"abc"}'::jsonb) as ok`,
      [proposta, JSON.stringify(mudancas), ordem, pronta],
    )
  )[0].ok;
}

async function aplicar(
  usuario: string,
  story: string,
  a: string,
  rev: number,
  proposta: string,
  aplicadas: string[],
  paragrafos: Par[],
  extra: Record<string, unknown> = {},
) {
  const r = await comoMembro(
    usuario,
    `select public.aplicar_proposta($1, $2, $3, $4, $5, $6::jsonb, '[]'::jsonb) as rev`,
    [
      story,
      a,
      rev,
      proposta,
      aplicadas,
      JSON.stringify({ titulo: "Outro", paragrafos, lacunas: [], ...extra }),
    ],
  );
  return r.erro ?? (r.linhas![0] as { rev: number }).rev;
}

/** Áudio acrescentado já recebido (como o servidor deixaria depois do upload). */
async function audioRecebido(livro: string, story: string, duracao = 60) {
  const id = crypto.randomUUID();
  await sql(
    `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type,
       tamanho_bytes, duracao_s, upload, recebido_em, para_historia)
     values ($1, $2, 'upload', 'mais.m4a', $3, 'audio/mp4', 100, $4, 'recebido', now(), $5)`,
    [id, livro, `livros/${livro}/audios/${id}.m4a`, duracao, story],
  );
  return id;
}

async function iniciar(gravacao: string) {
  return (
    await sql<{ historia: string | null; motivo: string | null }>(
      `select historia, motivo from public.servico_iniciar_historia($1)`,
      [gravacao],
    )
  )[0];
}

async function propostaDe(story: string, tipo: string) {
  return (
    await sql<{ id: string; estado: string; gravacoes: string[] }>(
      `select id, estado, gravacoes from public.story_proposals
       where story_id = $1 and tipo = $2 order by pedida_em desc limit 1`,
      [story, tipo],
    )
  )[0];
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Nelson");
  livroB = await ativarPlano(db, beto, "Zé");
  await sql(
    `update public.books set ia_consentimento_em = now(), ia_consentimento_versao = 1 where id = any ($1)`,
    [[livroA, livroB]],
  );
}, 60_000);
afterAll(async () => {
  await db.close();
});

describe("o aceite do M6 (item 5 do prompt)", () => {
  it("editar o 2º parágrafo à mão, acrescentar áudio, mudar o tamanho e aceitar tudo: o 2º continua idêntico", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await pegarTrava(ana, s, a);
    const p2 = par("p2", "Dois, do jeito que o pai contava.", [2], true);
    const atual = [par("p1", "Um.", [1]), p2, par("p3", "Três.", [3])];
    expect(await salvar(ana, s, a, 0, atual)).toEqual({ linhas: [{ rev: 1 }] });

    // Áudio acrescentado: vira proposta de áudio, sem história nova.
    const g = await audioRecebido(livroA, s);
    expect(await iniciar(g)).toEqual({ historia: s, motivo: "acrescentar" });
    expect(
      await sql(
        `select count(*)::int as n from public.stories where book_id = $1`,
        [livroA],
      ),
    ).toEqual([{ n: expect.any(Number) }]);
    const pa = await propostaDe(s, "audio");
    expect(pa).toMatchObject({ estado: "gerando", gravacoes: [g] });
    const insere: Mudanca = {
      id: "m1",
      tira: [],
      poe: [par("n-a1", "Quatro, do áudio novo.", [4])],
      depois_de: "p3",
    };
    expect(await gravar(pa.id, [insere])).toBe(true);
    const comAudio = [...atual, insere.poe[0]];
    expect(await aplicar(ana, s, a, 1, pa.id, ["m1"], comAudio)).toBe(2);

    // Tamanho: a IA "reescreveu" tudo, mas o p2 só entra como está.
    const pt = await pedir(ana, s, a, "tamanho", "longo");
    const mt: Mudanca[] = [
      {
        id: "m1",
        tira: [{ id: "p1", texto: "Um." }],
        poe: [par("n-t1", "Um, bem mais longo.", [1])],
        depois_de: null,
      },
      {
        id: "m2",
        tira: [
          { id: "p3", texto: "Três." },
          { id: "n-a1", texto: "Quatro, do áudio novo." },
        ],
        poe: [par("n-t2", "Três e quatro, juntos.", [3, 4])],
        depois_de: null,
      },
    ];
    expect(await gravar(pt, mt, ["n-t1", "p2", "n-t2"])).toBe(true);
    // Um texto final que mexe no p2 é recusado pelo banco.
    expect(
      await aplicar(
        ana,
        s,
        a,
        2,
        pt,
        ["m1", "m2"],
        [
          mt[0].poe[0],
          { ...p2, texto: "Dois, reescrito pela IA." },
          mt[1].poe[0],
        ],
      ),
    ).toBe("travado_alterado");
    expect(
      await aplicar(
        ana,
        s,
        a,
        2,
        pt,
        ["m1", "m2"],
        [mt[0].poe[0], p2, mt[1].poe[0]],
      ),
    ).toBe(3);

    const final = await texto(s);
    expect(final.texto!.paragrafos[1]).toEqual(p2);
    // Título e ano são os do texto atual, nunca os mandados no aceite.
    expect(final.texto!.titulo).toBe("O trem");
    const versoes = await sql(
      `select numero, origem, tamanho, proposta_id is not null as proposta, modelos
       from public.story_versions where story_id = $1 order by numero`,
      [s],
    );
    expect(versoes).toEqual([
      {
        numero: 1,
        origem: "ia",
        tamanho: "medio",
        proposta: false,
        modelos: null,
      },
      {
        numero: 2,
        origem: "responsavel",
        tamanho: "medio",
        proposta: false,
        modelos: null,
      },
      {
        numero: 3,
        origem: "ia",
        tamanho: "medio",
        proposta: true,
        modelos: { capaz: "modelo" },
      },
      {
        numero: 4,
        origem: "ia",
        tamanho: "longo",
        proposta: true,
        modelos: { capaz: "modelo" },
      },
    ]);
    // Proposta decidida não muda.
    await expect(
      db.query(`update public.story_proposals set erro = 'x' where id = $1`, [
        pt,
      ]),
    ).rejects.toThrow("versao_imutavel");
    await expect(
      db.query(`delete from public.story_proposals where id = $1`, [pt]),
    ).rejects.toThrow("versao_imutavel");
  });
});

describe("aplicar_proposta confere tudo no banco", () => {
  async function preparar() {
    const s = await historiaPronta(livroA);
    const a = aba();
    await pegarTrava(ana, s, a);
    const atual = [
      par("p1", "Um.", [1]),
      par("p2", "Dois, editado.", [2], true),
      par("p3", "Três.", [3]),
    ];
    await salvar(ana, s, a, 0, atual);
    const p = (await pedir(ana, s, a, "tamanho", "curto")) as string;
    const m: Mudanca[] = [
      {
        id: "m1",
        tira: [{ id: "p1", texto: "Um." }],
        poe: [par("n-c1", "Um curto.", [1])],
        depois_de: null,
      },
      {
        id: "m2",
        tira: [{ id: "p3", texto: "Três." }],
        poe: [par("n-c3", "Três curto.", [3])],
        depois_de: null,
      },
    ];
    expect(await gravar(p, m)).toBe(true);
    return { s, a, p, m, atual };
  }

  it("aceite parcial: só a mudança escolhida entra; o resto fica", async () => {
    const { s, a, p, m, atual } = await preparar();
    expect(
      await aplicar(ana, s, a, 1, p, ["m1"], [m[0].poe[0], atual[1], atual[2]]),
    ).toBe(2);
    const [pr] = await sql(
      `select estado, aplicadas from public.story_proposals where id = $1`,
      [p],
    );
    expect(pr).toEqual({ estado: "aplicada", aplicadas: ["m1"] });
  });

  it("recusa reordenar o que fica, parágrafo a mais, a menos, id repetido e colisão de id", async () => {
    const { s, a, p, m, atual } = await preparar();
    const n1 = m[0].poe[0];
    expect(
      await aplicar(ana, s, a, 1, p, ["m1"], [n1, atual[2], atual[1]]),
    ).toBe("dados_invalidos");
    expect(
      await aplicar(
        ana,
        s,
        a,
        1,
        p,
        ["m1"],
        [n1, atual[1], atual[2], par("x-1", "Inventado.", [9])],
      ),
    ).toBe("dados_invalidos");
    expect(await aplicar(ana, s, a, 1, p, ["m1"], [n1, atual[1]])).toBe(
      "proposta_vencida",
    );
    expect(await aplicar(ana, s, a, 1, p, ["m1"], [atual[1], atual[2]])).toBe(
      "dados_invalidos",
    );
    expect(await aplicar(ana, s, a, 1, p, ["m1"], [n1, n1, atual[2]])).toBe(
      "dados_invalidos",
    );
    expect(
      await aplicar(ana, s, a, 1, p, ["m9"], [n1, atual[1], atual[2]]),
    ).toBe("dados_invalidos");
    expect(
      await aplicar(ana, s, a, 0, p, ["m1"], [n1, atual[1], atual[2]]),
    ).toBe("texto_desatualizado");
  });

  it("mudança vencida: o parágrafo mudou depois do pedido", async () => {
    const { s, a, p, m, atual } = await preparar();
    const mexido = [par("p1", "Um, mexido.", [1], true), atual[1], atual[2]];
    await salvar(ana, s, a, 1, mexido);
    expect(
      await aplicar(ana, s, a, 2, p, ["m1"], [m[0].poe[0], atual[1], atual[2]]),
    ).toBe("proposta_vencida");
    // A outra mudança, que não toca no p1, continua valendo.
    expect(
      await aplicar(
        ana,
        s,
        a,
        2,
        p,
        ["m2"],
        [mexido[0], atual[1], m[1].poe[0]],
      ),
    ).toBe(3);
  });

  it("mudança que tira um travado é recusada (salvo o alvo do trecho)", async () => {
    const { s, a, atual } = await preparar();
    await sql(
      `update public.story_proposals set estado = 'descartada', decidida_em = now() where story_id = $1 and estado = 'pronta'`,
      [s],
    );
    const p = (await pedir(ana, s, a, "tamanho", "resumido")) as string;
    const m: Mudanca[] = [
      {
        id: "m1",
        tira: [{ id: "p2", texto: "Dois, editado." }],
        poe: [par("n-x", "Dois resumido.", [2])],
        depois_de: null,
      },
    ];
    expect(await gravar(p, m)).toBe(true);
    expect(
      await aplicar(ana, s, a, 1, p, ["m1"], [atual[0], m[0].poe[0], atual[2]]),
    ).toBe("travado_alterado");

    // Revisar trecho dentro do travado: pode, e o novo continua travado.
    const t = (await pedir(ana, s, a, "trecho", null, {
      paragrafo: "p2",
      inicio: 0,
      fim: 4,
      instrucao: "corrigir",
    })) as string;
    const novo = par("n-r", "Dois, corrigido.", [2], true);
    expect(
      await gravar(t, [
        {
          id: "m1",
          tira: [{ id: "p2", texto: "Dois, editado." }],
          poe: [novo],
          depois_de: null,
        },
      ]),
    ).toBe(true);
    expect(
      await aplicar(ana, s, a, 1, t, ["m1"], [atual[0], novo, atual[2]]),
    ).toBe(2);
  });

  it("sem a trava desta tela, nada feito", async () => {
    const { s, p, m, atual } = await preparar();
    expect(
      await aplicar(
        ana,
        s,
        aba(),
        1,
        p,
        ["m1"],
        [m[0].poe[0], atual[1], atual[2]],
      ),
    ).toBe("trava_de_outro");
  });
});

describe("pedir_proposta", () => {
  it("valida o pedido de trecho e a trava", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await pegarTrava(ana, s, a);
    // Outra tela da mesma pessoa não pede (a trava é da tela).
    expect(await pedir(ana, s, aba(), "tamanho", "longo")).toBe(
      "trava_de_outro",
    );
    const t = (o: object) => pedir(ana, s, a, "trecho", null, o);
    expect(
      await t({ paragrafo: "p2", inicio: 0, fim: 4, instrucao: "livre" }),
    ).toBe("dados_invalidos");
    expect(
      await t({ paragrafo: "p2", inicio: 0.5, fim: 4, instrucao: "curto" }),
    ).toBe("dados_invalidos");
    expect(
      await t({ paragrafo: "p2", inicio: "0", fim: 4, instrucao: "curto" }),
    ).toBe("dados_invalidos");
    expect(
      await t({ paragrafo: "p2", inicio: 3, fim: 2, instrucao: "curto" }),
    ).toBe("dados_invalidos");
    expect(
      await t({ paragrafo: "p2", inicio: 0, fim: 99, instrucao: "curto" }),
    ).toBe("dados_invalidos");
    expect(
      await t({ paragrafo: "p9", inicio: 0, fim: 2, instrucao: "curto" }),
    ).toBe("dados_invalidos");
    expect(
      await t({
        paragrafo: "p2",
        inicio: 0,
        fim: 2,
        instrucao: "curto",
        texto: "x",
      }),
    ).toBe("dados_invalidos");
    expect(
      await t({
        paragrafo: "p2",
        inicio: 0,
        fim: 2,
        instrucao: "livre",
        texto: "x".repeat(301),
      }),
    ).toBe("dados_invalidos");
    expect(
      await t({
        paragrafo: "p2",
        inicio: 0,
        fim: 2,
        instrucao: "livre",
        texto: "mais simples",
      }),
    ).toMatch(/^[0-9a-f-]{36}$/);
    expect(await pedir(ana, s, a, "tamanho", "enorme")).toBe("dados_invalidos");
    expect(await pedir(ana, s, a, "audio")).toBe("dados_invalidos"); // nenhum áudio fora do texto
  });

  it("um pendente por tipo: o pronto é descartado; o gerando recusa", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await pegarTrava(ana, s, a);
    const p1 = (await pedir(ana, s, a, "tamanho", "longo")) as string;
    expect(await pedir(ana, s, a, "tamanho", "curto")).toBe(
      "proposta_em_andamento",
    );
    await gravar(p1, [
      {
        id: "m1",
        tira: [{ id: "p1", texto: "Um." }],
        poe: [par("n-1", "Um longo.", [1])],
        depois_de: null,
      },
    ]);
    const p2 = (await pedir(ana, s, a, "tamanho", "curto")) as string;
    expect(p2).not.toBe(p1);
    const [x] = await sql(
      `select estado from public.story_proposals where id = $1`,
      [p1],
    );
    expect(x).toEqual({ estado: "descartada" });
  });

  it("trecho parado há mais de 3 min não bloqueia um novo", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await pegarTrava(ana, s, a);
    const pedido = { paragrafo: "p1", inicio: 0, fim: 2, instrucao: "curto" };
    const t1 = (await pedir(ana, s, a, "trecho", null, pedido)) as string;
    expect(await pedir(ana, s, a, "trecho", null, pedido)).toBe(
      "proposta_em_andamento",
    );
    await sql(
      `update public.story_proposals set pedida_em = now() - interval '4 minutes' where id = $1`,
      [t1],
    );
    expect(await pedir(ana, s, a, "trecho", null, pedido)).toMatch(
      /^[0-9a-f-]{36}$/,
    );
    const [x] = await sql(
      `select estado, erro from public.story_proposals where id = $1`,
      [t1],
    );
    expect(x).toEqual({ estado: "falhou", erro: "parada" });
  });

  it("40 pedidos por livro em 24 h", async () => {
    const s = await historiaPronta(livroB);
    const a = aba();
    await pegarTrava(beto, s, a);
    await sql(
      `insert into public.story_proposals (story_id, book_id, tipo, estado, tamanho, erro)
       select $1, $2, 'trecho', 'falhou', 'medio', 'parada' from generate_series(1, 40)`,
      [s, livroB],
    );
    expect(await pedir(beto, s, a, "tamanho", "longo")).toBe("cota_ia_diaria");
  });

  it("sem consentimento de IA, nada", async () => {
    const u = await criarUsuario(db, "sem@exemplo.com");
    const livro = await ativarPlano(db, u, "Sem");
    const s = await historiaPronta(livro);
    const a = aba();
    await pegarTrava(u, s, a);
    expect(await pedir(u, s, a, "tamanho", "longo")).toBe("sem_consentimento");
    const g = await audioRecebido(livro, s);
    expect(await iniciar(g)).toEqual({
      historia: null,
      motivo: "sem_consentimento",
    });
  });
});

describe("áudio acrescentado", () => {
  it("tetos, história indisponível e a proposta nova cobrindo a anterior", async () => {
    const s = await historiaPronta(livroA);
    expect(await iniciar(await audioRecebido(livroA, s, 1800))).toMatchObject({
      motivo: "acrescentar",
    });
    // Gerando: o 2º espera (o Inngest tenta de novo).
    const g2 = await audioRecebido(livroA, s, 60);
    await expect(iniciar(g2)).rejects.toThrow("proposta_em_andamento");
    const p1 = await propostaDe(s, "audio");
    await gravar(p1.id, [
      { id: "m1", tira: [], poe: [par("n-1", "Mais.", [5])], depois_de: null },
    ]);
    expect(await iniciar(g2)).toMatchObject({ motivo: "acrescentar" });
    const p2 = await propostaDe(s, "audio");
    expect(p2.gravacoes).toHaveLength(2);
    const [x] = await sql(
      `select estado from public.story_proposals where id = $1`,
      [p1.id],
    );
    expect(x).toEqual({ estado: "descartada" });
    // 1800 + 60 + 1800 passa de 60 min de fala.
    expect(await iniciar(await audioRecebido(livroA, s, 1800))).toEqual({
      historia: null,
      motivo: "longa",
    });

    const ouvindo = (
      await sql<{ id: string }>(
        `insert into public.stories (book_id) values ($1) returning id`,
        [livroA],
      )
    )[0].id;
    expect(await iniciar(await audioRecebido(livroA, ouvindo))).toEqual({
      historia: null,
      motivo: "historia_indisponivel",
    });
  });

  it("o membro só cria áudio acrescentado de até 30 min, para história pronta do próprio livro", async () => {
    const s = await historiaPronta(livroA);
    const deB = await historiaPronta(livroB);
    const ouvindo = (
      await sql<{ id: string }>(
        `insert into public.stories (book_id) values ($1) returning id`,
        [livroA],
      )
    )[0].id;
    const inserir = (
      story: string,
      duracao: number,
      lote: string | null = null,
    ) => {
      const id = crypto.randomUUID();
      return comoMembro(
        ana,
        `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type,
           tamanho_bytes, duracao_s, para_historia, lote_id, lote_total, lote_ordem)
         values ($1, $2, 'upload', 'a.m4a', $3, 'audio/mp4', 100, $4, $5, $6, $7, $8)`,
        [
          id,
          livroA,
          `livros/${livroA}/audios/${id}.m4a`,
          duracao,
          story,
          lote,
          lote ? 1 : null,
          lote ? 1 : null,
        ],
      );
    };
    expect(await inserir(s, 600)).toEqual({ linhas: [] });
    expect("erro" in (await inserir(s, 1801))).toBe(true);
    expect("erro" in (await inserir(deB, 60))).toBe(true);
    expect("erro" in (await inserir(ouvindo, 60))).toBe(true);
    expect("erro" in (await inserir(s, 60, crypto.randomUUID()))).toBe(true);
  });

  it("tamanho espera o áudio virar proposta; tamanho aceito em parte deixa o áudio fora do texto", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await pegarTrava(ana, s, a);
    const g = await audioRecebido(livroA, s);
    await iniciar(g);
    expect(await pedir(ana, s, a, "tamanho", "longo")).toBe(
      "proposta_em_andamento",
    );
    const pa = await propostaDe(s, "audio");
    await gravar(pa.id, [
      { id: "m1", tira: [], poe: [par("n-1", "Novo.", [4])], depois_de: null },
    ]);
    await sql(
      `update public.story_proposals set estado = 'descartada', decidida_em = now() where id = $1`,
      [pa.id],
    );
    const pt = (await pedir(ana, s, a, "tamanho", "longo")) as string;
    await gravar(pt, [
      {
        id: "m1",
        tira: [{ id: "p1", texto: "Um." }],
        poe: [par("n-t1", "Um longo.", [1])],
        depois_de: null,
      },
      {
        id: "m2",
        tira: [],
        poe: [par("n-t2", "Do áudio.", [4])],
        depois_de: "p3",
      },
    ]);
    const atual = [
      par("p1", "Um.", [1]),
      par("p2", "Dois.", [2]),
      par("p3", "Três.", [3]),
    ];
    expect(
      await aplicar(
        ana,
        s,
        a,
        0,
        pt,
        ["m1"],
        [par("n-t1", "Um longo.", [1]), atual[1], atual[2]],
      ),
    ).toBe(1);
    // Ficou de fora: dá para pedir "usar este áudio no texto".
    expect(await pedir(ana, s, a, "audio")).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("servico_* e isolamento", () => {
  it("formato das mudanças, trecho com uma mudança só e erro sem texto", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await pegarTrava(ana, s, a);
    const t = (await pedir(ana, s, a, "trecho", null, {
      paragrafo: "p1",
      inicio: 0,
      fim: 2,
      instrucao: "curto",
    })) as string;
    const dois = {
      id: "m1",
      tira: [{ id: "p1", texto: "Um." }],
      poe: [par("n-1", "A", [1], true), par("n-2", "B", [1], true)],
      depois_de: null,
    };
    await expect(gravar(t, [dois])).rejects.toThrow("dados_invalidos");
    const naoTravado = {
      id: "m1",
      tira: [{ id: "p1", texto: "Um." }],
      poe: [par("n-1", "A", [1], false)],
      depois_de: null,
    };
    await expect(gravar(t, [naoTravado])).rejects.toThrow("dados_invalidos");
    const outro = {
      id: "m1",
      tira: [{ id: "p2", texto: "Dois." }],
      poe: [par("n-1", "A", [2], true)],
      depois_de: null,
    };
    await expect(gravar(t, [outro])).rejects.toThrow("dados_invalidos");
    expect(
      (
        await sql<{ ok: boolean }>(
          `select public.servico_falhar_proposta($1, 'Texto da Fala!') as ok`,
          [t],
        )
      )[0].ok,
    ).toBe(true);
    const [x] = await sql(
      `select erro from public.story_proposals where id = $1`,
      [t],
    );
    expect(x).toEqual({ erro: "erro_inesperado" });
  });

  it("outro livro não lê; anon e porta_autor nada", async () => {
    const s = await historiaPronta(livroA);
    const a = aba();
    await pegarTrava(ana, s, a);
    await pedir(ana, s, a, "tamanho", "longo");
    const leB = await comoMembro(
      beto,
      `select id from public.story_proposals where story_id = $1`,
      [s],
    );
    expect(leB).toEqual({ linhas: [] });
    const leA = await comoMembro(
      ana,
      `select id, mudancas from public.story_proposals where story_id = $1`,
      [s],
    );
    expect(leA.linhas).toHaveLength(1);
    expect(
      await comoMembro(ana, `select travados from public.story_proposals`),
    ).toMatchObject({ erro: expect.any(String) });
    expect(
      await comoMembro(
        ana,
        `update public.story_proposals set estado = 'aplicada'`,
      ),
    ).toMatchObject({ erro: expect.any(String) });
    for (const papel of ["anon", "porta_autor"] as const) {
      const r = await como(db, papel, {}, (tx) =>
        tenta(tx, `select id from public.story_proposals`),
      );
      expect(r.erro).toBeTruthy();
      const f = await como(db, papel, {}, (tx) =>
        tenta(tx, `select public.pedir_proposta($1, $2, 'tamanho', 'longo')`, [
          s,
          a,
        ]),
      );
      expect(f.erro).toBeTruthy();
    }
    const b = await comoMembro(
      beto,
      `select public.pedir_proposta($1, $2, 'tamanho', 'longo')`,
      [s, aba()],
    );
    expect(b).toEqual({ erro: "sem_permissao" });
  });

  it("reversão trava com propostas; forçada passa; sobe de novo", async () => {
    await expect(db.exec(down)).rejects.toThrow(/reversao_com_propostas/);
    await db.exec(`set ecoa.reversao_destrutiva = 'sim'`);
    await db.exec(down);
    await db.exec(up);
    await db.exec(down);
  }, 60_000);
});
