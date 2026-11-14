// Montar e publicar o livro (prompt 13): book_layouts, book_exports e QR de mensagem.
// Design: docs/designs/montar-publicar-livro.md.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { ativarPlano, como, criarBanco, criarUsuario } from "./banco";

const RAIZ = path.resolve(__dirname, "..");
const up = readFileSync(
  path.join(RAIZ, "migrations/20261123120000_montar_livro.sql"),
  "utf8",
);
const down = readFileSync(
  path.join(RAIZ, "reversao/20261123120000_montar_livro.down.sql"),
  "utf8",
);

let db: PGlite;
let ana: string; // responsável do livro A
let caio: string; // co-facilitador do livro A
let beto: string; // responsável do livro B
let livroA: string;
let livroB: string;
let acessoA: string;

async function sql<T = Record<string, unknown>>(q: string, p: unknown[] = []) {
  return (await db.query<T>(q, p)).rows;
}

type Resposta =
  | { linhas: Record<string, unknown>[]; erro?: undefined }
  | { erro: string; linhas?: undefined };

async function comoPapel(
  papel: "authenticated" | "service_role" | "anon" | "porta_autor",
  usuario: string | null,
  q: string,
  p: unknown[] = [],
): Promise<Resposta> {
  return como(db, papel, usuario ? { sub: usuario } : {}, async (tx) => {
    await tx.exec("savepoint s");
    try {
      const linhas = (await tx.query<Record<string, unknown>>(q, p)).rows;
      await tx.exec("release savepoint s");
      return { linhas };
    } catch (e) {
      await tx.exec("rollback to savepoint s");
      return { erro: (e as Error).message };
    }
  });
}
const comoMembro = (u: string, q: string, p: unknown[] = []) =>
  comoPapel("authenticated", u, q, p);
const servico = (q: string, p: unknown[] = []) =>
  comoPapel("service_role", null, q, p);

async function historia(
  livro: string,
  o: { titulo?: string | null; revisada?: boolean; audio?: boolean } = {},
) {
  const titulo = o.titulo === undefined ? "O trem" : o.titulo;
  const texto = {
    titulo: titulo ?? "",
    ano: 1962,
    paragrafos: [
      {
        id: "p1",
        texto: "Meu pai trabalhava na estrada de ferro.",
        fontes: [],
        editado: false,
      },
      { id: "p2", texto: "  ", fontes: [], editado: false },
      {
        id: "p3",
        texto: "Toda manhã o apito acordava a rua.",
        fontes: [],
        editado: false,
      },
    ],
    lacunas: [],
  };
  const [{ id }] = await sql<{ id: string }>(
    `insert into public.stories (book_id, estado, pronta_em, titulo, ano, revisada_em, texto)
     values ($1, 'pronta', now(), $2, 1962, $3, $4) returning id`,
    [
      livro,
      titulo,
      o.revisada === false ? null : new Date().toISOString(),
      texto,
    ],
  );
  if (o.audio !== false) {
    const g = crypto.randomUUID();
    await sql(
      `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type, tamanho_bytes,
        duracao_s, upload, recebido_em)
       values ($1, $2, 'upload', 'a.m4a', $3, 'audio/mp4', 100, 120, 'recebido', now())`,
      [g, livro, `livros/${livro}/audios/${g}.m4a`],
    );
    await sql(
      `insert into public.story_recordings (story_id, recording_id, book_id, ordem) values ($1, $2, $3, 1)`,
      [id, g, livro],
    );
  }
  return id;
}

async function mensagem(livro: string, acesso: string, comAudio: boolean) {
  const id = crypto.randomUUID();
  await sql(
    `insert into public.family_messages (id, book_id, access_id, aparelho_hash, nome, relacao, estado,
       audio_caminho, audio_recebido_em, duracao_s, texto, texto_enviado, consentimento_em,
       consentimento_versao, enviada_em, no_livro, transcricao)
     values ($1, $2, $3, $4, 'Bia', 'neta', 'enviada', $5, $6, $7, 'Vô, obrigada.', 'Vô, obrigada.',
       now(), 1, now(), true, $8)`,
    [
      id,
      livro,
      acesso,
      "a".repeat(64),
      comAudio ? `livros/${livro}/mensagens/${id}.webm` : null,
      comAudio ? new Date().toISOString() : null,
      comAudio ? 40 : null,
      comAudio ? "vô obrigada" : null,
    ],
  );
  return id;
}

