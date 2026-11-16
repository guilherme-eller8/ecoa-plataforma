"use client";

// Folha "Página de amostra" (prompt 10, seção 5.1; refeita no P72): a página aparece na hora,
// em A5, e a voz do QR é preparada à vista, com progresso e a garantia de que dá para fechar.
// O PDF só sai com a voz pronta (P56); até lá o QR da imagem sai tracejado. O responsável pode
// desligar e religar o QR (P58).
import { useEffect, useState } from "react";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { IconeCheck } from "@/components/ui/icones";
import {
  AMOSTRA_CONSULTAR_S,
  AMOSTRA_ESPERA_VOZ_S,
  AMOSTRA_VOZ_TIPICA_S,
  QR_AUDIO_ESPERA_MIN,
} from "@/lib/config";
import type { Resposta } from "@/lib/livro/tipos";
import { codigoImpresso } from "@/lib/qr/codigo";

export type EstadoAmostra = {
  codigo: string;
  vozPronta: boolean;
  desligado: boolean;
  responsavel: boolean;
  /** A fila não aceitou o pedido da voz: esperar não adianta. */
  envioFalhou: boolean;
};

export type AcoesAmostra = {
  preparar: () => Promise<Resposta<EstadoAmostra>>;
  previa: () => Promise<Resposta<{ imagem: string; cortada: boolean }>>;
  desligar: (desligar: boolean) => Promise<Resposta>;
};

type Fase =
  | { tipo: "preparando" }
  | { tipo: "esperando"; estado: EstadoAmostra; inicio: number }
  | { tipo: "pronta"; estado: EstadoAmostra }
  | { tipo: "demorou"; estado: EstadoAmostra }
  | { tipo: "falhou"; estado: EstadoAmostra }
  | { tipo: "erro"; mensagem: string };

type Previa =
  | { tipo: "carregando" }
  | { tipo: "pronta"; imagem: string; comQr: boolean }
  | { tipo: "erro" };

