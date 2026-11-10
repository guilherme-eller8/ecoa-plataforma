import type { Metadata } from "next";
import { Abas } from "@/components/ui/abas";
import { Botao } from "@/components/ui/botao";
import { CartaoHistoria } from "@/components/ui/cartao-historia";
import { IconeMicrofone, IconeSubir, IconeTocar } from "@/components/ui/icones";
import { MarcaEcoa } from "@/components/ui/marca";
import {
  causos,
  historias,
  livro,
  paginasDaHistoria,
  perguntas,
  proximaPergunta,
  resumoDoLivro,
  historiaSendoEscrita,
  type Historia,
} from "@/lib/exemplos/livro-jair";
import { LEMBRETE_APOS_DIAS } from "@/lib/config";
import { formatarCronometro } from "@/lib/ui/tempo";
import { DemoFolha } from "../_demos/demo-folha";

export const metadata: Metadata = { title: "Livro do Jair · exemplo" };

// Tela de exemplo, com dados falsos e sem lógica: a home do responsável.
// Pergunta da tela: "o que falta para o livro do Jair andar hoje?"
//
// Grade: coluna de até 1100px, 12 colunas com 16px de vão (8 + 4 nas duas linhas,
// então a borda interna das duas linhas cai na mesma coluna). No celular, uma coluna,
// com a próxima pergunta logo depois do título.

const resumo = resumoDoLivro();
const paraEnviar = perguntas.filter((p) => p.estado === "para_enviar");
const enviadas = perguntas.filter((p) => p.estado === "enviada");
const pedido = causos.find((c) => c.quem === proximaPergunta.pedidaPor);

function ListaDeHistorias({ lista }: { lista: Historia[] }) {
  const visiveis = lista.slice(0, 4);
  return (
    <div className="flex flex-col gap-3">
      {visiveis.map((h) => (
        <CartaoHistoria
          key={h.id}
          titulo={h.titulo}
          estado={h.estado}
          origem={h.origem}
          duracaoSeg={h.duracaoSeg}
          trecho={h.trecho}
          paginas={paginasDaHistoria(h)}
          selo={
            h.editadaPeloAutor
              ? `Corrigida pelo ${livro.autor.nome}`
              : undefined
          }
          destaque={h.estado === "escrevendo"}
          acao={
            h.estado === "revisar" ? (
              <Botao variante="secundario">Revisar</Botao>
            ) : undefined
          }
        />
      ))}
      {lista.length > visiveis.length ? (
        <a
          href="#historias"
          className="min-h-alvo text-ui-17 text-floresta inline-flex items-center self-start font-medium underline-offset-4 hover:underline"
        >
          Ver as {lista.length} histórias
        </a>
      ) : null}
    </div>
  );
}

