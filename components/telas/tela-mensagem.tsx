"use client";

// Link de mensagens (P65): quem recebeu deixa uma mensagem para o livro, gravada ou escrita, e
// confere o texto antes de enviar. Uma ação por passo. Sem login; o rascunho é deste aparelho.
import { useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Botao } from "@/components/ui/botao";
import { Campo, CampoTexto } from "@/components/ui/campo";
import { MarcaEcoa } from "@/components/ui/marca";
import {
  GravadorCauso,
  type AudioGravado,
} from "@/components/familia/gravador-causo";
import { MAX_MENSAGEM_AUDIO_MIN, MAX_MENSAGEM_CARACTERES } from "@/lib/config";
import { comprimirFoto } from "@/lib/fotos/comprimir";
import type {
  AcoesMensagem,
  PaginaDaMensagem,
  Upload,
} from "@/lib/mensagens/tipos";
import { clienteNavegador } from "@/lib/supabase/navegador";
import { PlayerVoz } from "@/components/ui/player-voz";

const CHAVE_NOME = "ecoa_nome";
const ESPERA_MS = 4000;
const ESPERAS = 8; // ~30 s esperando outra chamada terminar a transcrição
// O texto vai para o livro: na fonte do livro (Newsreader), não na da interface.
const LIVRO = "[&_textarea]:font-livro [&_textarea]:text-livro-20";

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
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function subir(upload: Upload, arquivo: Blob) {
  const { error } = await clienteNavegador()
    .storage.from("mensagens")
    .uploadToSignedUrl(upload.caminho, upload.token, arquivo, {
      contentType: upload.contentType,
    });
  if (error) throw new Error("O envio não chegou. Tente de novo.");
}

export function TelaMensagemInvalida() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pt-10">
      <MarcaEcoa />
      <h1 className="font-livro text-livro-28 text-tinta leading-tight">
        Este link não vale mais.
      </h1>
      <p className="text-ui-17 text-tinta-2">
        Sua mensagem não foi enviada. Peça o link novo a quem te mandou.
      </p>
    </main>
  );
}

type Passo =
  "quem" | "gravar" | "escrever" | "escrevendo" | "conferir" | "enviada";

