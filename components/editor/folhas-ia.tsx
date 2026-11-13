"use client";

// Folhas das ferramentas da IA no editor (prompt 9): tamanho, revisar trecho e acrescentar
// áudio. Cada uma faz um pedido; a proposta volta como diferença (diferenca.tsx).
// Design: docs/designs/ia-sob-controle.md, seções 4.3 a 4.5.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { ControleTamanho } from "@/components/ui/controle-tamanho";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { IconeMicrofone, IconeSubir } from "@/components/ui/icones";
import { duracaoDoArquivo } from "@/lib/audios/duracao";
import { ACEITA_AUDIO, recusa } from "@/lib/audios/formatos";
import { enviarPorTus, type EnviarArquivo } from "@/lib/audios/tus";
import {
  ESPERA_TAMANHO_MS,
  INSTRUCAO_MAX,
  MAX_AUDIO_EXTRA_MIN,
} from "@/lib/config";
import type { PedidoDeTrecho } from "@/lib/editor/tipos";
import type { AcoesAudios } from "@/lib/livro/tipos";
import {
  chaveDaPosicao,
  posicaoDaChave,
  rotuloDaChave,
  type ChaveTamanho,
} from "@/lib/ui/tamanho";

// ── Tamanho ──────────────────────────────────────────────────────────────

export function FolhaTamanho({
  aberta,
  aoFechar,
  atual,
  travados,
  gerando,
  aoPedir,
}: {
  aberta: boolean;
  aoFechar: () => void;
  atual: ChaveTamanho;
  travados: number;
  gerando: ChaveTamanho | null; // tamanho que a IA está escrevendo agora
  aoPedir: (tamanho: ChaveTamanho) => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  return (
    <FolhaInferior
      aberta={aberta}
      aoFechar={aoFechar}
      titulo="Tamanho do texto"
    >
      <div className="flex flex-col gap-5">
        <h2 className="font-livro text-livro-24 text-tinta">
          Tamanho do texto
        </h2>
        <ControleTamanho
          key={`${atual}-${gerando ?? ""}`}
          inicial={posicaoDaChave(gerando ?? atual)}
          travados={travados}
          desabilitado={gerando !== null}
          aoMudar={(posicao) => {
            if (timer.current) clearTimeout(timer.current);
            const chave = chaveDaPosicao(posicao);
            if (chave === atual) return;
            // Arrastar pelas posições não pede nada: só a posição em que o dedo parou (P54).
            timer.current = setTimeout(() => aoPedir(chave), ESPERA_TAMANHO_MS);
          }}
        />
        {gerando ? (
          <p
            role="status"
            className="text-ui-17 text-tinta inline-flex items-center gap-3"
          >
            <span
              aria-hidden="true"
              className="border-floresta size-4 animate-spin rounded-full border-2 border-r-transparent motion-reduce:animate-none"
            />
            Escrevendo a versão {rotuloDaChave(gerando)}. Pode continuar
            editando.
          </p>
        ) : (
          <DicaPrimeiraVez chave="editor-tamanho">
            Arraste para ter mais ou menos detalhe.
          </DicaPrimeiraVez>
        )}
      </div>
    </FolhaInferior>
  );
}

// ── Revisar trecho ───────────────────────────────────────────────────────

const OPCOES: { instrucao: PedidoDeTrecho["instrucao"]; rotulo: string }[] = [
  { instrucao: "curto", rotulo: "Mais curto" },
  { instrucao: "fiel", rotulo: "Mais fiel à fala" },
  { instrucao: "corrigir", rotulo: "Corrigir" },
];

export function FolhaRevisar({
  aberta,
  aoFechar,
  trecho,
  ocupado,
  erro,
  aoPedir,
}: {
  aberta: boolean;
  aoFechar: () => void;
  trecho: string;
  ocupado: boolean;
  erro: string | null;
  aoPedir: (instrucao: PedidoDeTrecho["instrucao"], texto?: string) => void;
}) {
  const [texto, setTexto] = useState("");
  const curto =
    trecho.length > 140 ? `${trecho.slice(0, 140).trim()}…` : trecho;
  return (
    <FolhaInferior
      aberta={aberta}
      aoFechar={aoFechar}
      titulo="Revisar o trecho"
    >
      <div className="flex flex-col gap-5">
        <h2 className="font-livro text-livro-24 text-tinta">
          Revisar o trecho
        </h2>
        <blockquote className="font-livro text-livro-20 text-tinta-2 border-linha-forte border-l-2 pl-4">
          {curto}
        </blockquote>
        {ocupado ? (
          <p
            role="status"
            className="text-ui-17 text-tinta inline-flex items-center gap-3"
          >
            <span
              aria-hidden="true"
              className="border-floresta size-4 animate-spin rounded-full border-2 border-r-transparent motion-reduce:animate-none"
            />
            Revisando…
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              {OPCOES.map((o) => (
                <Botao
                  key={o.instrucao}
                  variante="secundario"
                  larguraTotal
                  onClick={() => aoPedir(o.instrucao)}
                >
                  {o.rotulo}
                </Botao>
              ))}
            </div>
            <form
              className="flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (texto.trim()) aoPedir("livre", texto.trim());
              }}
            >
              <label htmlFor="pedido-livre" className="text-ui-15 text-tinta-2">
                Ou escreva o que mudar
              </label>
              <textarea
                id="pedido-livre"
                rows={2}
                maxLength={INSTRUCAO_MAX}
                value={texto}
                onChange={(e) => setTexto(e.currentTarget.value)}
                placeholder="Ex.: deixe mais simples"
                className="border-linha-forte bg-papel text-ui-17 text-tinta placeholder:text-tinta-2/60 rounded-interno w-full border px-3 py-2"
              />
              <Botao
                type="submit"
                variante="texto"
                disabled={!texto.trim()}
                className="self-start"
              >
                Pedir
              </Botao>
            </form>
          </>
        )}
        {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
      </div>
    </FolhaInferior>
  );
}

