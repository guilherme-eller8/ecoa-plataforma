"use client";

// Área do autor (/a/[token], sem login, M7 e M11). Regras do autor: pergunta com 28 px ou mais,
// texto com 20 px, alvos de 56 px, botão de gravar de 120 px. Uma ação principal por tela.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Gravar } from "@/components/gravacao/gravar";
import { Aviso } from "@/components/ui/aviso";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { IconeMicrofone, IconePausa, IconeTocar } from "@/components/ui/icones";
import { MarcaEcoa } from "@/components/ui/marca";
import { enviarPorTus } from "@/lib/audios/tus";
import type {
  AcoesAutor,
  PaginaDoAutor,
  PerguntaDoAutor,
} from "@/lib/autor/tipos";
import type { AdaptadorEnvio, SubirBlob } from "@/lib/gravacao/envio";
import { armazemIndexedDb, type Armazem } from "@/lib/gravacao/local";

export type ModoAutor =
  { tipo: "inicio" } | { tipo: "gravar"; perguntaId: string | null };

export function adaptadorDoAutor(acoes: AcoesAutor): AdaptadorEnvio {
  return {
    preparar: (g, tamanho) =>
      acoes.preparar({
        id: g.idServidor,
        promptId: g.promptId,
        ext: g.ext,
        tamanho,
        duracaoS: g.segundos,
      }),
    assinar: (g) => acoes.assinar(g.idServidor),
    confirmar: (g) => acoes.confirmar(g.idServidor),
  };
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12">
      {children}
    </main>
  );
}

const voltar =
  "text-ui-17 text-tinta-2 hover:text-tinta min-h-alvo-autor inline-flex items-center self-start";

function PrimeiraAbertura({
  nome,
  consentir,
  aoConsentir,
}: {
  nome: string;
  consentir: AcoesAutor["consentir"];
  aoConsentir: () => void;
}) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <Moldura>
      <MarcaEcoa />
      <h1 className="font-livro text-livro-36 text-tinta leading-tight">
        {nome ? `Olá, ${nome}` : "Olá"}
      </h1>
      <p className="font-livro text-livro-28 text-tinta leading-snug">
        Toque no círculo e conte. Pode pausar quando quiser.
      </p>
      <p className="text-ui-20 text-tinta">
        Suas histórias vão virar um livro para a sua família. Podemos guardar a
        sua voz para isso?
      </p>
      <Botao
        tamanho="autor"
        larguraTotal
        carregando={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await consentir();
            if (!r.ok) return setErro(r.mensagem ?? "Não deu certo agora.");
            aoConsentir();
          })
        }
      >
        Sim, pode guardar
      </Botao>
      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
    </Moldura>
  );
}

/** Gravações deste link guardadas no aparelho que ainda não subiram. */
function useGuardadas(armazem: Armazem, token: string) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let vivo = true;
    void armazem
      .listar()
      .then((l) => {
        if (!vivo) return;
        setN(
          l.filter(
            (g) =>
              g.destino.tipo === "autor" &&
              g.destino.token === token &&
              g.estado !== "enviada",
          ).length,
        );
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [armazem, token]);
  return n;
}

