"use client";

// Gravação recebida que não começou a virar história: reenvia sem a família precisar gravar de
// novo. A ação confere no banco que ela ainda está parada; depois a tela relê o servidor.
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Resposta } from "@/lib/livro/tipos";
import { Botao } from "./botao";

export function BotaoTentarDeNovo({
  id,
  tentar,
  className,
}: {
  id: string;
  tentar: (id: string) => Promise<Resposta>;
  className?: string;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(
    null,
  );

  async function clicar() {
    setOcupado(true);
    setAviso(null);
    const r = await tentar(id);
    setOcupado(false);
    setAviso(
      r.ok
        ? { ok: true, texto: "Pronto. Deve começar em instantes." }
        : { ok: false, texto: r.mensagem },
    );
    if (r.ok) router.refresh();
  }

  return (
    <span
      className={`inline-flex flex-col items-start gap-1 ${className ?? ""}`}
    >
      <Botao
        variante="secundario"
        carregando={ocupado}
        onClick={() => void clicar()}
      >
        Tentar de novo
      </Botao>
      {aviso ? (
        <span
          role={aviso.ok ? "status" : "alert"}
          className={`text-ui-13 ${aviso.ok ? "text-tinta-2" : "text-erro"}`}
        >
          {aviso.texto}
        </span>
      ) : null}
    </span>
  );
}
