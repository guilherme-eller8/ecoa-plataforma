"use client";

// Folha "Página de amostra" (prompt 10, seção 5.1): cria o QR, espera a voz ficar pronta e só
// então mostra Baixar PDF (P56). O responsável pode desligar e religar o QR (P58).
import { useEffect, useState } from "react";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { AMOSTRA_CONSULTAR_S, AMOSTRA_ESPERA_VOZ_S } from "@/lib/config";
import type { Resposta } from "@/lib/livro/tipos";
import { codigoImpresso } from "@/lib/qr/codigo";

export type EstadoAmostra = {
  codigo: string;
  vozPronta: boolean;
  desligado: boolean;
  responsavel: boolean;
};

export type AcoesAmostra = {
  preparar: () => Promise<Resposta<EstadoAmostra>>;
  desligar: (desligar: boolean) => Promise<Resposta>;
};

type Fase =
  | { tipo: "preparando" }
  | { tipo: "pronta"; estado: EstadoAmostra }
  | { tipo: "esperando"; estado: EstadoAmostra }
  | { tipo: "demorou" }
  | { tipo: "erro"; mensagem: string };

export function FolhaAmostra({
  aberta,
  aoFechar,
  urlPdf,
  acoes,
}: {
  aberta: boolean;
  aoFechar: () => void;
  urlPdf: string;
  acoes: AcoesAmostra;
}) {
  const [fase, setFase] = useState<Fase>({ tipo: "preparando" });
  const [confirmarDesligar, setConfirmarDesligar] = useState(false);
  const [mudando, setMudando] = useState(false);
  const [rodada, setRodada] = useState(0);

  // Enquanto a folha está aberta: consulta a cada AMOSTRA_CONSULTAR_S até a voz ficar pronta.
  useEffect(() => {
    if (!aberta) return;
    let vivo = true;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const inicio = Date.now();
    async function consultar() {
      const r = await acoes.preparar();
      if (!vivo) return;
      if (!r.ok) return setFase({ tipo: "erro", mensagem: r.mensagem });
      const e = r.dados;
      if (e.vozPronta || e.desligado)
        return setFase({ tipo: "pronta", estado: e });
      if (Date.now() - inicio > AMOSTRA_ESPERA_VOZ_S * 1000)
        return setFase({ tipo: "demorou" });
      setFase({ tipo: "esperando", estado: e });
      espera = setTimeout(() => void consultar(), AMOSTRA_CONSULTAR_S * 1000);
    }
    void consultar();
    return () => {
      vivo = false;
      clearTimeout(espera);
    };
  }, [aberta, acoes, rodada]);

  function fechar() {
    setFase({ tipo: "preparando" });
    setConfirmarDesligar(false);
    aoFechar();
  }

  async function mudar(desligar: boolean) {
    setMudando(true);
    const r = await acoes.desligar(desligar);
    setMudando(false);
    setConfirmarDesligar(false);
    if (!r.ok) return setFase({ tipo: "erro", mensagem: r.mensagem });
    setFase({ tipo: "preparando" });
    setRodada((n) => n + 1);
  }

  const estado =
    fase.tipo === "pronta" || fase.tipo === "esperando" ? fase.estado : null;

  return (
    <FolhaInferior aberta={aberta} aoFechar={fechar} titulo="Página de amostra">
      {fase.tipo === "preparando" ? (
        <p className="text-ui-17 text-tinta-2">Preparando…</p>
      ) : null}

      {fase.tipo === "esperando" ? (
        <div className="flex flex-col gap-3" role="status">
          <p className="text-ui-17 text-tinta">Preparando a voz…</p>
          <p className="text-ui-15 text-tinta-2">
            Leva menos de um minuto. O PDF sai quando o QR já toca.
          </p>
        </div>
      ) : null}

      {fase.tipo === "demorou" ? (
        <p className="text-ui-17 text-tinta" role="status">
          Está demorando. Feche e tente de novo daqui a pouco.
        </p>
      ) : null}

      {fase.tipo === "erro" ? (
        <p className="text-ui-17 text-erro" role="alert">
          {fase.mensagem}
        </p>
      ) : null}

      {fase.tipo === "pronta" && !fase.estado.desligado ? (
        <div className="flex flex-col gap-4">
          <p className="text-ui-17 text-tinta-2">
            Uma página no tamanho do livro, com o QR que toca a voz.
          </p>
          <a
            href={urlPdf}
            download
            className={classesDoBotao({ larguraTotal: true })}
          >
            Baixar PDF
          </a>
          <DicaPrimeiraVez chave="amostra">
            Imprima e aponte a câmera do celular para o quadrado.
          </DicaPrimeiraVez>
        </div>
      ) : null}

      {fase.tipo === "pronta" && fase.estado.desligado ? (
        <p className="text-ui-17 text-tinta">
          O QR desta história está desligado. Quem apontar a câmera não ouve
          nada.
        </p>
      ) : null}

      {estado ? (
        <div className="bg-polen-2 rounded-interno flex flex-col gap-2 px-4 py-3">
          <p className="text-ui-15 text-tinta-2">
            Código embaixo do QR:{" "}
            <span className="text-tinta font-medium tracking-[0.08em]">
              {codigoImpresso(estado.codigo)}
            </span>
          </p>
          {estado.responsavel && !confirmarDesligar ? (
            <Botao
              variante="texto"
              className="self-start !px-0"
              carregando={mudando}
              onClick={() =>
                estado.desligado
                  ? void mudar(false)
                  : setConfirmarDesligar(true)
              }
            >
              {estado.desligado ? "Ligar de novo" : "Desligar este QR"}
            </Botao>
          ) : null}
          {confirmarDesligar ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-ui-15 text-tinta">
                Quem apontar a câmera não vai ouvir mais nada.
              </p>
              <Botao
                variante="secundario"
                carregando={mudando}
                onClick={() => void mudar(true)}
              >
                Desligar
              </Botao>
              <Botao
                variante="texto"
                onClick={() => setConfirmarDesligar(false)}
              >
                Cancelar
              </Botao>
            </div>
          ) : null}
        </div>
      ) : null}
    </FolhaInferior>
  );
}
