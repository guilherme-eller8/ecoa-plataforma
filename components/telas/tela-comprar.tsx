"use client";

// Compra do plano (P77): um campo, a confirmação do e-mail e Pagar. O pagamento acontece na
// página do Mercado Pago; nenhum dado de cartão passa pela Ecoa.
import { useActionState, useState } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Marca } from "@/components/ui/marca";
import { emailDaCompra, sugerirDominio } from "@/lib/pagamento/estado";
import type { AcaoFormulario } from "@/lib/resultado";

type Props = {
  /** Sem as credenciais do Mercado Pago: "A compra abre em breve." */
  aberta: boolean;
  modoTeste: boolean;
  preco: string; // "R$ 467"
  detalhe: string; // "Um ano de gravações e um livro de 80 páginas."
  emailInicial?: string;
  iniciar: AcaoFormulario;
};

export function TelaComprar({
  aberta,
  modoTeste,
  preco,
  detalhe,
  emailInicial = "",
  iniciar,
}: Props) {
  const [email, setEmail] = useState(emailInicial);
  const [resultado, enviar, enviando] = useActionState(iniciar, null);
  const valido = emailDaCompra(email);
  const sugestao = sugerirDominio(email);

  return (
    <div className="flex min-h-dvh flex-col">
      {modoTeste && aberta ? (
        <p className="font-ui w-full bg-[#f6e7b9] px-6 py-2 text-center text-[15px] text-[#5b4a12]">
          Modo de teste: nenhum valor é cobrado
        </p>
      ) : null}
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-10 pb-12">
        <Marca />
        <div className="flex flex-1 flex-col justify-center gap-8 py-12">
          <div className="flex flex-col gap-3">
            <h1 className="font-ui text-tinta text-[26px] leading-tight font-semibold md:text-[32px]">
              {aberta
                ? "Comece o livro de memórias"
                : "A compra abre em breve."}
            </h1>
            <p className="font-ui text-tinta-2 text-[17px]">
              {aberta ? detalhe : "Já tem um livro?"}
            </p>
          </div>

          {aberta ? (
            <form action={enviar} className="flex flex-col gap-5">
              <Campo
                rotulo="Seu e-mail"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {sugestao ? (
                <button
                  type="button"
                  onClick={() => setEmail(sugestao)}
                  className="font-ui text-floresta -mt-2 self-start text-left text-[16px] underline underline-offset-4"
                >
                  Você quis dizer <Destaque email={sugestao} />?
                </button>
              ) : null}
              {valido && !sugestao ? (
                <p className="font-ui text-tinta text-[17px] [overflow-wrap:anywhere]">
                  O acesso vai para <strong>{valido}</strong>
                </p>
              ) : null}
              <Botao
                type="submit"
                carregando={enviando}
                disabled={!valido}
                className="w-full"
              >
                Pagar {preco}
              </Botao>
              <p className="font-ui text-tinta-2 -mt-1 text-center text-[15px]">
                Pix ou cartão em até 12x (3x sem juros)
              </p>
              {resultado && !resultado.ok ? (
                <Aviso ok={false}>{resultado.mensagem}</Aviso>
              ) : null}
            </form>
          ) : (
            <a
              href="/entrar"
              className="font-ui bg-floresta text-papel inline-flex min-h-14 items-center justify-center rounded-full px-7 text-[17px] font-semibold"
            >
              Entrar
            </a>
          )}
        </div>
      </main>
    </div>
  );
}

/** "fulano@gmail.com" com o domínio em negrito, para a correção saltar aos olhos. */
function Destaque({ email }: { email: string }) {
  const [nome, dominio] = email.split("@");
  return (
    <span className="[overflow-wrap:anywhere]">
      {nome}@<strong>{dominio}</strong>
    </span>
  );
}