function Passo({
  feito,
  children,
}: {
  feito: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden="true"
        className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center ${feito ? "text-floresta" : "text-tinta-2"}`}
      >
        {feito ? <IconeCheck tamanho={22} /> : "…"}
      </span>
      <span className={`text-ui-17 ${feito ? "text-tinta" : "text-tinta-2"}`}>
        {children}
      </span>
    </li>
  );
}

/** Barra que anda até 90% no tempo típico da voz e espera ali: mostra que algo acontece. */
function Progresso({ inicio }: { inicio: number | null }) {
  const [agora, setAgora] = useState(inicio ?? 0);
  useEffect(() => {
    if (inicio === null) return;
    const t = setInterval(() => setAgora(Date.now()), 500);
    return () => clearInterval(t);
  }, [inicio]);
  const fracao =
    inicio === null
      ? 0
      : Math.min(0.9, (agora - inicio) / 1000 / AMOSTRA_VOZ_TIPICA_S);
  return (
    <div
      className="bg-polen-2 h-1.5 w-full overflow-hidden rounded-full"
      role="progressbar"
      aria-label="Preparando a voz"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(fracao * 100)}
    >
      <div
        className="bg-floresta h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${Math.max(4, fracao * 100)}%` }}
      />
    </div>
  );
}

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
  const [previa, setPrevia] = useState<Previa>({ tipo: "carregando" });
  const [confirmarDesligar, setConfirmarDesligar] = useState(false);
  const [mudando, setMudando] = useState(false);
  const [rodada, setRodada] = useState(0);

  // Enquanto a folha está aberta: cria o QR, mostra a página e consulta a voz a cada
  // AMOSTRA_CONSULTAR_S. Com a voz pronta, a imagem é refeita com o QR de verdade.
  useEffect(() => {
    if (!aberta) return;
    let vivo = true;
    let espera: ReturnType<typeof setTimeout> | undefined;
    const inicio = Date.now();
    let comQrNaImagem: boolean | null = null;

    async function mostrarPagina(comQr: boolean) {
      if (comQrNaImagem === comQr) return;
      comQrNaImagem = comQr;
      const r = await acoes.previa();
      if (!vivo) return;
      setPrevia(
        r.ok
          ? { tipo: "pronta", imagem: r.dados.imagem, comQr }
          : { tipo: "erro" },
      );
    }

    async function consultar() {
      const r = await acoes.preparar();
      if (!vivo) return;
      if (!r.ok) return setFase({ tipo: "erro", mensagem: r.mensagem });
      const e = r.dados;
      const tocando = e.vozPronta && !e.desligado;
      void mostrarPagina(tocando);
      if (e.vozPronta || e.desligado)
        return setFase({ tipo: "pronta", estado: e });
      if (e.envioFalhou) return setFase({ tipo: "falhou", estado: e });
      if (Date.now() - inicio > AMOSTRA_ESPERA_VOZ_S * 1000)
        return setFase({ tipo: "demorou", estado: e });
      setFase({ tipo: "esperando", estado: e, inicio });
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
    setPrevia({ tipo: "carregando" });
    setConfirmarDesligar(false);
    aoFechar();
  }

  function tentarDeNovo() {
    setFase({ tipo: "preparando" });
    setRodada((n) => n + 1);
  }

  async function mudar(desligar: boolean) {
    setMudando(true);
    const r = await acoes.desligar(desligar);
    setMudando(false);
    setConfirmarDesligar(false);
    if (!r.ok) return setFase({ tipo: "erro", mensagem: r.mensagem });
    tentarDeNovo();
  }

  const estado = "estado" in fase ? fase.estado : null;
  const desligado = estado?.desligado ?? false;
  const vozPronta = fase.tipo === "pronta" && !desligado;

  return (
    <FolhaInferior aberta={aberta} aoFechar={fechar} titulo="Página de amostra">
      <div className="flex flex-col gap-5">
        <figure className="flex flex-col items-center gap-2">
          <div className="bg-polen-2 rounded-interno shadow-flutuante flex aspect-[154/216] w-full max-w-[15rem] items-center justify-center overflow-hidden">
            {previa.tipo === "pronta" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previa.imagem}
                alt="A página da história no tamanho do livro"
                className="size-full object-contain"
              />
            ) : (
              <span className="text-ui-15 text-tinta-2 px-4 text-center">
                {previa.tipo === "erro"
                  ? "Não deu para mostrar a página agora."
                  : "Montando a página…"}
              </span>
            )}
          </div>
          <figcaption className="text-ui-13 text-tinta-2">
            Tamanho do livro (A5)
          </figcaption>
        </figure>

        {fase.tipo === "erro" ? (
          <div className="flex flex-col gap-3" role="alert">
            <p className="text-ui-17 text-erro">{fase.mensagem}</p>
            <Botao variante="secundario" onClick={tentarDeNovo}>
              Tentar de novo
            </Botao>
          </div>
        ) : null}

        {fase.tipo !== "erro" && !desligado ? (
          <ul className="flex flex-col gap-3" role="status" aria-live="polite">
            <Passo feito={previa.tipo === "pronta"}>
              Texto, título e foto no lugar
            </Passo>
            <Passo feito={vozPronta}>
              {vozPronta ? "O QR já toca a voz" : "Preparando a voz do QR"}
            </Passo>
          </ul>
        ) : null}

        {fase.tipo === "preparando" || fase.tipo === "esperando" ? (
          <div className="flex flex-col gap-2">
            <Progresso
              key={fase.tipo === "esperando" ? fase.inicio : 0}
              inicio={fase.tipo === "esperando" ? fase.inicio : null}
            />
            <p className="text-ui-15 text-tinta-2">
              Leva até 1 minuto. Pode fechar: a voz continua sendo preparada e o
              PDF fica aqui.
            </p>
          </div>
        ) : null}

        {fase.tipo === "demorou" ? (
          <div className="flex flex-col gap-3" role="status">
            <p className="text-ui-17 text-tinta">
              A voz está demorando mais que o normal. Pode fechar e voltar
              depois: a página fica aqui.
            </p>
            <Botao variante="secundario" onClick={tentarDeNovo}>
              Tentar de novo
            </Botao>
          </div>
        ) : null}

        {fase.tipo === "falhou" ? (
          <div className="flex flex-col gap-3" role="alert">
            <p className="text-ui-17 text-erro">
              Não conseguimos preparar a voz agora. Já fomos avisados. Tente de
              novo daqui a {QR_AUDIO_ESPERA_MIN} minutos.
            </p>
            <Botao variante="secundario" onClick={tentarDeNovo}>
              Tentar de novo
            </Botao>
          </div>
        ) : null}

        {desligado ? (
          <p className="text-ui-17 text-tinta">
            O QR desta história está desligado. Quem apontar a câmera não ouve
            nada.
          </p>
        ) : null}

        {fase.tipo !== "erro" && !desligado ? (
          vozPronta ? (
            <a
              href={urlPdf}
              download
              className={classesDoBotao({ larguraTotal: true })}
            >
              Baixar PDF para imprimir
            </a>
          ) : (
            <Botao larguraTotal disabled carregando={fase.tipo !== "falhou"}>
              Baixar PDF para imprimir
            </Botao>
          )
        ) : null}

        {vozPronta ? (
          <DicaPrimeiraVez chave="amostra">
            Imprima e aponte a câmera do celular para o quadrado.
          </DicaPrimeiraVez>
        ) : null}

        {estado ? (
          <div className="flex flex-col gap-1 pt-2">
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
      </div>
    </FolhaInferior>
  );
}
