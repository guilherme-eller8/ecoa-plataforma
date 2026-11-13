"use client";

import { AdminProcessamento } from "@/components/telas/admin-processamento";
import { TelaAdmin } from "@/components/telas/tela-admin";
import { TelaConfiguracoes } from "@/components/telas/tela-configuracoes";
import { TelaHistoria } from "@/components/telas/tela-historia";
import { TelaHistorias } from "@/components/telas/tela-historias";
import {
  ACOES_CONFIGURACOES_FALSAS,
  AO_VIVO_JAIR,
  AUDIOS_COM_SITUACAO,
  CUSTOS_FALSOS,
  ESPERANDO_FALSAS,
  FALHAS_FALSAS,
  HISTORIA_PARA_LER,
  GUARDADAS_JAIR,
  HISTORIAS_JAIR,
  NOMES_JAIR,
} from "@/lib/exemplos/prompt6";
import { TelaAudios } from "@/components/telas/tela-audios";
import { TelaDividir } from "@/components/telas/tela-dividir";
import {
  ACOES_DIVISAO_FALSAS,
  DIVISAO_CEIA,
  DIVISAO_CONFIRMADA,
  HISTORIA_COM_SUGESTAO,
  HISTORIAS_COM_DIVISAO,
} from "@/lib/exemplos/prompt7";
import { TelaNovaEnquete } from "@/components/telas/tela-nova-enquete";
import { TelaGravarConversa } from "@/components/telas/tela-gravar-conversa";
import { TelaAutor, TelaAutorInvalido } from "@/components/telas/tela-autor";
import { TelaCompartilhar } from "@/components/telas/tela-compartilhar";
import {
  ACOES_AUTOR_FALSAS,
  PAGINA_AUTOR,
  TOKEN_AUTOR_EXEMPLO,
} from "@/lib/exemplos/prompt5";
import { TelaNovaHistoria } from "@/components/telas/tela-nova-historia";
import {
  ACOES_AUDIOS_FALSAS,
  AUDIOS_JAIR,
  ENVIAR_FALSO,
  itensDeExemplo,
  PERGUNTAS_PENDENTES,
  SUBIR_FALSO,
} from "@/lib/exemplos/prompt5a";
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

// Dois áudios "recebidos do WhatsApp" para a tela de exemplo do Compartilhar.
const lerDeExemplo = async () => [
  new File([new Uint8Array(180 * 1024)], "PTT-20261110-WA0007.opus"),
  new File([new Uint8Array(95 * 1024)], "PTT-20261110-WA0008.opus"),
];

const acaoFalsa = async (): Promise<Resultado | null> => null;
const nada = async () => {};

