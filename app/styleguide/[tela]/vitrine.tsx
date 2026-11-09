"use client";

import { TelaAdmin } from "@/components/telas/tela-admin";
import { TelaConfirmar } from "@/components/telas/tela-confirmar";
import { TelaEntrar } from "@/components/telas/tela-entrar";
import { TelaLivroVazio } from "@/components/telas/tela-livro-vazio";
import { TelaSemAcesso } from "@/components/telas/tela-sem-acesso";
import type { Resultado } from "@/lib/resultado";
import { LIVROS_FALSOS, type Tela } from "@/lib/styleguide";

const acaoFalsa = async (): Promise<Resultado | null> => null;
const nada = async () => {};

export function Vitrine({ tela }: { tela: Tela }) {
  switch (tela) {
    case "entrar":
      return <TelaEntrar pedirLink={acaoFalsa} entrarComGoogle={nada} />;
    case "entrar-email":
      return (
        <TelaEntrar
          pedirLink={acaoFalsa}
          entrarComGoogle={nada}
          emailAberto
          erro="sem_livro"
        />
      );
    case "confirmar":
      return <TelaConfirmar tokenHash="previa" confirmar={acaoFalsa} />;
    case "sem-acesso":
      return (
        <TelaSemAcesso email="joao@exemplo.com" ehAdmin={false} sair={nada} />
      );
    case "livro":
      return <TelaLivroVazio autorNome="Jair" somenteLeitura={false} />;
    case "livro-somente-leitura":
      return <TelaLivroVazio autorNome="Jair" somenteLeitura />;
    case "admin":
      return (
        <TelaAdmin
          livros={LIVROS_FALSOS}
          ativar={acaoFalsa}
          renovar={acaoFalsa}
          reenviar={acaoFalsa}
        />
      );
  }
}