async function conteudo(usuario: string, livro: string) {
  const r = await comoMembro(
    usuario,
    `select public.montagem_conteudo($1) as c`,
    [livro],
  );
  return (r.linhas?.[0]?.c ?? { erro: r.erro }) as Record<string, any>;
}

async function salvar(
  usuario: string,
  livro: string,
  rev: number,
  o: Partial<{
    titulo: string | null;
    cor: string;
    ordemH: string[];
    ordemM: string[];
    fora: string[];
    foto: string | null;
  }> = {},
) {
  const r = await comoMembro(
    usuario,
    `select public.montagem_salvar($1, $2, $3, null, null, $4, $5, $6::uuid[], $7::uuid[], $8::uuid[]) as rev`,
    [
      livro,
      rev,
      o.titulo === undefined ? "Histórias do Jair" : o.titulo,
      o.foto ?? null,
      o.cor ?? "terracota",
      o.ordemH ?? [],
      o.ordemM ?? [],
      o.fora ?? [],
    ],
  );
  return r.erro ? { erro: r.erro } : { rev: Number(r.linhas![0].rev) };
}

async function publicar(usuario: string, livro: string, hash?: string) {
  const h =
    hash ?? (await conteudo(usuario === caio ? ana : usuario, livro)).hash;
  const r = await comoMembro(
    usuario,
    `select export_id, versao, pedir_audio from public.publicar_livro($1, $2)`,
    [livro, h],
  );
  return r.erro ? { erro: r.erro } : (r.linhas![0] as Record<string, any>);
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  caio = await criarUsuario(db, "caio@exemplo.com");
  beto = await criarUsuario(db, "beto@exemplo.com");
  livroA = await ativarPlano(db, ana, "Jair");
  livroB = await ativarPlano(db, beto, "Lia");
  await sql(
    `insert into public.book_members (book_id, user_id, papel) values ($1, $2, 'cofacilitador')`,
    [livroA, caio],
  );
  acessoA = crypto.randomUUID();
  await sql(
    `insert into public.message_access (id, book_id, token_hash) values ($1, $2, $3)`,
    [acessoA, livroA, "b".repeat(64)],
  );
});

describe("privilégios", () => {
  it("anon e porta_autor não alcançam book_layouts nem book_exports", async () => {
    for (const papel of ["anon", "porta_autor"]) {
      for (const t of ["book_layouts", "book_exports"]) {
        const [r] = await sql<{ t: boolean; c: boolean }>(
          `select has_table_privilege($1, $2, 'select') as t,
                  has_any_column_privilege($1, $2, 'select') as c`,
          [papel, `public.${t}`],
        );
        expect(r).toEqual({ t: false, c: false });
      }
    }
  });

  it("o membro não lê o conteúdo congelado nem escreve direto", async () => {
    const [r] = await sql<Record<string, boolean>>(
      `select has_column_privilege('authenticated', 'public.book_exports', 'conteudo', 'select') as conteudo,
              has_table_privilege('authenticated', 'public.book_exports', 'insert') as ins,
              has_table_privilege('authenticated', 'public.book_layouts', 'update') as upd`,
    );
    expect(r).toEqual({ conteudo: false, ins: false, upd: false });
  });

  it("anon e porta_autor não executam as funções novas", async () => {
    for (const papel of ["anon", "porta_autor"]) {
      for (const f of [
        "public.montagem_conteudo(uuid)",
        "public.publicar_livro(uuid, text)",
        "public.servico_export_conteudo(uuid)",
      ]) {
        const [r] = await sql<{ x: boolean }>(
          `select has_function_privilege($1, $2, 'execute') as x`,
          [papel, f],
        );
        expect(r.x).toBe(false);
      }
    }
  });
});