function Inicio({
  pagina,
  base,
  armazem,
  token,
}: {
  pagina: PaginaDoAutor;
  base: string;
  armazem: Armazem;
  token: string;
}) {
  const guardadas = useGuardadas(armazem, token);
  return (
    <Moldura>
      <MarcaEcoa />
      <h1 className="font-livro text-livro-36 text-tinta leading-tight">
        {pagina.nome ? `Olá, ${pagina.nome}` : "Olá"}
      </h1>
      {!pagina.aberto ? (
        <p className="text-ui-20 text-tinta-2">
          Este livro está fechado para novas gravações.
        </p>
      ) : (
        <>
          {guardadas ? (
            <div className="rounded-cartao bg-papel border-linha flex flex-col gap-4 border p-5">
              <p className="text-ui-20 text-tinta">
                Você tem uma gravação guardada que ainda não foi enviada.
              </p>
              <Link
                href={`${base}/gravar`}
                className={classesDoBotao({
                  tamanho: "autor",
                  larguraTotal: true,
                })}
              >
                Ver e enviar
              </Link>
            </div>
          ) : null}
          <Link
            href={`${base}/gravar`}
            className={classesDoBotao({
              tamanho: "autor",
              larguraTotal: true,
              variante: guardadas ? "secundario" : "principal",
            })}
          >
            <IconeMicrofone tamanho={24} />
            <span>Contar uma história</span>
          </Link>
          <section className="flex flex-col gap-4">
            <h2 className="text-ui-20 text-tinta font-medium">
              Perguntas para você
            </h2>
            {pagina.perguntas.length === 0 ? (
              <p className="text-ui-20 text-tinta-2">
                Nenhuma pergunta por enquanto.
              </p>
            ) : (
              <ul className="flex flex-col gap-4">
                {pagina.perguntas.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`${base}/gravar/${p.id}`}
                      className="rounded-cartao bg-papel border-linha hover:bg-polen-2 flex flex-col gap-3 border p-5"
                    >
                      {p.fotoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage
                        <img
                          src={p.fotoUrl}
                          alt=""
                          loading="lazy"
                          className="rounded-interno max-h-56 w-full object-cover"
                        />
                      ) : null}
                      <span className="font-livro text-livro-28 text-tinta leading-snug">
                        {p.texto}
                      </span>
                      {p.sugestaoNome ? (
                        <span className="text-ui-17 text-tinta-2">
                          {p.sugestaoNome} pediu
                        </span>
                      ) : null}
                      <span className="text-ui-17 text-floresta inline-flex items-center gap-2 font-medium">
                        <IconeMicrofone tamanho={20} />
                        Gravar a resposta
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </Moldura>
  );
}

/** O áudio de quem sugeriu, num botão grande (o player do navegador é pequeno demais). */
function OuvirPedido({ nome, url }: { nome: string; url: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [tocando, setTocando] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-ui-20 text-tinta-2">{nome} pediu:</p>
      <audio
        ref={audio}
        src={url}
        preload="none"
        onPlay={() => setTocando(true)}
        onPause={() => setTocando(false)}
        onEnded={() => setTocando(false)}
      />
      <Botao
        variante="secundario"
        tamanho="autor"
        larguraTotal
        icone={
          tocando ? <IconePausa tamanho={22} /> : <IconeTocar tamanho={22} />
        }
        onClick={() => {
          const a = audio.current;
          if (!a) return;
          if (a.paused) void a.play().catch(() => {});
          else a.pause();
        }}
      >
        {tocando ? "Parar" : `Ouvir ${nome}`}
      </Botao>
    </div>
  );
}

function Roteiro({ pergunta }: { pergunta: PerguntaDoAutor }) {
  return (
    <div className="flex flex-col gap-4">
      {pergunta.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage
        <img
          src={pergunta.fotoUrl}
          alt=""
          className="rounded-cartao max-h-[50vh] w-full object-cover"
        />
      ) : null}
      <h1 className="font-livro text-livro-28 text-tinta leading-snug">
        {pergunta.texto}
      </h1>
      {pergunta.sugestaoNome && pergunta.sugestaoAudioUrl ? (
        <OuvirPedido
          nome={pergunta.sugestaoNome}
          url={pergunta.sugestaoAudioUrl}
        />
      ) : null}
    </div>
  );
}

export function TelaAutor({
  token,
  pagina,
  modo,
  acoes,
  armazem,
  subir,
}: {
  token: string;
  pagina: PaginaDoAutor;
  modo: ModoAutor;
  acoes: AcoesAutor;
  armazem?: Armazem;
  subir?: SubirBlob;
}) {
  const [consentiu, setConsentiu] = useState(pagina.consentiu);
  const deposito = useMemo(() => armazem ?? armazemIndexedDb(), [armazem]);
  const adaptador = useMemo(() => adaptadorDoAutor(acoes), [acoes]);
  const base = `/a/${token}`;

  if (!consentiu)
    return (
      <PrimeiraAbertura
        nome={pagina.nome}
        consentir={acoes.consentir}
        aoConsentir={() => setConsentiu(true)}
      />
    );

  if (modo.tipo === "inicio")
    return (
      <Inicio pagina={pagina} base={base} armazem={deposito} token={token} />
    );

  const pergunta =
    pagina.perguntas.find((p) => p.id === modo.perguntaId) ?? null;
  return (
    <Moldura>
      <Link href={base} className={voltar}>
        ← Voltar
      </Link>
      {pergunta ? (
        <Roteiro pergunta={pergunta} />
      ) : (
        <div className="flex flex-col gap-3">
          <h1 className="font-livro text-livro-28 text-tinta leading-snug">
            Conte o que quiser
          </h1>
          {modo.perguntaId ? (
            <p className="text-ui-20 text-tinta-2">
              Essa pergunta já foi respondida. Pode contar outra história.
            </p>
          ) : null}
        </div>
      )}
      {pagina.aberto ? (
        <Gravar
          destino={{ tipo: "autor", token }}
          promptId={pergunta?.id ?? null}
          emPartes={false}
          tamanho="autor"
          armazem={deposito}
          adaptador={adaptador}
          subir={subir ?? ((b, p, pr, i) => enviarPorTus(b, p, pr, i))}
          depois={
            <Link
              href={base}
              className={classesDoBotao({
                tamanho: "autor",
                larguraTotal: true,
              })}
            >
              Voltar ao início
            </Link>
          }
        />
      ) : (
        <p className="text-ui-20 text-tinta-2">
          Este livro está fechado para novas gravações.
        </p>
      )}
    </Moldura>
  );
}

export function TelaAutorInvalido() {
  return (
    <Moldura>
      <MarcaEcoa />
      <h1 className="font-livro text-livro-36 text-tinta leading-tight">
        Este link não vale mais.
      </h1>
      <p className="text-ui-20 text-tinta-2">
        Peça um novo a quem está fazendo o seu livro.
      </p>
    </Moldura>
  );
}
