"use client";

// Kit de início: o convite do grupo (com o link da família) e a mensagem para o autor.
// Os dois abrem o WhatsApp do responsável com o texto pronto.
import Link from "next/link";
import { useState, useTransition } from "react";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { IconeEnviar } from "@/components/ui/icones";
import type { AcoesKit, LivroDaTela } from "@/lib/livro/tipos";
import { conviteDoGrupo, linkWhatsApp, mensagemAoAutor } from "@/lib/whatsapp";

function Copiar({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Botao
      variante="texto"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setCopiado(true);
          window.setTimeout(() => setCopiado(false), 2000);
        } catch {
          setCopiado(false);
        }
      }}
    >
      {copiado ? "Copiado" : "Copiar"}
    </Botao>
  );
}

function Cartao({
  titulo,
  texto,
  enviar,
  secundario = false,
}: {
  titulo: string;
  texto: string;
  enviar: string;
  secundario?: boolean;
}) {
  return (
    <section className="rounded-cartao bg-papel border-linha flex flex-col gap-4 border p-5">
      <h2 className="text-ui-20 text-tinta font-medium">{titulo}</h2>
      <p className="font-livro text-livro-20 text-tinta [overflow-wrap:anywhere] whitespace-pre-line">
        {texto}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={linkWhatsApp(texto)}
          target="_blank"
          rel="noreferrer"
          className={classesDoBotao({
            variante: secundario ? "secundario" : "principal",
          })}
        >
          <IconeEnviar tamanho={20} />
          <span>{enviar}</span>
        </a>
        <Copiar texto={texto} />
      </div>
    </section>
  );
}

export function TelaKit({
  livro,
  linkFamilia,
  linkAutor,
  acoes,
}: {
  livro: LivroDaTela;
  linkFamilia: string | null;
  linkAutor: string;
  acoes: AcoesKit;
}) {
  const [link, setLink] = useState(linkFamilia);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarTroca, setConfirmarTroca] = useState(false);
  const [pendente, iniciar] = useTransition();

  function pegar(trocar: boolean) {
    iniciar(async () => {
      const r = trocar
        ? await acoes.trocarLinkDaFamilia()
        : await acoes.pegarLinkDaFamilia();
      if (!r.ok) return setErro(r.mensagem);
      setErro(null);
      setConfirmarTroca(false);
      setLink(r.dados.url);
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12">
      <Link
        href={`/livro/${livro.id}`}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Livro do {livro.autor}
      </Link>
      <h1 className="font-livro text-livro-28 text-tinta leading-tight">
        Chame a família
      </h1>

      {link ? (
        <Cartao
          titulo="Para o grupo da família"
          texto={conviteDoGrupo({ autor: livro.autor, link })}
          enviar="Enviar ao grupo"
        />
      ) : (
        <section className="rounded-cartao bg-papel border-linha flex flex-col gap-4 border p-5">
          <h2 className="text-ui-20 text-tinta font-medium">
            Para o grupo da família
          </h2>
          <p className="text-ui-17 text-tinta-2">
            Um link só, para fixar no grupo: votar nas perguntas e sugerir
            causos.
          </p>
          <Botao
            carregando={pendente}
            disabled={!livro.podeEscrever}
            onClick={() => pegar(false)}
            className="self-start"
          >
            Pegar o link do grupo
          </Botao>
        </section>
      )}

      <Cartao
        titulo={`Para o ${livro.autor}`}
        texto={mensagemAoAutor({ autor: livro.autor, link: linkAutor })}
        enviar={`Enviar ao ${livro.autor}`}
        secundario
      />

      {erro ? (
        <p role="alert" className="text-ui-15 text-erro">
          {erro}
        </p>
      ) : null}

      {link && livro.podeEscrever ? (
        confirmarTroca ? (
          <div className="flex flex-col gap-3">
            <p className="text-ui-15 text-tinta">
              O link antigo para de funcionar. Você vai precisar mandar o novo
              no grupo.
            </p>
            <div className="flex gap-3">
              <Botao
                variante="secundario"
                carregando={pendente}
                onClick={() => pegar(true)}
              >
                Trocar o link
              </Botao>
              <Botao variante="texto" onClick={() => setConfirmarTroca(false)}>
                Manter
              </Botao>
            </div>
          </div>
        ) : (
          <Botao
            variante="texto"
            className="self-start"
            onClick={() => setConfirmarTroca(true)}
          >
            Trocar o link da família
          </Botao>
        )
      ) : null}

      <Link
        href={`/livro/${livro.id}/perguntas`}
        className="text-ui-17 text-floresta min-h-alvo inline-flex items-center self-start font-medium underline-offset-4 hover:underline"
      >
        Ir para as perguntas
      </Link>
    </main>
  );
}
