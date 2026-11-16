"use client";

import { AdminProcessamento } from "@/components/telas/admin-processamento";
import { TelaAderencia } from "@/components/telas/tela-aderencia";
import { TelaAderenciaLivro } from "@/components/telas/tela-aderencia-livro";
import { TelaEvals } from "@/components/telas/tela-evals";
import { TelaEvalsAdocao } from "@/components/telas/tela-evals-adocao";
import { TelaInicioAdmin } from "@/components/telas/tela-inicio-admin";
import {
  CLIENTE_JAIR,
  DADOS_ADOCAO,
  DADOS_ADOCAO_VAZIA,
  DADOS_CUSTO,
  DADOS_CUSTO_VAZIO,
  LIVROS_DA_ESCOLHA,
} from "@/lib/exemplos/evals";
import { TelaErros } from "@/components/telas/tela-erros";
import {
  FUNIL_ADERENCIA,
  JOBS_FALSOS,
  LINHA_DO_TEMPO_JAIR,
  LINHAS_ADERENCIA,
  PESSOAS_JAIR,
  ROTAS_COM_ERRO,
} from "@/lib/exemplos/prompt15";
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
  HISTORIA_SEM_FALA,
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
import { TelaEditor } from "@/components/telas/tela-editor";
import {
  TelaMontarCapa,
  TelaMontarConferir,
  TelaMontarConteudo,
} from "@/components/telas/tela-montar";
import { TelaVersao } from "@/components/telas/tela-versao";
import {
  ACOES_VERSAO_FALSAS,
  PREVIA_CAPA_EXEMPLO,
  VERSAO_PRONTA,
  QUEBRAR_LIVRO,
  acoesDeMontarFalsas,
  montagemDeExemplo,
} from "@/lib/exemplos/prompt13";
import {
  FolhaAmostra,
  type AcoesAmostra,
} from "@/components/editor/folha-amostra";
import { TelaDigitarCodigo, TelaPlayer } from "@/components/telas/tela-player";
import { TelaGravarMais } from "@/components/telas/tela-gravar-mais";
import {
  HISTORIA_COM_PROPOSTA,
  HISTORIA_EDITADA,
  acoesEditorComIA,
} from "@/lib/exemplos/prompt9";
import { TelaVersoes } from "@/components/telas/tela-versoes";
import {
  ACOES_VERSOES_FALSAS,
  acoesEditorFalsas,
  HISTORIA_PARA_EDITAR,
  TEXTO_ATUAL_TREM,
  VERSOES_TREM,
} from "@/lib/exemplos/prompt8";
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
  ConfigurarAjuda,
  ConfigurarFotos,
  ConfigurarPerguntas,
  ConfigurarQuem,
} from "@/components/telas/configurar";
import { FolhaGrupo } from "@/components/editor/folha-grupo";
import { TelaCompartilhada } from "@/components/telas/tela-compartilhada";
import { TelaConvite } from "@/components/telas/tela-convite";
import { TelaConvitesPendentes } from "@/components/telas/tela-convites-pendentes";
import { TelaPessoas } from "@/components/telas/tela-pessoas";
import {
  TelaMensagem,
  TelaMensagemInvalida,
} from "@/components/telas/tela-mensagem";
import { TelaMensagens } from "@/components/telas/tela-mensagens";
import {
  ACOES_MENSAGEM_FALSAS,
  ACOES_MENSAGENS_FALSAS,
  LINK_MENSAGEM_EXEMPLO,
  MENSAGENS_JAIR,
  PAGINA_MENSAGEM,
  TEXTO_CONFERIR,
} from "@/lib/exemplos/prompt12";
import { TelaSairResumo } from "@/components/telas/tela-sair-resumo";
import {
  ACOES_GRUPO_FALSAS,
  ACOES_PESSOAS_FALSAS,
  COMPARTILHADA,
  COMPARTILHADA_PREPARANDO,
  CONVITES_JAIR,
  LIVRO_COFACILITADORA,
  LIVRO_NOVO_RESPONSAVEL,
  MEMBROS_JAIR,
  MEMBROS_VISTOS_PELA_BIA,
  PERGUNTAS_PARA_LEMBRAR,
} from "@/lib/exemplos/prompt11";
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
import {
  TelaFolhear,
  type AcoesFolhear,
} from "@/components/telas/tela-folhear";
import type { Resultado } from "@/lib/resultado";
import { LIVROS_FALSOS, type Tela } from "@/lib/styleguide";

