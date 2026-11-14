"use client";

// Mensagens da família (P65): ouvir, ler, ajustar o texto e pôr ou tirar do livro. Uma ação
// principal: convidar pelo WhatsApp. Só entra no livro o que um membro marcar.
import Link from "next/link";
import { useState, useTransition } from "react";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { CampoTexto } from "@/components/ui/campo";
import { Copiar } from "@/components/ui/copiar";
import { DicaPrimeiraVez } from "@/components/ui/dica";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { IconeEnviar } from "@/components/ui/icones";
import { formatarDuracao } from "@/lib/audios/formatos";
import { MAX_MENSAGEM_CARACTERES } from "@/lib/config";
import type { LivroDaTela } from "@/lib/livro/tipos";
import type { AcoesMensagens, MensagemDoLivro } from "@/lib/mensagens/tipos";
import { conviteMensagem, linkWhatsApp } from "@/lib/whatsapp";

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Sao_Paulo",
});

export function TelaMensagens({
  livro,
  mensagens,
  link: linkInicial,
  acoes,
}: {
  livro: LivroDaTela;
  mensagens: MensagemDoLivro[];
  link: string | null;
  acoes: AcoesMensagens;
}) {
  const [link, setLink] = useState(linkInicial);
  const [aberta, setAberta] = useState<string | null>(null);
  const [verArquivadas, setVerArquivadas] = useState(false);
  const [confirmarTroca, setConfirmarTroca] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  const ativas = mensagens.filter((m) => m.estado === "enviada");
  const arquivadas = mensagens.filter((m) => m.estado === "arquivada");
  const noLivro = ativas.filter((m) => m.noLivro).length;
  const lista = verArquivadas ? arquivadas : ativas;
  const atual = mensagens.find((m) => m.id === aberta) ?? null;
  const convite = (url: string) =>
    linkWhatsApp(
      conviteMensagem({
        autor: livro.autor,
        parentesco: livro.parentesco,
        link: url,
      }),
    );

  function convidar() {
    iniciar(async () => {
      const r = await acoes.pegarLink();
      if (!r.ok) return setErro(r.mensagem);
      setErro(null);
      setLink(r.dados.url);
      window.location.href = convite(r.dados.url);
    });
  }

  function trocar() {
    iniciar(async () => {
      const r = await acoes.trocarLink();
      if (!r.ok) return setErro(r.mensagem);
      setErro(null);
      setConfirmarTroca(false);
      setLink(r.dados.url);
    });
  }

  const botaoConvidar = link ? (
    <a
      href={convite(link)}
      target="_blank"
      rel="noreferrer"
      className={classesDoBotao()}
    >
      <IconeEnviar tamanho={20} />
      <span>Convidar pelo WhatsApp</span>
    </a>
  ) : (
    <Botao
      carregando={pendente}
      disabled={!livro.podeEscrever}
      onClick={convidar}
    >
      <IconeEnviar tamanho={20} />
      <span>Convidar pelo WhatsApp</span>
    </Botao>
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12">
      <Link
        href={`/livro/${livro.id}`}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Livro do {livro.autor}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          Mensagens da família
        </h1>
        {ativas.length ? (
          <p className="text-ui-17 text-tinta-2">
            {ativas.length === 1 ? "1 mensagem" : `${ativas.length} mensagens`}
            {" · "}
            {noLivro} no livro
          </p>
        ) : null}
      </div>

      {erro ? (
        <p role="alert" className="text-ui-15 text-erro">
          {erro}
        </p>
      ) : null}

      {ativas.length === 0 && !verArquivadas ? (
        <EstadoVazio
          frase="Ninguém deixou mensagem ainda."
          acao={botaoConvidar}
        />
      ) : (
        <>
          {!verArquivadas ? (
            <div className="flex flex-wrap items-center gap-3">
              {botaoConvidar}
            </div>
          ) : null}
          {!verArquivadas ? (
            <DicaPrimeiraVez chave="mensagens-no-livro">
              Só entra no livro o que você marcar.
            </DicaPrimeiraVez>
          ) : null}
          <ul className="flex flex-col gap-3">
            {lista.map((m) => (
              <li
                key={m.id}
                className="rounded-cartao bg-papel flex items-start gap-3 p-4"
              >
                <button
                  type="button"
                  onClick={() => setAberta(m.id)}
                  className="flex min-w-0 flex-1 flex-col gap-1 text-left"
                >
                  <span className="text-ui-17 text-tinta font-medium">
                    {m.nome}
                    <span className="text-tinta-2 font-normal">
                      {" "}
                      · {m.relacao}
                    </span>
                  </span>
                  <span className="text-ui-13 text-tinta-2">
                    {DATA.format(new Date(m.enviadaEm))}
                    {m.duracaoS ? ` · ▶ ${formatarDuracao(m.duracaoS)}` : ""}
                    {m.fotoUrl ? " · com foto" : ""}
                  </span>
                  <span className="font-livro text-ui-17 text-tinta line-clamp-2">
                    {m.texto}
                  </span>
                </button>
                {m.estado === "enviada" ? (
                  <ChaveNoLivro
                    mensagem={m}
                    acoes={acoes}
                    pode={livro.podeEscrever}
                    aoErrar={setErro}
                  />
                ) : null}
              </li>
            ))}
          </ul>
          {verArquivadas ? (
            <Botao
              variante="texto"
              className="self-start"
              onClick={() => setVerArquivadas(false)}
            >
              ← Voltar às mensagens
            </Botao>
          ) : arquivadas.length ? (
            <Botao
              variante="texto"
              className="self-start"
              onClick={() => setVerArquivadas(true)}
            >
              {arquivadas.length === 1
                ? "1 arquivada"
                : `${arquivadas.length} arquivadas`}
            </Botao>
          ) : null}
        </>
      )}

      {link && !verArquivadas ? (
        <Copiar texto={link} rotulo="Copiar o link" variante="texto" />
      ) : null}
      {link && livro.ehResponsavel && livro.podeEscrever && !verArquivadas ? (
        confirmarTroca ? (
          <div className="flex flex-col gap-2">
            <p className="text-ui-15 text-tinta-2">
              O link antigo para de funcionar. Quem estiver escrevendo agora
              perde a mensagem.
            </p>
            <div className="flex gap-3">
              <Botao
                variante="secundario"
                carregando={pendente}
                onClick={trocar}
              >
                Trocar o link
              </Botao>
              <Botao variante="texto" onClick={() => setConfirmarTroca(false)}>
                Cancelar
              </Botao>
            </div>
          </div>
        ) : (
          <Botao
            variante="texto"
            className="self-start"
            onClick={() => setConfirmarTroca(true)}
          >
            Trocar o link
          </Botao>
        )
      ) : null}

      <FolhaInferior
        aberta={Boolean(atual)}
        aoFechar={() => setAberta(null)}
        titulo={atual ? `${atual.nome} · ${atual.relacao}` : ""}
      >
        {atual ? (
          <Detalhe
            key={atual.id}
            mensagem={atual}
            livro={livro}
            acoes={acoes}
            aoFechar={() => setAberta(null)}
          />
        ) : null}
      </FolhaInferior>
    </main>
  );
}

