"use client";

import { useState } from "react";
import { Botao } from "@/components/ui/botao";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { IconeEnviar } from "@/components/ui/icones";

export function DemoFolha({
  rotulo = "Enviar ao Jair",
  pergunta,
}: {
  rotulo?: string;
  pergunta: string;
}) {
  const [aberta, setAberta] = useState(false);
  return (
    <>
      <Botao
        variante="secundario"
        icone={<IconeEnviar />}
        onClick={() => setAberta(true)}
      >
        {rotulo}
      </Botao>
      <FolhaInferior
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo="Enviar ao Jair"
      >
        <p className="rounded-interno bg-polen font-livro text-livro-20 text-tinta p-4">
          Pai, tem uma pergunta nova pra você: “{pergunta}” É só tocar no link e
          gravar.
        </p>
        <Botao
          larguraTotal
          icone={<IconeEnviar />}
          onClick={() => setAberta(false)}
        >
          Abrir o WhatsApp
        </Botao>
      </FolhaInferior>
    </>
  );
}
