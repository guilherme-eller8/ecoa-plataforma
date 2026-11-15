"use client";

// Arquivar e desarquivar sem apagar nada (P69, P71): um botão de texto que chama a ação do
// servidor e relê a tela. Serve a áudio e a história (o que arquiva vem em `acoes`).
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AcoesArquivar } from "@/lib/livro/tipos";
import { Botao } from "./botao";

export function BotaoArquivar({
  id,
  acoes,
  arquivar = true,
  className,
}: {
  id: string;
  acoes: AcoesArquivar;
  arquivar?: boolean; // false = Desarquivar
  className?: string;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function clicar() {
    setOcupado(true);
    setErro(null);
    const r = await acoes.arquivar(id, arquivar);
    setOcupado(false);
    if (!r.ok) setErro(r.mensagem);
    else router.refresh();
  }

  return (
    <span
      className={`inline-flex flex-col items-start gap-1 ${className ?? ""}`}
    >
      <Botao
        variante={arquivar ? "texto" : "secundario"}
        carregando={ocupado}
        onClick={() => void clicar()}
      >
        {arquivar ? "Arquivar" : "Desarquivar"}
      </Botao>
      {erro ? (
        <span role="alert" className="text-ui-13 text-erro">
          {erro}
        </span>
      ) : null}
    </span>
  );
}