describe("contratos", () => {
  it("as funções internas novas não são executáveis por nenhum papel de fora", async () => {
    for (const papel of ["anon", "authenticated", "porta_autor"]) {
      for (const f of [
        "privado.conteudo_do_livro(uuid, boolean)",
        "privado.qr_inserir(uuid, uuid, uuid)",
        "privado.fonte_audio_da_mensagem(uuid)",
        "privado.hash_conteudo(jsonb)",
      ]) {
        const [r] = await sql<{ x: boolean }>(
          `select has_function_privilege($1, $2, 'execute') as x`,
          [papel, f],
        );
        expect(r.x, `${papel} ${f}`).toBe(false);
      }
    }
  });

  it("authenticated lê exatamente estas colunas", async () => {
    const colunas = async (t: string) =>
      (
        await sql<{ c: string }>(
          `select column_name as c from information_schema.column_privileges
           where grantee = 'authenticated' and table_schema = 'public' and table_name = $1
             and privilege_type = 'SELECT' order by 1`,
          [t],
        )
      ).map((x) => x.c);
    expect(await colunas("book_exports")).toEqual([
      "book_id",
      "capa_bytes",
      "criado_em",
      "erro",
      "espec",
      "estado",
      "id",
      "lombada_mm",
      "miolo_bytes",
      "paginas",
      "pasta",
      "publicado_por",
      "qr_esperados",
      "terminado_em",
      "versao",
    ]);
    expect(await colunas("montagem_usos")).toEqual([]);
  });

  it("teto de usos da montagem por pessoa e minuto", async () => {
    const usos: boolean[] = [];
    for (let i = 0; i < 31; i++) {
      const r = await comoMembro(
        caio,
        `select public.montagem_reservar_uso($1) as ok`,
        [livroA],
      );
      usos.push(Boolean(r.linhas?.[0].ok));
    }
    expect(usos.filter(Boolean)).toHaveLength(30);
    expect(usos[30]).toBe(false);
    expect(
      (
        await comoMembro(beto, `select public.montagem_reservar_uso($1)`, [
          livroA,
        ])
      ).erro,
    ).toContain("sem_permissao");
  });
});

describe("montagem", () => {
  it("lista as prontas na ordem salva, as novas no fim, e risca as de fora", async () => {
    const h1 = await historia(livroA);
    const h2 = await historia(livroA, { titulo: "A ceia" });
    const c0 = await conteudo(ana, livroA);
    expect(c0.livro.rev).toBe(0);
    expect(c0.historias.map((h: any) => h.id)).toEqual([h1, h2]);
    expect(c0.historias[0].paragrafos).toHaveLength(2); // o parágrafo em branco não entra

    const s = await salvar(ana, livroA, 0, { ordemH: [h2, h1], fora: [h1] });
    expect(s).toEqual({ rev: 1 });
    const h3 = await historia(livroA, { titulo: "O sítio" });
    const c1 = await conteudo(caio, livroA);
    expect(c1.historias.map((h: any) => [h.id, h.incluida])).toEqual([
      [h2, true],
      [h1, false],
      [h3, true],
    ]);
  });

  it("recusa revisão velha, cor fora da paleta, item de outro livro e quem não é membro", async () => {
    const hB = await historia(livroB);
    expect(await salvar(caio, livroA, 0)).toEqual({ erro: "montagem_mudou" });
    expect(await salvar(caio, livroA, 1, { cor: "rosa" })).toEqual({
      erro: "dados_invalidos",
    });
    expect(await salvar(caio, livroA, 1, { ordemH: [hB] })).toEqual({
      erro: "dados_invalidos",
    });
    expect(await salvar(beto, livroA, 1)).toEqual({ erro: "sem_permissao" });
    expect(await conteudo(beto, livroA)).toEqual({ erro: "sem_permissao" });
  });
});