// Dois áudios "recebidos do WhatsApp" para a tela de exemplo do Compartilhar.
const lerDeExemplo = async () => [
  new File([new Uint8Array(180 * 1024)], "PTT-20261110-WA0007.opus"),
  new File([new Uint8Array(95 * 1024)], "PTT-20261110-WA0008.opus"),
];

const acaoFalsa = async (): Promise<Resultado | null> => null;
const nada = async () => {};

// Prompt 10 (refeita no P72): folha da página de amostra, com a voz pronta, preparando ou com a
// fila recusando o pedido. A página é uma renderização de verdade do template, com texto falso.
const AMOSTRA_FALSA = (
  voz: "pronta" | "preparando" | "falhou",
): AcoesAmostra => ({
  preparar: async () => ({
    ok: true,
    dados: {
      codigo: "7KQ2M9XA",
      vozPronta: voz === "pronta",
      desligado: false,
      responsavel: true,
      envioFalhou: voz === "falhou",
    },
  }),
  previa: async () => ({
    ok: true,
    dados: {
      imagem:
        voz === "pronta"
          ? "/exemplo/amostra-com-qr.jpg"
          : "/exemplo/amostra-sem-qr.jpg",
      cortada: true,
    },
  }),
  desligar: async () => ({ ok: true }),
});

