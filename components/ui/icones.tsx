// Ícones de contorno, 1.5px, uma família só. Sempre decorativos (aria-hidden):
// o nome acessível vem do texto ou do aria-label do controle.
import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { tamanho?: number };

function Base({ tamanho = 20, children, ...resto }: Props) {
  return (
    <svg
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...resto}
    >
      {children}
    </svg>
  );
}

export function IconeMicrofone(p: Props) {
  return (
    <Base {...p}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" />
    </Base>
  );
}

export function IconePausa(p: Props) {
  return (
    <Base {...p}>
      <path d="M9 5v14M15 5v14" />
    </Base>
  );
}

export function IconeParar(p: Props) {
  return (
    <Base {...p}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </Base>
  );
}

export function IconeCheck(p: Props) {
  return (
    <Base {...p}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Base>
  );
}

export function IconeFechar(p: Props) {
  return (
    <Base {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Base>
  );
}

export function IconeSeta(p: Props) {
  return (
    <Base {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Base>
  );
}

export function IconeEnviar(p: Props) {
  return (
    <Base {...p}>
      <path d="M4 12l16-8-6 16-2.5-6.5L4 12z" />
    </Base>
  );
}

export function IconeSubir(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
    </Base>
  );
}

export function IconeTocar(p: Props) {
  return (
    <Base {...p}>
      <path d="M8 5.5v13l10.5-6.5L8 5.5z" />
    </Base>
  );
}

export function IconeLivro(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13" />
    </Base>
  );
}

export function IconePerguntas(p: Props) {
  return (
    <Base {...p}>
      <path d="M5 5h14v10H10l-4 4v-4H5z" />
    </Base>
  );
}

export function IconeCadeado(p: Props) {
  return (
    <Base {...p}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Base>
  );
}

export function IconeVarinha(p: Props) {
  return (
    <Base {...p}>
      <path d="M5 19L15 9M14 4v2M19 9h2M17.5 6.5l1.5-1.5M10 5l.5 1.5M18 13.5l1.5.5" />
    </Base>
  );
}
