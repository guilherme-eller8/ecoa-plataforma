"use client";

// O que fazer agora (P72): uma ação principal que muda com o estado do livro. Nova história
// fica sempre à vista, como ação de texto.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { linkDaPergunta } from "@/components/livro/link-do-autor";
import { Aviso } from "@/components/ui/aviso";
import { classesDoBotao } from "@/components/ui/botao";
import {
  IconeEnviar,
  IconeMicrofone,
  IconeSubir,
} from "@/components/ui/icones";
import type { Agora } from "@/lib/livro/agora";
import type { AcoesPerguntas, LivroDaTela } from "@/lib/livro/tipos";
import { linkWhatsApp, mensagemPergunta } from "@/lib/whatsapp";

const rotuloLink =
  "text-ui-17 text-floresta min-h-alvo inline-flex items-center gap-2 self-start font-medium underline-offset-4 hover:underline";

export function CartaoAgora({
  agora,
  livro,
  linkAutor,
  paraEnviar,
  mudarEstado,
}: {
  agora: Agora;
  livro: LivroDaTela;
  linkAutor: string | null;
  paraEnviar: number; // perguntas na lista para enviar (inclui a do cartão)
  mudarEstado?: AcoesPerguntas["mudarEstado"];
}) {
  const base = `/livro/${livro.id}`;
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const novaHistoria = (
    <Link href={`${base}/historias/nova`} className={rotuloLink}>
      <IconeSubir tamanho={18} />
      Nova história
    </Link>
  );

  let rotulo: string;
  let titulo: React.ReactNode;
  let acoes: React.ReactNode;

  if (agora.tipo === "pergunta") {
    const p = agora.pergunta;
    rotulo =
      p.tipo === "causo"
        ? p.sugeridoPor
          ? `Próximo causo, pedido por ${p.sugeridoPor}`
          : "Próximo causo"
        : p.sugeridoPor
          ? `Próxima pergunta, pedida por ${p.sugeridoPor}`
          : "Próxima pergunta";
    titulo = p.texto;
    const enviar = linkAutor ? (
      <a
        href={linkWhatsApp(
          mensagemPergunta({
            autor: livro.autor,
            pergunta: p.texto,
            link: linkDaPergunta(linkAutor, p.id),
          }),
          livro.autorCelular,
        )}
        target="_blank"
        rel="noreferrer"
        aria-disabled={pendente || undefined}
        onClick={() =>
          mudarEstado &&
          iniciar(async () => {
            setErro(null);
            const r = await mudarEstado(p.id, "enviada");
            if (!r.ok) setErro(r.mensagem ?? "Não deu certo agora.");
            else router.refresh();
          })
        }
        className={classesDoBotao({ variante: "secundario" })}
      >
        <IconeEnviar tamanho={18} />
        <span>Enviar ao {livro.autor}</span>
      </a>
    ) : (
      // Sem link do autor ainda: a tela de Perguntas cria o link e envia.
      <Link
        href={`${base}/perguntas`}
        className={classesDoBotao({ variante: "secundario" })}
      >
        <IconeEnviar tamanho={18} />
        <span>Enviar ao {livro.autor}</span>
      </Link>
    );
    acoes = (
      <>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Link
            href={`${base}/historias/gravar?pergunta=${p.id}`}
            className={classesDoBotao()}
          >
            <IconeMicrofone tamanho={20} />
            <span>Gravar agora</span>
          </Link>
          {enviar}
        </div>
        <div className="flex flex-wrap gap-x-6">
          {novaHistoria}
          {paraEnviar > 1 ? (
            <Link href={`${base}/perguntas`} className={rotuloLink}>
              Ver as {paraEnviar} perguntas
            </Link>
          ) : null}
        </div>
      </>
    );
  } else if (agora.tipo === "confirmar_ia") {
    rotulo = "Antes de continuar";
    titulo = "Os áudios esperam a sua confirmação para virar texto.";
    acoes = (
      <>
        <Link
          href={`${base}/configuracoes#ia`}
          className={classesDoBotao() + " self-start"}
        >
          <span>Confirmar</span>
        </Link>
        {novaHistoria}
      </>
    );
  } else if (agora.tipo === "primeiras_perguntas") {
    rotulo = "Para começar";
    titulo = `Escolha as primeiras perguntas para o ${livro.autor}.`;
    acoes = (
      <>
        <Link
          href={`${base}/configurar/perguntas`}
          className={classesDoBotao() + " self-start"}
        >
          <span>Escolher perguntas</span>
        </Link>
        {novaHistoria}
      </>
    );
  } else {
    rotulo = "Agora";
    titulo = `Grave uma conversa com o ${livro.autor} ou suba áudios que você já tem.`;
    acoes = (
      <>
        <Link
          href={`${base}/historias/nova`}
          className={classesDoBotao() + " self-start"}
        >
          <IconeSubir tamanho={20} />
          <span>Nova história</span>
        </Link>
        <Link href={`${base}/perguntas`} className={rotuloLink}>
          Fazer uma pergunta
        </Link>
      </>
    );
  }

  return (
    <section
      aria-labelledby="agora"
      className="rounded-cartao bg-papel flex flex-col justify-between gap-8 p-6 md:p-8"
    >
      <div className="flex items-start gap-4">
        <div className="flex flex-1 flex-col gap-3">
          <h2 id="agora" className="text-ui-15 text-tinta-2 font-medium">
            {rotulo}
          </h2>
          <p className="font-livro text-livro-28 text-tinta md:text-livro-36 max-w-[26ch] text-balance">
            {titulo}
          </p>
        </div>
        {agora.tipo === "pergunta" && agora.pergunta.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage
          <img
            src={agora.pergunta.fotoUrl}
            alt=""
            className="rounded-interno size-20 shrink-0 object-cover md:size-28"
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-3">
        {acoes}
        {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
      </div>
    </section>
  );
}
