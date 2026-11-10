"use client";

// Link da família, fixado no grupo de WhatsApp: votar na enquete aberta e sugerir um causo.
// Sem login. O nome fica lembrado no aparelho.
import { useState, useSyncExternalStore, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, CampoTexto } from "@/components/ui/campo";
import { IconeCheck } from "@/components/ui/icones";
import { MarcaEcoa } from "@/components/ui/marca";
import {
  GravadorCauso,
  type AudioGravado,
} from "@/components/familia/gravador-causo";
import { agruparPorFase } from "@/lib/enquete/fases";
import type { AcoesFamilia, PaginaDaFamilia } from "@/lib/familia/tipos";
import { clienteNavegador } from "@/lib/supabase/navegador";

const CHAVE_NOME = "ecoa_nome";

function lerNome() {
  try {
    return window.localStorage.getItem(CHAVE_NOME) ?? "";
  } catch {
    return "";
  }
}
const semAssinatura = () => () => {};
function guardarNome(nome: string) {
  try {
    window.localStorage.setItem(CHAVE_NOME, nome);
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

export function TelaFamiliaInvalida() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pt-10">
      <MarcaEcoa />
      <h1 className="font-livro text-livro-28 text-tinta leading-tight">
        Este link não vale mais.
      </h1>
      <p className="text-ui-17 text-tinta-2">
        Peça o novo no grupo da família.
      </p>
    </main>
  );
}

export function TelaFamilia({
  pagina,
  acoes,
  inicial = "inicio",
}: {
  pagina: PaginaDaFamilia;
  acoes: AcoesFamilia;
  inicial?: "inicio" | "causo";
}) {
  // O nome lembrado só existe no aparelho: no servidor é "", e o que a pessoa digita vence.
  const salvo = useSyncExternalStore(semAssinatura, lerNome, () => "");
  const [digitado, setNome] = useState<string | null>(null);
  const nome = digitado ?? salvo;
  const [vista, setVista] = useState<"inicio" | "causo" | "obrigado">(inicial);
  const autor = pagina.autor ?? "autor";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-5 pt-8 pb-12">
      <MarcaEcoa />
      <h1 className="font-livro text-livro-28 text-tinta leading-tight">
        Livro do {autor}
      </h1>

      {!pagina.aberto ? (
        <p className="text-ui-17 text-tinta-2">
          Este livro não está recebendo sugestões agora.
        </p>
      ) : vista === "obrigado" ? (
        <section className="flex flex-col gap-5">
          <p className="font-livro text-livro-24 text-tinta">
            Obrigado! Sua sugestão chegou.
          </p>
          <Botao
            variante="secundario"
            className="self-start"
            onClick={() => setVista("inicio")}
          >
            Voltar
          </Botao>
        </section>
      ) : vista === "causo" ? (
        <SugerirCauso
          autor={autor}
          nome={nome}
          aoMudarNome={setNome}
          acoes={acoes}
          aoEnviar={() => setVista("obrigado")}
          aoCancelar={() => setVista("inicio")}
        />
      ) : (
        <>
          {pagina.enquete ? (
            <Votar
              pagina={pagina}
              autor={autor}
              nome={nome}
              aoMudarNome={setNome}
              acoes={acoes}
            />
          ) : null}
          <Botao
            variante={pagina.enquete ? "secundario" : "principal"}
            larguraTotal
            onClick={() => setVista("causo")}
          >
            Sugerir pergunta ou causo
          </Botao>
        </>
      )}
    </main>
  );
}

