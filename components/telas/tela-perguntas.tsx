"use client";

// Tela Perguntas: a base do livro. Cada pergunta pode ser enviada ao autor ou, a partir do
// prompt 5, gravada ao vivo. Abas: Para perguntar · Enviadas · Respondidas · Sugestões · Enquete.
import Link from "next/link";
import {
  linkDaPergunta,
  useLinkDoAutor,
} from "@/components/livro/link-do-autor";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { Abas } from "@/components/ui/abas";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { IconeEnviar, IconeTocar } from "@/components/ui/icones";
import { AtualizarSozinho } from "@/components/livro/atualizar-sozinho";
import { EscolherDoBanco } from "@/components/perguntas/escolher-do-banco";
import { UploadFotos } from "@/components/fotos/upload-fotos";
import { EscreverPergunta } from "@/components/telas/configurar";
import { agruparPorFase, faseDoItem } from "@/lib/enquete/fases";
import {
  ranking,
  topN,
  totalDeVotantes,
  type LinhaDoRanking,
} from "@/lib/enquete/ranking";
import type {
  AcoesFotos,
  AcoesPerguntas,
  CausoDaTela,
  EnqueteDaTela,
  FotoDaTela,
  LivroDaTela,
  PerguntaDaTela,
  Resposta,
} from "@/lib/livro/tipos";
import { textoSugerido } from "@/lib/perguntas/sugestao";
import type { PromptTipo } from "@/lib/supabase/tipos";
import { falarDuracao } from "@/lib/ui/tempo";
import { linkWhatsApp, mensagemPergunta } from "@/lib/whatsapp";

import type { AbaPerguntas } from "@/lib/perguntas/abas";
export type { AbaPerguntas };

type Props = {
  livro: LivroDaTela;
  perguntas: PerguntaDaTela[];
  causos: CausoDaTela[];
  enquete: EnqueteDaTela | null;
  fotos: FotoDaTela[];
  linkAutor: string | null;
  acoes: AcoesPerguntas;
  acoesFotos: AcoesFotos;
  abaInicial?: AbaPerguntas;
};

function useAcao() {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  function rodar<T>(
    f: () => Promise<Resposta<T>>,
    depois?: (r: Resposta<T> & { ok: true }) => void,
  ) {
    iniciar(async () => {
      const r = await f();
      if (!r.ok) return setErro(r.mensagem);
      setErro(null);
      depois?.(r as Resposta<T> & { ok: true });
    });
  }
  return { pendente, erro, rodar, setErro };
}

function Erro({ mensagem }: { mensagem: string | null }) {
  return mensagem ? (
    <p role="alert" className="text-ui-15 text-erro">
      {mensagem}
    </p>
  ) : null;
}

function Etiqueta({ children }: { children: ReactNode }) {
  return (
    <span className="text-ui-13 bg-polen-2 text-tinta-2 rounded-chip px-2 py-0.5">
      {children}
    </span>
  );
}

function origemDa(p: PerguntaDaTela): string {
  if (p.causoId) return p.sugeridoPor ? `Causo de ${p.sugeridoPor}` : "Causo";
  if (p.origem === "enquete") return "Da enquete";
  if (p.origem === "banco") return "Do banco";
  return p.tipo === "causo" ? "Seu causo" : "Sua";
}

// ── Perguntas ────────────────────────────────────────────────────────────

