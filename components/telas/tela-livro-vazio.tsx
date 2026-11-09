import { Botao } from "@/components/ui/botao";
import { Marca } from "@/components/ui/marca";

type Props = { autorNome: string | null; somenteLeitura: boolean };

export function TelaLivroVazio({ autorNome, somenteLeitura }: Props) {
  const titulo = autorNome ? `O livro do ${autorNome}` : "Seu livro";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-6 pt-10 pb-12 md:px-10">
      <div className="flex items-center justify-between gap-4">
        <Marca />
        {somenteLeitura ? (
          <span className="font-ui bg-papel text-tinta-2 rounded-full px-4 py-2 text-[15px]">
            Somente leitura
          </span>
        ) : null}
      </div>
      <section className="flex flex-1 flex-col justify-center gap-6 py-16">
        <h1 className="font-livro text-tinta text-[44px] leading-[1.05] md:text-[64px]">
          {titulo}
        </h1>
        <p className="font-livro text-tinta-2 max-w-[26ch] text-[22px] leading-snug">
          Ainda não tem nenhuma história. A primeira começa com uma pergunta.
        </p>
        <div className="flex flex-col gap-2 pt-4">
          <Botao disabled className="self-start">
            Começar
          </Botao>
          <span className="font-ui text-tinta-2 text-[15px]">Em breve</span>
        </div>
      </section>
    </main>
  );
}
