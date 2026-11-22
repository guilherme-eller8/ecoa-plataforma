"use client";

// Volta do Mercado Pago (`/comprar/pronto/{compra}`): pronto, esperando, não passou ou
// conferindo. Só o estado e o e-mail mascarado; o acesso vai também por e-mail.
import { useEffect, useState } from "react";
import { Botao } from "@/components/ui/botao";
import { Marca } from "@/components/ui/marca";
import { LogoGoogle } from "@/components/telas/tela-entrar";
import { useRelerEnquanto } from "@/components/ui/atualizar-ao-vivo";
import type { EstadoDaTela } from "@/lib/pagamento/estado";

type Props = {
  estado: EstadoDaTela;
  emailMascarado: string;
  /** A mesma cobrança aceita nova tentativa (CUJ 4). Sem ela, volta para /comprar. */
  tentarUrl: string | null;
  /** Para de se atualizar sozinha depois deste tempo. */
  esperaMaxMin: number;
  entrarComGoogle: () => Promise<void> | void;
};

const TITULOS: Record<EstadoDaTela, string> = {
  pronto: "Pronto! Seu livro está criado.",
  esperando: "Esperando o pagamento.",
  nao_passou: "O pagamento não passou.",
  conferindo: "Estamos conferindo seu pagamento.",
};

export function TelaCompraPronta({
  estado,
  emailMascarado,
  tentarUrl,
  esperaMaxMin,
  entrarComGoogle,
}: Props) {
  const [dentroDaEspera, setDentroDaEspera] = useState(true);
  const [indoAoGoogle, setIndoAoGoogle] = useState(false);
  useEffect(() => {
    const id = setTimeout(
      () => setDentroDaEspera(false),
      esperaMaxMin * 60_000,
    );
    return () => clearTimeout(id);
  }, [esperaMaxMin]);
  useRelerEnquanto(estado === "esperando" && dentroDaEspera);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-10 pb-12">
      <Marca />
      <div
        className="flex flex-1 flex-col justify-center gap-8 py-12"
        aria-live="polite"
      >
        <div className="flex flex-col gap-3">
          <h1 className="font-ui text-tinta text-[26px] leading-tight font-semibold md:text-[32px]">
            {TITULOS[estado]}
          </h1>
          <p className="font-ui text-tinta-2 text-[17px]">
            {estado === "pronto" ? (
              <>
                Enviamos o acesso para{" "}
                <strong className="text-tinta whitespace-nowrap">
                  {emailMascarado}
                </strong>
                .
              </>
            ) : estado === "esperando" ? (
              "Pode fechar: avisamos por e-mail."
            ) : estado === "nao_passou" ? (
              "Nada foi cobrado. Pode tentar com outro cartão ou com Pix."
            ) : (
              "Avisamos por e-mail."
            )}
          </p>
        </div>

        {estado === "pronto" ? (
          <div className="flex flex-col gap-3">
            <Botao
              carregando={indoAoGoogle}
              onClick={async () => {
                setIndoAoGoogle(true);
                await entrarComGoogle();
              }}
              className="w-full"
              icone={<LogoGoogle />}
            >
              Entrar com Google
            </Botao>
            <p className="font-ui text-tinta-2 text-center text-[15px]">
              ou abra o e-mail
            </p>
          </div>
        ) : estado === "nao_passou" ? (
          <a
            href={tentarUrl ?? "/comprar"}
            className="font-ui bg-floresta text-papel inline-flex min-h-14 items-center justify-center rounded-full px-7 text-[17px] font-semibold"
          >
            Tentar de novo
          </a>
        ) : null}
      </div>
    </main>
  );
}