export function Vitrine({ tela }: { tela: Tela }) {
  switch (tela) {
    // ── Prompt 12 ──
    case "mensagem":
    case "mensagem-gravar":
    case "mensagem-escrever":
    case "mensagem-escrevendo":
    case "mensagem-conferir":
    case "mensagem-enviada": {
      const passo = (
        {
          mensagem: "quem",
          "mensagem-gravar": "gravar",
          "mensagem-escrever": "escrever",
          "mensagem-escrevendo": "escrevendo",
          "mensagem-conferir": "conferir",
          "mensagem-enviada": "enviada",
        } as const
      )[tela];
      return (
        <TelaMensagem
          pagina={PAGINA_MENSAGEM}
          acoes={ACOES_MENSAGEM_FALSAS}
          inicial={passo}
          textoInicial={passo === "conferir" ? TEXTO_CONFERIR : ""}
        />
      );
    }
    case "mensagem-fechada":
      return (
        <TelaMensagem
          pagina={{ ...PAGINA_MENSAGEM, aberto: false }}
          acoes={ACOES_MENSAGEM_FALSAS}
        />
      );
    case "mensagem-invalida":
      return <TelaMensagemInvalida />;
    case "mensagens":
      return (
        <TelaMensagens
          livro={LIVRO_JAIR}
          mensagens={MENSAGENS_JAIR}
          link={LINK_MENSAGEM_EXEMPLO}
          acoes={ACOES_MENSAGENS_FALSAS}
        />
      );
    case "mensagens-vazia":
      return (
        <TelaMensagens
          livro={LIVRO_JAIR}
          mensagens={[]}
          link={null}
          acoes={ACOES_MENSAGENS_FALSAS}
        />
      );
    case "mensagens-cofacilitador":
      return (
        <TelaMensagens
          livro={LIVRO_COFACILITADORA}
          mensagens={MENSAGENS_JAIR}
          link={LINK_MENSAGEM_EXEMPLO}
          acoes={ACOES_MENSAGENS_FALSAS}
        />
      );
    // ── Prompt 11 ──
    case "pessoas":
      return (
        <TelaPessoas
          livro={LIVRO_JAIR}
          membros={MEMBROS_JAIR}
          convites={CONVITES_JAIR}
          temLinks
          acoes={ACOES_PESSOAS_FALSAS}
        />
      );
    case "pessoas-vazia":
      return (
        <TelaPessoas
          livro={LIVRO_JAIR}
          membros={MEMBROS_JAIR.slice(0, 1)}
          convites={[]}
          temLinks
          acoes={ACOES_PESSOAS_FALSAS}
        />
      );
    case "pessoas-cofacilitador":
      return (
        <TelaPessoas
          livro={LIVRO_COFACILITADORA}
          membros={MEMBROS_VISTOS_PELA_BIA}
          convites={[]}
          temLinks
          acoes={ACOES_PESSOAS_FALSAS}
        />
      );
    case "configurar-ajuda":
      return (
        <ConfigurarAjuda
          livro={LIVRO_NOVO_RESPONSAVEL}
          acoes={ACOES_FALSAS.configuracao}
          convidar={ACOES_PESSOAS_FALSAS.convidar}
        />
      );
    case "convite":
      return (
        <TelaConvite
          estado={{ tipo: "entrar", quem: "Guilherme", autor: "Vô Jair" }}
        />
      );
    case "convite-aceitar":
      return (
        <TelaConvite
          estado={{ tipo: "aceitar", quem: "Guilherme", autor: "Vô Jair" }}
          aceitar={async () => ({ ok: true })}
        />
      );
    case "convite-outro-email":
      return (
        <TelaConvite
          estado={{ tipo: "outro_email", emailMascarado: "b•••@gmail.com" }}
          sair={nada}
        />
      );
    case "convite-invalido":
      return <TelaConvite estado={{ tipo: "invalido" }} />;
    case "convites-pendentes":
      return (
        <TelaConvitesPendentes
          convites={[{ id: CONVITES_JAIR[0].id, autor: "Vô Jair" }]}
          livroAtual={null}
          aceitar={async () => ({ ok: true })}
        />
      );
    case "editor-grupo":
      return (
        <>
          <TelaEditor
            historia={{ ...HISTORIA_PARA_EDITAR, revisada: true }}
            podeEscrever
            acoes={{
              ...acoesEditorFalsas("livre"),
              grupo: ACOES_GRUPO_FALSAS,
              amostra: AMOSTRA_FALSA("pronta"),
            }}
          />
          <FolhaGrupo aberta aoFechar={() => {}} acoes={ACOES_GRUPO_FALSAS} />
        </>
      );
    case "compartilhada":
    case "compartilhada-preparando":
      return (
        <TelaCompartilhada
          estado={
            tela === "compartilhada" ? COMPARTILHADA : COMPARTILHADA_PREPARANDO
          }
          tocou={nada}
        />
      );
    case "compartilhada-indisponivel":
      return (
        <TelaCompartilhada estado={{ estado: "indisponivel" }} tocou={nada} />
      );
    case "perguntas-lembrar":
      return (
        <TelaPerguntas
          livro={LIVRO_JAIR}
          perguntas={PERGUNTAS_PARA_LEMBRAR}
          causos={CAUSOS_JAIR}
          enquete={ENQUETE_JAIR}
          fotos={FOTOS_JAIR}
          linkAutor={LINK_AUTOR_EXEMPLO}
          acoes={ACOES_FALSAS.perguntas}
          acoesFotos={ACOES_FALSAS.fotos}
          abaInicial="enviadas"
        />
      );
    case "resumo-sair":
      return <TelaSairResumo valido sair={async () => ({ ok: true })} />;
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
          arquivarHistoria={{ arquivar: async () => ({ ok: true }) }}
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
          arquivar={{ arquivar: async () => ({ ok: true }) }}
          arquivadas={
            tela === "historias"
              ? [
                  {
                    id: "00000000-0000-4000-8000-000000000a01",
                    titulo: "A festa de São João",
                    falhou: false,
                    arquivadaEm: "2026-11-14T12:00:00Z",
                  },
                ]
              : []
          }
        />
      );
    case "historia":
      return <TelaHistoria livro={LIVRO_JAIR} historia={HISTORIA_PARA_LER} />;
    case "historia-sem-fala":
      return <TelaHistoria livro={LIVRO_JAIR} historia={HISTORIA_SEM_FALA} />;
    case "historia-sugestao":
      return (
        <TelaHistoria
          livro={LIVRO_JAIR}
          historia={HISTORIA_COM_SUGESTAO}
          responderSugestao={async () => ({ ok: true })}
        />
      );
    case "editor":
    case "editor-trava":
    case "editor-outra-tela":
    case "editor-somente-leitura":
    case "editor-pronta":
      return (
        <TelaEditor
          historia={{
            ...HISTORIA_PARA_EDITAR,
            revisada: tela === "editor-pronta",
          }}
          podeEscrever={tela !== "editor-somente-leitura"}
          arquivar={{ arquivar: async () => ({ ok: true }) }}
          acoes={{
            ...acoesEditorFalsas(
              tela === "editor-trava"
                ? "outra-pessoa"
                : tela === "editor-outra-tela"
                  ? "outra-tela"
                  : "livre",
            ),
            amostra: AMOSTRA_FALSA("pronta"),
          }}
        />
      );
    case "editor-amostra":
    case "editor-amostra-preparando":
    case "editor-amostra-falhou":
      return (
        <>
          <TelaEditor
            historia={{ ...HISTORIA_PARA_EDITAR, revisada: true }}
            podeEscrever
            acoes={acoesEditorFalsas("livre")}
          />
          <FolhaAmostra
            aberta
            aoFechar={() => {}}
            urlPdf="#"
            acoes={AMOSTRA_FALSA(
              tela === "editor-amostra"
                ? "pronta"
                : tela === "editor-amostra-falhou"
                  ? "falhou"
                  : "preparando",
            )}
          />
        </>
      );
    case "editor-ia":
    case "editor-proposta":
    case "editor-diferenca":
      return (
        <TelaEditor
          historia={
            tela === "editor-ia" ? HISTORIA_EDITADA : HISTORIA_COM_PROPOSTA
          }
          podeEscrever
          acoes={acoesEditorComIA()}
          propostaInicial={
            tela === "editor-diferenca"
              ? HISTORIA_COM_PROPOSTA.propostas[0].id
              : undefined
          }
        />
      );
    case "gravar-mais":
      return (
        <TelaGravarMais
          livroId={LIVRO_JAIR.id}
          historia={{
            id: HISTORIA_EDITADA.id,
            titulo: HISTORIA_EDITADA.texto.titulo,
          }}
          podeEscrever
          acoes={ACOES_AUDIOS_FALSAS}
          subir={SUBIR_FALSO}
        />
      );
    case "versoes":
      return (
        <TelaVersoes
          livroId={HISTORIA_PARA_EDITAR.livroId}
          historiaId={HISTORIA_PARA_EDITAR.id}
          titulo={HISTORIA_PARA_EDITAR.texto.titulo}
          atual={TEXTO_ATUAL_TREM}
          versoes={VERSOES_TREM}
          podeEscrever
          acoes={ACOES_VERSOES_FALSAS}
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
      return (
        <TelaAudios livro={LIVRO_JAIR} audios={AUDIOS_COM_SITUACAO} vitrine />
      );
    case "admin-aderencia":
      return (
        <TelaAderencia linhas={LINHAS_ADERENCIA} funil={FUNIL_ADERENCIA} />
      );
    case "admin-aderencia-vazia":
      return (
        <TelaAderencia
          linhas={[]}
          funil={{
            ...FUNIL_ADERENCIA,
            livros: 0,
            configurou: 0,
            primeiraHistoria: 0,
            cincoHistorias: 0,
          }}
        />
      );
    case "admin-aderencia-livro":
      return (
        <TelaAderenciaLivro
          autorNome="Jair"
          email="ana.souza@gmail.com"
          cliente={CLIENTE_JAIR}
          linha={LINHAS_ADERENCIA[1]}
          pessoas={PESSOAS_JAIR}
          linhaDoTempo={LINHA_DO_TEMPO_JAIR}
        />
      );
    case "admin-erros":
      return <TelaErros jobs={JOBS_FALSOS} rotas={ROTAS_COM_ERRO} />;
    case "admin-erros-vazio":
      return <TelaErros jobs={[]} rotas={[]} />;
    case "admin-evals":
      return <TelaEvals dados={DADOS_CUSTO} />;
    case "admin-evals-vazio":
      return <TelaEvals dados={DADOS_CUSTO_VAZIO} />;
    case "admin-evals-adocao":
      return <TelaEvalsAdocao dados={DADOS_ADOCAO} />;
    case "admin-evals-adocao-vazia":
      return <TelaEvalsAdocao dados={DADOS_ADOCAO_VAZIA} />;
    case "inicio-admin":
      return <TelaInicioAdmin livros={LIVROS_DA_ESCOLHA} />;
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
      return (
        <TelaAudios
          livro={LIVRO_JAIR}
          audios={AUDIOS_JAIR}
          acoes={{ arquivar: async () => ({ ok: true }) }}
          vitrine
        />
      );
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
      return <TelaAudios livro={LIVRO_JAIR} audios={[]} vitrine />;
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
    // Prompt 10: player do QR.
    case "player":
      return (
        <TelaPlayer
          estado={{
            estado: "ok",
            titulo: "O trem para Guarapari",
            ano: 1962,
            audioUrl: "/exemplo/trem.m4a",
          }}
          tocou={async () => {}}
        />
      );
    case "player-preparando":
      return (
        <TelaPlayer estado={{ estado: "preparando" }} tocou={async () => {}} />
      );
    case "player-nao-encontrado":
      return (
        <TelaPlayer
          estado={{ estado: "nao_encontrado" }}
          tocou={async () => {}}
        />
      );
    case "player-desativado":
      return (
        <TelaPlayer estado={{ estado: "desativado" }} tocou={async () => {}} />
      );
    case "player-digitar":
      return <TelaDigitarCodigo />;
    // Prompt 13: montar e publicar o livro.
    case "montar-conteudo":
      return (
        <TelaMontarConteudo
          livro={LIVRO_JAIR}
          montagem={montagemDeExemplo()}
          acoes={acoesDeMontarFalsas(72)}
        />
      );
    case "montar-conteudo-vazia":
      return (
        <TelaMontarConteudo
          livro={LIVRO_JAIR}
          montagem={montagemDeExemplo((c) => {
            c.historias = [];
            c.mensagens = [];
          })}
          acoes={acoesDeMontarFalsas(4, (c) => {
            c.historias = [];
            c.mensagens = [];
          })}
        />
      );
    case "montar-conteudo-riscada":
      return (
        <TelaMontarConteudo
          livro={LIVRO_JAIR}
          montagem={montagemDeExemplo((c) => {
            c.historias[2].incluida = false;
            c.mensagens[1].incluida = false;
          })}
          acoes={acoesDeMontarFalsas(60)}
        />
      );
    case "montar-capa":
      return (
        <TelaMontarCapa
          livro={LIVRO_JAIR}
          montagem={montagemDeExemplo()}
          acoes={acoesDeMontarFalsas(72)}
          previaInicial={PREVIA_CAPA_EXEMPLO}
        />
      );
    case "montar-conferir":
      return (
        <TelaMontarConferir
          livro={LIVRO_JAIR}
          montagem={montagemDeExemplo()}
          acoes={acoesDeMontarFalsas(72)}
        />
      );
    case "montar-conferir-vermelho":
      return (
        <TelaMontarConferir
          livro={LIVRO_JAIR}
          montagem={montagemDeExemplo(QUEBRAR_LIVRO)}
          acoes={acoesDeMontarFalsas(72, QUEBRAR_LIVRO)}
        />
      );
    case "montar-conferir-acima-80":
      return (
        <TelaMontarConferir
          livro={LIVRO_JAIR}
          montagem={montagemDeExemplo()}
          acoes={acoesDeMontarFalsas(92)}
        />
      );
    case "montar-conferir-cofacilitador":
      return (
        <TelaMontarConferir
          livro={LIVRO_COFACILITADORA}
          montagem={montagemDeExemplo()}
          acoes={acoesDeMontarFalsas(72)}
        />
      );
    case "versao-gerando":
      return (
        <TelaVersao
          livro={LIVRO_JAIR}
          versao={{
            ...VERSAO_PRONTA,
            estado: "gerando",
            paginas: null,
            capaUrl: null,
            previasUrls: [],
          }}
          acoes={{
            ...ACOES_VERSAO_FALSAS,
            estado: async () => ({
              ok: true,
              dados: {
                ...VERSAO_PRONTA,
                estado: "gerando",
                paginas: null,
                capaUrl: null,
                previasUrls: [],
              },
            }),
          }}
        />
      );
    case "versao-pronta":
      return (
        <TelaVersao
          livro={LIVRO_JAIR}
          versao={VERSAO_PRONTA}
          acoes={ACOES_VERSAO_FALSAS}
        />
      );
    case "versao-falhou":
      return (
        <TelaVersao
          livro={LIVRO_JAIR}
          versao={{
            ...VERSAO_PRONTA,
            estado: "falhou",
            paginas: null,
            capaUrl: null,
            previasUrls: [],
          }}
          acoes={ACOES_VERSAO_FALSAS}
        />
      );
    // ── P72: folhear antes de publicar ──
    case "folhear":
    case "folhear-vazio":
      return (
        <TelaFolhear
          livroId={LIVRO_JAIR.id}
          autor={LIVRO_JAIR.autor}
          acoes={acoesFolhearFalsas(tela === "folhear" ? 8 : 0)}
        />
      );
  }
}

// P72: as páginas são renderizações de verdade do template, com um livro de texto falso.
function acoesFolhearFalsas(total: number): AcoesFolhear {
  return {
    folhear: async (de) => ({
      ok: true,
      dados: {
        hash: "exemplo",
        total,
        capa: de === 1 && total ? "/exemplo/folhear-capa.svg" : null,
        de,
        urls: Array.from(
          { length: Math.max(0, Math.min(4, total - de + 1)) },
          (_, i) => `/exemplo/folhear-${de + i}.jpg`,
        ),
        provisorio: total > 0,
      },
    }),
  };
}
