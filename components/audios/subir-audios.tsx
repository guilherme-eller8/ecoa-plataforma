"use client";

// Subir áudios gravados fora da plataforma (WhatsApp, gravador do celular).
// Escolher → conferir no aparelho (formato, tamanho, duração) → pergunta e título opcionais →
// Enviar: o servidor cria as linhas e assina; o navegador sobe por TUS (2 de cada vez, com
// retomada) e o servidor confirma cada um.
import Link from "next/link";
import { useRef, useState } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { IconeSubir } from "@/components/ui/icones";
import { Seletor } from "@/components/ui/seletor";
import { duracaoDoArquivo } from "@/lib/audios/duracao";
import {
  ACEITA_AUDIO,
  formatarDuracao,
  formatarTamanho,
  recusa,
} from "@/lib/audios/formatos";
import { enviarPorTus, type EnviarArquivo } from "@/lib/audios/tus";
import { MAX_ARQUIVOS_LOTE, SUBIDAS_SIMULTANEAS } from "@/lib/config";
import type {
  AcoesAudios,
  AudioPreparado,
  PerguntaDaTela,
} from "@/lib/livro/tipos";

export type EstadoItem = "escolhido" | "enviando" | "ok" | "erro";

export type ItemAudio = {
  chave: string;
  arquivo: File;
  duracaoS: number | null;
  recusa: string | null;
  promptId: string;
  titulo: string;
  estado: EstadoItem;
  progresso: number; // 0 a 1
  preparado?: AudioPreparado;
};

export function novoItem(arquivo: File, extra: Partial<ItemAudio> = {}) {
  return {
    chave: crypto.randomUUID(),
    arquivo,
    duracaoS: null,
    recusa: recusa(arquivo),
    promptId: "",
    titulo: "",
    estado: "escolhido",
    progresso: 0,
    ...extra,
  } satisfies ItemAudio;
}

