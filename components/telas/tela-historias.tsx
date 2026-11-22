// Histórias do livro: os cartões com as etapas ao vivo (M5), os mais recentes no alto.
import Link from "next/link";
import { classesDoBotao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { HistoriasAoVivo } from "@/components/ui/historias-ao-vivo";
import { IconeSubir } from "@/components/ui/icones";
import type { AoVivo } from "@/components/ui/historias-ao-vivo";
import { BotaoArquivar } from "@/components/ui/botao-arquivar";
import type { HistoriaArquivada, HistoriaDaTela } from "@/lib/historias/tipos";
import type { AcoesArquivar, LivroDaTela } from "@/lib/livro/tipos";

export function TelaHistorias({
  livro,
  historias,
  marcarVista,
  vitrine,
  arquivadas = [],
  arquivar,
}: {
  livro: LivroDaTela;
  historias: HistoriaDaTela[];
  marcarVista: (historia: string) => Promise<void>;
  vitrine?: Record<string, AoVivo>; // só na vitrine: sem canal, com texto de exemplo
  arquivadas?: HistoriaArquivada[]; // P71
  arquivar?: AcoesArquivar;
}) {
  const pode = livro.podeEscrever ? arquivar : undefined;
  const nova = `/livro/${livro.id}/historias/nova`;
  const prontas = historias.filter((h) => h.estado === "pronta").length;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12 md:max-w-3xl lg:max-w-5xl">
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
            {prontas === 1
              ? "1 pronta para revisar"
              : `${prontas} prontas para revisar`}
          </p>
        ) : null}
      </div>
      <HistoriasAoVivo
        livroId={livro.id}
        historias={historias}
        colunas={2}
        arquivar={pode}
        marcarVista={marcarVista}
        canal={!vitrine}
        inicial={vitrine}
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
      {arquivadas.length ? (
        <details className="pt-8">
          <summary className="text-ui-17 text-floresta min-h-alvo cursor-pointer font-medium">
            {arquivadas.length === 1
              ? "1 história arquivada"
              : `${arquivadas.length} histórias arquivadas`}
          </summary>
          <p className="text-ui-15 text-tinta-2 mt-2">
            Ficam guardadas, com o áudio e o QR, mas fora do livro.
          </p>
          <ul className="mt-4 grid items-start gap-3 lg:grid-cols-2">
            {arquivadas.map((h) => (
              <li
                key={h.id}
                className="rounded-cartao bg-papel border-linha flex flex-wrap items-center justify-between gap-3 border px-5 py-4"
              >
                <Link
                  href={`/livro/${livro.id}/historias/${h.id}`}
                  className="font-livro text-livro-20 text-tinta min-w-0 [overflow-wrap:anywhere] underline-offset-4 hover:underline"
                >
                  {h.titulo ?? "História sem título"}
                </Link>
                {pode ? (
                  <BotaoArquivar id={h.id} acoes={pode} arquivar={false} />
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </main>
  );
}
