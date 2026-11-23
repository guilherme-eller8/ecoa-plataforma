"use client";

// Quem ajuda (prompt 11): o responsável vê, convida (até MAX_COFACILITADORES), cancela e
// remove; o co-facilitador vê e pode sair. O banco confere cada regra; a tela só esconde.
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao, classesDoBotao } from "@/components/ui/botao";
import { Campo } from "@/components/ui/campo";
import { Copiar } from "@/components/ui/copiar";
import { EstadoVazio } from "@/components/ui/estado-vazio";
import { FolhaInferior } from "@/components/ui/folha-inferior";
import { IconeEnviar } from "@/components/ui/icones";
import { MAX_COFACILITADORES } from "@/lib/config";
import type {
  AcoesPessoas,
  ConviteDaTela,
  LivroDaTela,
  MembroDaTela,
} from "@/lib/livro/tipos";
import { linkWhatsApp } from "@/lib/whatsapp";

function nomeDe(m: MembroDaTela) {
  return m.nome || m.email || "Sem nome";
}

/** Convite pelo nome (P81): só o nome. Usado na tela e no passo Quem mais ajuda. */
export function FormConvite({
  convidar,
  aoConvidar,
  rotulo = "Criar convite",
}: {
  convidar: AcoesPessoas["convidar"];
  aoConvidar: (convite: ConviteDaTela) => void;
  rotulo?: string;
}) {
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await convidar(nome);
          if (!r.ok) return setErro(r.mensagem);
          setErro(null);
          setNome("");
          aoConvidar(r.dados.convite);
        });
      }}
    >
      <Campo
        rotulo="Nome de quem vai ajudar"
        autoComplete="off"
        autoCapitalize="words"
        maxLength={30}
        required
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        erro={erro ?? undefined}
      />
      <Botao type="submit" carregando={pendente} larguraTotal>
        {rotulo}
      </Botao>
    </form>
  );
}

/** O convite vai pelo WhatsApp de quem convidou (P9): nenhum e-mail sai da Ecoa. */
export function MandarConvite({
  convite,
  principal = false,
  children,
}: {
  convite: ConviteDaTela;
  principal?: boolean;
  children?: React.ReactNode; // mais ações na mesma linha (ex.: Cancelar)
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <a
        href={linkWhatsApp(convite.mensagem)}
        target="_blank"
        rel="noreferrer"
        className={classesDoBotao({
          variante: principal ? "principal" : "secundario",
          larguraTotal: principal,
        })}
      >
        <IconeEnviar tamanho={20} />
        <span>Mandar no WhatsApp</span>
      </a>
      <Copiar texto={convite.mensagem} rotulo="Copiar mensagem" />
      {children}
    </div>
  );
}

/** Situação do convite pendente, em poucas palavras. */
export function situacaoDoConvite(c: ConviteDaTela): {
  titulo: string;
  linha: string;
} {
  if (!c.nome)
    return {
      titulo: c.email ?? "Convite",
      linha: "Convite enviado. Esperando.",
    };
  if (!c.email) return { titulo: c.nome, linha: "Ainda não abriu o convite" };
  return { titulo: c.nome, linha: `${c.email}, ainda não entrou` };
}

function ConvitePendente({
  convite,
  cancelar,
}: {
  convite: ConviteDaTela;
  cancelar?: () => void;
}) {
  const { titulo, linha } = situacaoDoConvite(convite);
  return (
    <li className="rounded-cartao bg-papel border-linha flex flex-col gap-3 border p-5">
      <div className="flex flex-col gap-1">
        <p className="text-ui-17 text-tinta [overflow-wrap:anywhere]">
          {titulo}
        </p>
        <p className="text-ui-15 text-tinta-2 [overflow-wrap:anywhere]">
          {linha}
        </p>
      </div>
      <MandarConvite convite={convite}>
        {cancelar ? (
          <Botao variante="texto" onClick={cancelar}>
            Cancelar
          </Botao>
        ) : null}
      </MandarConvite>
    </li>
  );
}

