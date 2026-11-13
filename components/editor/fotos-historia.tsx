"use client";

// Fotos da história (prompt 8): até 4, do acervo ou novas, com legenda e alerta quando a
// foto é pequena para imprimir. Tirar a foto da história não apaga do acervo.
import { useState } from "react";
import { UploadFotos } from "@/components/fotos/upload-fotos";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { IconeCheck } from "@/components/ui/icones";
import { FOTO_LADO_MIN_IMPRESSAO_PX, MAX_FOTOS_HISTORIA } from "@/lib/config";
import type { AcoesEditor } from "@/lib/editor/tipos";
import type { FotoDaHistoria } from "@/lib/historias/tipos";
import type { FotoDaTela } from "@/lib/livro/tipos";

export function pequenaParaImprimir(f: {
  largura: number | null;
  altura: number | null;
}) {
  return (
    f.largura != null &&
    f.altura != null &&
    Math.min(f.largura, f.altura) < FOTO_LADO_MIN_IMPRESSAO_PX
  );
}

export function FotosDaHistoria({
  inicial,
  editavel,
  acoes,
}: {
  inicial: FotoDaHistoria[];
  editavel: boolean;
  acoes: AcoesEditor;
}) {
  const [fotos, setFotos] = useState(inicial);
  const [aberta, setAberta] = useState(false);
  const [acervo, setAcervo] = useState<FotoDaTela[] | null>(null);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const cabem = MAX_FOTOS_HISTORIA - fotos.length;

  async function abrir() {
    setAberta(true);
    setMarcadas([]);
    setErro(null);
    const r = await acoes.acervo();
    if (r.ok)
      setAcervo(r.dados.filter((f) => !fotos.some((x) => x.id === f.id)));
    else setErro(r.mensagem);
  }

  async function ligar(ids: string[]) {
    if (!ids.length) return;
    setOcupado(true);
    setErro(null);
    const r = await acoes.ligarFotos(ids.slice(0, cabem));
    setOcupado(false);
    if (!r.ok) return setErro(r.mensagem);
    setFotos(r.dados.fotos);
    setAberta(false);
  }

  async function tirar(id: string) {
    const antes = fotos;
    setFotos((l) => l.filter((f) => f.id !== id));
    const r = await acoes.tirarFoto(id);
    if (!r.ok) {
      setFotos(antes);
      setErro(r.mensagem);
    }
  }

  if (!fotos.length && !editavel) return null;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="fotos-titulo">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="fotos-titulo" className="text-ui-20 text-tinta font-medium">
          Fotos
        </h2>
        {fotos.length ? (
          <span className="text-ui-15 text-tinta-2 num">
            {fotos.length} de {MAX_FOTOS_HISTORIA}
          </span>
        ) : null}
      </div>

      {fotos.length ? (
        <ul className="grid grid-cols-2 gap-4 sm:gap-5">
          {fotos.map((f) => (
            <li key={f.id} className="flex flex-col gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage */}
              <img
                src={f.url}
                alt={f.legenda ?? ""}
                className="rounded-interno bg-polen-2 aspect-[4/3] w-full object-cover"
              />
              {pequenaParaImprimir(f) ? (
                <p className="text-ui-15 text-aviso">
                  Pequena para imprimir bem.
                </p>
              ) : null}
              {editavel ? (
                <>
                  <label className="sr-only" htmlFor={`legenda-${f.id}`}>
                    Legenda
                  </label>
                  <input
                    id={`legenda-${f.id}`}
                    defaultValue={f.legenda ?? ""}
                    maxLength={300}
                    placeholder="Legenda"
                    onBlur={(e) => {
                      const v = e.currentTarget.value.trim();
                      if (v !== (f.legenda ?? ""))
                        void acoes.legendar(f.id, v).then((r) => {
                          if (r.ok)
                            setFotos((l) =>
                              l.map((x) =>
                                x.id === f.id
                                  ? { ...x, legenda: v || null }
                                  : x,
                              ),
                            );
                          else setErro(r.mensagem);
                        });
                    }}
                    className="border-linha-forte bg-papel text-ui-17 text-tinta placeholder:text-tinta-2 rounded-interno min-h-alvo font-livro border px-3 italic"
                  />
                  <button
                    type="button"
                    onClick={() => void tirar(f.id)}
                    className="text-ui-15 text-tinta-2 hover:text-tinta min-h-11 self-start underline-offset-4 hover:underline"
                  >
                    Tirar da história
                  </button>
                </>
              ) : f.legenda ? (
                <p className="font-livro text-ui-17 text-tinta-2 italic">
                  {f.legenda}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ui-17 text-tinta-2">
          Uma foto deixa a história viva.
        </p>
      )}

      {editavel && cabem > 0 ? (
        <Botao
          variante="secundario"
          onClick={() => void abrir()}
          className="self-start"
        >
          Pôr fotos
        </Botao>
      ) : null}
      {erro && !aberta ? <Aviso ok={false}>{erro}</Aviso> : null}

      <FolhaInferior
        aberta={aberta}
        aoFechar={() => setAberta(false)}
        titulo="Pôr fotos"
      >
        <div className="flex flex-col gap-5">
          <p className="text-ui-17 text-tinta-2">
            {cabem === 1 ? "Cabe mais 1 foto." : `Cabem mais ${cabem} fotos.`}
          </p>
          {acervo === null ? (
            <p className="text-ui-15 text-tinta-2">Abrindo o acervo…</p>
          ) : acervo.length ? (
            <ul className="grid grid-cols-3 gap-2">
              {acervo.map((f) => {
                const marcada = marcadas.includes(f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      aria-pressed={marcada}
                      aria-label={f.legenda || "Foto do acervo"}
                      disabled={!marcada && marcadas.length >= cabem}
                      onClick={() =>
                        setMarcadas((l) =>
                          marcada ? l.filter((x) => x !== f.id) : [...l, f.id],
                        )
                      }
                      className={
                        "rounded-interno relative block aspect-square w-full overflow-hidden disabled:opacity-40 " +
                        (marcada ? "ring-floresta ring-4" : "")
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage */}
                      <img
                        src={f.url}
                        alt=""
                        className="size-full object-cover"
                      />
                      {marcada ? (
                        <span className="bg-floresta text-papel absolute top-1.5 right-1.5 rounded-full p-1">
                          <IconeCheck tamanho={16} />
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-ui-15 text-tinta-2">O acervo está vazio.</p>
          )}
          {marcadas.length ? (
            <Botao
              larguraTotal
              carregando={ocupado}
              onClick={() => void ligar(marcadas)}
            >
              {marcadas.length === 1
                ? "Pôr 1 foto"
                : `Pôr ${marcadas.length} fotos`}
            </Botao>
          ) : null}
          <UploadFotos
            acoes={acoes}
            rotulo="Subir fotos novas"
            aoTerminar={(ids) => void ligar(ids)}
          />
          {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
        </div>
      </FolhaInferior>
    </section>
  );
}
