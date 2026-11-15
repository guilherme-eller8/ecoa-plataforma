"use client";

// Montar o livro em 3 passos (prompt 13, M9): Conteúdo, Capa e Conferir. Uma ação por tela;
// setas no lugar de arrastar (gesto óbvio para quem tem 80 anos); o contador fica fixo embaixo.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  MolduraDaMontagem,
  TextoDoContador,
  useContagem,
  useSalvarMontagem,
} from "@/components/montar/moldura";
import { UploadFotos } from "@/components/fotos/upload-fotos";
import { PreviaDaCapa } from "@/components/montar/previa-capa";
import { Aviso } from "@/components/ui/aviso";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { Campo, CampoTexto } from "@/components/ui/campo";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import {
  CAPA_CORES,
  DEDICATORIA_MAX,
  PREVIA_CAPA_APOS_MS,
  SUBTITULO_LIVRO_MAX,
  TITULO_CAPA_LINHAS,
  TITULO_LIVRO_MAX,
  type CorDaCapa,
} from "@/lib/config";
import { bloqueia, resumoDePaginas, type Alerta } from "@/lib/livro/alertas";
import type {
  AcoesMontar,
  HistoriaNaMontagem,
  MensagemNaMontagem,
  MontagemDaTela,
} from "@/lib/livro/montar-tipos";
import type { AcoesFotos, LivroDaTela } from "@/lib/livro/tipos";

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