describe("publicar", () => {
  it("só o responsável publica", async () => {
    expect(await publicar(caio, livroA)).toEqual({ erro: "sem_permissao" });
  });

  it("bloqueia história sem título ou não marcada como pronta, e montagem que mudou", async () => {
    const semTitulo = await historia(livroA, { titulo: null });
    let rev = (await conteudo(ana, livroA)).livro.rev;
    expect(await publicar(ana, livroA, "0".repeat(64))).toEqual({
      erro: "montagem_mudou",
    });
    expect(await publicar(ana, livroA)).toEqual({
      erro: "historia_sem_titulo",
    });
    const fora = (
      await sql<{ fora: string[] }>(
        `select fora from public.book_layouts where book_id = $1`,
        [livroA],
      )
    )[0].fora;
    const naoRevisada = await historia(livroA, { revisada: false });
    rev = (await salvar(ana, livroA, rev, { fora: [...fora, semTitulo] })).rev!;
    expect(await publicar(ana, livroA)).toEqual({
      erro: "historia_nao_pronta",
    });
    rev = (
      await salvar(ana, livroA, rev, {
        fora: [...fora, semTitulo, naoRevisada],
      })
    ).rev!;
    expect((await conteudo(ana, livroA)).livro.rev).toBe(rev);
  });

  it("congela o conteúdo, cria os QR (história e mensagem com áudio) e reserva os recortes", async () => {
    const mAudio = await mensagem(livroA, acessoA, true);
    const mTexto = await mensagem(livroA, acessoA, false);
    const semAudio = await historia(livroA, {
      titulo: "Só escrita",
      audio: false,
    });
    const visto = (await conteudo(ana, livroA)).hash;
    // Uma mensagem tirada do livro depois de conferir: o hash não bate mais.
    await sql(
      `update public.family_messages set no_livro = false where id = $1`,
      [mTexto],
    );
    expect(await publicar(ana, livroA, visto)).toEqual({
      erro: "montagem_mudou",
    });
    await sql(
      `update public.family_messages set no_livro = true where id = $1`,
      [mTexto],
    );
    const p = await publicar(ana, livroA);
    expect(p.erro).toBeUndefined();
    expect(p.versao).toBe(1);

    const [e] = await sql<{ conteudo: any; qr_esperados: number }>(
      `select conteudo, qr_esperados from public.book_exports where id = $1`,
      [p.export_id],
    );
    const hs = e.conteudo.historias as any[];
    expect(hs.every((h) => h.incluida)).toBe(true);
    expect(hs.find((h) => h.id === semAudio).qr).toBeNull(); // sai sem QR
    const ms = e.conteudo.mensagens as any[];
    expect(ms.find((m) => m.id === mAudio).qr.codigo).toMatch(
      /^[2-9A-HJKMNP-Z]{8}$/,
    );
    expect(ms.find((m) => m.id === mTexto).qr).toBeNull();
    const comQr = [...hs, ...ms].filter((x) => x.qr).length;
    expect(e.qr_esperados).toBe(comQr);
    expect(p.pedir_audio).toHaveLength(comQr);
  });

  it("uma publicação por vez", async () => {
    expect(await publicar(ana, livroA)).toEqual({
      erro: "publicacao_em_andamento",
    });
  });

  it("só fica pronta com todos os QR conferidos, e depois não muda nem sai", async () => {
    const [{ id, versao }] = await sql<{ id: string; versao: number }>(
      `select id, versao from public.book_exports where book_id = $1`,
      [livroA],
    );
    const pasta = `livros/${livroA}/v${versao}-0123456789ab`;
    const args = (qr: number) => [
      id,
      { formato: "A5" },
      84,
      9.5,
      pasta,
      1000,
      500,
      qr,
    ];
    const q = `select public.servico_export_pronto($1, $2, $3, $4, $5, $6, $7, $8) as ok`;
    expect((await servico(q, args(0))).erro).toContain("qr_nao_conferido");
    const [{ qr_esperados }] = await sql<{ qr_esperados: number }>(
      `select qr_esperados from public.book_exports where id = $1`,
      [id],
    );
    expect((await servico(q, args(qr_esperados))).linhas?.[0].ok).toBe(true);
    expect((await servico(q, args(qr_esperados))).linhas?.[0].ok).toBe(false);
    for (const tentativa of [
      `update public.book_exports set paginas = 88 where id = '${id}'`,
      `update public.book_exports set conteudo = '{}' where id = '${id}'`,
      `delete from public.book_exports where id = '${id}'`,
    ]) {
      await expect(sql(tentativa)).rejects.toThrow(/export_imutavel/);
    }
  });

  it("mensagem com QR ou publicada não é apagada", async () => {
    const [m] = await sql<{ id: string }>(
      `select id from public.family_messages where book_id = $1 and audio_caminho is null limit 1`,
      [livroA],
    );
    await sql(
      `update public.family_messages set estado = 'arquivada', no_livro = false where id = $1`,
      [m.id],
    );
    const r = await comoMembro(
      ana,
      `select * from public.mensagem_apagar($1)`,
      [m.id],
    );
    expect(r.erro).toContain("mensagem_publicada");
  });
});