function CartaoPergunta({
  p,
  livro,
  linkAutor,
  acoes,
}: {
  p: PerguntaDaTela;
  livro: LivroDaTela;
  linkAutor: string | null;
  acoes: AcoesPerguntas;
}) {
  const { pendente, erro, rodar } = useAcao();
  const [menu, setMenu] = useState(false);
  const escrever = livro.podeEscrever;
  return (
    <li className="rounded-cartao bg-papel border-linha flex flex-col gap-3 border p-4">
      <div className="flex items-start gap-3">
        {p.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL assinada do Storage
          <img
            src={p.fotoUrl}
            alt=""
            loading="lazy"
            className="rounded-interno size-16 shrink-0 object-cover"
          />
        ) : null}
        <p className="font-livro text-livro-20 text-tinta flex-1">{p.texto}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Etiqueta>{origemDa(p)}</Etiqueta>
        {p.tipo === "causo" && !p.causoId ? <Etiqueta>Causo</Etiqueta> : null}
      </div>
      {escrever ? (
        <div className="flex flex-wrap items-center gap-2">
          {p.estado === "para_enviar" ? (
            <>
              {linkAutor ? (
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
                  onClick={() =>
                    rodar(() => acoes.mudarEstado(p.id, "enviada"))
                  }
                  className={classesDoBotao({ variante: "secundario" })}
                >
                  <IconeEnviar tamanho={18} />
                  <span>Enviar ao {livro.autor}</span>
                </a>
              ) : (
                <Botao variante="secundario" disabled>
                  <IconeEnviar tamanho={18} />
                  <span>Enviar ao {livro.autor}</span>
                </Botao>
              )}
              <Botao
                variante="texto"
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
              >
                Mais
              </Botao>
              {menu ? (
                <div className="flex w-full flex-wrap gap-2">
                  <Link
                    href={`/livro/${livro.id}/historias/gravar?pergunta=${p.id}`}
                    className={classesDoBotao({ variante: "texto" })}
                  >
                    Gravar agora
                  </Link>
                  <Botao
                    variante="texto"
                    disabled={pendente}
                    onClick={() =>
                      rodar(() => acoes.mudarEstado(p.id, "pulada"))
                    }
                  >
                    Pular
                  </Botao>
                  <Botao
                    variante="texto"
                    disabled={pendente}
                    onClick={() => rodar(() => acoes.apagar(p.id))}
                  >
                    Apagar
                  </Botao>
                </div>
              ) : null}
            </>
          ) : p.estado === "pulada" ? (
            <Botao
              variante="texto"
              disabled={pendente}
              onClick={() =>
                rodar(() => acoes.mudarEstado(p.id, "para_enviar"))
              }
            >
              Voltar para a lista
            </Botao>
          ) : p.estado === "enviada" ? (
            <Botao
              variante="texto"
              disabled={pendente}
              onClick={() =>
                rodar(() => acoes.mudarEstado(p.id, "para_enviar"))
              }
            >
              Desfazer envio
            </Botao>
          ) : null}
        </div>
      ) : null}
      {erro ? (
        <p role="alert" className="text-ui-15 text-erro">
          {erro === "Este livro não aceita mudanças agora."
            ? erro
            : `Não marquei como enviada. ${erro}`}
        </p>
      ) : null}
    </li>
  );
}

function ListaDePerguntas(props: {
  lista: PerguntaDaTela[];
  livro: LivroDaTela;
  linkAutor: string | null;
  acoes: AcoesPerguntas;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {props.lista.map((p) => (
        <CartaoPergunta
          key={p.id}
          p={p}
          livro={props.livro}
          linkAutor={props.linkAutor}
          acoes={props.acoes}
        />
      ))}
    </ul>
  );
}

// ── Adicionar ────────────────────────────────────────────────────────────