export function TelaPessoas({
  livro,
  membros,
  convites: convitesIniciais,
  temLinks,
  acoes,
}: {
  livro: LivroDaTela;
  membros: MembroDaTela[];
  convites: ConviteDaTela[];
  temLinks: boolean;
  acoes: AcoesPessoas;
}) {
  const router = useRouter();
  const [convites, setConvites] = useState(convitesIniciais);
  const [convidando, setConvidando] = useState(false);
  const [criado, setCriado] = useState<ConviteDaTela | null>(null);
  const [removendo, setRemovendo] = useState<MembroDaTela | null>(null);
  const [trocarDepois, setTrocarDepois] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(
    null,
  );
  const [pendente, iniciar] = useTransition();

  const ajudantes = membros.filter((m) => m.papel === "cofacilitador");
  const vagas = MAX_COFACILITADORES - ajudantes.length - convites.length;
  const podeConvidar = livro.ehResponsavel && livro.podeEscrever && vagas > 0;

  function executar(
    acao: () => Promise<{ ok: boolean; mensagem?: string }>,
    sucesso: () => void,
  ) {
    iniciar(async () => {
      const r = await acao();
      if (!r.ok) return setAviso({ ok: false, texto: r.mensagem ?? "" });
      setAviso(null);
      sucesso();
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-8 px-5 pt-8 pb-12 md:max-w-2xl lg:max-w-3xl">
      <Link
        href={`/livro/${livro.id}/configuracoes`}
        className="text-ui-15 text-tinta-2 hover:text-tinta inline-flex min-h-11 items-center self-start"
      >
        ← Configurações
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="font-livro text-livro-28 text-tinta leading-tight">
          Quem ajuda
        </h1>
        <p className="text-ui-17 text-tinta-2">
          {livro.ehResponsavel
            ? `Até ${MAX_COFACILITADORES} pessoas editam o livro com você.`
            : "Quem faz o livro do " + livro.autor + "."}
        </p>
      </div>

      {aviso ? <Aviso ok={aviso.ok}>{aviso.texto}</Aviso> : null}

      {trocarDepois ? (
        <section className="rounded-cartao bg-papel border-linha flex flex-col gap-4 border p-5">
          <p className="text-ui-17 text-tinta">
            {trocarDepois} conhecia o link do {livro.autor} e o da família.
            Trocar os dois agora?
          </p>
          <p className="text-ui-15 text-tinta-2">
            Depois, mande os links novos ao {livro.autor} e ao grupo.
          </p>
          <div className="flex flex-wrap gap-3">
            <Botao
              variante="secundario"
              carregando={pendente}
              onClick={() =>
                executar(acoes.trocarLinks, () => {
                  setTrocarDepois(null);
                  setAviso({ ok: true, texto: "Links trocados." });
                })
              }
            >
              Trocar os links
            </Botao>
            <Link
              href={`/livro/${livro.id}/kit`}
              className={classesDoBotao({ variante: "texto" })}
            >
              Ver os links
            </Link>
            <Botao variante="texto" onClick={() => setTrocarDepois(null)}>
              Agora não
            </Botao>
          </div>
        </section>
      ) : null}

      <ul className="flex flex-col gap-3">
        {membros.map((m) => (
          <li
            key={m.userId}
            className="rounded-cartao bg-papel border-linha flex flex-wrap items-center justify-between gap-3 border p-5"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-ui-17 text-tinta [overflow-wrap:anywhere]">
                {nomeDe(m)}
                {m.ehVoce ? " (você)" : ""}
              </p>
              <p className="text-ui-15 text-tinta-2">
                {m.papel === "responsavel"
                  ? "Cuida do livro"
                  : "Ajuda a editar"}
              </p>
            </div>
            {livro.ehResponsavel && m.papel === "cofacilitador" ? (
              <Botao variante="texto" onClick={() => setRemovendo(m)}>
                Remover
              </Botao>
            ) : null}
            {!livro.ehResponsavel && m.ehVoce ? (
              <Botao variante="texto" onClick={() => setSaindo(true)}>
                Sair do livro
              </Botao>
            ) : null}
          </li>
        ))}
        {convites.map((c) => (
          <ConvitePendente
            key={c.id}
            convite={c}
            cancelar={
              livro.ehResponsavel
                ? () =>
                    executar(
                      () => acoes.cancelarConvite(c.id),
                      () =>
                        setConvites((cs) => cs.filter((x) => x.id !== c.id)),
                    )
                : undefined
            }
          />
        ))}
      </ul>

      {livro.ehResponsavel &&
      ajudantes.length === 0 &&
      convites.length === 0 ? (
        <EstadoVazio
          frase="Só você por enquanto. Chame um irmão para ajudar."
          acao={
            podeConvidar ? (
              <Botao onClick={() => setConvidando(true)}>Convidar</Botao>
            ) : null
          }
        />
      ) : podeConvidar ? (
        <Botao larguraTotal onClick={() => setConvidando(true)}>
          Convidar
        </Botao>
      ) : livro.ehResponsavel && vagas <= 0 ? (
        <p className="text-ui-15 text-tinta-2">
          O livro já tem {MAX_COFACILITADORES} pessoas ajudando. Cancele um
          convite para abrir vaga.
        </p>
      ) : null}

      <FolhaInferior
        aberta={convidando}
        aoFechar={() => {
          setConvidando(false);
          setCriado(null);
        }}
        titulo={criado ? `Convite para ${criado.nome ?? ""}` : "Convidar"}
      >
        {criado ? (
          <div className="flex flex-col gap-4">
            <p className="text-ui-17 text-tinta-2">
              O link é só para {criado.nome}. Mande pelo WhatsApp.
            </p>
            <MandarConvite convite={criado} principal />
          </div>
        ) : (
          <FormConvite
            convidar={acoes.convidar}
            aoConvidar={(convite) => {
              setCriado(convite);
              setConvites((cs) => [...cs, convite]);
            }}
          />
        )}
      </FolhaInferior>

      <FolhaInferior
        aberta={removendo !== null}
        aoFechar={() => setRemovendo(null)}
        titulo="Remover"
      >
        <p className="text-ui-17 text-tinta">
          {removendo ? nomeDe(removendo) : ""} deixa de ver e editar o livro na
          hora. O que já fez fica no livro.
        </p>
        <Botao
          larguraTotal
          carregando={pendente}
          onClick={() => {
            const m = removendo;
            if (!m) return;
            executar(
              () => acoes.remover(m.userId),
              () => {
                setRemovendo(null);
                if (temLinks) setTrocarDepois(nomeDe(m));
                router.refresh();
              },
            );
          }}
        >
          Remover
        </Botao>
      </FolhaInferior>

      <FolhaInferior
        aberta={saindo}
        aoFechar={() => setSaindo(false)}
        titulo="Sair do livro"
      >
        <p className="text-ui-17 text-tinta">
          Você deixa de ver o livro do {livro.autor}. Para voltar, precisa de um
          novo convite.
        </p>
        <Botao
          larguraTotal
          carregando={pendente}
          onClick={() =>
            executar(acoes.sair, () => {
              setSaindo(false);
              router.push("/");
            })
          }
        >
          Sair do livro
        </Botao>
      </FolhaInferior>
    </main>
  );
}