export function SubirAudios({
  livroId,
  perguntas,
  acoes,
  enviarArquivo = enviarPorTus,
  inicial = [],
}: {
  livroId: string;
  perguntas: PerguntaDaTela[];
  acoes: AcoesAudios;
  enviarArquivo?: EnviarArquivo;
  inicial?: ItemAudio[];
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [itens, setItens] = useState<ItemAudio[]>(inicial);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const mudar = (chave: string, m: Partial<ItemAudio>) =>
    setItens((l) => l.map((x) => (x.chave === chave ? { ...x, ...m } : x)));

  function escolher(arquivos: FileList | null) {
    if (!arquivos?.length) return;
    setMensagem(null);
    const cabem = MAX_ARQUIVOS_LOTE - itens.length;
    const lista = [...arquivos];
    if (lista.length > cabem)
      setMensagem(`Até ${MAX_ARQUIVOS_LOTE} áudios por vez.`);
    const novos = lista.slice(0, Math.max(0, cabem)).map((a) => novoItem(a));
    setItens((l) => [...l, ...novos]);
    for (const n of novos) {
      if (n.recusa) continue;
      void duracaoDoArquivo(n.arquivo).then((d) =>
        mudar(n.chave, { duracaoS: d }),
      );
    }
  }

  async function subirUm(item: ItemAudio, preparado: AudioPreparado) {
    mudar(item.chave, { estado: "enviando", progresso: 0, preparado });
    try {
      await enviarArquivo(item.arquivo, preparado, (f) =>
        mudar(item.chave, { progresso: f }),
      );
      const r = await acoes.confirmarAudio(preparado.id);
      if (!r.ok) throw new Error(r.mensagem);
      mudar(item.chave, { estado: "ok", progresso: 1 });
    } catch {
      mudar(item.chave, { estado: "erro" });
    }
  }

  async function enviar(fila: ItemAudio[]) {
    setOcupado(true);
    setMensagem(null);

    // Os que ainda não têm linha no banco: o servidor cria e assina de uma vez.
    const novos = fila.filter((x) => !x.preparado);
    const preparados = new Map<string, AudioPreparado>();
    if (novos.length) {
      const r = await acoes.prepararAudios(
        novos.map((x) => ({
          nome: x.arquivo.name,
          tamanho: x.arquivo.size,
          duracaoS: x.duracaoS,
          promptId: x.promptId || null,
          titulo: x.titulo.trim() || null,
        })),
      );
      if (!r.ok) {
        setMensagem(r.mensagem);
        setOcupado(false);
        return;
      }
      novos.forEach((x, i) => preparados.set(x.chave, r.dados[i]));
    }
    // Os que falharam antes: token novo para o mesmo caminho (retoma de onde parou).
    for (const x of fila.filter((x) => x.preparado)) {
      const r = await acoes.reassinarAudio(x.preparado!.id);
      if (r.ok) preparados.set(x.chave, r.dados);
      else mudar(x.chave, { estado: "erro" });
    }

    const trabalhos = fila.filter((x) => preparados.has(x.chave));
    let proximo = 0;
    async function trabalhador() {
      while (proximo < trabalhos.length) {
        const x = trabalhos[proximo++];
        await subirUm(x, preparados.get(x.chave)!);
      }
    }
    await Promise.all(
      Array.from({ length: SUBIDAS_SIMULTANEAS }, () => trabalhador()),
    );
    setOcupado(false);
  }

  const aceitos = itens.filter((x) => !x.recusa);
  const paraEnviar = aceitos.filter((x) => x.estado === "escolhido");
  const comErro = aceitos.filter((x) => x.estado === "erro");
  const prontos = aceitos.filter((x) => x.estado === "ok").length;
  const terminou = aceitos.length > 0 && prontos === aceitos.length && !ocupado;
  const opcoes = perguntas.map((p) => ({ valor: p.id, rotulo: p.texto }));

  const seletor = (
    <input
      ref={entrada}
      type="file"
      accept={ACEITA_AUDIO}
      multiple
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      data-testid="escolher-audios"
      onChange={(e) => {
        escolher(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (!itens.length)
    return (
      <div className="flex flex-col gap-5">
        {seletor}
        <p className="text-ui-17 text-tinta-2">
          Áudios do WhatsApp ou do gravador do celular.
        </p>
        <Botao
          larguraTotal
          icone={<IconeSubir tamanho={20} />}
          onClick={() => entrada.current?.click()}
          className="sm:w-auto sm:self-start"
        >
          Subir áudios
        </Botao>
        {mensagem ? <Aviso ok={false}>{mensagem}</Aviso> : null}
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      {seletor}
      <ul className="flex flex-col gap-3">
        {itens.map((x) => (
          <li
            key={x.chave}
            className="rounded-cartao bg-papel border-linha flex flex-col gap-4 border p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-ui-17 text-tinta truncate font-medium">
                  {x.arquivo.name}
                </p>
                <p className="text-ui-15 text-tinta-2">
                  {[
                    formatarDuracao(x.duracaoS),
                    formatarTamanho(x.arquivo.size),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              {x.estado === "escolhido" && !ocupado ? (
                <Botao
                  variante="texto"
                  aria-label={`Tirar ${x.arquivo.name}`}
                  onClick={() =>
                    setItens((l) => l.filter((y) => y.chave !== x.chave))
                  }
                >
                  Tirar
                </Botao>
              ) : null}
            </div>

            {x.recusa ? (
              <p role="alert" className="text-ui-15 text-erro">
                {x.recusa}
              </p>
            ) : x.estado === "escolhido" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {opcoes.length ? (
                  <Seletor
                    rotulo="Pergunta (opcional)"
                    vazio="Sem pergunta"
                    opcoes={opcoes}
                    value={x.promptId}
                    disabled={ocupado}
                    onChange={(e) =>
                      mudar(x.chave, { promptId: e.target.value })
                    }
                  />
                ) : null}
                <Campo
                  rotulo="Título (opcional)"
                  value={x.titulo}
                  maxLength={120}
                  disabled={ocupado}
                  onChange={(e) => mudar(x.chave, { titulo: e.target.value })}
                />
              </div>
            ) : (
              <Progresso estado={x.estado} fracao={x.progresso} />
            )}
          </li>
        ))}
      </ul>

      {mensagem ? <Aviso ok={false}>{mensagem}</Aviso> : null}

      {terminou ? (
        <div className="flex flex-col gap-4">
          <Aviso ok>
            Pronto.{" "}
            {prontos === 1 ? "1 áudio guardado" : `${prontos} áudios guardados`}
            .
          </Aviso>
          <Link
            href={`/livro/${livroId}/audios`}
            className={
              classesDoBotao({ larguraTotal: true }) +
              " sm:w-auto sm:self-start"
            }
          >
            Ver áudios recebidos
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {comErro.length && !ocupado ? (
            <Botao
              larguraTotal
              onClick={() => void enviar(comErro)}
              className="sm:w-auto"
            >
              Tentar de novo ({comErro.length})
            </Botao>
          ) : (
            <Botao
              larguraTotal
              icone={<IconeSubir tamanho={20} />}
              carregando={ocupado}
              disabled={!paraEnviar.length}
              onClick={() => void enviar(paraEnviar)}
              className="sm:w-auto"
            >
              {ocupado
                ? "Enviando…"
                : paraEnviar.length === 1
                  ? "Enviar 1 áudio"
                  : `Enviar ${paraEnviar.length} áudios`}
            </Botao>
          )}
          {!ocupado && itens.length < MAX_ARQUIVOS_LOTE ? (
            <Botao variante="texto" onClick={() => entrada.current?.click()}>
              Escolher mais
            </Botao>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Progresso({ estado, fracao }: { estado: EstadoItem; fracao: number }) {
  const pct = Math.round(fracao * 100);
  const texto =
    estado === "ok"
      ? "Guardado"
      : estado === "erro"
        ? "Não subiu. A internet caiu?"
        : `Enviando ${pct}%`;
  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={estado === "ok" ? 100 : pct}
        aria-label="Envio"
        className="bg-polen-2 h-2 overflow-hidden rounded-full"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${estado === "erro" ? "bg-erro" : "bg-floresta"}`}
          style={{ width: `${estado === "ok" ? 100 : pct}%` }}
        />
      </div>
      <p
        className={`text-ui-15 ${estado === "erro" ? "text-erro" : "text-tinta-2"}`}
        aria-live="polite"
      >
        {texto}
      </p>
    </div>
  );
}
