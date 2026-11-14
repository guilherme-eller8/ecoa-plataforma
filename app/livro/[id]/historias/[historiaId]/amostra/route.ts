// PDF da página de amostra (prompt 10, seção 5.3). Só lê: o QR já foi criado pela folha.
// Nenhum PDF sai sem o QR lido por software no próprio arquivo.
import { after } from "next/server";
import { registrarEvento } from "@/lib/eventos";
import { gerarAmostra } from "@/lib/livro/amostra";
import { conferirQr } from "@/lib/livro/conferir-qr";
import { livroDaAcao } from "@/lib/livro/acesso";
import { bytesDaFoto, dadosDaAmostra } from "@/lib/livro/dados-amostra";

export const maxDuration = 60;

function pagina(status: number, frase: string) {
  return new Response(
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Página de amostra</title><body style="font-family:system-ui;padding:32px;max-width:28rem;margin:auto;font-size:18px;line-height:1.45;color:#1c1917;background:#fbf8f1"><p>${frase}</p><p><a href="javascript:history.back()" style="color:#2f5d46">Voltar</a></p></body></html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
      },
    },
  );
}

function nomeDoArquivo(titulo: string) {
  const slug = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `amostra${slug ? `-${slug}` : ""}.pdf`;
}

export async function GET(
  request: Request,
  { params }: RouteContext<"/livro/[id]/historias/[historiaId]/amostra">,
) {
  const { id, historiaId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(historiaId))
    return pagina(404, "Não achamos esta história.");
  const a = await livroDaAcao(id);
  if (!a) return pagina(404, "Não achamos esta história.");
  const d = await dadosDaAmostra(a.livro.id, historiaId);
  if (!d)
    return pagina(409, "Marque a história como pronta para gerar a página.");
  if (!d.codigo || d.desligado || !d.vozPronta)
    return pagina(409, "Volte e toque em Página de amostra de novo.");

  // Folha de teste do formato da URL (Q4): só fora da produção.
  const formato = new URL(request.url).searchParams.get("formato");
  const maiuscula =
    process.env.VERCEL_ENV !== "production" &&
    (formato === "maiusculo" || formato === "minusculo")
      ? formato === "maiusculo"
      : undefined;

  try {
    const bytes = d.foto ? await bytesDaFoto(d.foto.caminho) : null;
    const r = await gerarAmostra({
      titulo:
        maiuscula === undefined
          ? d.titulo
          : `${d.titulo} · teste ${maiuscula ? "A (maiúsculo)" : "B (minúsculo)"}`,
      ano: d.ano,
      paragrafos: d.paragrafos,
      codigo: d.codigo,
      foto:
        d.foto && bytes
          ? { bytes, largura: d.foto.largura, altura: d.foto.altura }
          : null,
      maiuscula,
    });
    const c = await conferirQr(r.pdf, r.url);
    if (!c.ok)
      return pagina(422, "Não conseguimos conferir o QR. Tente de novo.");
    after(() =>
      registrarEvento({
        quem: a.usuario.id,
        papel: a.livro.papel,
        acao: "amostra_gerada",
        livro: a.livro.id,
        detalhes: { story: historiaId, cortada: r.cortado },
      }),
    );
    const nome = nomeDoArquivo(d.titulo);
    return new Response(new Uint8Array(r.pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="amostra.pdf"; filename*=UTF-8''${encodeURIComponent(nome)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return pagina(500, "Não deu certo agora. Tente de novo.");
  }
}