function Seta({ cima }: { cima: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cima ? "" : "rotate-180"}
    >
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

const botaoRedondo =
  "text-tinta hover:bg-polen-2 border-linha-forte flex size-11 shrink-0 items-center justify-center rounded-full border disabled:opacity-40 disabled:hover:bg-transparent";

function mover<T>(lista: T[], de: number, para: number): T[] {
  if (para < 0 || para >= lista.length) return lista;
  const nova = [...lista];
  [nova[de], nova[para]] = [nova[para], nova[de]];
  return nova;
}

// ── Passo 1: Conteúdo ────────────────────────────────────────────────────

function LinhaDeItem({
  titulo,
  detalhe,
  incluida,
  aviso,
  pode,
  primeira,
  ultima,
  aoSubir,
  aoDescer,
  aoAlternar,
  fonteLivro,
}: {
  titulo: string;
  detalhe: string;
  incluida: boolean;
  aviso?: string;
  pode: boolean;
  primeira: boolean;
  ultima: boolean;
  aoSubir: () => void;
  aoDescer: () => void;
  aoAlternar: () => void;
  fonteLivro?: boolean;
}) {
  return (
    <li
      className={`rounded-cartao bg-papel flex items-center gap-2 p-3 ${incluida ? "" : "opacity-60"}`}
    >
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          aria-label={`Subir ${titulo}`}
          className={botaoRedondo}
          disabled={!pode || primeira}
          onClick={aoSubir}
        >
          <Seta cima />
        </button>
        <button
          type="button"
          aria-label={`Descer ${titulo}`}
          className={botaoRedondo}
          disabled={!pode || ultima}
          onClick={aoDescer}
        >
          <Seta cima={false} />
        </button>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 pl-1">
        <span
          className={`${fonteLivro ? "font-livro text-livro-20" : "text-ui-17 font-medium"} text-tinta ${incluida ? "" : "text-tinta-2 line-through"}`}
        >
          {titulo}
        </span>
        <span className="text-ui-13 text-tinta-2">{detalhe}</span>
        {aviso && incluida ? (
          <span className="text-ui-13 text-aviso">{aviso}</span>
        ) : null}
      </div>
      <Botao
        variante="secundario"
        disabled={!pode}
        onClick={aoAlternar}
        className="shrink-0 !px-4"
      >
        {incluida ? "Tirar" : "Pôr de volta"}
      </Botao>
    </li>
  );
}

export function TelaMontarConteudo({
  livro,
  montagem,
  acoes,
}: {
  livro: LivroDaTela;
  montagem: MontagemDaTela;
  acoes: AcoesMontar;
}) {
  const router = useRouter();
  const [historias, setHistorias] = useState<HistoriaNaMontagem[]>(
    montagem.historias,
  );
  const [mensagens, setMensagens] = useState<MensagemNaMontagem[]>(
    montagem.mensagens,
  );
  const [dedicatoria, setDedicatoria] = useState(montagem.dedicatoria);
  const [aviso, setAviso] = useState<string | null>(null);
  const pode = livro.podeEscrever;

  const { salvarMontagem, salvando, erro, versaoSalva, esperar } =
    useSalvarMontagem({
      revInicial: montagem.rev,
      salvar: acoes.salvar,
      aoMudarPorOutro: () => {
        setAviso("Alguém mudou a montagem agora. Atualizamos.");
        router.refresh();
      },
    });
  const contagem = useContagem(acoes.contar, versaoSalva);

  function persistir(
    h: HistoriaNaMontagem[],
    m: MensagemNaMontagem[],
    ded: string,
  ) {
    void salvarMontagem((rev) => ({
      rev,
      titulo: montagem.tituloEscolhido ? montagem.titulo : "",
      subtitulo: montagem.subtitulo,
      dedicatoria: ded,
      capaFotoId: montagem.capaFotoId,
      capaCor: montagem.capaCor,
      ordemHistorias: h.map((x) => x.id),
      ordemMensagens: m.map((x) => x.id),
      fora: h.filter((x) => !x.incluida).map((x) => x.id),
    }));
  }

  function moverHistoria(i: number, para: number) {
    const nova = mover(historias, i, para);
    setHistorias(nova);
    persistir(nova, mensagens, dedicatoria);
  }
  function alternarHistoria(i: number) {
    const nova = historias.map((h, k) =>
      k === i ? { ...h, incluida: !h.incluida } : h,
    );
    setHistorias(nova);
    persistir(nova, mensagens, dedicatoria);
  }
  function moverMensagem(i: number, para: number) {
    const nova = mover(mensagens, i, para);
    setMensagens(nova);
    persistir(historias, nova, dedicatoria);
  }
  async function alternarMensagem(i: number) {
    const m = mensagens[i];
    const incluir = !m.incluida;
    setMensagens(
      mensagens.map((x, k) => (k === i ? { ...x, incluida: incluir } : x)),
    );
    // Riscar é o mesmo "entra no livro" da aba Mensagens (Q8): uma regra só.
    const r = await acoes.mensagemNoLivro(m.id, incluir);
    if (!r.ok) {
      setMensagens(mensagens);
      setAviso(r.mensagem);
    } else {
      router.refresh();
    }
  }

  async function proximo() {
    await esperar();
    router.push(`/livro/${livro.id}/montar/capa`);
  }

  const vazio = historias.length === 0 && mensagens.length === 0;

  return (
    <MolduraDaMontagem
      livroId={livro.id}
      autor={livro.autor}
      passo="conteudo"
      contador={<TextoDoContador estado={contagem} />}
      acao={
        <Botao onClick={proximo} disabled={vazio} carregando={salvando}>
          Próximo: capa
        </Botao>
      }
    >
      <h1 className="font-livro text-livro-28 text-tinta leading-tight">
        O que entra no livro
      </h1>
      {!pode ? (
        <Aviso ok={false}>
          Este livro está só para leitura. As versões publicadas continuam
          abertas.
        </Aviso>
      ) : null}
      {aviso ? <Aviso ok={false}>{aviso}</Aviso> : null}
      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}

      {vazio ? (
        <EstadoVazio
          frase="Quando a primeira história ficar pronta, ela aparece aqui."
          acao={
            <Link
              href={`/livro/${livro.id}/historias/nova`}
              className={classesDoBotao()}
            >
              Nova história
            </Link>
          }
        />
      ) : (
        <>
          <DicaPrimeiraVez chave="montar-setas">
            Use as setas para mudar a ordem.
          </DicaPrimeiraVez>
          <CampoTexto
            rotulo="Dedicatória (opcional)"
            dica="Aparece numa página só dela, depois da folha de rosto."
            value={dedicatoria}
            maxLength={DEDICATORIA_MAX}
            rows={2}
            disabled={!pode}
            onChange={(e) => setDedicatoria(e.target.value)}
            onBlur={() => {
              if (dedicatoria !== montagem.dedicatoria)
                persistir(historias, mensagens, dedicatoria);
            }}
          />
          <section className="flex flex-col gap-3" aria-label="Histórias">
            <h2 className="text-ui-20 text-tinta font-medium">Histórias</h2>
            <ul className="flex flex-col gap-3">
              {historias.map((h, i) => (
                <LinhaDeItem
                  key={h.id}
                  fonteLivro
                  titulo={h.titulo?.trim() || "História sem título"}
                  detalhe={[
                    h.ano ? String(h.ano) : null,
                    `${h.palavras} palavras`,
                    h.comQr ? null : "sem QR",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  aviso={h.revisada ? undefined : "Falta revisar"}
                  incluida={h.incluida}
                  pode={pode}
                  primeira={i === 0}
                  ultima={i === historias.length - 1}
                  aoSubir={() => moverHistoria(i, i - 1)}
                  aoDescer={() => moverHistoria(i, i + 1)}
                  aoAlternar={() => alternarHistoria(i)}
                />
              ))}
            </ul>
          </section>
          {mensagens.length ? (
            <section
              className="flex flex-col gap-3"
              aria-label="Mensagens da família"
            >
              <h2 className="text-ui-20 text-tinta font-medium">
                Mensagens da família{" "}
                <span className="text-tinta-2 text-ui-15 font-normal">
                  (capítulo final)
                </span>
              </h2>
              <ul className="flex flex-col gap-3">
                {mensagens.map((m, i) => (
                  <LinhaDeItem
                    key={m.id}
                    titulo={`${m.nome}, ${m.relacao}`}
                    detalhe={`${m.previa.slice(0, 60)}${m.previa.length > 60 ? "…" : ""}${m.comQr ? "" : " · sem QR"}`}
                    incluida={m.incluida}
                    pode={pode}
                    primeira={i === 0}
                    ultima={i === mensagens.length - 1}
                    aoSubir={() => moverMensagem(i, i - 1)}
                    aoDescer={() => moverMensagem(i, i + 1)}
                    aoAlternar={() => void alternarMensagem(i)}
                  />
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </MolduraDaMontagem>
  );
}

// ── Passo 2: Capa ────────────────────────────────────────────────────────

function Bolinha({
  cor,
  marcada,
  pode,
  aoEscolher,
}: {
  cor: CorDaCapa;
  marcada: boolean;
  pode: boolean;
  aoEscolher: () => void;
}) {
  const [c, m, y, k] = CAPA_CORES[cor].cmyk;
  // Só para a tela: conversão simples de CMYK para RGB.
  const rgb = [c, m, y].map((v) =>
    Math.round(255 * (1 - v / 100) * (1 - k / 100)),
  );
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcada}
      aria-label={CAPA_CORES[cor].nome}
      disabled={!pode}
      onClick={aoEscolher}
      className={`flex size-14 items-center justify-center rounded-full border-2 ${marcada ? "border-floresta" : "border-transparent"} focus-visible:ring-floresta focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none`}
    >
      <span
        className="border-linha-forte size-10 rounded-full border"
        style={{ backgroundColor: `rgb(${rgb.join(",")})` }}
      />
    </button>
  );
}

export function TelaMontarCapa({
  livro,
  montagem,
  acoes,
  fotos,
  previaInicial = null,
}: {
  livro: LivroDaTela;
  montagem: MontagemDaTela;
  acoes: AcoesMontar;
  /** Subir uma foto nova direto da capa (na vitrine não há servidor). */
  fotos?: AcoesFotos;
  /** Só na vitrine: uma prévia pronta, sem servidor. */
  previaInicial?: string | null;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(montagem.titulo);
  const [subtitulo, setSubtitulo] = useState(montagem.subtitulo);
  const [fotoId, setFotoId] = useState(montagem.capaFotoId);
  const [cor, setCor] = useState<CorDaCapa>(montagem.capaCor);
  const [escolherFoto, setEscolherFoto] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [previa, setPrevia] = useState<string | null>(previaInicial);
  const [previaErro, setPreviaErro] = useState(false);
  const pode = livro.podeEscrever;

  const { salvarMontagem, salvando, erro, versaoSalva, esperar } =
    useSalvarMontagem({
      revInicial: montagem.rev,
      salvar: acoes.salvar,
      aoMudarPorOutro: () => {
        setAviso("Alguém mudou a montagem agora. Atualizamos.");
        router.refresh();
      },
    });
  const contagem = useContagem(acoes.contar, versaoSalva);
  const paginas = contagem.contagem?.paginas ?? 80;

  const salvar = (t: string, s: string, f: string | null, c: CorDaCapa) =>
    void salvarMontagem((rev) => ({
      rev,
      titulo: t,
      subtitulo: s,
      dedicatoria: montagem.dedicatoria,
      capaFotoId: f,
      capaCor: c,
      ordemHistorias: montagem.historias.map((h) => h.id),
      ordemMensagens: montagem.mensagens.map((m) => m.id),
      fora: montagem.historias.filter((h) => !h.incluida).map((h) => h.id),
    }));

  // O título já vem preenchido ("Histórias de {apelido}"): grava uma vez, para o livro nunca
  // chegar ao Conferir sem título só porque ninguém mexeu no campo.
  const gravouPadrao = useRef(false);
  useEffect(() => {
    if (!montagem.tituloEscolhido && pode && !gravouPadrao.current) {
      gravouPadrao.current = true;
      salvar(
        montagem.titulo,
        montagem.subtitulo,
        montagem.capaFotoId,
        montagem.capaCor,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prévia ao vivo 600 ms depois da última mudança (renderizada pelo próprio Typst, Q11).
  const primeira = useRef(previaInicial !== null);
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    let vivo = true;
    const t = setTimeout(() => {
      void acoes
        .previaCapa({ titulo, subtitulo, fotoId, cor, paginas })
        .then((r) => {
          if (!vivo) return;
          setPreviaErro(!r.ok);
          if (r.ok) setPrevia(r.dados.imagem);
        });
    }, PREVIA_CAPA_APOS_MS);
    return () => {
      vivo = false;
      clearTimeout(t);
    };
  }, [titulo, subtitulo, fotoId, cor, paginas, acoes]);

  const longo = (contagem.contagem?.linhasDoTitulo ?? 0) > TITULO_CAPA_LINHAS;
  const fotoEscolhida = montagem.fotos.find((f) => f.id === fotoId);

  async function proximo() {
    await esperar();
    router.push(`/livro/${livro.id}/montar/conferir`);
  }

  return (
    <MolduraDaMontagem
      livroId={livro.id}
      autor={livro.autor}
      passo="capa"
      contador={<TextoDoContador estado={contagem} />}
      acao={
        <Botao
          onClick={proximo}
          carregando={salvando}
          disabled={!titulo.trim()}
        >
          Próximo: conferir
        </Botao>
      }
    >
      <h1 className="font-livro text-livro-28 text-tinta leading-tight">
        A capa
      </h1>
      {!pode ? (
        <Aviso ok={false}>
          Este livro está só para leitura. As versões publicadas continuam
          abertas.
        </Aviso>
      ) : null}
      {aviso ? <Aviso ok={false}>{aviso}</Aviso> : null}
      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}

      <div className="flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div className="flex flex-col gap-3 lg:sticky lg:top-6">
          {previa ? (
            <PreviaDaCapa
              src={previa}
              alt="Capa aberta: contracapa, lombada e capa"
            />
          ) : (
            <p className="rounded-cartao bg-polen-2 text-ui-15 text-tinta-2 p-6">
              Montando a prévia…
            </p>
          )}
          {previaErro ? (
            <p role="status" className="text-ui-15 text-tinta-2">
              A prévia não atualizou agora. Seus textos estão salvos.
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-7">
          <Campo
            rotulo="Título"
            value={titulo}
            maxLength={TITULO_LIVRO_MAX}
            disabled={!pode}
            erro={
              longo
                ? `Não cabe na capa em ${TITULO_CAPA_LINHAS} linhas. Encurte o título.`
                : undefined
            }
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() =>
              titulo.trim() && salvar(titulo, subtitulo, fotoId, cor)
            }
          />
          <Campo
            rotulo="Subtítulo (opcional)"
            value={subtitulo}
            maxLength={SUBTITULO_LIVRO_MAX}
            disabled={!pode}
            onChange={(e) => setSubtitulo(e.target.value)}
            onBlur={() =>
              titulo.trim() && salvar(titulo, subtitulo, fotoId, cor)
            }
          />

          <div className="flex flex-col gap-2">
            <span className="text-ui-15 text-tinta font-medium">
              Foto da capa
            </span>
            <div className="flex items-center gap-4">
              {fotoEscolhida ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoEscolhida.url}
                  alt="Foto da capa"
                  className="rounded-interno size-20 object-cover"
                />
              ) : null}
              <Botao
                variante="secundario"
                disabled={!pode}
                onClick={() => setEscolherFoto(true)}
              >
                {fotoEscolhida ? "Trocar a foto" : "Escolher uma foto"}
              </Botao>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span id="rotulo-cor" className="text-ui-15 text-tinta font-medium">
              Cor da capa
            </span>
            <div
              role="radiogroup"
              aria-labelledby="rotulo-cor"
              className="flex flex-wrap gap-1"
            >
              {(Object.keys(CAPA_CORES) as CorDaCapa[]).map((c) => (
                <Bolinha
                  key={c}
                  cor={c}
                  marcada={cor === c}
                  pode={pode}
                  aoEscolher={() => {
                    setCor(c);
                    if (titulo.trim()) salvar(titulo, subtitulo, fotoId, c);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <FolhaInferior
        aberta={escolherFoto}
        aoFechar={() => setEscolherFoto(false)}
        titulo="Foto da capa"
      >
        {fotos ? (
          <div className="mb-4 flex flex-col gap-2">
            <UploadFotos
              acoes={fotos}
              uma
              rotulo="Subir uma foto nova"
              aoTerminar={(ids) => {
                const nova = ids[0];
                if (!nova) return;
                setFotoId(nova);
                setEscolherFoto(false);
                if (titulo.trim()) salvar(titulo, subtitulo, nova, cor);
                // A lista do acervo (com a foto nova) vem do servidor, depois de salvar.
                void esperar().then(() => router.refresh());
              }}
            />
          </div>
        ) : null}
        {montagem.fotos.length === 0 ? (
          <p className="text-ui-17 text-tinta-2">
            {fotos
              ? "Ainda não há fotos no acervo."
              : "Suba fotos na configuração do livro."}
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2">
            {montagem.fotos.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  aria-label="Usar esta foto"
                  aria-pressed={f.id === fotoId}
                  className={`rounded-interno block aspect-square w-full overflow-hidden border-2 ${f.id === fotoId ? "border-floresta" : "border-transparent"}`}
                  onClick={() => {
                    setFotoId(f.id);
                    setEscolherFoto(false);
                    if (titulo.trim()) salvar(titulo, subtitulo, f.id, cor);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {fotoId ? (
          <Botao
            variante="texto"
            className="mt-3"
            onClick={() => {
              setFotoId(null);
              setEscolherFoto(false);
              if (titulo.trim()) salvar(titulo, subtitulo, null, cor);
            }}
          >
            Sem foto
          </Botao>
        ) : null}
      </FolhaInferior>
    </MolduraDaMontagem>
  );
}

// ── Passo 3: Conferir ────────────────────────────────────────────────────

function aondeResolver(livroId: string, a: Alerta): string {
  const base = `/livro/${livroId}`;
  if (a.onde === "capa") return `${base}/montar/capa`;
  if (a.onde === "mensagens") return `${base}/montar`;
  if (a.onde === "historia" && a.codigo === "historia_nao_pronta")
    return `${base}/historias/${a.item}`;
  if (a.onde === "historia") return `${base}/historias/${a.item}`;
  return `${base}/montar`;
}

export function TelaMontarConferir({
  livro,
  montagem,
  acoes,
}: {
  livro: LivroDaTela;
  montagem: MontagemDaTela;
  acoes: AcoesMontar;
}) {
  const router = useRouter();
  const contagem = useContagem(acoes.contar, 0);
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [publicando, setPublicando] = useState(false);

  const c = contagem.contagem;
  // O hash que a pessoa viu: se a contagem já é de outro estado do livro, recarrega.
  const mudou = Boolean(c && montagem.hash && c.hash !== montagem.hash);
  useEffect(() => {
    if (mudou) router.refresh();
  }, [mudou, router]);

  const alertas = c?.alertas ?? montagem.alertas;
  const travado = bloqueia(alertas);
  const resumo = c ? resumoDePaginas(c.paginas) : null;

  async function publicar() {
    setPublicando(true);
    const r = await acoes.publicar(montagem.hash);
    if (r.ok) {
      router.push(`/livro/${livro.id}/publicado/${r.dados.versao}`);
      return;
    }
    setPublicando(false);
    setConfirmar(false);
    setErro(r.mensagem);
    if (r.mensagem.startsWith("O livro mudou")) router.refresh();
  }

  const responsavel = montagem.responsavel
    ? montagem.responsavel.split(" ")[0]
    : "o responsável";

  return (
    <MolduraDaMontagem
      livroId={livro.id}
      autor={livro.autor}
      passo="conferir"
      contador={<TextoDoContador estado={contagem} />}
      acao={
        livro.ehResponsavel ? (
          <Botao
            onClick={() => setConfirmar(true)}
            disabled={!livro.podeEscrever || travado || !c || mudou}
          >
            Publicar
          </Botao>
        ) : (
          <span className="text-ui-15 text-tinta-2 text-right">
            Só {responsavel} publica.
          </span>
        )
      }
    >
      <div className="flex flex-col gap-2">
        <h1 className="font-livro text-livro-44 text-tinta leading-none">
          {resumo ? resumo.titulo : "Contando…"}
        </h1>
        {resumo ? (
          <p className="text-ui-17 text-tinta-2">{resumo.frase}</p>
        ) : (
          <p className="text-ui-17 text-tinta-2">
            Montando o livro de verdade para contar as páginas.
          </p>
        )}
      </div>

      {erro ? <Aviso ok={false}>{erro}</Aviso> : null}
      {mudou ? (
        <Aviso ok={false}>
          O livro mudou enquanto você conferia. Atualizando…
        </Aviso>
      ) : null}
      {!livro.podeEscrever ? (
        <Aviso ok={false}>
          Este livro está só para leitura. As versões publicadas continuam
          abertas.
        </Aviso>
      ) : null}

      {alertas.length === 0 ? (
        <p className="text-ui-17 text-floresta font-medium">
          Tudo certo para publicar.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Avisos">
          {alertas.map((a, i) => (
            <li
              key={`${a.codigo}-${a.item ?? i}`}
              className={`rounded-cartao flex flex-col gap-2 p-4 ${a.nivel === "vermelho" ? "bg-erro-fundo text-erro" : "bg-aviso-fundo text-aviso"}`}
            >
              <p className="text-ui-17">
                <span className="sr-only">
                  {a.nivel === "vermelho" ? "Precisa resolver: " : "Atenção: "}
                </span>
                {a.texto}
              </p>
              <Link
                href={aondeResolver(livro.id, a)}
                className="text-ui-15 inline-flex min-h-11 items-center self-start font-medium underline underline-offset-4"
              >
                Resolver
              </Link>
            </li>
          ))}
        </ul>
      )}

      {montagem.versoes.length ? (
        <section
          className="flex flex-col gap-3"
          aria-label="Versões publicadas"
        >
          <h2 className="text-ui-20 text-tinta font-medium">
            Versões publicadas
          </h2>
          <ul className="flex flex-col gap-2">
            {montagem.versoes.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/livro/${livro.id}/publicado/${v.versao}`}
                  className="rounded-cartao bg-papel hover:bg-polen-2 text-ui-17 text-tinta flex min-h-14 items-center justify-between gap-3 px-4"
                >
                  <span>
                    Versão {v.versao}
                    <span className="text-tinta-2">
                      {v.paginas ? ` · ${v.paginas} páginas` : ""}
                      {v.estado === "gerando" ? " · preparando" : ""}
                      {v.estado === "falhou" ? " · não deu certo" : ""}
                    </span>
                  </span>
                  <span className="text-ui-13 text-tinta-2">
                    {DATA.format(new Date(v.criadoEm))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <FolhaInferior
        aberta={confirmar}
        aoFechar={() => setConfirmar(false)}
        titulo={`Publicar a versão ${montagem.proximaVersao}?`}
      >
        <div className="flex flex-col gap-5">
          <p className="text-ui-17 text-tinta">
            Publicar a versão {montagem.proximaVersao}? O que mudar depois fica
            para a próxima.
          </p>
          <div className="flex flex-col gap-3">
            <Botao carregando={publicando} onClick={publicar} larguraTotal>
              Publicar
            </Botao>
            <Botao
              variante="secundario"
              larguraTotal
              onClick={() => setConfirmar(false)}
            >
              Voltar
            </Botao>
          </div>
        </div>
      </FolhaInferior>
    </MolduraDaMontagem>
  );
}
