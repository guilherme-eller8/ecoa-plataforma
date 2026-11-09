"use client";

// Escolher várias fotos, comprimir no aparelho, subir 3 por vez com progresso e registrar
// as que subiram. Cada falha pode ser tentada de novo.
import { useRef, useState } from "react";
import { Botao } from "@/components/ui/botao";
import { IconeSubir } from "@/components/ui/icones";
import { MAX_FOTOS_POR_ENVIO } from "@/lib/config";
import { comprimirFoto } from "@/lib/fotos/comprimir";
import type { AcoesFotos, FotoSubida } from "@/lib/livro/tipos";
import { clienteNavegador } from "@/lib/supabase/navegador";

type Item = {
  nome: string;
  previa: string;
  estado: "esperando" | "subindo" | "ok" | "erro";
  arquivo: File;
};

export function UploadFotos({
  acoes,
  doAutor = false,
  rotulo = "Escolher fotos",
  aoTerminar,
}: {
  acoes: AcoesFotos;
  doAutor?: boolean;
  rotulo?: string;
  aoTerminar?: (ids: string[]) => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [itens, setItens] = useState<Item[]>([]);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const mudar = (i: number, estado: Item["estado"]) =>
    setItens((l) => l.map((x, k) => (k === i ? { ...x, estado } : x)));

  async function subir(lista: Item[], indices: number[]) {
    setOcupado(true);
    setMensagem(null);
    const preparo = await acoes.prepararFotos(indices.length);
    if (!preparo.ok) {
      setMensagem(preparo.mensagem);
      indices.forEach((i) => mudar(i, "erro"));
      setOcupado(false);
      return;
    }
    const storage = clienteNavegador().storage.from("acervo");
    const subidas: FotoSubida[] = [];
    let proximo = 0;
    async function trabalhador() {
      while (proximo < indices.length) {
        const k = proximo++;
        const i = indices[k];
        const { caminho, token } = preparo.ok
          ? preparo.dados[k]
          : { caminho: "", token: "" };
        mudar(i, "subindo");
        try {
          const foto = await comprimirFoto(lista[i].arquivo);
          const { error } = await storage.uploadToSignedUrl(
            caminho,
            token,
            foto.arquivo,
            {
              contentType: "image/jpeg",
            },
          );
          if (error) throw error;
          subidas.push({ caminho, largura: foto.largura, altura: foto.altura });
          mudar(i, "ok");
        } catch {
          mudar(i, "erro");
        }
      }
    }
    await Promise.all([trabalhador(), trabalhador(), trabalhador()]);
    if (subidas.length) {
      const r = await acoes.registrarFotos(subidas, { doAutor });
      if (!r.ok) setMensagem(r.mensagem);
      else aoTerminar?.(r.dados.ids);
    }
    setOcupado(false);
  }

  function escolher(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    const novos = [...arquivos]
      .slice(0, doAutor ? 1 : MAX_FOTOS_POR_ENVIO)
      .map((arquivo) => ({
        nome: arquivo.name,
        previa: URL.createObjectURL(arquivo),
        estado: "esperando" as const,
        arquivo,
      }));
    const lista = [...itens, ...novos];
    setItens(lista);
    void subir(
      lista,
      novos.map((_, k) => itens.length + k),
    );
  }

  const comErro = itens.flatMap((x, i) => (x.estado === "erro" ? [i] : []));
  const prontas = itens.filter((x) => x.estado === "ok").length;

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        multiple={!doAutor}
        className="sr-only"
        aria-label={rotulo}
        onChange={(e) => {
          escolher(e.target.files);
          e.target.value = "";
        }}
      />
      <Botao
        variante={itens.length ? "secundario" : "principal"}
        icone={<IconeSubir tamanho={20} />}
        onClick={() => entrada.current?.click()}
        carregando={ocupado}
        className="self-start"
      >
        {itens.length ? "Escolher mais" : rotulo}
      </Botao>
      {itens.length ? (
        <p className="text-ui-15 text-tinta-2" aria-live="polite">
          {prontas} de {itens.length}{" "}
          {itens.length === 1 ? "foto pronta" : "fotos prontas"}
        </p>
      ) : null}
      {itens.length ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {itens.map((x, i) => (
            <li
              key={i}
              className="rounded-interno bg-polen-2 relative aspect-square overflow-hidden"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (blob:) */}
              <img
                src={x.previa}
                alt=""
                className={`size-full object-cover ${x.estado === "ok" ? "" : "opacity-60"}`}
              />
              {x.estado === "subindo" || x.estado === "esperando" ? (
                <span className="text-ui-13 bg-papel/90 absolute inset-x-0 bottom-0 px-2 py-1">
                  Enviando…
                </span>
              ) : null}
              {x.estado === "erro" ? (
                <span className="text-ui-13 bg-erro-fundo text-erro absolute inset-x-0 bottom-0 px-2 py-1">
                  Falhou
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {comErro.length && !ocupado ? (
        <Botao
          variante="texto"
          className="self-start"
          onClick={() => void subir(itens, comErro)}
        >
          Tentar de novo ({comErro.length})
        </Botao>
      ) : null}
      {mensagem ? (
        <p role="alert" className="text-ui-15 text-erro">
          {mensagem}
        </p>
      ) : null}
    </div>
  );
}