// Votar em etapas (P35): uma fase da vida por tela, até 2 em cada, e a revisão antes de votar.
function Votar({
  pagina,
  autor,
  nome,
  aoMudarNome,
  acoes,
}: {
  pagina: PaginaDaFamilia;
  autor: string;
  nome: string;
  aoMudarNome: (n: string) => void;
  acoes: AcoesFamilia;
}) {
  const enquete = pagina.enquete!;
  const porFase = pagina.votos_por_fase;
  const etapas = agruparPorFase(enquete.itens, (i) => i.fase);
  const [marcados, setMarcados] = useState<string[]>(enquete.meus_votos);
  const [votou, setVotou] = useState(enquete.meus_votos.length > 0);
  const [vista, setVista] = useState<number | "revisar">(0);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  if (votou)
    return (
      <section className="rounded-cartao bg-papel border-linha flex flex-col gap-4 border p-5">
        <p className="text-ui-20 text-tinta inline-flex items-center gap-2 font-medium">
          <IconeCheck tamanho={22} /> Seu voto foi registrado
        </p>
        <Botao
          variante="texto"
          className="self-start"
          onClick={() => {
            setVotou(false);
            setVista("revisar");
          }}
        >
          Mudar meu voto
        </Botao>
      </section>
    );

  function votar() {
    iniciar(async () => {
      guardarNome(nome.trim());
      const r = await acoes.votar(nome.trim(), marcados);
      if (!r.ok) return setErro(r.mensagem);
      setErro(null);
      setVotou(true);
    });
  }

  if (vista === "revisar") {
    const escolhidos = etapas
      .map((g, i) => ({
        ...g,
        indice: i,
        itens: g.itens.filter((x) => marcados.includes(x.id)),
      }))
      .filter((g) => g.itens.length);
    return (
      <section className="flex flex-col gap-5" aria-labelledby="titulo-enquete">
        <div className="flex flex-col gap-1">
          <h2 id="titulo-enquete" className="text-ui-24 text-tinta font-medium">
            Revisar seu voto
          </h2>
          <p className="text-ui-15 text-tinta-2">
            {marcados.length === 1
              ? "1 história escolhida"
              : `${marcados.length} histórias escolhidas`}
          </p>
        </div>
        {escolhidos.length ? (
          <ul className="flex flex-col gap-3">
            {escolhidos.map((g) => (
              <li
                key={g.categoria.id}
                className="rounded-cartao bg-papel border-linha flex flex-col gap-2 border p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-ui-17 text-tinta font-medium">
                    {g.categoria.nome}
                  </p>
                  <Botao variante="texto" onClick={() => setVista(g.indice)}>
                    Mudar
                  </Botao>
                </div>
                {g.itens.map((x) => (
                  <p key={x.id} className="font-livro text-livro-20 text-tinta">
                    {x.texto}
                  </p>
                ))}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-ui-17 text-tinta-2">Nenhuma escolhida ainda.</p>
        )}
        <Campo
          rotulo="Seu nome"
          value={nome}
          onChange={(e) => aoMudarNome(e.target.value)}
          autoComplete="given-name"
        />
        {erro ? (
          <p role="alert" className="text-ui-15 text-erro">
            {erro}
          </p>
        ) : null}
        <div className="flex items-center gap-3">
          <Botao
            variante="secundario"
            onClick={() => setVista(Math.max(0, etapas.length - 1))}
          >
            Voltar
          </Botao>
          <Botao
            className="flex-1"
            carregando={pendente}
            disabled={!nome.trim() || marcados.length === 0}
            onClick={votar}
          >
            Votar
          </Botao>
        </div>
      </section>
    );
  }

  const etapa = etapas[vista];
  if (!etapa) return null;
  const naFase = etapa.itens.filter((x) => marcados.includes(x.id)).length;
  const cheia = naFase >= porFase;
  const ultima = vista === etapas.length - 1;

  return (
    <section className="flex flex-col gap-5" aria-labelledby="titulo-enquete">
      {vista === 0 ? (
        <p className="text-ui-17 text-tinta">
          Escolha as histórias que você quer ouvir do {autor}. Até {porFase} por
          fase.
        </p>
      ) : null}
      <div className="flex flex-col gap-1">
        <p className="text-ui-15 text-tinta-2">
          Etapa {vista + 1} de {etapas.length}
        </p>
        <h2 id="titulo-enquete" className="text-ui-24 text-tinta font-medium">
          {etapa.categoria.nome}
        </h2>
        <p className="text-ui-15 text-tinta-2" aria-live="polite">
          {naFase} de {porFase}
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {etapa.itens.map((item) => {
          const marcado = marcados.includes(item.id);
          return (
            <li key={item.id}>
              <label
                className={
                  "rounded-interno min-h-alvo flex cursor-pointer items-start gap-3 border px-4 py-3 " +
                  (marcado
                    ? "border-floresta/40 bg-floresta-claro"
                    : "border-linha bg-papel") +
                  (!marcado && cheia ? " opacity-55" : "")
                }
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  disabled={!marcado && cheia}
                  onChange={() =>
                    setMarcados((m) =>
                      marcado
                        ? m.filter((x) => x !== item.id)
                        : [...m, item.id],
                    )
                  }
                  className="accent-floresta mt-1 size-5 shrink-0"
                />
                <span className="font-livro text-livro-20 text-tinta">
                  {item.texto}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex items-center gap-3">
        {vista > 0 ? (
          <Botao variante="secundario" onClick={() => setVista(vista - 1)}>
            Voltar
          </Botao>
        ) : null}
        <Botao
          className="flex-1"
          onClick={() => setVista(ultima ? "revisar" : vista + 1)}
        >
          {ultima ? "Revisar" : "Próxima"}
        </Botao>
      </div>
    </section>
  );
}

function SugerirCauso({
  autor,
  nome,
  aoMudarNome,
  acoes,
  aoEnviar,
  aoCancelar,
}: {
  autor: string;
  nome: string;
  aoMudarNome: (n: string) => void;
  acoes: AcoesFamilia;
  aoEnviar: () => void;
  aoCancelar: () => void;
}) {
  const [tipo, setTipo] = useState<"pergunta" | "causo">("causo");
  const [modo, setModo] = useState<"gravar" | "escrever">("gravar");
  const [audio, setAudio] = useState<AudioGravado | null>(null);
  const [texto, setTexto] = useState("");
  const [aceito, setAceito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const [pendenteDeAudio, setPendenteDeAudio] = useState<string | null>(null); // causo que espera o áudio

  const pronto =
    nome.trim() &&
    aceito &&
    (modo === "gravar" ? audio : texto.trim().length >= 3);

  async function subirAudio(
    causo: string,
    upload: { caminho: string; token: string; contentType: string },
    a: AudioGravado,
  ) {
    const { error } = await clienteNavegador()
      .storage.from("causos")
      .uploadToSignedUrl(upload.caminho, upload.token, a.blob, {
        contentType: upload.contentType,
      });
    if (error) throw error;
    const r = await acoes.confirmarAudio(causo, a.segundos);
    if (!r.ok) throw new Error(r.mensagem);
  }

  function enviar() {
    iniciar(async () => {
      setErro(null);
      guardarNome(nome.trim());
      try {
        if (pendenteDeAudio && audio) {
          // Tentar de novo: confirma primeiro; só pede nova autorização se o arquivo não chegou.
          const c = await acoes.confirmarAudio(pendenteDeAudio, audio.segundos);
          if (!c.ok) {
            if (!c.podeTentarDeNovo) throw new Error(c.mensagem);
            const p = await acoes.prepararAudioDeNovo(
              pendenteDeAudio,
              audio.mime,
            );
            if (!p.ok) throw new Error(p.mensagem);
            await subirAudio(pendenteDeAudio, p.upload, audio);
          }
          return aoEnviar();
        }
        const r = await acoes.enviarCauso({
          tipo,
          nome: nome.trim(),
          texto: modo === "escrever" ? texto.trim() : null,
          audio: modo === "gravar" && audio ? { mime: audio.mime } : null,
          consentimento: aceito,
        });
        if (!r.ok) return setErro(r.mensagem);
        if (r.upload && audio) {
          setPendenteDeAudio(r.causo);
          await subirAudio(r.causo, r.upload, audio);
        }
        aoEnviar();
      } catch (e) {
        setErro(
          e instanceof Error && e.message
            ? e.message
            : "O áudio não chegou. Tente de novo.",
        );
      }
    });
  }

  return (
    <section className="flex flex-col gap-6" aria-labelledby="titulo-causo">
      <h2 id="titulo-causo" className="text-ui-24 text-tinta font-medium">
        O que você quer ouvir do {autor}?
      </h2>
      <div
        role="radiogroup"
        aria-label="O que sugerir"
        className="flex flex-col gap-2"
      >
        {(
          [
            ["causo", "Um causo para ele contar"],
            ["pergunta", "Uma pergunta para ele"],
          ] as const
        ).map(([t, rotulo]) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            disabled={Boolean(pendenteDeAudio)}
            onClick={() => setTipo(t)}
            className={
              "min-h-alvo rounded-interno text-ui-17 border px-4 text-left " +
              (tipo === t
                ? "border-floresta/40 bg-floresta-claro text-tinta font-medium"
                : "border-linha-forte bg-papel text-tinta")
            }
          >
            {rotulo}
          </button>
        ))}
      </div>
      <Campo
        rotulo="Seu nome"
        value={nome}
        onChange={(e) => aoMudarNome(e.target.value)}
        autoComplete="given-name"
      />
      <div role="radiogroup" aria-label="Como enviar" className="flex gap-2">
        {(["gravar", "escrever"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={modo === m}
            disabled={Boolean(pendenteDeAudio)}
            onClick={() => setModo(m)}
            className={
              "min-h-alvo rounded-controle text-ui-17 border px-5 " +
              (modo === m
                ? "border-tinta bg-tinta text-papel"
                : "border-linha-forte text-tinta")
            }
          >
            {m === "gravar" ? "Gravar" : "Escrever"}
          </button>
        ))}
      </div>
      {modo === "gravar" ? (
        <GravadorCauso aoMudar={setAudio} />
      ) : (
        <CampoTexto
          rotulo={tipo === "causo" ? "O causo" : "A pergunta"}
          placeholder={
            tipo === "causo"
              ? "Pede pra ele contar aquela vez em Guarapari que dormiu demais"
              : "Como foi o dia em que você chegou em Belo Horizonte?"
          }
          value={texto}
          maxLength={2000}
          onChange={(e) => setTexto(e.target.value)}
        />
      )}
      <label className="text-ui-15 text-tinta flex items-start gap-3">
        <input
          type="checkbox"
          checked={aceito}
          onChange={(e) => setAceito(e.target.checked)}
          className="accent-floresta mt-0.5 size-5 shrink-0"
        />
        Concordo em enviar meu áudio ou texto para o livro do {autor}, que a
        família vai guardar.
      </label>
      {erro ? (
        <p role="alert" className="text-ui-15 text-erro">
          {erro}
        </p>
      ) : null}
      <Botao
        larguraTotal
        carregando={pendente}
        disabled={!pronto}
        onClick={enviar}
      >
        {pendenteDeAudio ? "Tentar de novo" : "Enviar"}
      </Botao>
      <Botao variante="texto" className="self-center" onClick={aoCancelar}>
        Voltar
      </Botao>
    </section>
  );
}