export function TelaMensagem({
  pagina,
  acoes,
  inicial = "quem",
  textoInicial = "",
}: {
  pagina: PaginaDaMensagem;
  acoes: AcoesMensagem;
  inicial?: Passo;
  textoInicial?: string; // só no styleguide
}) {
  const salvo = useSyncExternalStore(semAssinatura, lerNome, () => "");
  const [digitado, setNome] = useState<string | null>(null);
  const nome = digitado ?? salvo;
  const [relacao, setRelacao] = useState("");
  const [passo, setPasso] = useState<Passo>(inicial);
  const [audio, setAudio] = useState<AudioGravado | null>(null);
  const [foto, setFoto] = useState<{ arquivo: Blob; url: string } | null>(null);
  const [texto, setTexto] = useState(textoInicial);
  const [aceito, setAceito] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null); // id do rascunho
  const [pendente, iniciar] = useTransition();
  const [ouvirUrl, setOuvirUrl] = useState<string | null>(null);
  // Rascunho com áudio ainda por chegar: tentar de novo reaproveita (3 rascunhos por aparelho).
  const rascunho = useRef<{ id: string; audio: Upload | null } | null>(null);

  const autor = pagina.autor;
  const titulo = autor
    ? `Uma mensagem para o livro de ${autor}`
    : "Uma mensagem para o livro";
  const para = autor ?? "a pessoa homenageada";

  function recomecar() {
    setAudio(null);
    setFoto(null);
    setTexto("");
    setAceito(false);
    setErro(null);
    setAviso(null);
    setMensagem(null);
    rascunho.current = null;
    setPasso("quem");
  }

  async function escolherFoto(arquivo: File | undefined) {
    setErro(null);
    if (!arquivo) return;
    try {
      const c = await comprimirFoto(arquivo);
      setFoto({ arquivo: c.arquivo, url: URL.createObjectURL(c.arquivo) });
    } catch {
      setErro("Não conseguimos abrir esta foto. Escolha outra.");
    }
  }

  /** Cria o rascunho e sobe a foto (se houver). Devolve o id e o upload do áudio. */
  async function criarRascunho(comAudio: boolean) {
    guardarNome(nome.trim());
    const r = await acoes.criar({
      nome: nome.trim(),
      relacao: relacao.trim(),
      audio: comAudio && audio ? { mime: audio.mime } : null,
      foto: Boolean(foto),
      consentimento: aceito,
    });
    if (!r.ok) throw new Error(r.mensagem);
    setMensagem(r.id);
    if (r.foto && foto) {
      // A foto é opcional: se não chegar, a mensagem segue sem ela.
      try {
        await subir(r.foto, foto.arquivo);
        await acoes.confirmarFoto(r.id);
      } catch {
        /* segue sem foto */
      }
    }
    return r;
  }

  async function pedirTexto(id: string) {
    for (let i = 0; i <= ESPERAS; i++) {
      const t = await acoes.transcrever(id);
      if (t.ok) {
        setTexto(t.sugestao);
        return setPasso("conferir");
      }
      if ("espera" in t) {
        await esperar(ESPERA_MS);
        continue;
      }
      if (t.regravar) {
        setAudio(null);
        setMensagem(null);
        rascunho.current = null;
        setPasso("gravar");
        return setErro(t.mensagem);
      }
      if (t.escrever) {
        setTexto("");
        setAviso(t.mensagem);
        return setPasso("conferir");
      }
      setPasso("conferir");
      setTexto("");
      return setErro(t.mensagem);
    }
    setPasso("conferir");
    setTexto("");
    setErro("Não conseguimos escrever o áudio agora. Tente de novo.");
  }

  function continuarGravacao() {
    if (!audio) return;
    iniciar(async () => {
      setErro(null);
      setAviso(null);
      try {
        const r = rascunho.current ?? (await criarRascunho(true));
        rascunho.current = { id: r.id, audio: r.audio };
        if (!r.audio) throw new Error("O envio não chegou. Tente de novo.");
        await subir(r.audio, audio.blob);
        const c = await acoes.confirmarAudio(r.id, audio.segundos);
        if (!c.ok) {
          if (c.regravar) {
            setAudio(null);
            rascunho.current = null;
          }
          throw new Error(c.mensagem);
        }
        if (ouvirUrl) URL.revokeObjectURL(ouvirUrl);
        setOuvirUrl(URL.createObjectURL(audio.blob));
        setPasso("escrevendo");
        await pedirTexto(r.id);
      } catch (e) {
        setPasso("gravar");
        setErro(e instanceof Error ? e.message : "Tente de novo.");
      }
    });
  }

  function tentarTranscreverDeNovo() {
    if (!mensagem) return;
    iniciar(async () => {
      setErro(null);
      setPasso("escrevendo");
      await pedirTexto(mensagem);
    });
  }

  function enviar() {
    iniciar(async () => {
      setErro(null);
      try {
        let id = mensagem;
        if (!id) id = (await criarRascunho(false)).id;
        const r = await acoes.enviar(id, texto);
        if (!r.ok) throw new Error(r.mensagem);
        setPasso("enviada");
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Tente de novo.");
      }
    });
  }

  const quemPronto = nome.trim() && relacao.trim();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-8 px-5 pt-8 pb-12">
      <MarcaEcoa />
      <header className="flex flex-col gap-2">
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          {titulo}
        </h1>
        {passo !== "enviada" ? (
          <p className="text-ui-17 text-tinta-2">
            É surpresa: só vai aparecer no livro impresso.
          </p>
        ) : null}
      </header>

      {!pagina.aberto ? (
        <p className="text-ui-17 text-tinta-2">
          Este livro não recebe mensagens agora.
        </p>
      ) : passo === "quem" ? (
        <section className="flex flex-col gap-6" aria-label="Quem escreve">
          <Campo
            rotulo="Seu nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            autoComplete="given-name"
            maxLength={80}
          />
          <Campo
            rotulo={`Quem você é para ${para}`}
            placeholder="sobrinha, amigo do trabalho…"
            value={relacao}
            onChange={(e) => setRelacao(e.target.value)}
            maxLength={60}
          />
          <Botao
            larguraTotal
            disabled={!quemPronto}
            onClick={() => setPasso("gravar")}
          >
            Gravar mensagem
          </Botao>
          <Botao
            variante="texto"
            className="self-center"
            disabled={!quemPronto}
            onClick={() => setPasso("escrever")}
          >
            Prefiro escrever
          </Botao>
        </section>
      ) : passo === "gravar" || passo === "escrever" ? (
        <section className="flex flex-col gap-6">
          {passo === "gravar" ? (
            <GravadorCauso
              aoMudar={setAudio}
              maxMin={MAX_MENSAGEM_AUDIO_MIN}
              semMicrofone="Não conseguimos usar o microfone. Libere o acesso ou escreva a mensagem."
            />
          ) : (
            <CampoTexto
              rotulo="Sua mensagem"
              value={texto}
              maxLength={MAX_MENSAGEM_CARACTERES}
              rows={10}
              className={LIVRO}
              onChange={(e) => setTexto(e.target.value)}
            />
          )}
          <Foto
            foto={foto}
            aoEscolher={escolherFoto}
            aoTirar={() => setFoto(null)}
          />
          <Consentimento autor={para} aceito={aceito} aoMudar={setAceito} />
          {erro ? (
            <p role="alert" className="text-ui-15 text-erro">
              {erro}
            </p>
          ) : null}
          {passo === "gravar" ? (
            <Botao
              larguraTotal
              carregando={pendente}
              disabled={!audio || !aceito}
              onClick={continuarGravacao}
            >
              Continuar
            </Botao>
          ) : (
            <Botao
              larguraTotal
              carregando={pendente}
              disabled={!texto.trim() || !aceito}
              onClick={enviar}
            >
              Enviar mensagem
            </Botao>
          )}
          <Botao
            variante="texto"
            className="self-center"
            disabled={pendente}
            onClick={() => setPasso(passo === "gravar" ? "escrever" : "gravar")}
          >
            {passo === "gravar" ? "Prefiro escrever" : "Prefiro gravar"}
          </Botao>
        </section>
      ) : passo === "escrevendo" ? (
        <section
          className="flex flex-col items-center gap-4 pt-6"
          aria-live="polite"
        >
          {/* taste-skill-ignore: o anel é o indicador de espera, não uma caixa */}
          <span
            aria-hidden
            className="border-linha-forte border-t-floresta size-10 animate-spin rounded-full border-4"
          />
          <p className="text-ui-17 text-tinta">Escrevendo o que você falou…</p>
        </section>
      ) : passo === "conferir" ? (
        <section className="flex flex-col gap-6" aria-label="Confira o texto">
          <h2 className="text-ui-24 text-tinta font-medium">Confira o texto</h2>
          {ouvirUrl ? (
            <PlayerVoz
              src={ouvirUrl}
              nome="a sua mensagem"
              preload="metadata"
            />
          ) : null}
          {aviso ? <p className="text-ui-15 text-tinta-2">{aviso}</p> : null}
          <CampoTexto
            rotulo="Corrija o que quiser"
            value={texto}
            maxLength={MAX_MENSAGEM_CARACTERES}
            rows={10}
            className={LIVRO}
            onChange={(e) => setTexto(e.target.value)}
          />
          {erro ? (
            <p role="alert" className="text-ui-15 text-erro">
              {erro}
            </p>
          ) : null}
          <Botao
            larguraTotal
            carregando={pendente}
            disabled={!texto.trim()}
            onClick={enviar}
          >
            Enviar mensagem
          </Botao>
          {erro && !aviso ? (
            <Botao
              variante="texto"
              className="self-center"
              disabled={pendente}
              onClick={tentarTranscreverDeNovo}
            >
              Tentar escrever o áudio de novo
            </Botao>
          ) : null}
        </section>
      ) : (
        <section className="flex flex-col gap-5">
          <p className="font-livro text-livro-24 text-tinta">
            Mensagem enviada. Obrigado!
          </p>
          <p className="text-ui-15 text-tinta-2">
            Quer mudar ou tirar sua mensagem? Peça a quem te mandou o link.
          </p>
          <Botao
            variante="secundario"
            className="self-start"
            onClick={recomecar}
          >
            Deixar outra mensagem
          </Botao>
        </section>
      )}
    </main>
  );
}