export default function HomeResponsavel() {
  const ordem: Historia["estado"][] = [
    "escrevendo",
    "ouvindo",
    "enviando",
    "revisar",
    "pronta",
  ];
  const ordenadas = [...historias].sort(
    (a, b) => ordem.indexOf(a.estado) - ordem.indexOf(b.estado),
  );
  const paraRevisar = ordenadas.filter((h) => h.estado === "revisar");
  const prontas = ordenadas.filter((h) => h.estado === "pronta");
  const porcentagem = Math.round(
    (resumo.paginas / resumo.paginasInclusas) * 100,
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-[1132px] items-center justify-between px-4">
        <MarcaEcoa />
        <nav
          aria-label="Principal"
          className="hidden items-center gap-1 md:flex"
        >
          {["Histórias", "Perguntas", "Livro"].map((item, i) => (
            <a
              key={item}
              href="#"
              aria-current={i === 0 ? "page" : undefined}
              className={
                "min-h-alvo rounded-controle text-ui-17 inline-flex items-center px-4 " +
                (i === 0
                  ? "text-tinta font-medium"
                  : "text-tinta-2 hover:bg-polen-2 hover:text-tinta")
              }
            >
              {item}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="min-h-alvo rounded-controle text-ui-17 text-tinta hover:bg-polen-2 inline-flex items-center px-4 md:hidden"
          >
            Menu
          </button>
          <span
            aria-label={`${livro.responsavel.nome}, sua conta`}
            role="img"
            className="bg-floresta-claro text-ui-17 text-floresta inline-flex size-10 items-center justify-center rounded-full font-medium"
          >
            {livro.responsavel.nome[0]}
          </span>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-[1132px] grid-cols-1 gap-4 px-4 pt-6 pb-16 md:pt-12 lg:grid-cols-12">
        <div className="flex flex-col gap-2 lg:col-span-12 lg:pb-6">
          <h1 className="font-livro text-livro-36 text-tinta md:text-livro-44">
            Livro do {livro.autor.nome}
          </h1>
          {historiaSendoEscrita ? (
            <p className="text-ui-17 text-tinta-2 flex items-start gap-2">
              <span
                aria-hidden="true"
                className="animate-pulsar bg-floresta mt-[0.6em] size-2 shrink-0 rounded-full"
              />
              “{historiaSendoEscrita.titulo}” está sendo escrita agora.
            </p>
          ) : null}
        </div>

        <section
          aria-labelledby="proxima"
          className="rounded-cartao bg-papel flex flex-col justify-between gap-8 p-6 md:p-8 lg:col-span-8"
        >
          <div className="flex flex-col gap-3">
            <h2 id="proxima" className="text-ui-15 text-tinta-2 font-medium">
              {proximaPergunta.pedidaPor
                ? `Próxima pergunta, pedida pelo ${proximaPergunta.pedidaPor}`
                : "Próxima pergunta"}
            </h2>
            <p className="font-livro text-livro-28 text-tinta md:text-livro-36 max-w-[24ch]">
              {proximaPergunta.texto}
            </p>
            {pedido?.formato === "audio" ? (
              <button
                type="button"
                className="min-h-alvo rounded-controle bg-polen text-ui-17 text-tinta hover:bg-polen-2 mt-1 inline-flex items-center gap-3 self-start px-4"
              >
                <IconeTocar />
                Ouvir o {pedido.quem}
                <span className="num text-tinta-2">
                  {formatarCronometro(pedido.duracaoSeg ?? 0)}
                </span>
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Botao icone={<IconeMicrofone />}>Gravar agora</Botao>
            <DemoFolha
              rotulo={`Enviar ao ${livro.autor.nome}`}
              pergunta={proximaPergunta.texto}
            />
            <Botao variante="texto" icone={<IconeSubir />}>
              Subir áudio
            </Botao>
          </div>
        </section>

        <section
          aria-labelledby="o-livro"
          className="rounded-cartao bg-papel flex flex-col gap-5 p-6 md:p-8 lg:col-span-4"
        >
          <h2 id="o-livro" className="text-ui-15 text-tinta-2 font-medium">
            O livro
          </h2>
          <div className="flex flex-col gap-3">
            <p className="font-livro text-livro-36 text-tinta">
              <span className="num">{resumo.paginas}</span>
              <span className="text-livro-20 text-tinta-2">
                {" "}
                de {resumo.paginasInclusas} páginas
              </span>
            </p>
            <div
              role="progressbar"
              aria-label="Páginas escritas"
              aria-valuemin={0}
              aria-valuemax={resumo.paginasInclusas}
              aria-valuenow={resumo.paginas}
              aria-valuetext={`${resumo.paginas} de ${resumo.paginasInclusas} páginas`}
              className="rounded-controle bg-polen-2 h-2 overflow-hidden"
            >
              <div
                className="rounded-controle bg-floresta h-full"
                style={{ width: `${porcentagem}%` }}
              />
            </div>
          </div>
          <dl className="text-ui-17 flex flex-col">
            {[
              ["Prontas", resumo.prontas],
              ["Para revisar", resumo.paraRevisar],
              ["Sendo feitas", resumo.emAndamento],
            ].map(([rotulo, valor]) => (
              <div
                key={rotulo}
                className="flex items-center justify-between py-2.5"
              >
                <dt className="text-tinta-2">{rotulo}</dt>
                <dd className="num text-tinta">{valor}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="historias" className="pt-8 lg:col-span-8">
          <Abas
            rotulo="Filtrar histórias"
            titulo={
              <h2
                id="historias"
                className="font-livro text-livro-28 text-tinta"
              >
                Histórias
              </h2>
            }
            abas={[
              {
                id: "todas",
                rotulo: "Todas",
                contagem: ordenadas.length,
                conteudo: <ListaDeHistorias lista={ordenadas} />,
              },
              {
                id: "revisar",
                rotulo: "Para revisar",
                contagem: paraRevisar.length,
                conteudo: <ListaDeHistorias lista={paraRevisar} />,
              },
              {
                id: "prontas",
                rotulo: "Prontas",
                contagem: prontas.length,
                conteudo: <ListaDeHistorias lista={prontas} />,
              },
            ]}
          />
        </section>

        <aside className="flex flex-col gap-4 lg:col-span-4 lg:pt-[calc(2rem+72px)]">
          <section
            aria-labelledby="causos"
            className="rounded-cartao bg-papel flex flex-col gap-4 p-6"
          >
            <h2 id="causos" className="font-livro text-livro-24 text-tinta">
              Causos da família
            </h2>
            <p className="text-ui-15 text-tinta-2 -mt-2">
              <span className="num">{causos.length}</span> novos, chegaram pelo
              grupo
            </p>
            <ul className="flex flex-col">
              {causos.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 py-4 first:pt-0">
                  <p className="text-ui-15 text-tinta-2">
                    {c.quem}, {c.relacao}
                  </p>
                  {c.formato === "audio" ? (
                    <button
                      type="button"
                      className="min-h-alvo rounded-controle bg-polen text-ui-17 text-tinta hover:bg-polen-2 inline-flex items-center gap-3 self-start px-4"
                    >
                      <IconeTocar />
                      Ouvir{" "}
                      <span className="num text-tinta-2">
                        {formatarCronometro(c.duracaoSeg ?? 0)}
                      </span>
                    </button>
                  ) : (
                    <p className="font-livro text-livro-20 text-tinta">
                      “{c.texto}”
                    </p>
                  )}
                  <a
                    href="#"
                    className="min-h-alvo text-ui-17 text-floresta inline-flex items-center self-start font-medium underline-offset-4 hover:underline"
                  >
                    Virar pergunta
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section
            aria-labelledby="enviadas"
            className="rounded-cartao bg-papel flex flex-col gap-4 p-6"
          >
            <h2 id="enviadas" className="font-livro text-livro-24 text-tinta">
              Esperando o {livro.autor.nome}
            </h2>
            <ul className="flex flex-col">
              {enviadas.map((p) => (
                <li key={p.id} className="flex flex-col gap-1 py-4 first:pt-0">
                  <p className="font-livro text-livro-20 text-tinta">
                    {p.texto}
                  </p>
                  <p className="text-ui-15 text-tinta-2">
                    Enviada há <span className="num">{p.enviadaHaDias}</span>{" "}
                    {p.enviadaHaDias === 1 ? "dia" : "dias"}
                  </p>
                  {(p.enviadaHaDias ?? 0) >= LEMBRETE_APOS_DIAS ? (
                    <a
                      href="#"
                      className="min-h-alvo text-ui-17 text-floresta inline-flex items-center self-start font-medium underline-offset-4 hover:underline"
                    >
                      Lembrar com carinho
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
            <p className="text-ui-15 text-tinta-2">
              Mais <span className="num">{paraEnviar.length - 1}</span>{" "}
              perguntas prontas para enviar.
            </p>
          </section>
        </aside>
      </main>
    </div>
  );
}
