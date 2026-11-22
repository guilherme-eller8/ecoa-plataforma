// Dados falsos do prompt 14, parte 1 (compra pelo Mercado Pago) para o styleguide.
import type { LinhaCompra } from "@/components/telas/admin-compras";

export const COMPRA_DETALHE = "Um ano de gravações e um livro de 80 páginas.";

export const COMPRAS_FALSAS: LinhaCompra[] = [
  {
    id: "c0ffee00-0000-4000-8000-000000001401",
    criadoEm: "2026-11-21T14:05:00Z",
    email: "beatriz.souza@gmail.com",
    valorCentavos: 46700,
    meio: "credit_card",
    parcelas: 3,
    estado: "aprovado",
    alertas: [],
    acessoEnviado: true,
    livro: "00000000-0000-4000-8000-000000000001",
  },
  {
    id: "c0ffee00-0000-4000-8000-000000001402",
    criadoEm: "2026-11-21T13:40:00Z",
    email: "carlos.lima@hotmail.com",
    valorCentavos: 46700,
    meio: "bank_transfer",
    parcelas: 1,
    estado: "pendente",
    alertas: [],
    acessoEnviado: false,
    livro: null,
  },
  {
    id: "c0ffee00-0000-4000-8000-000000001403",
    criadoEm: "2026-11-20T19:12:00Z",
    email: "ana.prado@gmail.com",
    valorCentavos: 46700,
    meio: "credit_card",
    parcelas: 6,
    estado: "retido",
    alertas: ["valor_diferente"],
    acessoEnviado: false,
    livro: null,
  },
  {
    id: "c0ffee00-0000-4000-8000-000000001404",
    criadoEm: "2026-11-20T10:01:00Z",
    email: "joao@empresa.com.br",
    valorCentavos: 46700,
    meio: "credit_card",
    parcelas: 1,
    estado: "recusado",
    alertas: [],
    acessoEnviado: false,
    livro: null,
  },
];