export function Vitrine({ tela }: { tela: Tela }) {
  switch (tela) {
    case "livro-com-historias":
      return (
        <TelaLivro
          livro={{ ...LIVRO_JAIR, iaConfirmada: true }}
          resumo={{
            paraPerguntar: 4,
            causosNovos: 1,
            enqueteAberta: false,
            audios: 3,
          }}
          historias={HISTORIAS_JAIR.slice(0, 2)}
          linkFamilia="https://app.ecoa-memorias.com.br/f/v1_exemplo"
          guardadas={GUARDADAS_JAIR}
          marcarVista={nada}
          vitrine={AO_VIVO_JAIR}
        />
      );
    case "historias":
    case "historias-vazia":
      return (
        <TelaHistorias
          livro={LIVRO_JAIR}
          historias={tela === "historias" ? HISTORIAS_JAIR : []}
          marcarVista={nada}
          vitrine={AO_VIVO_JAIR}
        />
      );
    case "historia":
      return <TelaHistoria livro={LIVRO_JAIR} historia={HISTORIA_PARA_LER} />;
    case "historia-sugestao":
      return (
        <TelaHistoria
          livro={LIVRO_JAIR}
          historia={HISTORIA_COM_SUGESTAO}
          responderSugestao={async () => ({ ok: true })}
        />
      );
    case "dividir":
    case "dividir-confirmada":
      return (
        <TelaDividir
          livro={LIVRO_JAIR}
          divisao={tela === "dividir" ? DIVISAO_CEIA : DIVISAO_CONFIRMADA}
          acoes={ACOES_DIVISAO_FALSAS}
        />
      );
    case "livro-conferir":
      return (
        <TelaLivro
          livro={{ ...LIVRO_JAIR, iaConfirmada: true }}
          resumo={{
            paraPerguntar: 4,
            causosNovos: 0,
            enqueteAberta: false,
            audios: 10,
          }}
          historias={HISTORIAS_COM_DIVISAO}
          linkFamilia="https://app.ecoa-memorias.com.br/f/v1_exemplo"
          guardadas={[]}
          marcarVista={nada}
          vitrine={{}}
        />
      );
    case "configuracoes":
    case "configuracoes-vazia":
      return (
        <TelaConfiguracoes
          livro={{ ...LIVRO_JAIR, iaConfirmada: tela === "configuracoes" }}
          nomes={tela === "configuracoes" ? NOMES_JAIR : []}
          acoes={ACOES_CONFIGURACOES_FALSAS}
        />
      );
    case "audios-situacao":
      return <TelaAudios livro={LIVRO_JAIR} audios={AUDIOS_COM_SITUACAO} />;
    case "admin-processamento":
      return (
        <TelaAdmin
          livros={LIVROS_FALSOS}
          ativar={acaoFalsa}
          renovar={acaoFalsa}
          reenviar={acaoFalsa}
          processamento={
            <AdminProcessamento
              falhas={FALHAS_FALSAS}
              esperando={ESPERANDO_FALSAS}
              custos={CUSTOS_FALSOS}
              tentarDeNovo={async () => ({
                ok: true,
                mensagem: "Processando de novo.",
              })}
              processar={async () => ({
                ok: true,
                mensagem: "Enviado para a fila.",
              })}
            />
          }
        />
      );
    case "nova-enquete":
    case "nova-enquete-etapa":
    case "nova-enquete-revisar":
      return (
        <TelaNovaEnquete
          livro={LIVRO_JAIR}
          causos={CAUSOS_JAIR.filter(
            (c) => c.estado === "novo" || c.estado === "na_enquete",
          )}
          abrirEnquete={ACOES_FALSAS.perguntas.abrirEnquete}
          inicial={
            tela === "nova-enquete"
              ? { vista: "como" }
              : tela === "nova-enquete-etapa"
                ? { vista: 1 }
                : { vista: "revisar", todas: true }
          }
        />
      );
    case "nova-historia":
    case "nova-historia-arquivos":
      return (
        <TelaNovaHistoria
          livro={LIVRO_JAIR}
          perguntas={PERGUNTAS_PENDENTES}
          acoes={ACOES_AUDIOS_FALSAS}
          enviarArquivo={ENVIAR_FALSO}
          inicial={tela === "nova-historia" ? [] : itensDeExemplo()}
        />
      );
    case "audios":
      return <TelaAudios livro={LIVRO_JAIR} audios={AUDIOS_JAIR} />;
    case "gravar-conversa":
    case "gravar-conversa-pergunta":
    case "gravar-conversa-partes":
      return (
        <TelaGravarConversa
          livro={LIVRO_JAIR}
          perguntas={PERGUNTAS_PENDENTES}
          acoes={ACOES_AUDIOS_FALSAS}
          perguntaInicial={
            tela === "gravar-conversa" ? null : PERGUNTAS_PENDENTES[0]?.id
          }
          subir={SUBIR_FALSO}
          limiteParteS={tela === "gravar-conversa-partes" ? 3 : undefined}
        />
      );
    case "autor-primeira":
    case "autor-inicio":
    case "autor-inicio-vazio":
    case "autor-gravar":
    case "autor-gravar-livre":
      return (
        <TelaAutor
          token={TOKEN_AUTOR_EXEMPLO}
          pagina={{
            ...PAGINA_AUTOR,
            consentiu: tela !== "autor-primeira",
            perguntas:
              tela === "autor-inicio-vazio" ? [] : PAGINA_AUTOR.perguntas,
          }}
          modo={
            tela === "autor-gravar"
              ? { tipo: "gravar", perguntaId: PAGINA_AUTOR.perguntas[0].id }
              : tela === "autor-gravar-livre"
                ? { tipo: "gravar", perguntaId: null }
                : { tipo: "inicio" }
          }
          acoes={ACOES_AUTOR_FALSAS}
          subir={SUBIR_FALSO}
        />
      );
    case "autor-invalido":
      return <TelaAutorInvalido />;
    case "compartilhar":
    case "compartilhar-livros":
    case "compartilhar-erro":
      return (
        <TelaCompartilhar
          livro={tela === "compartilhar" ? LIVRO_JAIR : null}
          livros={[
            { id: LIVRO_JAIR.id, autor: LIVRO_JAIR.autor },
            {
              id: "00000000-0000-4000-8000-000000000999",
              autor: "Dona Lurdes",
            },
          ]}
          perguntas={PERGUNTAS_PENDENTES}
          acoes={ACOES_AUDIOS_FALSAS}
          erro={tela === "compartilhar-erro"}
          ler={lerDeExemplo}
        />
      );
    case "audios-vazia":
      return <TelaAudios livro={LIVRO_JAIR} audios={[]} />;
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
          resumo={{
            paraPerguntar: 4,
            causosNovos: 1,
            enqueteAberta: true,
            audios: 3,
          }}
        />
      );
    case "livro-somente-leitura":
      return (
        <TelaLivro
          livro={{ ...LIVRO_JAIR, podeEscrever: false }}
          resumo={{
            paraPerguntar: 4,
            causosNovos: 0,
            enqueteAberta: false,
            audios: 0,
          }}
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
