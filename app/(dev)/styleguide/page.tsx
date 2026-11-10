import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { AvisoSalvo } from "@/components/ui/aviso-salvo";
import { Botao } from "@/components/ui/botao";
import { Campo, CampoTexto } from "@/components/ui/campo";
import { CartaoHistoria } from "@/components/ui/cartao-historia";
import { ControleTamanho } from "@/components/ui/controle-tamanho";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { Gravador } from "@/components/ui/gravador";
import { IconeMicrofone, IconeSubir } from "@/components/ui/icones";
import { MarcaEcoa } from "@/components/ui/marca";
import { Seletor } from "@/components/ui/seletor";
import { Abas } from "@/components/ui/abas";
import { DemoAvisoSalvo } from "./_demos/demo-aviso-salvo";
import { DemoCartaoAoVivo } from "./_demos/demo-cartao-ao-vivo";
import { DemoFolha } from "./_demos/demo-folha";
import { DemoGravador } from "./_demos/demo-gravador";

export const metadata: Metadata = { title: "Styleguide · Ecoa" };

// Todos os tokens e componentes, em todos os estados. Só em desenvolvimento.

const cores = [
  {
    nome: "pólen",
    token: "--polen",
    hex: "#f5efe4",
    papel: "o chão de toda tela",
  },
  {
    nome: "papel",
    token: "--papel",
    hex: "#fffdf8",
    papel: "painéis e cartões",
  },
  {
    nome: "tinta",
    token: "--tinta",
    hex: "#26211d",
    papel: "todo texto corrido",
  },
  {
    nome: "tinta 2",
    token: "--tinta-2",
    hex: "#6e6259",
    papel: "notas secundárias",
  },
  {
    nome: "floresta",
    token: "--floresta",
    hex: "#1f3d33",
    papel: "ação principal e dado principal",
  },
  {
    nome: "pólen 2",
    token: "--polen-2",
    hex: "#ece4d5",
    papel: "degrau tonal, trilho",
  },
  {
    nome: "floresta clara",
    token: "--floresta-claro",
    hex: "#e3ebe5",
    papel: "seleção, selo",
  },
  {
    nome: "gravando",
    token: "--gravando",
    hex: "#b3261e",
    papel: "só o ponto de gravação",
  },
];

const parentescos = ["Pai", "Mãe", "Avô", "Avó", "Tio", "Tia", "Outro"].map(
  (p) => ({
    valor: p.toLowerCase(),
    rotulo: p,
  }),
);

const secoes = [
  ["cores", "Cores"],
  ["tipografia", "Tipografia"],
  ["espaco", "Espaço e raios"],
  ["botoes", "Botões"],
  ["campos", "Campos"],
  ["abas", "Abas"],
  ["folha", "Folha inferior"],
  ["salvo", "Salvo"],
  ["vazio", "Estado vazio"],
  ["cartao", "Cartão de história"],
  ["gravador", "Gravador"],
  ["tamanho", "Tamanho do texto"],
] as const;

