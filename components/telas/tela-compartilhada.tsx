"use client";

// /o/{token} (prompt 11, P61): uma história mandada ao grupo. "Uma história de Jair", título,
// ano, Ouvir e o texto. Link desligado e link errado mostram a mesma frase.
import { PlayerDeVoz } from "@/components/telas/tela-player";
import { MarcaEcoa } from "@/components/ui/marca";
import type { EstadoCompartilhada } from "@/lib/compartilhar/tipos";

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-6 pt-10 pb-10">
      <div className="flex flex-1 flex-col gap-10 py-6">{children}</div>
      <footer className="text-tinta-2 flex justify-center pt-8 opacity-80">
        <MarcaEcoa />
      </footer>
    </main>
  );
}

function Recado({ frase }: { frase: string }) {
  return (
    <Moldura>
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="font-livro text-livro-28 text-tinta text-balance">
          {frase}
        </h1>
      </div>
    </Moldura>
  );
}

export function TelaCompartilhada({
  estado,
  tocou,
}: {
  estado: EstadoCompartilhada;
  tocou: () => Promise<void>;
}) {
  if (estado.estado === "indisponivel")
    return <Recado frase="Este link não está mais disponível." />;
  if (estado.estado === "em_revisao")
    return <Recado frase="Esta história está sendo revisada. Volte daqui a pouco." />;

  return (
    <Moldura>
      <header className="flex flex-col gap-3">
        <p className="font-ui text-ui-15 text-tinta-2">
          Uma história de {estado.autor}
        </p>
        <h1 className="font-livro text-livro-36 text-tinta text-balance leading-tight">
          {estado.titulo}
        </h1>
        {estado.ano ? (
          <p className="font-ui text-ui-15 text-tinta-2 tracking-[0.12em]">
            {estado.ano}
          </p>
        ) : null}
      </header>

      {estado.voz?.tipo === "ok" ? (
        <PlayerDeVoz audioUrl={estado.voz.audioUrl} tocou={tocou} />
      ) : estado.voz?.tipo === "preparando" ? (
        <p className="font-ui text-ui-17 text-tinta-2" role="status">
          A voz chega em instantes. Abra de novo daqui a pouco.
        </p>
      ) : null}

      <article className="font-livro text-livro-20 text-tinta flex flex-col gap-5 leading-relaxed">
        {estado.paragrafos.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </article>
    </Moldura>
  );
}