function FolhaAdicionar({
  aberta,
  aoFechar,
  perguntas,
  fotos,
  acoes,
  acoesFotos,
}: {
  aberta: boolean;
  aoFechar: () => void;
  perguntas: PerguntaDaTela[];
  fotos: FotoDaTela[];
  acoes: AcoesPerguntas;
  acoesFotos: AcoesFotos;
}) {
  const [modo, setModo] = useState<"menu" | "banco" | "escrever" | "foto">(
    "menu",
  );
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [rascunho, setRascunho] = useState<{ tipo: PromptTipo; texto: string }>(
    { tipo: "pergunta", texto: "" },
  );
  const [foto, setFoto] = useState<string | null>(null);
  const { pendente, erro, rodar } = useAcao();
  const jaNoLivro = perguntas.flatMap((p) => (p.bancoId ? [p.bancoId] : []));

  function fechar() {
    setModo("menu");
    setMarcadas([]);
    setFoto(null);
    setRascunho({ tipo: "pergunta", texto: "" });
    aoFechar();
  }

  const titulo = {
    menu: "Adicionar",
    banco: "Do banco",
    escrever: "Escrever",
    foto: "Com foto",
  }[modo];

  return (
    <FolhaInferior aberta={aberta} aoFechar={fechar} titulo={titulo}>
      {modo === "menu" ? (
        <div className="flex flex-col gap-3">
          <Botao
            variante="secundario"
            larguraTotal
            onClick={() => setModo("banco")}
          >
            Do banco de perguntas
          </Botao>
          <Botao
            variante="secundario"
            larguraTotal
            onClick={() => setModo("escrever")}
          >
            Escrever pergunta ou causo
          </Botao>
          <Botao
            variante="secundario"
            larguraTotal
            onClick={() => setModo("foto")}
          >
            Pergunta com foto
          </Botao>
        </div>
      ) : modo === "banco" ? (
        <>
          <EscolherDoBanco
            marcadas={marcadas}
            aoMudar={setMarcadas}
            esconder={jaNoLivro}
          />
          <Erro mensagem={erro} />
          <Botao
            larguraTotal
            disabled={!marcadas.length}
            carregando={pendente}
            onClick={() =>
              rodar(() => acoes.adicionarDoBanco(marcadas), fechar)
            }
          >
            {marcadas.length === 1
              ? "Pôr 1 na lista"
              : `Pôr ${marcadas.length} na lista`}
          </Botao>
        </>
      ) : modo === "escrever" ? (
        <>
          <EscreverPergunta
            valor={rascunho}
            aoMudar={setRascunho}
            carregando={pendente}
            aoSalvar={() =>
              rodar(
                () =>
                  acoes.adicionarPropria({
                    ...rascunho,
                    texto: rascunho.texto.trim(),
                  }),
                fechar,
              )
            }
          />
          <Erro mensagem={erro} />
        </>
      ) : (
        <>
          {fotos.length ? (
            <ul
              className="grid grid-cols-3 gap-2"
              role="radiogroup"
              aria-label="Foto"
            >
              {fotos.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={foto === f.id}
                    onClick={() => setFoto(f.id)}
                    className={
                      "rounded-interno block aspect-square w-full overflow-hidden border-4 " +
                      (foto === f.id ? "border-floresta" : "border-transparent")
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- URL assinada */}
                    <img
                      src={f.url}
                      alt={f.legenda ?? ""}
                      loading="lazy"
                      className="size-full object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ui-15 text-tinta-2">
              O acervo ainda não tem fotos.
            </p>
          )}
          <UploadFotos
            acoes={acoesFotos}
            rotulo="Subir fotos"
            aoTerminar={(ids) => ids[0] && setFoto(ids[0])}
          />
          {foto ? (
            <EscreverPergunta
              valor={rascunho}
              aoMudar={setRascunho}
              carregando={pendente}
              aoSalvar={() =>
                rodar(
                  () =>
                    acoes.adicionarPropria({
                      ...rascunho,
                      texto: rascunho.texto.trim(),
                      fotoId: foto,
                    }),
                  fechar,
                )
              }
            />
          ) : null}
          <Erro mensagem={erro} />
        </>
      )}
    </FolhaInferior>
  );
}

// ── Sugestões da família (perguntas e causos) ────────────────────────────

const ESTADO_DO_CAUSO: Record<CausoDaTela["estado"], string | null> = {
  novo: null,
  na_enquete: "Na enquete",
  virou_pergunta: "Na lista",
  arquivado: "Arquivado",
};

function CartaoCauso({
  c,
  livro,
  acoes,
  aoTocar,
  aoPorNaEnquete,
}: {
  c: CausoDaTela;
  livro: LivroDaTela;
  acoes: AcoesPerguntas;
  aoTocar: (tocando: boolean) => void;
  aoPorNaEnquete: (c: CausoDaTela) => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [virar, setVirar] = useState(false);
  const [texto, setTexto] = useState({
    tipo: c.tipo as PromptTipo,
    texto: textoSugerido(c),
  });
  const { pendente, erro, rodar } = useAcao();
  const quando = new Date(c.criadoEm).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
  const estado = ESTADO_DO_CAUSO[c.estado];

  return (
    <li className="rounded-cartao bg-papel border-linha flex flex-col gap-3 border p-4">
      <p className="text-ui-15 text-tinta-2">
        <Etiqueta>{c.tipo === "pergunta" ? "Pergunta" : "Causo"}</Etiqueta>{" "}
        <span className="text-tinta font-medium">{c.nome}</span> · {quando}
        {estado ? (
          <span className="ml-2">
            <Etiqueta>{estado}</Etiqueta>
          </span>
        ) : null}
      </p>
      {c.texto ? (
        <p className="font-livro text-livro-20 text-tinta whitespace-pre-line">
          {c.texto}
        </p>
      ) : null}
      {c.temAudio ? (
        url ? (
          <audio
            controls
            autoPlay
            src={url}
            className="w-full"
            onPlay={() => aoTocar(true)}
            onPause={() => aoTocar(false)}
            onEnded={() => aoTocar(false)}
          />
        ) : (
          <Botao
            variante="secundario"
            icone={<IconeTocar tamanho={18} />}
            carregando={pendente}
            className="self-start"
            onClick={() =>
              rodar(
                () => acoes.urlDoAudio(c.id),
                (r) => setUrl(r.dados.url),
              )
            }
          >
            Ouvir {c.duracaoS ? `· ${falarDuracao(c.duracaoS)}` : ""}
          </Botao>
        )
      ) : null}
      {livro.podeEscrever && c.estado !== "virou_pergunta" ? (
        <div className="flex flex-wrap gap-2">
          <Botao variante="secundario" onClick={() => setVirar(true)}>
            Pôr na lista
          </Botao>
          {c.estado === "novo" ? (
            <Botao variante="texto" onClick={() => aoPorNaEnquete(c)}>
              Pôr na enquete
            </Botao>
          ) : null}
        </div>
      ) : null}
      <Erro mensagem={erro} />
      <FolhaInferior
        aberta={virar}
        aoFechar={() => setVirar(false)}
        titulo="Pôr na lista"
      >
        <EscreverPergunta
          valor={texto}
          aoMudar={setTexto}
          carregando={pendente}
          rotuloSalvar="Pôr em Para perguntar"
          aoSalvar={() =>
            rodar(
              () => acoes.virarPergunta(c.id, texto.texto.trim()),
              () => setVirar(false),
            )
          }
        />
        {c.temAudio ? (
          <p className="text-ui-15 text-tinta-2">
            O áudio de {c.nome} vai junto.
          </p>
        ) : null}
        <Erro mensagem={erro} />
      </FolhaInferior>
    </li>
  );
}

// ── Enquete ──────────────────────────────────────────────────────────────

function Resultados({
  enquete,
  livro,
  acoes,
}: {
  enquete: EnqueteDaTela;
  livro: LivroDaTela;
  acoes: AcoesPerguntas;
}) {
  const linhas = useMemo(
    () => ranking(enquete.itens, enquete.votos),
    [enquete],
  );
  const pessoas = totalDeVotantes(enquete.votos);
  const [n, setN] = useState(3);
  const [encerrar, setEncerrar] = useState(false);
  const [remover, setRemover] = useState<{
    votante: string;
    nome: string;
  } | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const { pendente, erro, rodar } = useAcao();
  const top = topN(linhas, n).filter((l) => !l.prompt_id);
  const maximo = Math.max(1, ...linhas.map((l) => l.votos));
  const aberta = enquete.estado === "aberta";
  const escrever = livro.podeEscrever;
  const grupos = agruparPorFase(linhas, (l) => faseDoItem(l.banco_id));
  const posicaoNaFase = new Map(
    grupos.flatMap((g) => g.itens.map((l, i) => [l.id, i + 1] as const)),
  );
  const linha = (l: LinhaDoRanking) => (
    <li
      key={l.id}
      className="rounded-cartao bg-papel border-linha flex flex-col gap-2 border p-4"
    >
      <div className="flex items-start gap-3">
        <span className="num text-ui-17 text-tinta-2 w-6 shrink-0">
          {posicaoNaFase.get(l.id)}
        </span>
        <p className="font-livro text-livro-20 text-tinta flex-1">{l.texto}</p>
        <span className="num text-ui-20 text-tinta font-medium">{l.votos}</span>
      </div>
      <div
        className="bg-polen-2 h-1.5 overflow-hidden rounded-full"
        aria-hidden="true"
      >
        <div
          className="bg-floresta h-full"
          style={{ width: `${(l.votos / maximo) * 100}%` }}
        />
      </div>
      {l.votantes.length ? (
        <div className="flex flex-wrap gap-1.5">
          {l.votantes.map((v) =>
            escrever ? (
              <button
                key={v.votante + l.id}
                type="button"
                onClick={() => setRemover(v)}
                className="text-ui-13 rounded-chip bg-polen-2 text-tinta hover:bg-linha min-h-8 px-2"
              >
                {v.nome}
              </button>
            ) : (
              <Etiqueta key={v.votante + l.id}>{v.nome}</Etiqueta>
            ),
          )}
        </div>
      ) : null}
      {escrever ? (
        l.prompt_id ? (
          <span className="text-ui-15 text-floresta">Em Para perguntar</span>
        ) : (
          <Botao
            variante="texto"
            className="self-start"
            disabled={pendente}
            onClick={() =>
              rodar(() => acoes.salvarDaEnquete(enquete.id, [l.id]))
            }
          >
            Salvar esta
          </Botao>
        )
      ) : null}
    </li>
  );

  return (
    <div className="flex flex-col gap-5">
      <p className="text-ui-17 text-tinta" aria-live="polite">
        {aberta ? "Enquete aberta" : "Enquete encerrada"} ·{" "}
        {pessoas === 1 ? "1 pessoa votou" : `${pessoas} pessoas votaram`}
      </p>
      {grupos.map((g) => {
        const comVoto = g.itens.filter((l) => l.votos > 0);
        const semVoto = g.itens.filter((l) => l.votos === 0);
        return (
          <section key={g.categoria.id} className="flex flex-col gap-3">
            <h3 className="text-ui-17 text-tinta font-medium">
              {g.categoria.nome}
            </h3>
            {comVoto.length ? (
              <ol className="flex flex-col gap-3">{comVoto.map(linha)}</ol>
            ) : null}
            {semVoto.length ? (
              <details>
                <summary className="text-ui-15 text-tinta-2 min-h-11 cursor-pointer">
                  Sem votos ({semVoto.length})
                </summary>
                <ol className="flex flex-col gap-3 pt-2">
                  {semVoto.map(linha)}
                </ol>
              </details>
            ) : null}
          </section>
        );
      })}

      {escrever ? (
        <div className="bg-polen sticky bottom-0 -mx-4 flex flex-col gap-3 px-4 py-3">
          <Erro mensagem={erro} />
          {aviso ? (
            <p role="status" className="text-ui-15 text-floresta">
              {aviso}
            </p>
          ) : null}
          <div className="flex flex-col gap-3">
            <div
              className="rounded-controle border-linha-forte flex items-center self-start border"
              role="group"
              aria-label="Quantas salvar"
            >
              <button
                type="button"
                aria-label="Menos"
                className="size-alvo text-ui-20"
                onClick={() => setN((x) => Math.max(1, x - 1))}
              >
                −
              </button>
              <span className="num text-ui-17 w-6 text-center">{n}</span>
              <button
                type="button"
                aria-label="Mais"
                className="size-alvo text-ui-20"
                onClick={() => setN((x) => Math.min(10, x + 1))}
              >
                +
              </button>
            </div>
            <Botao
              larguraTotal
              carregando={pendente}
              disabled={top.length === 0}
              onClick={() =>
                rodar(
                  () =>
                    acoes.salvarDaEnquete(
                      enquete.id,
                      top.map((l) => l.id),
                    ),
                  (r) => setAviso(`${r.dados.salvas} em Para perguntar.`),
                )
              }
            >
              {n === 1 ? "Salvar a mais votada" : `Salvar as ${n} mais votadas`}
            </Botao>
          </div>
          {aberta ? (
            encerrar ? (
              <div className="flex gap-3">
                <Botao
                  variante="secundario"
                  disabled={pendente}
                  onClick={() => rodar(() => acoes.encerrarEnquete(enquete.id))}
                >
                  Encerrar agora
                </Botao>
                <Botao variante="texto" onClick={() => setEncerrar(false)}>
                  Continuar aberta
                </Botao>
              </div>
            ) : (
              <Botao
                variante="texto"
                className="self-start"
                onClick={() => setEncerrar(true)}
              >
                Encerrar a enquete
              </Botao>
            )
          ) : null}
        </div>
      ) : null}

      <FolhaInferior
        aberta={Boolean(remover)}
        aoFechar={() => setRemover(null)}
        titulo={`Remover os votos de ${remover?.nome ?? ""}?`}
      >
        <p className="text-ui-17 text-tinta-2">
          Ela ainda pode votar de novo pelo link.
        </p>
        <Botao
          larguraTotal
          carregando={pendente}
          onClick={() =>
            remover &&
            rodar(
              () => acoes.removerVotos(enquete.id, remover.votante),
              () => setRemover(null),
            )
          }
        >
          Remover
        </Botao>
      </FolhaInferior>
    </div>
  );
}

// ── Tela ─────────────────────────────────────────────────────────────────

export function TelaPerguntas({
  livro,
  perguntas,
  causos,
  enquete,
  fotos,
  linkAutor,
  acoes,
  acoesFotos,
  abaInicial = "perguntar",
}: Props) {
  const router = useRouter();
  const caminho = usePathname();
  const { link: linkDoAutorAtual } = useLinkDoAutor(
    linkAutor,
    acoes.pegarLinkDoAutor,
    livro.podeEscrever,
  );
  const [aba, setAba] = useState<AbaPerguntas>(abaInicial);
  const [adicionar, setAdicionar] = useState(false);
  const [tocando, setTocando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciar] = useTransition();

  const por = (e: PerguntaDaTela["estado"]) =>
    perguntas.filter((p) => p.estado === e);
  const paraPerguntar = por("para_enviar");
  const puladas = por("pulada");
  const enviadas = por("enviada");
  const respondidas = por("respondida");
  const causosNovos = causos.filter((c) => c.estado === "novo").length;
  const escrever = livro.podeEscrever;
  const novaEnquete = `/livro/${livro.id}/enquete/nova`;

  function mudarAba(id: string) {
    setAba(id as AbaPerguntas);
    router.replace(`${caminho}?aba=${id}`, { scroll: false });
  }

  function porNaEnquete(c: CausoDaTela) {
    iniciar(async () => {
      const r = await acoes.porNaEnquete(c.id);
      if (!r.ok) return setErro(r.mensagem);
      if (!r.dados.adicionado) router.push(`${novaEnquete}?causo=${c.id}`);
    });
  }

  const lista = (l: PerguntaDaTela[]) => (
    <ListaDePerguntas
      lista={l}
      livro={livro}
      linkAutor={linkDoAutorAtual}
      acoes={acoes}
    />
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-6 px-4 pt-8 pb-12">
      <AtualizarSozinho
        ativo={aba === "causos" || aba === "enquete"}
        pausado={tocando || adicionar}
      />
      <Link
        href={`/livro/${livro.id}`}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Livro do {livro.autor}
      </Link>
      <div className="flex items-end justify-between gap-4">
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          Perguntas
        </h1>
        {/* Uma ação principal por tela: Adicionar só na lista; Sugestões e Enquete têm a sua. */}
        {escrever && aba === "perguntar" && paraPerguntar.length > 0 ? (
          <Botao onClick={() => setAdicionar(true)}>Adicionar</Botao>
        ) : null}
      </div>
      <Erro mensagem={erro} />

      <Abas
        rotulo="Perguntas"
        quebrar
        ativa={aba}
        aoMudar={mudarAba}
        abas={[
          {
            id: "perguntar",
            rotulo: "Para perguntar",
            contagem: paraPerguntar.length,
            conteudo: (
              <div className="flex flex-col gap-6">
                {paraPerguntar.length ? (
                  lista(paraPerguntar)
                ) : (
                  <EstadoVazio
                    frase={`Escolha o que perguntar ao ${livro.autor}.`}
                    acao={
                      escrever ? (
                        <Botao onClick={() => setAdicionar(true)}>
                          Adicionar
                        </Botao>
                      ) : null
                    }
                  />
                )}
                {puladas.length ? (
                  <details className="flex flex-col gap-3">
                    <summary className="text-ui-17 text-tinta-2 min-h-alvo cursor-pointer">
                      Puladas ({puladas.length})
                    </summary>
                    <div className="pt-3">{lista(puladas)}</div>
                  </details>
                ) : null}
              </div>
            ),
          },
          {
            id: "enviadas",
            rotulo: "Enviadas",
            contagem: enviadas.length,
            conteudo: enviadas.length ? (
              lista(enviadas)
            ) : (
              <p className="text-ui-17 text-tinta-2">Nada enviado ainda.</p>
            ),
          },
          {
            id: "respondidas",
            rotulo: "Respondidas",
            contagem: respondidas.length,
            conteudo: respondidas.length ? (
              lista(respondidas)
            ) : (
              <p className="text-ui-17 text-tinta-2">
                As respostas do {livro.autor} aparecem aqui.
              </p>
            ),
          },
          {
            id: "causos",
            rotulo: "Sugestões",
            contagem: causosNovos || undefined,
            conteudo: causos.length ? (
              <ul className="flex flex-col gap-3">
                {causos.map((c) => (
                  <CartaoCauso
                    key={c.id}
                    c={c}
                    livro={livro}
                    acoes={acoes}
                    aoTocar={setTocando}
                    aoPorNaEnquete={porNaEnquete}
                  />
                ))}
              </ul>
            ) : (
              <EstadoVazio
                frase="As perguntas e os causos que a família sugerir chegam aqui."
                acao={
                  <Link
                    href={`/livro/${livro.id}/kit`}
                    className={classesDoBotao({ variante: "secundario" })}
                  >
                    <span>Convidar a família</span>
                  </Link>
                }
              />
            ),
          },
          {
            id: "enquete",
            rotulo: "Enquete",
            conteudo: (
              <div className="flex flex-col gap-6">
                {enquete ? (
                  <Resultados
                    key={enquete.id}
                    enquete={enquete}
                    livro={livro}
                    acoes={acoes}
                  />
                ) : (
                  <EstadoVazio
                    frase="Deixe a família votar no que perguntar."
                    acao={
                      escrever ? (
                        <Link href={novaEnquete} className={classesDoBotao()}>
                          <span>Nova enquete</span>
                        </Link>
                      ) : null
                    }
                  />
                )}
                {enquete?.estado === "encerrada" && escrever ? (
                  <Link
                    href={novaEnquete}
                    className={
                      classesDoBotao({ variante: "secundario" }) + " self-start"
                    }
                  >
                    <span>Nova enquete</span>
                  </Link>
                ) : null}
                {enquete?.estado === "aberta" ? (
                  <Link
                    href={`/livro/${livro.id}/kit`}
                    className="text-ui-15 text-floresta inline-flex min-h-11 items-center self-start underline-offset-4 hover:underline"
                  >
                    Mandar o link da família no grupo
                  </Link>
                ) : null}
              </div>
            ),
          },
        ]}
      />

      <FolhaAdicionar
        aberta={adicionar}
        aoFechar={() => setAdicionar(false)}
        perguntas={perguntas}
        fotos={fotos}
        acoes={acoes}
        acoesFotos={acoesFotos}
      />
    </main>
  );
}
