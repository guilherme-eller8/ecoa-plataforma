"use client";

// Áudios recebidos: tudo o que já chegou, com player. Nada se apaga nesta fase.
import Link from "next/link";
import { useState } from "react";
import { classesDoBotao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { IconeMicrofone, IconeSubir } from "@/components/ui/icones";
import { formatarDuracao } from "@/lib/audios/formatos";
import type { AudioDaTela, LivroDaTela } from "@/lib/livro/tipos";

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

// Só o que não é óbvio: subido pelo responsável é o padrão e não ganha rótulo.
const ORIGEM: Partial<
  Record<AudioDaTela["origem"], (autor: string) => string>
> = {
  conversa: () => "Conversa gravada aqui",
  autor: (autor) => `Gravado por ${autor}`,
  livre: (autor) => `Gravado por ${autor}`,
};

function Player({ url, nome }: { url: string | null; nome: string }) {
  const [falhou, setFalhou] = useState(false);
  if (!url)
    return (
      <p className="text-ui-15 text-tinta-2">
        Não deu para carregar agora. Atualize a página.
      </p>
    );
  if (falhou)
    return (
      <p className="text-ui-15 text-tinta-2">
        Este celular não toca este formato. Ouça no computador ou atualize o
        iPhone.
      </p>
    );
  return (
    <audio
      controls
      preload="none"
      src={url}
      aria-label={`Ouvir ${nome}`}
      onError={() => setFalhou(true)}
      className="w-full"
    />
  );
}

// Todo áudio tem um selo com o estado de agora (D3 do prompt 7): nada fica sem status.
const ETAPA: Record<string, string> = {
  ouvindo: "Ouvindo…",
  dividindo: "Separando as histórias…",
  separar: "Confira as histórias",
  escrevendo: "Escrevendo…",
  pronta: "Virou história",
  falhou: "Não deu certo",
};

function Situacao({ livroId, audio }: { livroId: string; audio: AudioDaTela }) {
  const s = audio.situacao;
  const selo = "text-ui-13 rounded-full px-3 py-1";
  if (!s)
    return audio.processado ? null : (
      <span className={`${selo} bg-polen-2 text-tinta-2`}>Aguardando</span>
    );
  if (s.tipo === "historia")
    return (
      <Link
        href={
          s.estado === "separar"
            ? `/livro/${livroId}/historias/${s.historia}/dividir`
            : `/livro/${livroId}/historias/${s.historia}`
        }
        className={`${selo} bg-floresta-claro text-floresta font-medium`}
      >
        {ETAPA[s.estado] ?? "Ver a história"}
      </Link>
    );
  return s.confirmar ? (
    <Link
      href={`/livro/${livroId}/configuracoes#ia`}
      className={`${selo} bg-polen-2 text-floresta font-medium underline-offset-4 hover:underline`}
    >
      {s.rotulo}
    </Link>
  ) : (
    <span className={`${selo} bg-polen-2 text-tinta-2`}>{s.rotulo}</span>
  );
}

export function TelaAudios({
  livro,
  audios,
}: {
  livro: LivroDaTela;
  audios: AudioDaTela[];
}) {
  const nova = `/livro/${livro.id}/historias/nova`;
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
          Áudios recebidos
        </h1>
        {audios.length ? (
          <p className="text-ui-17 text-tinta-2">
            {audios.length === 1
              ? "1 áudio guardado"
              : `${audios.length} áudios guardados`}
          </p>
        ) : null}
      </div>

      {audios.length === 0 ? (
        <EstadoVazio
          frase="Nenhum áudio ainda."
          acao={
            livro.podeEscrever ? (
              <Link href={nova} className={classesDoBotao()}>
                <IconeSubir tamanho={20} />
                <span>Subir áudios</span>
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {audios.map((a, i) => {
              // Prompt 7: o 1º arquivo de um envio abre o grupo ("8 áudios · 13 de nov.").
              const abreEnvio =
                a.envio && audios[i - 1]?.envio?.id !== a.envio.id;
              const doEnvio = a.envio
                ? audios.filter((x) => x.envio?.id === a.envio!.id).length
                : 0;
              // Nome de arquivo ("PTT-2026…opus") não é título de livro: sem título nem
              // pergunta, o cartão mostra a data, e o arquivo vai para a linha de apoio.
              const quando = a.recebidoEm
                ? DATA.format(new Date(a.recebidoEm))
                : null;
              const gravadoAqui = a.origem !== "upload" && a.origem !== "lote";
              const tipo = a.origem === "conversa" ? "Conversa" : "Áudio";
              const nome =
                a.titulo ??
                a.pergunta ??
                (quando ? `${tipo} de ${quando.split(",")[0]}` : tipo);
              const apoio = [
                ORIGEM[a.origem]?.(livro.autor),
                a.titulo || a.pergunta || gravadoAqui ? quando : a.nomeArquivo,
                formatarDuracao(a.duracaoS),
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={a.id} className="flex flex-col gap-3">
                  {abreEnvio ? (
                    <p className="text-ui-15 text-tinta-2 pt-2 font-medium">
                      {a.envio!.total === doEnvio
                        ? `${doEnvio} áudios enviados juntos`
                        : `${doEnvio} de ${a.envio!.total} áudios enviados juntos`}
                      {quando ? ` · ${quando.split(",")[0]}` : ""}
                    </p>
                  ) : null}
                  <div className="rounded-cartao bg-papel border-linha flex flex-col gap-3 border p-5">
                    <p className="font-livro text-livro-24 text-tinta leading-snug [overflow-wrap:anywhere]">
                      {nome}
                    </p>
                    {a.titulo && a.pergunta ? (
                      <p className="text-ui-15 text-tinta-2">
                        Responde: {a.pergunta}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <p className="text-ui-15 text-tinta-2 [overflow-wrap:anywhere]">
                        {apoio}
                      </p>
                      <Situacao livroId={livro.id} audio={a} />
                    </div>
                    <Player url={a.url} nome={nome} />
                  </div>
                </li>
              );
            })}
          </ul>
          {livro.podeEscrever ? (
            <Link
              href={nova}
              className={
                classesDoBotao({ variante: "secundario", larguraTotal: true }) +
                " sm:w-auto sm:self-start"
              }
            >
              <IconeMicrofone tamanho={20} />
              <span>Nova história</span>
            </Link>
          ) : null}
        </>
      )}
    </main>
  );
}