function ChaveNoLivro({
  mensagem,
  acoes,
  pode,
  aoErrar,
}: {
  mensagem: MensagemDoLivro;
  acoes: AcoesMensagens;
  pode: boolean;
  aoErrar: (m: string | null) => void;
}) {
  const [ligada, setLigada] = useState(mensagem.noLivro);
  const [pendente, iniciar] = useTransition();
  function alternar() {
    const nova = !ligada;
    setLigada(nova);
    iniciar(async () => {
      const r = await acoes.noLivro(mensagem.id, nova);
      if (!r.ok) {
        setLigada(!nova);
        aoErrar(r.mensagem);
      } else aoErrar(null);
    });
  }
  return (
    <label className="text-ui-13 text-tinta-2 min-h-alvo flex shrink-0 cursor-pointer flex-col items-center justify-center gap-1">
      <input
        type="checkbox"
        role="switch"
        checked={ligada}
        disabled={!pode || pendente}
        onChange={alternar}
        aria-label={`${mensagem.nome} no livro`}
        className="accent-floresta size-6"
      />
      No livro
    </label>
  );
}

function Detalhe({
  mensagem: m,
  livro,
  acoes,
  aoFechar,
}: {
  mensagem: MensagemDoLivro;
  livro: LivroDaTela;
  acoes: AcoesMensagens;
  aoFechar: () => void;
}) {
  const [texto, setTexto] = useState(m.texto);
  const [salvo, setSalvo] = useState(m.texto);
  const [verOriginal, setVerOriginal] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  const mudou = salvo !== m.textoEnviado;

  function salvar() {
    if (texto.trim() === salvo.trim()) return;
    iniciar(async () => {
      const r = await acoes.editar(m.id, texto);
      if (!r.ok) return setErro(r.mensagem);
      setErro(null);
      setSalvo(texto.trim());
    });
  }

  function executar(f: () => Promise<{ ok: boolean; mensagem?: string }>) {
    iniciar(async () => {
      const r = await f();
      if (!r.ok) return setErro(r.mensagem ?? "Tente de novo.");
      aoFechar();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {m.fotoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL assinada de 10 min
        <img
          src={m.fotoUrl}
          alt={`Foto de ${m.nome}`}
          className="rounded-interno max-h-64 w-full object-cover"
        />
      ) : null}
      {m.audioUrl ? (
        <audio
          controls
          preload="none"
          src={m.audioUrl}
          aria-label={`Ouvir ${m.nome}`}
          className="w-full"
        />
      ) : null}
      {m.estado === "enviada" && livro.podeEscrever ? (
        <CampoTexto
          rotulo="Texto da mensagem"
          value={texto}
          maxLength={MAX_MENSAGEM_CARACTERES}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={salvar}
          rows={10}
          className="[&_textarea]:font-livro [&_textarea]:text-livro-20"
        />
      ) : (
        <p className="font-livro text-ui-17 text-tinta whitespace-pre-line">
          {m.texto}
        </p>
      )}
      {mudou ? (
        verOriginal ? (
          <div className="flex flex-col gap-1">
            <p className="text-ui-13 text-tinta-2">O que {m.nome} enviou:</p>
            <p className="font-livro text-ui-17 text-tinta-2 whitespace-pre-line">
              {m.textoEnviado}
            </p>
          </div>
        ) : (
          <Botao
            variante="texto"
            className="self-start"
            onClick={() => setVerOriginal(true)}
          >
            Ver o que {m.nome} enviou
          </Botao>
        )
      ) : null}
      {erro ? (
        <p role="alert" className="text-ui-15 text-erro">
          {erro}
        </p>
      ) : null}
      {pendente ? <p className="text-ui-13 text-tinta-2">Salvando…</p> : null}
      {m.estado === "enviada" ? (
        livro.podeEscrever ? (
          <Botao
            variante="texto"
            className="self-start"
            disabled={pendente}
            onClick={() => executar(() => acoes.arquivar(m.id, true))}
          >
            Arquivar
          </Botao>
        ) : null
      ) : (
        <div className="flex flex-col gap-3">
          {livro.podeEscrever ? (
            <Botao
              variante="secundario"
              className="self-start"
              disabled={pendente}
              onClick={() => executar(() => acoes.arquivar(m.id, false))}
            >
              Voltar para a lista
            </Botao>
          ) : null}
          {livro.ehResponsavel ? (
            confirmarApagar ? (
              <div className="flex flex-col gap-2">
                <p className="text-ui-15 text-tinta">
                  A voz e o texto de {m.nome} somem. Não dá para desfazer.
                </p>
                <div className="flex gap-3">
                  <Botao
                    variante="secundario"
                    carregando={pendente}
                    onClick={() => executar(() => acoes.apagar(m.id))}
                  >
                    Apagar para sempre
                  </Botao>
                  <Botao
                    variante="texto"
                    onClick={() => setConfirmarApagar(false)}
                  >
                    Cancelar
                  </Botao>
                </div>
              </div>
            ) : (
              <Botao
                variante="texto"
                className="self-start"
                onClick={() => setConfirmarApagar(true)}
              >
                Apagar para sempre
              </Botao>
            )
          ) : null}
        </div>
      )}
    </div>
  );
}
