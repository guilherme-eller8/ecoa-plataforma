import type { Metadata } from "next";
import { Botao } from "@/components/ui/botao";
import { IconeLivro, IconePerguntas, IconeTocar } from "@/components/ui/icones";
import { MarcaEcoa } from "@/components/ui/marca";
import {
  historias,
  livro,
  perguntas,
  proximaPergunta,
} from "@/lib/exemplos/livro-jair";
import { DemoGravador } from "../_demos/demo-gravador";

export const metadata: Metadata = { title: "Olá, Jair · exemplo" };

// Tela de exemplo, com dados falsos e sem lógica: a área do autor.
// Pergunta da tela: "o que eu conto agora?"
// Regras do PRD para o autor: pergunta >= 28px, texto 20px, alvos >= 56px,
// botão de gravar >= 120px. Nada de mensagens da família aqui, em nenhuma forma.
//
// Grade: coluna de até 1100px, 12 colunas (7 + 5) no computador; uma coluna no celular,
// com navegação de 3 destinos presa na base.

const outrasPerguntas = perguntas
  .filter((p) => p.id !== proximaPergunta.id && p.estado === "para_enviar")
  .slice(0, 3);
const minhasHistorias = historias
  .filter((h) => h.estado === "pronta" || h.estado === "revisar")
  .slice(0, 3);

const destinos = [
  { rotulo: "Perguntas", icone: <IconePerguntas tamanho={24} />, atual: true },
  { rotulo: "Histórias", icone: <IconeTocar tamanho={24} />, atual: false },
  { rotulo: "Meu livro", icone: <IconeLivro tamanho={24} />, atual: false },
];

export default function AreaDoAutor() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-[1132px] items-center justify-between px-4">
        <MarcaEcoa />
        <nav
          aria-label="Principal"
          className="hidden items-center gap-1 md:flex"
        >
          {destinos.map((d) => (
            <a
              key={d.rotulo}
              href="#"
              aria-current={d.atual ? "page" : undefined}
              className={
                "min-h-alvo-autor rounded-controle text-ui-20 inline-flex items-center px-5 " +
                (d.atual
                  ? "text-tinta font-medium"
                  : "text-tinta-2 hover:bg-polen-2 hover:text-tinta")
              }
            >
              {d.rotulo}
            </a>
          ))}
        </nav>
      </header>

      <nav
        aria-label="Principal"
        className="grid grid-cols-3 gap-2 px-4 md:hidden"
      >
        {destinos.map((d) => (
          <a
            key={d.rotulo}
            href="#"
            aria-current={d.atual ? "page" : undefined}
            className={
              "rounded-interno text-ui-15 flex min-h-[72px] flex-col items-center justify-center gap-1 text-center leading-tight " +
              (d.atual
                ? "bg-tinta text-papel font-medium"
                : "bg-papel text-tinta")
            }
          >
            {d.icone}
            {d.rotulo}
          </a>
        ))}
      </nav>

      <main className="mx-auto grid w-full max-w-[1132px] grid-cols-1 gap-4 px-4 pt-8 pb-16 md:pt-12 lg:grid-cols-12 lg:items-start">
        <h1 className="font-livro text-livro-36 text-tinta md:text-livro-44 lg:col-span-12 lg:pb-6">
          Olá, {livro.autor.nome}
        </h1>

        <section
          aria-labelledby="pergunta"
          className="rounded-cartao bg-papel flex flex-col items-center gap-8 px-5 py-8 md:px-10 md:py-12 lg:col-span-7"
        >
          <div className="flex w-full flex-col gap-4">
            {proximaPergunta.pedidaPor ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-ui-20 text-tinta-2">
                  O {proximaPergunta.pedidaPor} pediu:
                </p>
                <button
                  type="button"
                  className="min-h-alvo-autor rounded-controle bg-polen text-ui-20 text-tinta hover:bg-polen-2 inline-flex items-center gap-2 px-5"
                >
                  <IconeTocar tamanho={22} />
                  Ouvir o {proximaPergunta.pedidaPor}
                </button>
              </div>
            ) : null}
            <h2
              id="pergunta"
              className="font-livro text-livro-28 text-tinta md:text-livro-36"
            >
              {proximaPergunta.texto}
            </h2>
          </div>

          <DemoGravador />
        </section>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <section
            aria-labelledby="livre"
            className="rounded-cartao bg-papel flex flex-col items-start gap-4 px-5 py-6 md:px-8"
          >
            <h2 id="livre" className="font-livro text-livro-28 text-tinta">
              Quer contar outra coisa?
            </h2>
            <Botao variante="secundario" tamanho="autor">
              Contar uma história
            </Botao>
          </section>

          <section
            aria-labelledby="outras"
            className="rounded-cartao bg-papel flex flex-col gap-2 px-5 py-6 md:px-8"
          >
            <h2 id="outras" className="font-livro text-livro-28 text-tinta">
              Outras perguntas
            </h2>
            <ul className="flex flex-col">
              {outrasPerguntas.map((p) => (
                <li
                  key={p.id}
                  className="py-1"
                >
                  <a
                    href="#"
                    className="min-h-alvo-autor font-livro text-livro-20 text-tinta hover:text-floresta flex items-center py-3"
                  >
                    {p.texto}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section
          aria-labelledby="minhas"
          className="flex flex-col gap-4 pt-8 lg:col-span-12"
        >
          <h2 id="minhas" className="font-livro text-livro-28 text-tinta">
            Minhas histórias
          </h2>
          <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {minhasHistorias.map((h) => (
              <li
                key={h.id}
                className="rounded-cartao bg-papel flex flex-col gap-3 p-5 md:p-6"
              >
                <h3 className="font-livro text-livro-24 text-tinta">
                  {h.titulo}
                </h3>
                <p className="font-livro text-livro-20 text-tinta line-clamp-3">
                  {h.trecho}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    className="min-h-alvo-autor rounded-controle bg-polen text-ui-20 text-tinta hover:bg-polen-2 inline-flex items-center gap-2 px-5"
                  >
                    <IconeTocar tamanho={22} />
                    Ouvir
                  </button>
                  <a
                    href="#"
                    className="min-h-alvo-autor text-ui-20 text-floresta inline-flex items-center px-3 font-medium underline-offset-4 hover:underline"
                  >
                    Ler e corrigir
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
