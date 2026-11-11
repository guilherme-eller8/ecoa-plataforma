// Histórias do livro: os cartões com as etapas ao vivo (M5), os mais recentes no alto.
import Link from "next/link";
import { classesDoBotao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { HistoriasAoVivo } from "@/components/ui/historias-ao-vivo";
import { IconeSubir } from "@/components/ui/icones";
import type { HistoriaDaTela } from "@/lib/historias/tipos";
import type { LivroDaTela } from "@/lib/livro/tipos";

export function TelaHistorias({
  livro,
  historias,
  marcarVista,
}: {
  livro: LivroDaTela;
  historias: HistoriaDaTela[];
  marcarVista: (historia: string) => Promise<void>;
}) {
  const nova = `/livro/${livro.id}/historias/nova`;
  const prontas = historias.filter((h) => h.estado === "pronta").length;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12">
      <Link
        href={`/livro/${livro.id}`}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Livro do {livro.autor}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          Histórias
        </h1>
        {prontas ? (
          <p className="text-ui-17 text-tinta-2">
            {prontas === 1 ? "1 pronta para revisar" : `${prontas} prontas para revisar`}
          </p>
        ) : null}
      </div>
      <HistoriasAoVivo
        livroId={livro.id}
        historias={historias}
        marcarVista={marcarVista}
        vazio={
          <EstadoVazio
            frase="Nenhuma história ainda."
            acao={
              livro.podeEscrever ? (
                <Link href={nova} className={classesDoBotao()}>
                  <IconeSubir tamanho={20} />
                  <span>Nova história</span>
                </Link>
              ) : null
            }
          />
        }
      />
    </main>
  );
}
