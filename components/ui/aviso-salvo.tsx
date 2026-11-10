// Aviso discreto de salvamento. Fica numa região viva: o leitor de tela anuncia
// "Salvo" sem roubar o foco. Some sozinho quando o estado volta a "parado".
import { IconeCheck } from "./icones";

export type EstadoSalvo = "parado" | "salvando" | "salvo" | "erro";

export function AvisoSalvo({ estado }: { estado: EstadoSalvo }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-ui-15 inline-flex min-h-8 items-center gap-2"
    >
      {estado === "salvando" ? (
        <span className="text-tinta-2">Salvando…</span>
      ) : estado === "salvo" ? (
        <span
          key="salvo"
          className="animate-surgir text-floresta inline-flex items-center gap-1.5"
        >
          <IconeCheck tamanho={18} />
          Salvo
        </span>
      ) : estado === "erro" ? (
        <span className="text-erro">Não salvou. Tentando de novo…</span>
      ) : null}
    </p>
  );
}
