"use client";

// Configuração inicial em 3 passos. Todo passo tem a ação principal, Pular e Depois.
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, CampoTexto } from "@/components/ui/campo";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { Seletor } from "@/components/ui/seletor";
import { UploadFotos } from "@/components/fotos/upload-fotos";
import { EscolherDoBanco } from "@/components/perguntas/escolher-do-banco";
import { TEXTO_PERGUNTA_MAX } from "@/lib/config";
import { proximoPasso, PASSOS, type Passo } from "@/lib/livro/configuracao";
import type {
  AcoesConfiguracao,
  AcoesFotos,
  LivroDaTela,
} from "@/lib/livro/tipos";
import { iniciaisDo, perguntaPorId } from "@/lib/perguntas/banco";
import type { Parentesco, PromptTipo } from "@/lib/supabase/tipos";

const PARENTESCOS: { valor: Parentesco; rotulo: string }[] = [
  { valor: "pai", rotulo: "Pai" },
  { valor: "mae", rotulo: "Mãe" },
  { valor: "avo", rotulo: "Avô" },
  { valor: "avoa", rotulo: "Avó" },
  { valor: "tio", rotulo: "Tio" },
  { valor: "tia", rotulo: "Tia" },
  { valor: "outro", rotulo: "Outro" },
];

type Props = {
  livro: LivroDaTela;
  acoes: AcoesConfiguracao;
  fotos: AcoesFotos;
};

function useNavegar(livro: LivroDaTela) {
  const router = useRouter();
  return {
    depoisDe(passo: Passo) {
      const p = proximoPasso(passo);
      router.push(
        p ? `/livro/${livro.id}/configurar/${p}` : `/livro/${livro.id}/kit`,
      );
    },
    home: () => router.push(`/livro/${livro.id}`),
  };
}

