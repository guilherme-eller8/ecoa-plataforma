"use client";

// Folha "Compartilhar no grupo" (prompt 11, P61): link /o/ com a mensagem pronta para o
// WhatsApp. Avisa antes de copiar quem vai ver. Desligar fica embaixo, discreto.
import { useEffect, useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { Copiar } from "@/components/ui/copiar";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { IconeEnviar } from "@/components/ui/icones";
import type { LinkCompartilhado } from "@/lib/compartilhar/tipos";
import type { Resposta } from "@/lib/livro/tipos";
import { linkWhatsApp } from "@/lib/whatsapp";

export type AcoesGrupo = {
  compartilhar: () => Promise<Resposta<LinkCompartilhado>>;
  desligar: () => Promise<Resposta>;
};

type Fase =
  | { tipo: "preparando" }
  | { tipo: "pronto"; link: LinkCompartilhado }
  | { tipo: "desligado" }
  | { tipo: "erro"; mensagem: string };

export function FolhaGrupo({
  aberta,
  aoFechar,
  acoes,
}: {
  aberta: boolean;
  aoFechar: () => void;
  acoes: AcoesGrupo;
}) {
  const [fase, setFase] = useState<Fase>({ tipo: "preparando" });
  const [rodada, setRodada] = useState(0);
  const [confirmar, setConfirmar] = useState(false);
  const [pendente, iniciar] = useTransition();

  useEffect(() => {
    if (!aberta) return;
    let vivo = true;
    void acoes.compartilhar().then((r) => {
      if (!vivo) return;
      setFase(
        r.ok
          ? { tipo: "pronto", link: r.dados }
          : { tipo: "erro", mensagem: r.mensagem },
      );
    });
    return () => {
      vivo = false;
    };
  }, [aberta, acoes, rodada]);

  function fechar() {
    setConfirmar(false);
    aoFechar();
  }

  return (
    <FolhaInferior aberta={aberta} aoFechar={fechar} titulo="Compartilhar no grupo">
      {fase.tipo === "preparando" ? (
        <p className="text-ui-17 text-tinta-2" role="status">
          Preparando o link…
        </p>
      ) : fase.tipo === "erro" ? (
        <>
          <Aviso ok={false}>{fase.mensagem}</Aviso>
          <Botao
            variante="secundario"
            onClick={() => {
              setFase({ tipo: "preparando" });
              setRodada((n) => n + 1);
            }}
          >
            Tentar de novo
          </Botao>
        </>
      ) : fase.tipo === "desligado" ? (
        <>
          <p className="text-ui-17 text-tinta">
            Link desligado. Quem abrir vê que ele não está mais disponível.
          </p>
          <Botao
            variante="secundario"
            onClick={() => {
              setFase({ tipo: "preparando" });
              setRodada((n) => n + 1);
            }}
          >
            Criar um link novo
          </Botao>
        </>
      ) : (
        <>
          <p className="text-ui-17 text-tinta-2">
            {fase.link.comVoz
              ? "Quem tiver este link ouve a voz e lê o texto."
              : "Quem tiver este link lê o texto."}
          </p>
          <p className="font-livro text-livro-20 text-tinta bg-polen rounded-cartao p-4 [overflow-wrap:anywhere]">
            {fase.link.mensagem}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Copiar
              texto={fase.link.mensagem}
              rotulo="Copiar mensagem"
              variante="principal"
            />
            <a
              href={linkWhatsApp(fase.link.mensagem)}
              target="_blank"
              rel="noreferrer"
              className={classesDoBotao({ variante: "secundario" })}
            >
              <IconeEnviar tamanho={20} />
              <span>Abrir WhatsApp</span>
            </a>
          </div>
          {confirmar ? (
            <div className="flex flex-col gap-3">
              <p className="text-ui-15 text-tinta">
                Quem já recebeu o link não consegue mais abrir.
              </p>
              <div className="flex gap-3">
                <Botao
                  variante="secundario"
                  carregando={pendente}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await acoes.desligar();
                      if (!r.ok)
                        return setFase({ tipo: "erro", mensagem: r.mensagem });
                      setConfirmar(false);
                      setFase({ tipo: "desligado" });
                    })
                  }
                >
                  Desligar
                </Botao>
                <Botao variante="texto" onClick={() => setConfirmar(false)}>
                  Manter
                </Botao>
              </div>
            </div>
          ) : (
            <Botao
              variante="texto"
              className="self-start"
              onClick={() => setConfirmar(true)}
            >
              Desligar este link
            </Botao>
          )}
        </>
      )}
    </FolhaInferior>
  );
}
