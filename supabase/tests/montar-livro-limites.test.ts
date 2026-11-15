// Montar e publicar (prompt 13): os limites e os casos de borda que o design listou para a
// construção. Banco próprio, para não depender da ordem dos testes de montar-livro.test.ts.
import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import {
  ativarPlano,
  como,
  criarBanco,
  criarUsuario,
  vencerPlano,
} from "./banco";

let db: PGlite;
let ana: string; // responsável
let caio: string; // co-facilitador
let livro: string;

type Resposta =
  | { linhas: Record<string, unknown>[]; erro?: undefined }
  | { erro: string; linhas?: undefined };

async function sql<T = Record<string, unknown>>(q: string, p: unknown[] = []) {
  return (await db.query<T>(q, p)).rows;
}

async function comoMembro(
  usuario: string,
  q: string,
  p: unknown[] = [],
): Promise<Resposta> {
  return como(db, "authenticated", { sub: usuario }, async (tx) => {
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

async function historia(l: string, o: { audio?: boolean } = {}) {
  const texto = {
    titulo: "O trem",
    ano: 1962,
    paragrafos: [
      {
        id: "p1",
        texto: "Meu pai trabalhava na estrada de ferro.",
        fontes: [],
        editado: false,
      },
    ],
    lacunas: [],
  };
  const [{ id }] = await sql<{ id: string }>(
    `insert into public.stories (book_id, estado, pronta_em, titulo, ano, revisada_em, texto)
     values ($1, 'pronta', now(), 'O trem', 1962, now(), $2) returning id`,
    [l, texto],
  );
  if (o.audio) {
    const g = crypto.randomUUID();
    await sql(
      `insert into public.recordings (id, book_id, origem, nome_arquivo, caminho, content_type, tamanho_bytes,
        duracao_s, upload, recebido_em)
       values ($1, $2, 'upload', 'a.m4a', $3, 'audio/mp4', 100, 120, 'recebido', now())`,
      [g, l, `livros/${l}/audios/${g}.m4a`],
    );
    await sql(
      `insert into public.story_recordings (story_id, recording_id, book_id, ordem) values ($1, $2, $3, 1)`,
      [id, g, l],
    );
  }
  return id;
}

async function hashAtual(usuario: string, l: string) {
  const r = await comoMembro(
    usuario,
    `select public.montagem_conteudo($1) as c`,
    [l],
  );
  return (r.linhas?.[0]?.c as { hash: string }).hash;
}

const publicar = async (usuario: string, l: string, hash?: string) => {
  const h = hash ?? (await hashAtual(usuario, l));
  const r = await comoMembro(
    usuario,
    `select export_id, versao, pedir_audio from public.publicar_livro($1, $2)`,
    [l, h],
  );
  return r.erro ? { erro: r.erro } : (r.linhas![0] as Record<string, unknown>);
};

const salvarMontagem = (
  usuario: string,
  l: string,
  rev: number,
  titulo = "Histórias do Jair",
) =>
  comoMembro(
    usuario,
    `select public.montagem_salvar($1, $2, $3, null, null, null, 'terracota', '{}'::uuid[], '{}'::uuid[], '{}'::uuid[]) as rev`,
    [l, rev, titulo],
  );

/** O servidor termina a geração: pronta (sem QR esperado) ou falhou. */
async function terminar(exportId: string, estado: "pronta" | "falhou") {
  const [e] = await sql<{ book_id: string; versao: number }>(
    `select book_id, versao from public.book_exports where id = $1`,
    [exportId],
  );
  return como(db, "service_role", {}, async (tx) => {
    if (estado === "falhou") {
      await tx.query(
        `select public.servico_export_falhou($1, 'falhou_typst')`,
        [exportId],
      );
      return;
    }
    await tx.query(
      `select public.servico_export_pronto($1, '{}'::jsonb, 8, 5.0, $2, 100, 100, 0)`,
      [exportId, `livros/${e.book_id}/v${e.versao}-0123456789ab`],
    );
  });
}

beforeAll(async () => {
  db = await criarBanco();
  ana = await criarUsuario(db, "ana@exemplo.com");
  caio = await criarUsuario(db, "caio@exemplo.com");
  livro = await ativarPlano(db, ana, "Jair");
  await sql(
    `insert into public.book_members (book_id, user_id, papel) values ($1, $2, 'cofacilitador')`,
    [livro, caio],
  );
  await historia(livro); // sem áudio: sai sem QR, então não há o que conferir (qr_esperados = 0)
});

describe("quem monta e quem publica (P60, Q7)", () => {
  it("o co-facilitador monta e vê, mas não publica", async () => {
    const r = await salvarMontagem(caio, livro, 0);
    expect(r.erro).toBeUndefined();
    expect(Number(r.linhas![0].rev)).toBe(1);
    const lido = await comoMembro(
      caio,
      `select public.montagem_conteudo($1) as c`,
      [livro],
    );
    expect(
      (lido.linhas![0].c as { livro: { titulo: string } }).livro.titulo,
    ).toBe("Histórias do Jair");
    expect(
      (await publicar(caio, livro, await hashAtual(caio, livro))).erro,
    ).toContain("sem_permissao");
  });
});

describe("tetos de publicação", () => {
  it("10 por livro em 24 h: a 11ª é recusada", async () => {
    for (let i = 1; i <= 10; i++) {
      const p = await publicar(ana, livro);
      expect(p.erro).toBeUndefined();
      expect(p.versao).toBe(i);
      await terminar(p.export_id as string, "pronta");
    }
    expect(await publicar(ana, livro)).toEqual({ erro: "limite_publicacoes" });
  });

  it("a que falhou não conta no teto", async () => {
    const outro = await ativarPlano(
      db,
      await criarUsuario(db, "lia@exemplo.com"),
      "Lia",
    );
    const dono = (
      await sql<{ user_id: string }>(
        `select user_id from public.book_members where book_id = $1 and papel = 'responsavel'`,
        [outro],
      )
    )[0].user_id;
    await historia(outro);
    await salvarMontagem(dono, outro, 0);
    for (let i = 1; i <= 12; i++) {
      const p = await publicar(dono, outro);
      expect(p.erro).toBeUndefined();
      expect(p.versao).toBe(i);
      await terminar(p.export_id as string, "falhou");
    }
  });
});

describe("publicação presa", () => {
  it("a que está 'gerando' há mais de 30 min vira falhou (expirou) e abre vaga", async () => {
    const outro = await ativarPlano(
      db,
      await criarUsuario(db, "pedro@exemplo.com"),
      "Pedro",
    );
    const dono = (
      await sql<{ user_id: string }>(
        `select user_id from public.book_members where book_id = $1 and papel = 'responsavel'`,
        [outro],
      )
    )[0].user_id;
    await historia(outro);
    await salvarMontagem(dono, outro, 0);
    const presa = await publicar(dono, outro);
    expect(await publicar(dono, outro)).toEqual({
      erro: "publicacao_em_andamento",
    });
    // O banco só deixa mexer em 'gerando' pela função; a data antiga entra por insert direto.
    await sql(
      `insert into public.book_exports (book_id, versao, conteudo, qr_esperados, criado_em)
       select book_id, 99, conteudo, qr_esperados, now() - interval '31 minutes' from public.book_exports where id = $1`,
      [presa.export_id],
    );
    await terminar(presa.export_id as string, "falhou"); // libera a de verdade; a velha (v99) fica 'gerando'
    const v = await publicar(dono, outro);
    expect(v.erro).toBeUndefined();
    const [velha] = await sql<{ estado: string; erro: string | null }>(
      `select estado, erro from public.book_exports where book_id = $1 and versao = 99`,
      [outro],
    );
    expect(velha).toEqual({ estado: "falhou", erro: "expirou" });
  });
});

describe("plano vencido: lê, mas não monta nem publica (P4)", () => {
  it("monta e publicar dão livro_fechado; a leitura continua", async () => {
    const vencido = await ativarPlano(
      db,
      await criarUsuario(db, "vera@exemplo.com"),
      "Vera",
    );
    const dono = (
      await sql<{ user_id: string }>(
        `select user_id from public.book_members where book_id = $1 and papel = 'responsavel'`,
        [vencido],
      )
    )[0].user_id;
    await historia(vencido);
    await salvarMontagem(dono, vencido, 0);
    const hash = await hashAtual(dono, vencido);
    await vencerPlano(db, vencido);
    expect((await salvarMontagem(dono, vencido, 1)).erro).toContain(
      "livro_fechado",
    );
    expect((await publicar(dono, vencido, hash)).erro).toContain(
      "livro_fechado",
    );
    expect(await hashAtual(dono, vencido)).toBe(hash); // ler continua valendo
  });
});

describe("QR que perdeu o áudio aceito", () => {
  it("a amostra criou o QR, mas sem áudio aceito ele não conta como impresso (Q10)", async () => {
    const outro = await ativarPlano(
      db,
      await criarUsuario(db, "rita@exemplo.com"),
      "Rita",
    );
    const dono = (
      await sql<{ user_id: string }>(
        `select user_id from public.book_members where book_id = $1 and papel = 'responsavel'`,
        [outro],
      )
    )[0].user_id;
    const h = await historia(outro, { audio: true });
    const criado = await comoMembro(dono, `select * from public.criar_qr($1)`, [
      h,
    ]);
    expect(criado.erro).toBeUndefined();
    // O áudio some da história (por exemplo, foi tirado do texto): o QR continua, mas não toca.
    await sql(`delete from public.story_recordings where story_id = $1`, [h]);
    await salvarMontagem(dono, outro, 0);
    const p = await publicar(dono, outro);
    expect(p.erro).toBeUndefined();
    expect(p.pedir_audio).toEqual([]);
    const [e] = await sql<{ qr_esperados: number }>(
      `select qr_esperados from public.book_exports where id = $1`,
      [p.export_id],
    );
    expect(e.qr_esperados).toBe(0);
  });
});
