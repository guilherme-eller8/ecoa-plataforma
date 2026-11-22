// Lista Compras do admin (prompt 14, parte 1): as últimas 30, com o estado e o alerta.
// Só leitura: ativar à mão e trocar responsável continuam no formulário de cima.
import Link from "next/link";
import { fraseDoAlerta, type PagamentoEstado } from "@/lib/pagamento/estado";

export type LinhaCompra = {
  id: string;
  criadoEm: string;
  email: string;
  valorCentavos: number;
  meio: string | null;
  parcelas: number | null;
  estado: PagamentoEstado;
  alertas: string[];
  acessoEnviado: boolean;
  livro: string | null;
};

const ROTULO: Record<PagamentoEstado, string> = {
  criado: "Abriu o pagamento",
  pendente: "Esperando",
  aprovado: "Aprovada",
  recusado: "Recusada",
  retido: "Retida: conferir",
  estornado: "Estornada",
};

const COR: Record<PagamentoEstado, string> = {
  criado: "text-tinta-2",
  pendente: "text-tinta-2",
  aprovado: "text-floresta",
  recusado: "text-tinta-2",
  retido: "text-[#7a2e14]",
  estornado: "text-[#7a2e14]",
};

const MEIO: Record<string, string> = {
  credit_card: "Cartão",
  debit_card: "Débito",
  bank_transfer: "Pix",
  account_money: "Saldo MP",
};

const quando = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));

const reais = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

export function AdminCompras({ compras }: { compras: LinhaCompra[] }) {
  return (
    <section aria-labelledby="titulo-compras" className="flex flex-col gap-4">
      <h2
        id="titulo-compras"
        className="font-ui text-tinta text-[17px] font-semibold"
      >
        Compras{" "}
        <span className="text-tinta-2 font-normal tabular-nums">
          {compras.length}
        </span>
      </h2>
      {compras.length === 0 ? (
        <p className="font-ui text-tinta-2 text-[16px]">
          Nenhuma compra pelo Mercado Pago ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {compras.map((c) => (
            <li
              key={c.id}
              className="bg-papel font-ui flex flex-col gap-1.5 rounded-2xl px-5 py-4 text-[15px]"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="text-tinta text-[16px] font-medium [overflow-wrap:anywhere]">
                  {c.email}
                </span>
                <span className={`font-medium ${COR[c.estado]}`}>
                  {ROTULO[c.estado]}
                </span>
              </div>
              <p className="text-tinta-2 tabular-nums">
                {quando(c.criadoEm)} · {reais(c.valorCentavos)}
                {c.meio ? ` · ${MEIO[c.meio] ?? c.meio}` : ""}
                {c.parcelas && c.parcelas > 1 ? ` em ${c.parcelas}x` : ""}
                {c.estado === "aprovado"
                  ? c.acessoEnviado
                    ? " · acesso enviado"
                    : " · acesso ainda não saiu"
                  : ""}
              </p>
              {c.alertas.map((a) => (
                <p key={a} className="text-[#7a2e14]">
                  {fraseDoAlerta(a)}
                </p>
              ))}
              <p className="text-tinta-2 flex flex-wrap gap-x-4 text-[13px]">
                <span className="tabular-nums">Compra {c.id.slice(0, 8)}</span>
                {c.livro ? (
                  <Link
                    href={`/admin/aderencia/${c.livro}`}
                    className="text-floresta underline underline-offset-4"
                  >
                    Ver o livro
                  </Link>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
