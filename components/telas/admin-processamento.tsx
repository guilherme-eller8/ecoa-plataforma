"use client";

// Admin → Processamento (prompt 6): histórias com falha, gravações que não viraram história e
// o custo de IA por livro. Os erros são códigos fixos, nunca texto da fala (T36).
import { useState, useTransition } from "react";
import { Aviso } from "@/components/ui/aviso";
import { Botao } from "@/components/ui/botao";
import type { Resultado } from "@/lib/resultado";

export type Falha = {
  id: string;
  autor: string;
  etapa: string | null;
  codigo: string | null;
  quando: string;
};
export type Esperando = {
  id: string;
  autor: string;
  origem: string;
  duracaoS: number | null;
  quando: string;
};
export type CustoDoLivro = {
  autor: string;
  reais: number;
  historias: number;
  minutos: number;
};

const data = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));

function BotaoAcao({
  rotulo,
  acao,
}: {
  rotulo: string;
  acao: () => Promise<Resultado>;
}) {
  const [pendente, iniciar] = useTransition();
  const [r, setR] = useState<Resultado | null>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      <Botao
        variante="secundario"
        carregando={pendente}
        onClick={() => iniciar(async () => setR(await acao()))}
      >
        {rotulo}
      </Botao>
      {r ? <Aviso ok={r.ok}>{r.mensagem}</Aviso> : null}
    </div>
  );
}

export function AdminProcessamento({
  falhas,
  esperando,
  custos,
  tentarDeNovo,
  processar,
}: {
  falhas: Falha[];
  esperando: Esperando[];
  custos: CustoDoLivro[];
  tentarDeNovo: (id: string) => Promise<Resultado>;
  processar: (id: string) => Promise<Resultado>;
}) {
  const titulo = "font-ui text-tinta text-[17px] font-semibold";
  const linha =
    "bg-papel rounded-2xl flex flex-wrap items-center justify-between gap-3 p-4";
  const apoio = "font-ui text-tinta-2 text-[15px]";
  return (
    <section
      aria-labelledby="titulo-processamento"
      className="flex flex-col gap-6"
    >
      <h2 id="titulo-processamento" className={titulo}>
        Processamento
      </h2>

      <div className="flex flex-col gap-3">
        <h3 className="font-ui text-tinta text-[15px] font-medium">
          Histórias com falha{" "}
          <span className="text-tinta-2 tabular-nums">{falhas.length}</span>
        </h3>
        {falhas.length === 0 ? (
          <p className={apoio}>Nenhuma falha.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {falhas.map((f) => (
              <li key={f.id} className={linha}>
                <div className="flex flex-col">
                  <span className="font-ui text-tinta text-[16px]">
                    {f.autor}
                  </span>
                  <span className={apoio}>
                    {f.etapa ?? "?"} · {f.codigo ?? "?"} · {data(f.quando)}
                  </span>
                </div>
                <BotaoAcao
                  rotulo="Tentar de novo"
                  acao={() => tentarDeNovo(f.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-ui text-tinta text-[15px] font-medium">
          Gravações sem história{" "}
          <span className="text-tinta-2 tabular-nums">{esperando.length}</span>
        </h3>
        {esperando.length === 0 ? (
          <p className={apoio}>Nenhuma.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {esperando.map((g) => (
              <li key={g.id} className={linha}>
                <div className="flex flex-col">
                  <span className="font-ui text-tinta text-[16px]">
                    {g.autor}
                  </span>
                  <span className={apoio}>
                    {g.origem}
                    {g.duracaoS
                      ? ` · ${Math.round(g.duracaoS / 60)} min`
                      : ""}{" "}
                    · {data(g.quando)}
                  </span>
                </div>
                <BotaoAcao rotulo="Processar" acao={() => processar(g.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="font-ui text-tinta text-[15px] font-medium">
          Custo de IA por livro
        </h3>
        {custos.length === 0 ? (
          <p className={apoio}>Nenhum gasto ainda.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {custos.map((c) => (
              <li key={c.autor} className={linha}>
                <span className="font-ui text-tinta text-[16px]">
                  {c.autor}
                </span>
                <span className={`${apoio} tabular-nums`}>
                  R$ {c.reais.toFixed(2).replace(".", ",")} · {c.historias}{" "}
                  {c.historias === 1 ? "história" : "histórias"} ·{" "}
                  {Math.round(c.minutos)} min de áudio
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
