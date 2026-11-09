import { Botao } from "@/components/ui/botao";
import { Marca } from "@/components/ui/marca";

type Props = {
  email: string | null;
  ehAdmin: boolean;
  sair: () => Promise<void>;
};

export function TelaSemAcesso({ email, ehAdmin, sair }: Props) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-10 pb-12">
      <Marca />
      <div className="flex flex-1 flex-col justify-center gap-6 py-12">
        <h1 className="font-ui text-tinta text-[26px] leading-tight font-semibold md:text-[32px]">
          Seu acesso ainda não foi ativado
        </h1>
        <p className="font-ui text-tinta-2 text-[17px]">
          {email ? <>Você entrou como {email}. </> : null}Assim que o plano for
          ativado, o livro aparece aqui.
        </p>
        {ehAdmin ? (
          <a
            href="/admin"
            className="font-ui bg-floresta text-papel inline-flex min-h-14 items-center justify-center rounded-full px-7 text-[17px] font-semibold"
          >
            Abrir o admin
          </a>
        ) : null}
        <form action={sair}>
          <Botao variante="texto" type="submit">
            Entrar com outra conta
          </Botao>
        </form>
      </div>
    </main>
  );
}