function Foto({
  foto,
  aoEscolher,
  aoTirar,
}: {
  foto: { url: string } | null;
  aoEscolher: (f: File | undefined) => void;
  aoTirar: () => void;
}) {
  if (foto)
    return (
      <div className="flex items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- foto local, ainda não enviada */}
        <img
          src={foto.url}
          alt="A foto escolhida"
          className="rounded-interno size-20 object-cover"
        />
        <Botao variante="texto" onClick={aoTirar}>
          Tirar a foto
        </Botao>
      </div>
    );
  return (
    <label className="text-ui-17 text-floresta min-h-alvo flex cursor-pointer items-center font-medium underline-offset-4 hover:underline">
      Pôr uma foto (opcional)
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => aoEscolher(e.target.files?.[0])}
      />
    </label>
  );
}

function Consentimento({
  autor,
  aceito,
  aoMudar,
}: {
  autor: string;
  aceito: boolean;
  aoMudar: (v: boolean) => void;
}) {
  return (
    <label className="text-ui-15 text-tinta flex items-start gap-3">
      <input
        type="checkbox"
        checked={aceito}
        onChange={(e) => aoMudar(e.target.checked)}
        className="accent-floresta mt-0.5 size-5 shrink-0"
      />
      Autorizo guardar minha voz, meu texto e minha foto no livro de {autor},
      enquanto o livro existir. A família que faz o livro pode ouvir, ajustar o
      texto e imprimir. A voz é transcrita por um serviço nos Estados Unidos.
    </label>
  );
}
