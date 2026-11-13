// Divisão em histórias (prompt 7): contêiner do lote e da conversa, confirmação pelo membro,
// pergunta sugerida, tetos e reversão. Design: docs/designs/divisao-historias.md (seção 5.3).
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ativarPlano,
  como,
  criarBanco,
  criarUsuario,
  reverter,
  tenta,
} from "./banco";

const RAIZ = path.resolve(__dirname, "..");
const up = readFileSync(
  path.join(RAIZ, "migrations/20261117120000_divisao.sql"),
  "utf8",
);
const down = readFileSync(
  path.join(RAIZ, "reversao/20261117120000_divisao.down.sql"),
  "utf8",
);

type Ini = {
  historia: string | null;
  estado: string | null;
  motivo: string | null;
};

describe("divisao", () => {
  it("cenários", async () => {
    const db = await criarBanco();
    const ana = await criarUsuario(db, "ana@x.com");
    const beto = await criarUsuario(db, "beto@x.com");
    const A = await ativarPlano(db, ana, "Nelson");
    const B = await ativarPlano(db, beto, "Zé");
    const C = await ativarPlano(db, beto, "Cota");
    for (const l of [A, B, C])
      await db.query(
        `update public.books set ia_consentimento_em = now(), ia_consentimento_versao = 1 where id = $1`,
        [l],
      );

    async function rec(
      livro: string,
      o: {
        origem?: string;
        lote?: string | null;
        total?: number | null;
        ordem?: number | null;
        dur?: number | null;
        upload?: string;
        nome?: string;
      } = {},
    ) {
      const id = crypto.randomUUID();
      const recebido = (o.upload ?? "recebido") === "recebido";
      const comLote = o.lote != null;
      await db.query(
        `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type, tamanho_bytes,
          duracao_s, upload, recebido_em, lote_id ${comLote && o.total !== null ? ", lote_total, lote_ordem" : ""})
         values ($1,$2,$3::public.recording_origem,$4,$5,'audio/mp4',100,$6,$7::public.recording_upload,$8,$9 ${comLote && o.total !== null ? ",$10,$11" : ""})`,
        [
          id,
          livro,
          o.origem ?? "upload",
          o.nome ?? "a.m4a",
          `livros/${livro}/audios/${id}.m4a`,
          o.dur === undefined ? 120 : o.dur,
          o.upload ?? "recebido",
          recebido ? new Date().toISOString() : null,
          o.lote ?? null,
          ...(comLote && o.total !== null ? [o.total ?? 1, o.ordem ?? 1] : []),
        ],
      );
      return id;
    }

    // Linhas antigas (de antes da migration, sem total): conversa cuja parte 1 tem 30 min.
    const velha = crypto.randomUUID();
    const pa = await rec(B, {
      origem: "conversa",
      lote: velha,
      total: null,
      dur: 1800,
    });
    const svc = <T>(fn: Parameters<typeof como<T>>[3]) =>
      como(db, "service_role", {}, fn);
    const iniciar = (g: string) =>
      svc(
        async (tx) =>
          (
            await tx.query<Ini>(
              `select * from public.servico_iniciar_historia($1)`,
              [g],
            )
          ).rows[0],
      );
    async function transcrever(
      g: string,
      livro: string,
      de: number,
      n: number,
    ) {
      const segs = Array.from({ length: n }, (_, i) => ({
        id: de + i,
        arquivo: "g",
        inicio: i * 10,
        fim: i * 10 + 10,
        falante: "g:s0",
        texto: "x",
      }));
      await svc((tx) =>
        tx.query(
          `insert into public.transcripts (recording_id, book_id, provedor, modelo, segmentos, palavras, minutos) values ($1,$2,'elevenlabs','scribe_v1',$3,'[]',1)`,
          [g, livro, JSON.stringify(segs)],
        ),
      );
    }
    const mudar = (s: string, p: string) =>
      svc(
        async (tx) =>
          (
            await tx.query<{ ok: boolean }>(
              `select public.servico_mudar_etapa($1, $2::public.story_estado) ok`,
              [s, p],
            )
          ).rows[0].ok,
      );
    const propor = (s: string, n: number) =>
      svc(
        async (tx) =>
          (
            await tx.query<{ ok: boolean }>(
              `select public.servico_propor_divisao($1,$2) ok`,
              [
                s,
                JSON.stringify({
                  historias: Array.from({ length: n }, () => ({
                    titulo: "x",
                    segmentos: [[1, 1]],
                  })),
                }),
              ],
            )
          ).rows[0].ok,
      );

    // P43 nas linhas antigas: parte de 30 min sem total → espera; 7 h depois → segue.
    expect((await iniciar(pa)).motivo).toBe("lote_incompleto");
    await db.query(
      `update public.recordings set recebido_em = now() - interval '7 hours' where id = $1`,
      [pa],
    );
    expect((await iniciar(pa)).estado).toBe("ouvindo");

    // Linha nova de lote sem total → recusada pelo CHECK.
    const semTotal = crypto.randomUUID();
    expect(
      await como(db, "authenticated", { sub: ana }, (tx) =>
        tenta(
          tx,
          `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type, tamanho_bytes, lote_id)
       values ($1, $2, 'lote', 'a.m4a', $4, 'audio/mp4', 1, $3)`,
          [
            semTotal,
            A,
            crypto.randomUUID(),
            `livros/${A}/audios/${semTotal}.m4a`,
          ],
        ),
      ),
    ).toEqual({ erro: expect.stringMatching(/row-level security/) });
    const comTotal = crypto.randomUUID();
    expect(
      await como(db, "authenticated", { sub: ana }, (tx) =>
        tenta(
          tx,
          `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type, tamanho_bytes, lote_id, lote_total, lote_ordem)
       values ($1, $2, 'lote', 'a.m4a', $4, 'audio/mp4', 1, $3, 2, 1)`,
          [
            comTotal,
            A,
            crypto.randomUUID(),
            `livros/${A}/audios/${comTotal}.m4a`,
          ],
        ),
      ),
    ).toEqual({ linhas: 0, afetadas: 1 });

    // Lote de 3, chegando fora de ordem (parte 3, depois 1, depois 2): ordem pela posição.
    const lote = crypto.randomUUID();
    const g3 = await rec(A, {
      origem: "lote",
      lote,
      total: 3,
      ordem: 3,
      nome: "IMG-10.opus",
    });
    const g1 = await rec(A, {
      origem: "lote",
      lote,
      total: 3,
      ordem: 1,
      nome: "IMG-2.opus",
    });
    expect((await iniciar(g1)).motivo).toBe("lote_incompleto");
    const g2 = await rec(A, {
      origem: "lote",
      lote,
      total: 3,
      ordem: 2,
      nome: "IMG-3.opus",
    });
    const ini = await iniciar(g2);
    expect(ini.estado).toBe("ouvindo");
    const h = ini.historia!;
    const ordem = await db.query<{ recording_id: string }>(
      `select recording_id from public.story_recordings where story_id = $1 order by ordem`,
      [h],
    );
    expect(ordem.rows.map((r) => r.recording_id)).toEqual([g1, g2, g3]);
    expect((await iniciar(g3)).historia).toBe(h);

    await transcrever(g1, A, 1, 4);
    await transcrever(g2, A, 5, 4);
    await transcrever(g3, A, 9, 4);
    await svc((tx) =>
      tx.query(
        `update public.stories set estrutura = '{"falantes":[],"vazios":[],"mudancasDeAssunto":[5]}' where id = $1`,
        [h],
      ),
    );
    expect(await mudar(h, "dividindo")).toBe(true);
    expect(await propor(h, 3)).toBe(true);
    expect(await propor(h, 3)).toBe(false); // de novo: já está em separar

    const p1 = (
      await db.query<{ id: string }>(
        `insert into public.prompts (book_id, texto, origem) values ($1, 'Como conheceu a vó?', 'propria') returning id`,
        [A],
      )
    ).rows[0].id;
    const pB = (
      await db.query<{ id: string }>(
        `insert into public.prompts (book_id, texto, origem) values ($1, 'Outra', 'propria') returning id`,
        [B],
      )
    ).rows[0].id;

    const confirmar = (u: string, payload: unknown, story = h) =>
      como(db, "authenticated", { sub: u }, (tx) =>
        tenta(tx, `select public.confirmar_divisao($1, $2)`, [
          story,
          JSON.stringify(payload),
        ]),
      );
    const ok3 = [
      { titulo: " Guarapari ", segmentos: [1, 2, 3, 4, 5, 6], prompt_id: p1 },
      { titulo: "", segmentos: [7, 8, 9], sugerida: p1 },
      { titulo: "Fim", segmentos: [10, 11, 12] },
    ];
    expect(await confirmar(beto, ok3)).toEqual({ erro: "sem_permissao" });
    expect(await confirmar(ana, [{ segmentos: [1, 2, 3, 99] }])).toEqual({
      erro: "divisao_invalida",
    });
    expect(
      await confirmar(ana, [
        { segmentos: [1, 2, 3] },
        { segmentos: [3, 4, 5] },
      ]),
    ).toEqual({ erro: "divisao_invalida" });
    expect(
      await confirmar(ana, [{ segmentos: [1, 2, 3], prompt_id: pB }]),
    ).toEqual({ erro: "divisao_invalida" });
    expect(await confirmar(ana, [{ segmentos: ["abc"] }])).toEqual({
      erro: "divisao_invalida",
    });
    expect(await confirmar(ana, [{ segmentos: [1.5] }])).toEqual({
      erro: "divisao_invalida",
    });
    expect(
      await confirmar(ana, [{ segmentos: [1, 2, 3], prompt_id: "zzz" }]),
    ).toEqual({ erro: "divisao_invalida" });
    expect(await confirmar(ana, [{ segmentos: [1, 2, 3], titulo: 5 }])).toEqual(
      { erro: "divisao_invalida" },
    );
    expect(
      await confirmar(ana, [
        { segmentos: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
        { segmentos: [12] },
      ]),
    ).toEqual({ erro: "divisao_curta" });
    expect(
      await como(db, "porta_autor", {}, (tx) =>
        tenta(tx, `select public.confirmar_divisao($1, '[]')`, [h]),
      ),
    ).toHaveProperty("erro");
    expect(
      await como(db, "anon", {}, (tx) =>
        tenta(tx, `select public.confirmar_divisao($1, '[]')`, [h]),
      ),
    ).toHaveProperty("erro");
    const r = await como(
      db,
      "authenticated",
      { sub: ana },
      async (tx) =>
        (
          await tx.query<{ ids: string[] }>(
            `select public.confirmar_divisao($1, $2) ids`,
            [h, JSON.stringify(ok3)],
          )
        ).rows[0].ids,
    );
    expect(r[0]).toBe(h);
    expect(r).toHaveLength(3);
    expect(await confirmar(ana, ok3)).toEqual({
      erro: "divisao_ja_confirmada",
    });

    const st = await db.query<{
      id: string;
      titulo: string | null;
      estado: string;
      prompt_id: string | null;
      pergunta_sugerida: string | null;
      divisao_de: string | null;
      mud: string;
      grav: number;
    }>(
      `select id, titulo, estado::text, prompt_id, pergunta_sugerida, divisao_de, estrutura->>'mudancasDeAssunto' mud,
              jsonb_array_length(coalesce(divisao->'gravacoes','[]')) grav from public.stories where id = any($1)`,
      [r],
    );
    const porId = new Map(st.rows.map((x) => [x.id, x]));
    expect(porId.get(h)).toMatchObject({
      titulo: "Guarapari",
      estado: "ouvindo",
      prompt_id: p1,
      divisao_de: null,
      mud: "[]",
      grav: 3,
    });
    expect(porId.get(r[1])).toMatchObject({
      titulo: null,
      pergunta_sugerida: null,
      divisao_de: h,
    });
    const srs = await db.query<{
      story_id: string;
      recording_id: string;
      ordem: number;
      segmentos: number[];
    }>(
      `select story_id, recording_id, ordem, segmentos from public.story_recordings where story_id = any($1) order by story_id, ordem`,
      [r],
    );
    const de = (s: string) =>
      srs.rows
        .filter((x) => x.story_id === s)
        .map((x) => [x.recording_id, x.ordem, x.segmentos]);
    expect(de(h)).toEqual([
      [g1, 1, [1, 2, 3, 4]],
      [g2, 2, [5, 6]],
    ]);
    expect(de(r[1])).toEqual([
      [g2, 2, [7, 8]],
      [g3, 3, [9]],
    ]);
    expect(de(r[2])).toEqual([[g3, 3, [10, 11, 12]]]);
    expect((await iniciar(g3)).motivo).toBe("dividida");
    // Concluir mantém o título da divisão.
    await svc(async (tx) => {
      await tx.query(
        `select public.servico_mudar_etapa($1, 'escrevendo'::public.story_estado)`,
        [h],
      );
      await tx.query(
        `update public.stories set rascunho = '{"edicao":{"titulo":"Outro","paragrafos":[],"lacunas":[]}}' where id = $1`,
        [h],
      );
      await tx.query(
        `select public.servico_concluir_historia($1,'medio','{}','{}')`,
        [h],
      );
    });
    expect(
      (
        await db.query<{ titulo: string }>(
          `select titulo from public.stories where id = $1`,
          [h],
        )
      ).rows[0].titulo,
    ).toBe("Guarapari");
    // Filha não pode ir para dividindo.
    expect(await mudar(r[1], "dividindo")).toBe(false);

    // 4º arquivo do lote chegando depois → história própria.
    const g4 = await rec(A, {
      origem: "lote",
      lote,
      total: 3,
      ordem: 3,
      nome: "4.opus",
    });
    const i4 = await iniciar(g4);
    expect(i4.estado).toBe("ouvindo");
    expect(i4.historia).not.toBe(h);

    // Sugestão
    const p2 = (
      await db.query<{ id: string }>(
        `insert into public.prompts (book_id, texto, origem) values ($1, 'Escola?', 'propria') returning id`,
        [A],
      )
    ).rows[0].id;
    expect(
      (
        await svc((tx) =>
          tx.query<{ ok: boolean }>(
            `select public.servico_sugerir_pergunta($1,$2) ok`,
            [r[2], p2],
          ),
        )
      ).rows[0].ok,
    ).toBe(true);
    expect(
      (
        await svc((tx) =>
          tx.query<{ ok: boolean }>(
            `select public.servico_sugerir_pergunta($1,$2) ok`,
            [r[2], pB],
          ),
        )
      ).rows[0].ok,
    ).toBe(false);
    expect(
      await como(db, "authenticated", { sub: beto }, (tx) =>
        tenta(tx, `select public.responder_sugestao($1, true)`, [r[2]]),
      ),
    ).toEqual({ erro: "sem_permissao" });
    expect(
      (
        await como(db, "authenticated", { sub: ana }, (tx) =>
          tx.query<{ ok: boolean }>(
            `select public.responder_sugestao($1, null) ok`,
            [r[2]],
          ),
        )
      ).rows[0].ok,
    ).toBe(false);
    await como(db, "authenticated", { sub: ana }, (tx) =>
      tx.query(`select public.responder_sugestao($1, true)`, [r[2]]),
    );
    expect(
      (
        await db.query<{ estado: string }>(
          `select estado::text from public.prompts where id = $1`,
          [p2],
        )
      ).rows[0].estado,
    ).toBe("respondida");

    // Gatilho excluído: lote de 3 em que o último a chegar passa de 2 h → contêiner dos outros dois.
    const l3 = crypto.randomUUID();
    const x1 = await rec(B, { origem: "lote", lote: l3, total: 3, ordem: 1 });
    const x2 = await rec(B, { origem: "lote", lote: l3, total: 3, ordem: 2 });
    const x3 = await rec(B, {
      origem: "lote",
      lote: l3,
      total: 3,
      ordem: 3,
      dur: 7300,
    });
    const ix = await iniciar(x3);
    expect(ix.estado).toBe("ouvindo");
    const membros = await db.query<{ recording_id: string }>(
      `select recording_id from public.story_recordings where story_id = $1 order by ordem`,
      [ix.historia],
    );
    expect(membros.rows.map((m) => m.recording_id)).toEqual([x1, x2]);
    expect((await iniciar(x3)).motivo).toBe("longa");

    // Descartar tudo: contêiner encerra, gravações saem da fila.
    await transcrever(x1, B, 1, 3);
    await transcrever(x2, B, 4, 3);
    await svc((tx) =>
      tx.query(
        `update public.stories set estrutura = '{"falantes":[],"vazios":[],"mudancasDeAssunto":[]}' where id = $1`,
        [ix.historia],
      ),
    );
    await mudar(ix.historia!, "dividindo");
    await propor(ix.historia!, 1);
    expect(await confirmar(beto, [], ix.historia!)).toEqual({
      linhas: 1,
      afetadas: 0,
    });
    const fim = await db.query<{ estado: string; erro: string }>(
      `select estado::text, erro from public.stories where id = $1`,
      [ix.historia],
    );
    expect(fim.rows[0]).toEqual({ estado: "falhou", erro: "tudo_descartado" });
    expect((await iniciar(x1)).motivo).toBe("dividida"); // ainda ligado ao contêiner encerrado

    // D9: arquivo único de 90 min é processado inteiro; história de mais de 60 min é recusada.
    const longo = await rec(B, { dur: 5400 });
    const il = await iniciar(longo);
    expect(il.estado).toBe("ouvindo");
    const segs = Array.from({ length: 2 }, (_, i) => ({
      id: i + 1,
      arquivo: "g1",
      inicio: i * 2700,
      fim: i * 2700 + 2700,
      falante: "g1:s0",
      texto: "x",
    }));
    await svc((tx) =>
      tx.query(
        `insert into public.transcripts (recording_id, book_id, provedor, modelo, segmentos, palavras, minutos) values ($1,$2,'elevenlabs','scribe_v1',$3,'[]',90)`,
        [longo, B, JSON.stringify(segs)],
      ),
    );
    await svc((tx) =>
      tx.query(
        `update public.stories set estrutura = '{"falantes":[],"vazios":[],"mudancasDeAssunto":[2]}' where id = $1`,
        [il.historia],
      ),
    );
    await mudar(il.historia!, "dividindo");
    await propor(il.historia!, 2);
    expect(
      await confirmar(beto, [{ segmentos: [1, 2] }], il.historia!),
    ).toEqual({ erro: "divisao_longa" });
    // Tirar a 2ª metade inteira: ela não volta para a fila.
    expect(await confirmar(beto, [{ segmentos: [1] }], il.historia!)).toEqual({
      linhas: 1,
      afetadas: 0,
    });
    const sr = await db.query<{ segmentos: number[] }>(
      `select segmentos from public.story_recordings where story_id = $1`,
      [il.historia],
    );
    expect(sr.rows).toEqual([{ segmentos: [1] }]);

    // Cota com reserva: 3 lotes de 4 × 30 min (120 min cada) no livro C → o 3º espera.
    const lotes = [];
    for (let k = 0; k < 3; k++) {
      const l = crypto.randomUUID();
      const ids = [];
      for (let i = 1; i <= 4; i++)
        ids.push(
          await rec(C, {
            origem: "lote",
            lote: l,
            total: 4,
            ordem: i,
            dur: 1800,
          }),
        );
      lotes.push(ids);
    }
    expect((await iniciar(lotes[0][3])).estado).toBe("ouvindo");
    expect((await iniciar(lotes[1][3])).estado).toBe("ouvindo");
    expect((await iniciar(lotes[2][3])).motivo).toBe("cota_diaria");

    // Membro de outro livro não lê a divisão.
    expect(
      (
        await como(db, "authenticated", { sub: beto }, (tx) =>
          tx.query(`select divisao from public.stories where id = $1`, [h]),
        )
      ).rows,
    ).toHaveLength(0);
    const leA = await como(db, "authenticated", { sub: ana }, (tx) =>
      tx.query<{ divisao: { final: unknown[] } }>(
        `select divisao from public.stories where id = $1`,
        [h],
      ),
    );
    expect(leA.rows[0].divisao.final).toHaveLength(3);

    // Reversão trava; forçada passa; sobe e desce de novo; reversão completa.
    await expect(db.exec(down)).rejects.toThrow(/reversao_com_divisao/);
    await db.exec(`set ecoa.reversao_destrutiva = 'sim'`);
    await db.exec(down);
    await db.exec(up);
    await db.exec(down);
    await reverter(db);
  }, 60_000);
});