function Moldura({
  passo,
  titulo,
  children,
  principal,
  livro,
  acoes,
  erro,
}: {
  passo: Passo;
  titulo: string;
  children: ReactNode;
  principal: ReactNode;
  livro: LivroDaTela;
  acoes: AcoesConfiguracao;
  erro: string | null;
}) {
  const nav = useNavegar(livro);
  const [pendente, iniciar] = useTransition();
  const [erroDoRodape, setErroDoRodape] = useState<string | null>(null);
  const indice = PASSOS.indexOf(passo) + 1;

  function marcar(estado: "pulado" | "depois") {
    iniciar(async () => {
      const r = await acoes.marcarPasso(passo, estado);
      if (!r.ok) return setErroDoRodape(r.mensagem);
      if (estado === "pulado") nav.depoisDe(passo);
      else nav.home();
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-10">
      <p className="text-ui-15 text-tinta-2">
        Passo {indice} de {PASSOS.length}
      </p>
      <h1 className="font-livro text-livro-36 text-tinta leading-tight">
        {titulo}
      </h1>
      <div className="flex flex-1 flex-col gap-6">{children}</div>
      <div className="bg-polen sticky bottom-0 -mx-5 flex flex-col gap-2 px-5 pt-3 pb-4">
        {erro || erroDoRodape ? (
          <p role="alert" className="text-ui-15 text-erro">
            {erro ?? erroDoRodape}
          </p>
        ) : null}
        {principal}
        <div className="flex justify-between gap-4">
          <Botao
            variante="texto"
            disabled={pendente}
            onClick={() => marcar("pulado")}
          >
            Pular
          </Botao>
          <Botao
            variante="texto"
            disabled={pendente}
            onClick={() => marcar("depois")}
          >
            Depois
          </Botao>
        </div>
      </div>
    </main>
  );
}

export function ConfigurarQuem({ livro, acoes, fotos }: Props) {
  const nav = useNavegar(livro);
  const [nome, setNome] = useState(livro.autorNome ?? "");
  const [apelido, setApelido] = useState(livro.autorApelido ?? "");
  const [parentesco, setParentesco] = useState<Parentesco | "">(
    livro.parentesco ?? "",
  );
  const [comFoto, setComFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function continuar() {
    iniciar(async () => {
      const r = await acoes.salvarQuem({
        nome,
        apelido,
        parentesco: parentesco || null,
      });
      if (!r.ok) return setErro(r.mensagem);
      nav.depoisDe("quem");
    });
  }

  return (
    <Moldura
      passo="quem"
      titulo="Quem vai contar as histórias?"
      livro={livro}
      acoes={acoes}
      erro={erro}
      principal={
        <Botao
          larguraTotal
          carregando={pendente}
          disabled={!nome.trim()}
          onClick={continuar}
        >
          Continuar
        </Botao>
      }
    >
      <Campo
        rotulo="Nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        autoComplete="off"
        required
        autoFocus={!nome}
      />
      <Campo
        rotulo="Como a família chama (opcional)"
        value={apelido}
        onChange={(e) => setApelido(e.target.value)}
        placeholder="Vô Jair"
        autoComplete="off"
      />
      <Seletor
        rotulo="Parentesco (opcional)"
        vazio="Escolher"
        opcoes={PARENTESCOS}
        value={parentesco}
        onChange={(e) => setParentesco(e.target.value as Parentesco | "")}
      />
      {comFoto ? (
        <UploadFotos acoes={fotos} doAutor rotulo="Escolher a foto" />
      ) : livro.fotoAutorUrl ? null : (
        <Botao
          variante="texto"
          className="self-start"
          onClick={() => setComFoto(true)}
        >
          Pôr uma foto
        </Botao>
      )}
    </Moldura>
  );
}

type Propria = { tipo: PromptTipo; texto: string };

export function ConfigurarPerguntas({ livro, acoes }: Props) {
  const nav = useNavegar(livro);
  const [marcadas, setMarcadas] = useState(() =>
    iniciaisDo(livro.parentesco).map((p) => p.id),
  );
  const [proprias, setProprias] = useState<Propria[]>([]);
  const [folha, setFolha] = useState<"trocar" | "escrever" | null>(null);
  const [rascunho, setRascunho] = useState<Propria>({
    tipo: "pergunta",
    texto: "",
  });
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const total = marcadas.length + proprias.length;

  function salvar() {
    iniciar(async () => {
      const r = await acoes.salvarPerguntas({ bancoIds: marcadas, proprias });
      if (!r.ok) return setErro(r.mensagem);
      nav.depoisDe("perguntas");
    });
  }

  const visiveis = [
    ...new Set([...iniciaisDo(livro.parentesco).map((p) => p.id), ...marcadas]),
  ];

  return (
    <Moldura
      passo="perguntas"
      titulo={`O que perguntar ao ${livro.autor}?`}
      livro={livro}
      acoes={acoes}
      erro={erro}
      principal={
        <Botao
          larguraTotal
          carregando={pendente}
          disabled={total === 0}
          onClick={salvar}
        >
          {total === 1 ? "Salvar 1 pergunta" : `Salvar ${total} perguntas`}
        </Botao>
      }
    >
      <ul className="flex flex-col gap-2">
        {visiveis.map((id) => {
          const p = perguntaPorId(id);
          if (!p) return null;
          const marcada = marcadas.includes(id);
          return (
            <li key={id}>
              <label
                className={
                  "rounded-interno min-h-alvo flex cursor-pointer items-start gap-3 border px-4 py-3 " +
                  (marcada
                    ? "border-floresta bg-floresta-claro"
                    : "border-linha bg-papel")
                }
              >
                <input
                  type="checkbox"
                  checked={marcada}
                  onChange={() =>
                    setMarcadas((m) =>
                      marcada ? m.filter((x) => x !== id) : [...m, id],
                    )
                  }
                  className="accent-floresta mt-1 size-5 shrink-0"
                />
                <span className="font-livro text-livro-20 text-tinta">
                  {p.texto}
                </span>
              </label>
            </li>
          );
        })}
        {proprias.map((p, i) => (
          <li
            key={`p${i}`}
            className="rounded-interno border-floresta bg-floresta-claro flex items-start gap-3 border px-4 py-3"
          >
            <span className="font-livro text-livro-20 text-tinta flex-1">
              {p.texto}
              <span className="text-ui-13 text-tinta-2 ml-2 font-sans">
                {p.tipo === "causo" ? "Causo" : "Sua"}
              </span>
            </span>
            <button
              type="button"
              aria-label="Tirar"
              onClick={() => setProprias((l) => l.filter((_, k) => k !== i))}
              className="text-ui-15 text-tinta-2 hover:text-tinta min-h-11 px-2"
            >
              Tirar
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Botao variante="secundario" onClick={() => setFolha("trocar")}>
          Trocar
        </Botao>
        <Botao variante="secundario" onClick={() => setFolha("escrever")}>
          Escrever a minha
        </Botao>
      </div>

      <FolhaInferior
        aberta={folha === "trocar"}
        aoFechar={() => setFolha(null)}
        titulo="Banco de perguntas"
      >
        <EscolherDoBanco marcadas={marcadas} aoMudar={setMarcadas} />
        <Botao larguraTotal onClick={() => setFolha(null)}>
          Pronto
        </Botao>
      </FolhaInferior>

      <FolhaInferior
        aberta={folha === "escrever"}
        aoFechar={() => setFolha(null)}
        titulo="Escrever a minha"
      >
        <EscreverPergunta
          valor={rascunho}
          aoMudar={setRascunho}
          aoSalvar={() => {
            setProprias((l) => [
              ...l,
              { ...rascunho, texto: rascunho.texto.trim() },
            ]);
            setRascunho({ tipo: "pergunta", texto: "" });
            setFolha(null);
          }}
        />
      </FolhaInferior>
    </Moldura>
  );
}

export function EscreverPergunta({
  valor,
  aoMudar,
  aoSalvar,
  carregando,
  rotuloSalvar = "Pôr na lista",
}: {
  valor: Propria;
  aoMudar: (v: Propria) => void;
  aoSalvar: () => void;
  carregando?: boolean;
  rotuloSalvar?: string;
}) {
  const curto = valor.texto.trim().length < 3;
  return (
    <div className="flex flex-col gap-5">
      <div role="radiogroup" aria-label="Tipo" className="flex gap-2">
        {(["pergunta", "causo"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={valor.tipo === t}
            onClick={() => aoMudar({ ...valor, tipo: t })}
            className={
              "min-h-alvo rounded-controle text-ui-17 border px-5 " +
              (valor.tipo === t
                ? "border-tinta bg-tinta text-papel"
                : "border-linha-forte text-tinta")
            }
          >
            {t === "pergunta" ? "Pergunta" : "Causo"}
          </button>
        ))}
      </div>
      <CampoTexto
        rotulo={
          valor.tipo === "pergunta"
            ? "A pergunta"
            : "O causo que ele deve contar"
        }
        placeholder={
          valor.tipo === "pergunta"
            ? "Como era a casa da roça?"
            : "Conta da vez em Guarapari que você dormiu demais"
        }
        value={valor.texto}
        maxLength={TEXTO_PERGUNTA_MAX}
        onChange={(e) => aoMudar({ ...valor, texto: e.target.value })}
        dica={`${valor.texto.length} de ${TEXTO_PERGUNTA_MAX}`}
      />
      <Botao
        larguraTotal
        disabled={curto}
        carregando={carregando}
        onClick={aoSalvar}
      >
        {rotuloSalvar}
      </Botao>
    </div>
  );
}

export function ConfigurarFotos({ livro, acoes, fotos }: Props) {
  const nav = useNavegar(livro);
  const [subiu, setSubiu] = useState(0);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function continuar() {
    iniciar(async () => {
      const r = await acoes.marcarPasso("fotos", subiu ? "feito" : "pulado");
      if (!r.ok) return setErro(r.mensagem);
      nav.depoisDe("fotos");
    });
  }

  return (
    <Moldura
      passo="fotos"
      titulo="Fotos do acervo"
      livro={livro}
      acoes={acoes}
      erro={erro}
      principal={
        subiu ? (
          <Botao larguraTotal carregando={pendente} onClick={continuar}>
            Continuar
          </Botao>
        ) : null
      }
    >
      <p className="text-ui-17 text-tinta-2">
        Escolha várias de uma vez. Elas viram perguntas com foto.
      </p>
      <UploadFotos
        acoes={fotos}
        aoTerminar={(ids) => setSubiu((n) => n + ids.length)}
      />
    </Moldura>
  );
}
