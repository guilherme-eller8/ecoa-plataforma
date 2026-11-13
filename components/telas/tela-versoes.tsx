"use client";

// Histórico da história (prompt 8): o texto de agora (quando ainda não virou versão) e as
// versões, da mais nova à mais antiga, com a origem. Tocar abre a prévia; Restaurar guarda o
// texto de agora e volta a versão escolhida como uma versão nova. Nada se apaga.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { abaDestaGuia, type AcoesVersoes } from "@/lib/editor/tipos";
import type { TextoAtualDaTela, VersaoDaTela } from "@/lib/historias/tipos";

const QUANDO = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const quando = (iso: string) => QUANDO.format(new Date(iso)).replace(",", " ·");

function quem(v: { origem: VersaoDaTela["origem"] | null; minha: boolean }) {
  if (v.origem === "ia") return "Escrita pela IA";
  if (v.minha) return "Editada por você";
  if (v.origem === "autor") return "Corrigida pelo autor";
  if (v.origem === "cofacilitador") return "Editada por quem ajuda";
  return "Editada pelo responsável";
}

type Aberta = {
  numero: number | null;
  titulo: string;
  paragrafos: string[];
  rotulo: string;
};

export function TelaVersoes({
  livroId,
  historiaId,
  titulo,
  atual,
  versoes,
  podeEscrever,
  acoes,
}: {
  livroId: string;
  historiaId: string;
  titulo: string | null;
  atual: TextoAtualDaTela;
  versoes: VersaoDaTela[];
  podeEscrever: boolean;
  acoes: AcoesVersoes;
}) {
  const router = useRouter();
  const voltar = `/livro/${livroId}/historias/${historiaId}`;
  const [aberta, setAberta] = useState<Aberta | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const dataDa = new Map(versoes.map((v) => [v.numero, v.criadaEm]));

  async function restaurar(numero: number) {
    setOcupado(true);
    setErro(null);
    const r = await acoes.restaurar(abaDestaGuia(), numero);
    setOcupado(false);
    if (!r.ok) return setErro(r.mensagem);
    router.push(voltar);
    router.refresh();
  }

  const itens = [
    ...(atual
      ? [
          {
            chave: "atual",
            numero: null,
            rotulo: "Texto de agora",
            detalhe: `${quem({ origem: atual.origem, minha: atual.minha })}${atual.em ? ` · ${quando(atual.em)}` : ""}`,
            titulo: atual.titulo,
            paragrafos: atual.paragrafos,
          },
        ]
      : []),
    ...versoes.map((v, i) => ({
      chave: String(v.numero),
      numero: !atual && i === 0 ? null : v.numero, // a mais nova sem pendência = o texto de agora
      rotulo: quando(v.criadaEm),
      detalhe:
        quem(v) +
        (v.restauradaDe && dataDa.get(v.restauradaDe)
          ? ` · voltou à versão de ${quando(dataDa.get(v.restauradaDe)!)}`
          : ""),
      titulo: v.titulo,
      paragrafos: v.paragrafos,
    })),
  ];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-6 pb-16">
      <Link
        href={voltar}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← {titulo ?? "História"}
      </Link>
      <h1 className="text-ui-24 text-tinta font-medium">Histórico</h1>

      {podeEscrever && versoes.length > 1 ? (
        <DicaPrimeiraVez chave="restaurar">
          Restaurar não apaga nada: o texto de agora fica guardado.
        </DicaPrimeiraVez>
      ) : null}

      <ol className="flex flex-col gap-2">
        {itens.map((v, i) => (
          <li key={v.chave}>
            <button
              type="button"
              onClick={() =>
                setAberta({
                  numero: v.numero,
                  titulo: v.titulo,
                  paragrafos: v.paragrafos,
                  rotulo: v.rotulo,
                })
              }
              className="bg-papel hover:bg-polen-2 rounded-interno flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors duration-[var(--dur-rapida)]"
            >
              <span className="text-ui-17 text-tinta flex items-center gap-2 font-medium">
                {v.rotulo}
                {i === 0 && !atual ? (
                  <span className="bg-floresta-claro text-floresta text-ui-13 rounded-full px-2 py-0.5">
                    Atual
                  </span>
                ) : null}
              </span>
              <span className="text-ui-15 text-tinta-2">{v.detalhe}</span>
              <span className="font-livro text-ui-15 text-tinta-2 line-clamp-1">
                {v.paragrafos[0]}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <FolhaInferior
        aberta={aberta !== null}
        aoFechar={() => setAberta(null)}
        titulo={aberta?.rotulo ?? "Versão"}
      >
        {aberta ? (
          <div className="flex flex-col gap-5">
            <p className="text-ui-15 text-tinta-2">{aberta.rotulo}</p>
            <h2 className="font-livro text-livro-24 text-tinta leading-tight">
              {aberta.titulo || "Sem título"}
            </h2>
            <div className="font-livro text-livro-20 text-tinta flex max-h-[45dvh] flex-col gap-4 overflow-y-auto leading-relaxed">
              {aberta.paragrafos.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
            {aberta.numero !== null && podeEscrever ? (
              <Botao
                larguraTotal
                carregando={ocupado}
                onClick={() => void restaurar(aberta.numero!)}
              >
                Restaurar esta versão
              </Botao>
            ) : (
              <p className="text-ui-15 text-tinta-2">
                Este é o texto de agora.
              </p>
            )}
          </div>
        ) : null}
      </FolhaInferior>
    </main>
  );
}
