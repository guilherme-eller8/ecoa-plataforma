// Início de quem é admin (Evals 1A): em vez de abrir direto o livro mais recente, escolhe entre
// o admin e os próprios livros. Quem não é admin continua indo direto para o livro.
import Link from "next/link";
import { classesDoBotao } from "@/components/ui/botao";
import { Marca } from "@/components/ui/marca";

export type LivroDaEscolha = { id: string; nome: string; papel: string };

const PAPEL: Record<string, string> = {
  responsavel: "Você é o responsável",
  cofacilitador: "Você ajuda",
};

export function TelaInicioAdmin({ livros }: { livros: LivroDaEscolha[] }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-10 px-6 pt-10 pb-12">
      <Marca />
      <div className="flex flex-col gap-6">
        <h1 className="font-ui text-tinta text-[26px] leading-tight font-semibold md:text-[32px]">
          Para onde?
        </h1>
        <Link href="/admin" className={classesDoBotao()}>
          Abrir o admin
        </Link>
      </div>
      <section aria-labelledby="t-meus" className="flex flex-col gap-3">
        <h2 id="t-meus" className="font-ui text-tinta-2 text-[15px]">
          Seus livros
        </h2>
        {livros.length === 0 ? (
          <p className="font-ui text-tinta-2 text-[17px]">
            Você não participa de nenhum livro.
          </p>
        ) : (
          <ul className="*:bg-papel flex flex-col gap-1 *:overflow-hidden *:rounded-xl">
            {livros.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/livro/${l.id}`}
                  className="hover:bg-polen-2 flex min-h-14 flex-col justify-center gap-0.5 px-4 py-3"
                >
                  <span className="font-livro text-tinta text-[20px]">
                    {l.nome}
                  </span>
                  <span className="font-ui text-tinta-2 text-[15px]">
                    {PAPEL[l.papel] ?? l.papel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