function Secao({
  id,
  titulo,
  children,
}: {
  id: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`t-${id}`}
      className="flex scroll-mt-8 flex-col gap-6 pt-16"
    >
      <h2 id={`t-${id}`} className="font-livro text-livro-28 text-tinta">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Amostra({
  rotulo,
  children,
  className = "",
}: {
  rotulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-cartao bg-papel flex flex-col gap-3 p-5 ${className}`}
    >
      <p className="text-ui-13 text-tinta-2">{rotulo}</p>
      {children}
    </div>
  );
}

export default function Styleguide() {
  return (
    <div className="mx-auto flex w-full max-w-[1132px] flex-col gap-12 px-4 py-8 md:py-12">
      <header className="flex flex-col gap-6">
        <MarcaEcoa />
        <div className="flex flex-col gap-2">
          <h1 className="font-livro text-livro-36 text-tinta md:text-livro-44">
            Design system
          </h1>
          <p className="text-ui-17 text-tinta-2 max-w-[60ch]">
            Calmo, espaçoso, a história no centro. Uma ação principal por tela.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/styleguide/responsavel"
            className="min-h-alvo rounded-controle bg-floresta text-ui-17 text-papel hover:bg-floresta-escuro inline-flex items-center px-6 font-medium"
          >
            Home do responsável
          </Link>
          <Link
            href="/styleguide/autor"
            className="min-h-alvo rounded-controle border-linha-forte bg-papel text-ui-17 text-tinta hover:bg-polen-2 inline-flex items-center border px-6 font-medium"
          >
            Área do autor
          </Link>
        </div>
        <nav aria-label="Seções" className="flex flex-wrap gap-x-5 gap-y-1">
          {secoes.map(([id, nome]) => (
            <a
              key={id}
              href={`#${id}`}
              className="min-h-alvo text-ui-15 text-tinta-2 hover:text-tinta inline-flex items-center underline-offset-4 hover:underline"
            >
              {nome}
            </a>
          ))}
        </nav>
      </header>

      <Secao id="cores" titulo="Cores">
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cores.map((c) => (
            <li
              key={c.token}
              className="rounded-cartao bg-papel flex flex-col gap-3 p-4"
            >
              <span
                className="rounded-interno border-linha h-16 border"
                style={{ background: `var(${c.token})` }}
              />
              <span className="flex flex-col">
                <span className="text-ui-15 text-tinta font-medium">
                  {c.nome}
                </span>
                <span className="text-ui-13 text-tinta-2">{c.papel}</span>
                <span className="num text-ui-13 text-tinta-2">{c.hex}</span>
              </span>
            </li>
          ))}
        </ul>
      </Secao>

      <Secao id="tipografia" titulo="Tipografia">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Amostra rotulo="Livro, Newsreader: o que vai para o papel">
            <p className="font-livro text-livro-44">Olá, Jair</p>
            <p className="font-livro text-livro-36">O livro tem 27 páginas</p>
            <p className="font-livro text-livro-28">
              Como era a casa onde o senhor cresceu?
            </p>
            <p className="font-livro text-livro-24">Quando conheci a Lurdes</p>
            <p className="font-livro text-livro-20">
              Foi num baile no clube da estação, em 1964. Ela estava de vestido
              azul e não quis dançar comigo na primeira vez.
            </p>
          </Amostra>
          <Amostra rotulo="Interface, fonte do sistema: botões, rótulos, campos">
            <p className="text-ui-24">Título de seção 24</p>
            <p className="text-ui-20">Texto do autor na interface 20</p>
            <p className="text-ui-17">Corpo e botões 17</p>
            <p className="text-ui-15 text-tinta-2">Rótulos e notas 15</p>
            <p className="text-ui-13 text-tinta-2">
              Legendas 13, o menor tamanho
            </p>
          </Amostra>
        </div>
      </Secao>

      <Secao id="espaco" titulo="Espaço e raios">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Amostra rotulo="Espaçamento, base 4">
            <ul className="flex flex-col gap-2">
              {[1, 2, 3, 4, 6, 8, 12, 16].map((n) => (
                <li
                  key={n}
                  className="text-ui-13 text-tinta-2 flex items-center gap-3"
                >
                  <span className="num w-20 shrink-0 whitespace-nowrap">
                    --esp-{n}
                  </span>
                  <span
                    className="rounded-chip bg-floresta h-3"
                    style={{ width: `var(--esp-${n})` }}
                  />
                </li>
              ))}
            </ul>
          </Amostra>
          <Amostra rotulo="Raios: cartão 20, interno 12, chip 8, controle em pílula">
            <div className="flex flex-wrap items-end gap-4">
              <span className="rounded-cartao bg-polen-2 size-20" />
              <span className="rounded-interno bg-polen-2 size-16" />
              <span className="rounded-chip bg-polen-2 size-12" />
              <span className="rounded-controle bg-polen-2 h-12 w-28" />
            </div>
            <p className="text-ui-13 text-tinta-2">
              Sombra só no que flutua: a folha inferior.
            </p>
          </Amostra>
        </div>
      </Secao>

      <Secao id="botoes" titulo="Botões">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Amostra rotulo="Padrão, 48px">
            <div className="flex flex-wrap items-center gap-3">
              <Botao icone={<IconeMicrofone />}>Gravar agora</Botao>
              <Botao variante="secundario">Enviar ao Jair</Botao>
              <Botao variante="texto" icone={<IconeSubir />}>
                Subir áudio
              </Botao>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Botao carregando>Salvando</Botao>
              <Botao disabled>Publicar</Botao>
              <Botao variante="secundario" disabled>
                Desabilitado
              </Botao>
            </div>
          </Amostra>
          <Amostra rotulo="Autor, 56px">
            <div className="flex flex-wrap items-center gap-3">
              <Botao tamanho="autor">Enviar</Botao>
              <Botao tamanho="autor" variante="secundario">
                Contar uma história
              </Botao>
              <Botao tamanho="autor" variante="texto">
                Agora não
              </Botao>
            </div>
          </Amostra>
        </div>
      </Secao>

      <Secao id="campos" titulo="Campos">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Amostra rotulo="Campo">
            <Campo rotulo="Nome" defaultValue="Jair" />
            <Campo
              rotulo="Apelido"
              placeholder="Como a família chama"
              dica="Opcional"
            />
            <Campo
              rotulo="E-mail"
              defaultValue="ana@"
              erro="Falta o resto do e-mail."
            />
            <Campo rotulo="Link do autor" defaultValue="Revogado" disabled />
          </Amostra>
          <Amostra rotulo="Seletor e texto longo">
            <Seletor rotulo="Parentesco" opcoes={parentescos} vazio="Escolha" />
            <Seletor
              rotulo="Parentesco"
              opcoes={parentescos}
              defaultValue="avo"
              erro="Escolha um parentesco."
            />
            <CampoTexto
              rotulo="Me conte sobre ele"
              placeholder="Onde nasceu, com quem casou, o que gosta de contar…"
            />
          </Amostra>
        </div>
      </Secao>

      <Secao id="abas" titulo="Abas">
        <Amostra rotulo="Setas do teclado mudam de aba">
          <Abas
            rotulo="Perguntas"
            abas={[
              {
                id: "enviar",
                rotulo: "Para enviar",
                contagem: 3,
                conteudo: (
                  <p className="text-ui-17">3 perguntas prontas para enviar.</p>
                ),
              },
              {
                id: "enviadas",
                rotulo: "Enviadas",
                contagem: 2,
                conteudo: (
                  <p className="text-ui-17">2 perguntas esperando o Jair.</p>
                ),
              },
              {
                id: "respondidas",
                rotulo: "Respondidas",
                contagem: 7,
                conteudo: <p className="text-ui-17">7 respondidas.</p>,
              },
              {
                id: "causos",
                rotulo: "Causos",
                contagem: 0,
                conteudo: (
                  <EstadoVazio
                    frase="Nenhum causo ainda."
                    acao={
                      <Botao variante="secundario">
                        Copiar o link do grupo
                      </Botao>
                    }
                  />
                ),
              },
            ]}
          />
        </Amostra>
      </Secao>

      <Secao id="folha" titulo="Folha inferior">
        <Amostra rotulo="No celular sobe da base; no computador, janela no centro">
          <div>
            <DemoFolha pergunta="Como era a casa onde o senhor cresceu?" />
          </div>
        </Amostra>
      </Secao>

      <Secao id="salvo" titulo="Salvo">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Amostra rotulo="Estados">
            <AvisoSalvo estado="salvando" />
            <AvisoSalvo estado="salvo" />
            <AvisoSalvo estado="erro" />
          </Amostra>
          <Amostra rotulo="Ao vivo">
            <DemoAvisoSalvo />
          </Amostra>
        </div>
      </Secao>

      <Secao id="vazio" titulo="Estado vazio">
        <EstadoVazio
          frase="Nenhuma história ainda. A primeira pode ser hoje."
          acao={<Botao icone={<IconeMicrofone />}>Gravar a primeira</Botao>}
        />
      </Secao>

      <Secao id="cartao" titulo="Cartão de história">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DemoCartaoAoVivo />
          <div className="flex flex-col gap-4">
            <CartaoHistoria
              titulo="O caminhão do meu pai"
              estado="ouvindo"
              origem="Gravado com a Ana"
              duracaoSeg={400}
              destaque
            />
            <CartaoHistoria
              titulo="O sítio em Bom Despacho"
              estado="revisar"
              origem="História livre"
              duracaoSeg={655}
              trecho="O sítio do meu avô ficava depois da ponte de madeira. A gente ia de charrete, e a viagem durava a manhã inteira."
              selo="Corrigida pelo Jair"
              acao={<Botao variante="secundario">Revisar</Botao>}
            />
            <CartaoHistoria
              titulo="Quando conheci a Lurdes"
              estado="pronta"
              origem="Pergunta do banco"
              duracaoSeg={1130}
              paginas={7}
              trecho="Foi num baile no clube da estação, em 1964. Ela estava de vestido azul e não quis dançar comigo na primeira vez."
            />
          </div>
        </div>
      </Secao>

      <Secao id="gravador" titulo="Gravador">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Amostra rotulo="Pronto" className="items-center">
            <Gravador estado="pronto" segundos={0} />
          </Amostra>
          <Amostra rotulo="Gravando" className="items-center">
            <Gravador estado="gravando" segundos={75} />
          </Amostra>
          <Amostra rotulo="Pausado" className="items-center">
            <Gravador estado="pausado" segundos={312} />
          </Amostra>
          <Amostra rotulo="Experimente" className="items-center">
            <DemoGravador />
          </Amostra>
        </div>
      </Secao>

      <Secao id="tamanho" titulo="Tamanho do texto">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Amostra rotulo="Sem parágrafos travados">
            <ControleTamanho />
          </Amostra>
          <Amostra rotulo="Com 2 parágrafos editados à mão">
            <ControleTamanho inicial={4} travados={2} />
          </Amostra>
          <Amostra rotulo="Desabilitado (passe em somente leitura)">
            <ControleTamanho inicial={2} desabilitado />
          </Amostra>
        </div>
      </Secao>
    </div>
  );
}