// ── Acrescentar áudio ────────────────────────────────────────────────────

export function FolhaAcrescentar({
  aberta,
  aoFechar,
  base,
  historiaId,
  acoes,
  foraDoTexto,
  aoEnviado,
  aoUsarNoTexto,
  enviarArquivo = enviarPorTus,
}: {
  aberta: boolean;
  aoFechar: () => void;
  base: string; // /livro/[id]/historias/[historiaId]
  historiaId: string;
  acoes: AcoesAudios;
  foraDoTexto: number;
  aoEnviado: () => void;
  aoUsarNoTexto: () => void;
  enviarArquivo?: EnviarArquivo;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function subir(arquivo: File) {
    setErro(null);
    const ruim = recusa(arquivo);
    if (ruim) return setErro(ruim);
    const segundos = await duracaoDoArquivo(arquivo);
    if (segundos && segundos > MAX_AUDIO_EXTRA_MIN * 60)
      return setErro(`Use um áudio de até ${MAX_AUDIO_EXTRA_MIN} minutos.`);
    setProgresso(0);
    try {
      const r = await acoes.prepararAudios(
        [
          {
            nome: arquivo.name,
            tamanho: arquivo.size,
            duracaoS: segundos,
            promptId: null,
            titulo: null,
          },
        ],
        { paraHistoria: { historiaId, gravado: false } },
      );
      if (!r.ok) throw new Error(r.mensagem);
      const p = r.dados[0];
      await enviarArquivo(arquivo, p, setProgresso);
      const c = await acoes.confirmarAudio(p.id);
      if (!c.ok) throw new Error(c.mensagem);
      setProgresso(null);
      aoEnviado();
    } catch (e) {
      setProgresso(null);
      setErro(
        e instanceof Error && e.message.length < 120
          ? e.message
          : "O áudio não subiu. Tente de novo.",
      );
    }
  }

  return (
    <FolhaInferior
      aberta={aberta}
      aoFechar={aoFechar}
      titulo="Acrescentar áudio"
    >
      <div className="flex flex-col gap-5">
        <h2 className="font-livro text-livro-24 text-tinta">
          Acrescentar áudio
        </h2>
        <p className="text-ui-17 text-tinta-2">
          A IA junta ao texto o que é novo. Você confere antes de entrar.
        </p>
        {progresso !== null ? (
          <div role="status" className="flex flex-col gap-2">
            <p className="text-ui-17 text-tinta">
              Subindo o áudio… {Math.round(progresso * 100)}%
            </p>
            <div className="bg-polen-2 h-2 overflow-hidden rounded-full">
              <div
                className="bg-floresta h-full transition-[width] duration-[var(--dur-rapida)]"
                style={{ width: `${Math.round(progresso * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              href={`${base}/gravar`}
              className={classesDoBotao({ larguraTotal: true })}
            >
              <IconeMicrofone tamanho={20} />
              Gravar mais sobre isso
            </Link>
            <Botao
              variante="secundario"
              larguraTotal
              icone={<IconeSubir tamanho={20} />}
              onClick={() => input.current?.click()}
            >
              Subir mais um áudio
            </Botao>
            <input
              ref={input}
              type="file"
              accept={ACEITA_AUDIO}
              className="hidden"
              onChange={(e) => {
                const f = e.currentTarget.files?.[0];
                e.currentTarget.value = "";
                if (f) void subir(f);
              }}
            />
            {foraDoTexto > 0 ? (
              <Botao
                variante="texto"
                onClick={aoUsarNoTexto}
                className="self-start"
              >
                Usar no texto o áudio que ficou de fora
              </Botao>
            ) : null}
          </div>
        )}
        {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
      </div>
    </FolhaInferior>
  );
}