describe("QR de mensagem no player", () => {
  it("devolve nome e relação (nunca o texto) e só aceita recorte do tamanho da mensagem", async () => {
    const [q] = await sql<{ codigo: string; message_id: string }>(
      `select codigo, message_id from public.qr_codes where message_id is not null limit 1`,
    );
    const [{ f }] = await sql<{ f: string }>(
      `select privado.fonte_audio_da_mensagem($1) as f`,
      [q.message_id],
    );
    const caminho = `livros/${livroA}/${q.codigo}-0123456789ab.m4a`;
    const pronto = `select gravado from public.servico_qr_audio_pronto($1, $2, $3, $4)`;
    expect((await servico(pronto, [q.codigo, caminho, f, 341])).erro).toContain(
      "qr_recorte_longo",
    );
    expect(
      (await servico(pronto, [q.codigo, caminho, f, 40])).linhas?.[0].gravado,
    ).toBe(true);
    const r = await servico(`select public.servico_ouvir_qr($1, $2) as r`, [
      q.codigo,
      "c".repeat(64),
    ]);
    const o = r.linhas![0].r as Record<string, unknown>;
    expect(o).toMatchObject({
      estado: "ok",
      tipo: "mensagem",
      nome: "Bia",
      relacao: "neta",
    });
    expect(JSON.stringify(o)).not.toContain("obrigada");
    const t = await servico(`select public.servico_qr_trechos($1) as t`, [
      q.codigo,
    ]);
    expect(t.linhas![0].t).toMatchObject({ bucket: "mensagens" });
  });

  it("mensagem arquivada para de tocar; desarquivar volta", async () => {
    const [q] = await sql<{ codigo: string; message_id: string }>(
      `select codigo, message_id from public.qr_codes where message_id is not null limit 1`,
    );
    const ouvir = async () =>
      (
        (
          await servico(`select public.servico_ouvir_qr($1, $2) as r`, [
            q.codigo,
            "d".repeat(64),
          ])
        ).linhas![0].r as Record<string, unknown>
      ).estado;
    await sql(
      `update public.family_messages set estado = 'arquivada', no_livro = false where id = $1`,
      [q.message_id],
    );
    expect(await ouvir()).toBe("desativado");
    await sql(
      `update public.family_messages set estado = 'enviada' where id = $1`,
      [q.message_id],
    );
    expect(await ouvir()).toBe("ok");
  });

  it("o QR de mensagem continua imutável", async () => {
    await expect(
      sql(
        `update public.qr_codes set message_id = null where message_id is not null`,
      ),
    ).rejects.toThrow();
  });
});

describe("reversão", () => {
  it("trava com publicação; forçada passa e sobe de novo", async () => {
    await expect(db.exec(down)).rejects.toThrow(/reversao_com_publicacoes/);
    await db.exec(
      `set ecoa.reversao_destrutiva = 'sim'; ${down}; reset ecoa.reversao_destrutiva;`,
    );
    const [r] = await sql<{ t: string | null }>(
      `select to_regclass('public.book_exports')::text as t`,
    );
    expect(r.t).toBeNull();
    await db.exec(up);
  });
});
