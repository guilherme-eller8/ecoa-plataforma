"use client";

// Áudios recebidos: tudo o que já chegou, com player. Nada se apaga: arquivar tira o áudio da
// lista (P69), mesmo o que já virou história, e desarquivar o devolve.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AtualizarAoVivo } from "@/components/ui/atualizar-ao-vivo";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { IconeMicrofone, IconeSubir } from "@/components/ui/icones";
import { PlayerVoz } from "@/components/ui/player-voz";
import { formatarDuracao } from "@/lib/audios/formatos";
import { CabecalhoLivro } from "@/components/livro/cabecalho-livro";
import type {
  AcoesArquivar,
  AudioDaTela,
  LivroDaTela,
} from "@/lib/livro/tipos";

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

function Player({
  url,
  nome,
  duracaoS,
}: {
  url: string | null;
  nome: string;
  duracaoS: number | null;
}) {
  if (!url)
    return (
      <p className="text-ui-15 text-tinta-2">
        Não deu para carregar agora. Atualize a página.
      </p>
    );
  return (
    <PlayerVoz
      src={url}
      nome={nome}
      duracaoS={duracaoS}
      mensagemDeFalha="Este celular não toca este formato. Ouça no computador ou atualize o iPhone."
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
  acoes,
  vitrine = false,
}: {
  livro: LivroDaTela;
  audios: AudioDaTela[];
  acoes?: AcoesArquivar;
  vitrine?: boolean; // só na vitrine: sem Supabase, sem canal
}) {
  const router = useRouter();
  const nova = `/livro/${livro.id}/historias/nova`;
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const ativos = audios.filter((a) => !a.arquivado);
  const arquivados = audios.filter((a) => a.arquivado);
  const pode = livro.podeEscrever && Boolean(acoes);

  async function arquivar(a: AudioDaTela, sim: boolean) {
    if (!acoes) return;
    setOcupado(a.id);
    setAviso(null);
    const r = await acoes.arquivar(a.id, sim);
    setOcupado(null);
    if (!r.ok) {
      setAviso(r.mensagem);
      return;
    }
    setAviso(
      !sim
        ? "O áudio voltou para a lista."
        : a.situacao?.tipo === "historia"
          ? "Arquivado. A história e o QR dele continuam no livro."
          : "Arquivado. Dá para desarquivar quando quiser.",
    );
    router.refresh();
  }

  // Algo ainda vai mudar de situação sozinho: a tela relê o servidor e assina o canal do livro.
  const andando = ativos.some((a) => {
    const s = a.situacao;
    if (!s) return !a.processado;
    return s.tipo === "historia"
      ? s.estado === "ouvindo" ||
          s.estado === "dividindo" ||
          s.estado === "escrevendo"
      : Boolean(s.andando);
  });

  // Nome de arquivo ("PTT-2026…opus") não é título de livro nem linha de apoio: sem título
  // nem pergunta, o cartão mostra o tipo e a data.
  function textos(a: AudioDaTela) {
    const quando = a.recebidoEm ? DATA.format(new Date(a.recebidoEm)) : null;
    const tipo = a.origem === "conversa" ? "Conversa" : "Áudio";
    const nome =
      a.titulo ??
      a.pergunta ??
      (quando ? `${tipo} de ${quando.split(",")[0]}` : tipo);
    const apoio = [
      ORIGEM[a.origem]?.(livro.autor),
      quando,
      formatarDuracao(a.duracaoS),
    ]
      .filter(Boolean)
      .join(" · ");
    return { quando, nome, apoio };
  }

  return (
    <>
      <CabecalhoLivro livroId={livro.id} secao="audios" />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-5 pt-6 pb-12 md:max-w-3xl md:pt-10 lg:max-w-5xl">
        {vitrine ? null : (
          <AtualizarAoVivo livroId={livro.id} ativo={andando} />
        )}
        <div className="flex flex-col gap-2">
          <h1 className="font-livro text-livro-28 text-tinta leading-tight">
            Áudios recebidos
          </h1>
          {ativos.length ? (
            <p className="text-ui-17 text-tinta-2">
              {ativos.length === 1
                ? "1 áudio guardado"
                : `${ativos.length} áudios guardados`}
            </p>
          ) : null}
          {aviso ? (
            <p role="status" className="text-ui-15 text-floresta">
              {aviso}
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
            {ativos.length === 0 ? (
              <p className="text-ui-17 text-tinta-2">
                Todos os áudios estão arquivados.
              </p>
            ) : (
              <ul className="grid items-start gap-4 lg:grid-cols-2">
                {ativos.map((a, i) => {
                  // Prompt 7: o 1º arquivo de um envio abre o grupo ("8 áudios · 13 de nov.").
                  const abreEnvio =
                    a.envio && ativos[i - 1]?.envio?.id !== a.envio.id;
                  const doEnvio = a.envio
                    ? ativos.filter((x) => x.envio?.id === a.envio!.id).length
                    : 0;
                  const { quando, nome, apoio } = textos(a);
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
                        <Player url={a.url} nome={nome} duracaoS={a.duracaoS} />
                        {pode ? (
                          <Botao
                            variante="texto"
                            className="self-start"
                            carregando={ocupado === a.id}
                            onClick={() => void arquivar(a, true)}
                          >
                            Arquivar
                          </Botao>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {livro.podeEscrever ? (
              <Link
                href={nova}
                className={
                  classesDoBotao({
                    variante: "secundario",
                    larguraTotal: true,
                  }) + " sm:w-auto sm:self-start"
                }
              >
                <IconeMicrofone tamanho={20} />
                <span>Nova história</span>
              </Link>
            ) : null}

            {arquivados.length ? (
              <details className="pt-6">
                <summary className="text-ui-17 text-floresta min-h-alvo cursor-pointer font-medium">
                  {arquivados.length === 1
                    ? "1 áudio arquivado"
                    : `${arquivados.length} áudios arquivados`}
                </summary>
                <ul className="mt-4 grid items-start gap-4 lg:grid-cols-2">
                  {arquivados.map((a) => {
                    const { nome, apoio } = textos(a);
                    return (
                      <li
                        key={a.id}
                        className="rounded-cartao bg-papel border-linha flex flex-col gap-3 border p-5"
                      >
                        <p className="font-livro text-livro-24 text-tinta leading-snug [overflow-wrap:anywhere]">
                          {nome}
                        </p>
                        <p className="text-ui-15 text-tinta-2 [overflow-wrap:anywhere]">
                          {apoio}
                        </p>
                        <Player url={a.url} nome={nome} duracaoS={a.duracaoS} />
                        {pode ? (
                          <Botao
                            variante="secundario"
                            className="self-start"
                            carregando={ocupado === a.id}
                            onClick={() => void arquivar(a, false)}
                          >
                            Desarquivar
                          </Botao>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
