import type { Metadata } from "next";
import { Suspense } from "react";
import { TelaComprar } from "@/components/telas/tela-comprar";
import { PAGINAS_INCLUSAS, PRECO_PLANO } from "@/lib/config";
import { envPagamento } from "@/lib/env-pagamento";
import { usuarioAtual } from "@/lib/sessao";
import { iniciarCompra } from "./acoes";

export const metadata: Metadata = { title: "Comprar · Ecoa Memórias" };

// /comprar (P77): o botão da landing chega aqui. Público; com sessão, o e-mail vem preenchido.
export default function PaginaComprar() {
  return (
    <Suspense>
      <Comprar />
    </Suspense>
  );
}

async function Comprar() {
  const usuario = await usuarioAtual();
  const env = envPagamento();
  return (
    <TelaComprar
      aberta={Boolean(env)}
      modoTeste={env?.MP_MODO !== "producao"}
      preco={`R$ ${PRECO_PLANO}`}
      detalhe={`Um ano de gravações e um livro de ${PAGINAS_INCLUSAS} páginas.`}
      emailInicial={usuario?.email ?? ""}
      iniciar={iniciarCompra}
    />
  );
}
