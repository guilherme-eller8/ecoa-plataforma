"use client";

import { TelaAdmin } from "@/components/telas/tela-admin";
import { TelaConfirmar } from "@/components/telas/tela-confirmar";
import { TelaEntrar } from "@/components/telas/tela-entrar";
import {
  ConfigurarFotos,
  ConfigurarPerguntas,
  ConfigurarQuem,
} from "@/components/telas/configurar";
import {
  TelaFamilia,
  TelaFamiliaInvalida,
} from "@/components/telas/tela-familia";
import { TelaKit } from "@/components/telas/tela-kit";
import { TelaLivro } from "@/components/telas/tela-livro";
import { TelaPerguntas } from "@/components/telas/tela-perguntas";
import {
  ACOES_FALSAS,
  CAUSOS_JAIR,
  ENQUETE_JAIR,
  FOTOS_JAIR,
  LINK_AUTOR_EXEMPLO,
  LINK_FAMILIA_EXEMPLO,
  LIVRO_JAIR,
  LIVRO_NOVO,
  PAGINA_FAMILIA,
  PERGUNTAS_JAIR,
} from "@/lib/exemplos/prompt4";
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
      return (
        <TelaLivro
          livro={LIVRO_JAIR}
          resumo={{ paraPerguntar: 4, causosNovos: 1, enqueteAberta: true }}
        />
      );
    case "livro-somente-leitura":
      return (
        <TelaLivro
          livro={{ ...LIVRO_JAIR, podeEscrever: false }}
          resumo={{ paraPerguntar: 4, causosNovos: 0, enqueteAberta: false }}
        />
      );
    case "admin":
      return (
        <TelaAdmin
          livros={LIVROS_FALSOS}
          ativar={acaoFalsa}
          renovar={acaoFalsa}
          reenviar={acaoFalsa}
        />
      );
    case "configurar-quem":
      return (
        <ConfigurarQuem
          livro={LIVRO_NOVO}
          acoes={ACOES_FALSAS.configuracao}
          fotos={ACOES_FALSAS.fotos}
        />
      );
    case "configurar-perguntas":
      return (
        <ConfigurarPerguntas
          livro={LIVRO_NOVO}
          acoes={ACOES_FALSAS.configuracao}
          fotos={ACOES_FALSAS.fotos}
        />
      );
    case "configurar-fotos":
      return (
        <ConfigurarFotos
          livro={LIVRO_NOVO}
          acoes={ACOES_FALSAS.configuracao}
          fotos={ACOES_FALSAS.fotos}
        />
      );
    case "kit":
      return (
        <TelaKit
          livro={LIVRO_JAIR}
          linkFamilia={LINK_FAMILIA_EXEMPLO}
          linkAutor={LINK_AUTOR_EXEMPLO}
          acoes={ACOES_FALSAS.kit}
        />
      );
    case "kit-sem-link":
      return (
        <TelaKit
          livro={LIVRO_JAIR}
          linkFamilia={null}
          linkAutor={LINK_AUTOR_EXEMPLO}
          acoes={ACOES_FALSAS.kit}
        />
      );
    case "perguntas":
    case "perguntas-causos":
    case "perguntas-enquete":
      return (
        <TelaPerguntas
          livro={LIVRO_JAIR}
          perguntas={PERGUNTAS_JAIR}
          causos={CAUSOS_JAIR}
          enquete={ENQUETE_JAIR}
          fotos={FOTOS_JAIR}
          linkAutor={LINK_AUTOR_EXEMPLO}
          acoes={ACOES_FALSAS.perguntas}
          acoesFotos={ACOES_FALSAS.fotos}
          abaInicial={
            tela === "perguntas"
              ? "perguntar"
              : tela === "perguntas-causos"
                ? "causos"
                : "enquete"
          }
        />
      );
    case "perguntas-vazia":
      return (
        <TelaPerguntas
          livro={LIVRO_JAIR}
          perguntas={[]}
          causos={[]}
          enquete={null}
          fotos={[]}
          linkAutor={LINK_AUTOR_EXEMPLO}
          acoes={ACOES_FALSAS.perguntas}
          acoesFotos={ACOES_FALSAS.fotos}
        />
      );
    case "familia":
      return (
        <TelaFamilia pagina={PAGINA_FAMILIA} acoes={ACOES_FALSAS.familia} />
      );
    case "familia-causo":
      return (
        <TelaFamilia
          pagina={PAGINA_FAMILIA}
          acoes={ACOES_FALSAS.familia}
          inicial="causo"
        />
      );
    case "familia-invalida":
      return <TelaFamiliaInvalida />;
  }
}
