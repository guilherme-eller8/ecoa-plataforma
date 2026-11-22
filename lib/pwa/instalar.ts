// "Pôr na tela inicial" (T16): guarda o pedido de instalação do Chrome (Android), que chega
// uma vez só e pode chegar antes da tela que o usa. Importado no layout raiz pelo registro do
// service worker, para escutar desde o primeiro carregamento. No iPhone não há pedido: a tela
// explica o caminho pelo Compartilhar do Safari.

type PedidoDeInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let pedido: PedidoDeInstalacao | null = null;
const ouvintes = new Set<() => void>();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // a tela decide quando oferecer
    pedido = e as PedidoDeInstalacao;
    ouvintes.forEach((o) => o());
  });
  window.addEventListener("appinstalled", () => {
    pedido = null;
    ouvintes.forEach((o) => o());
  });
}

export function assinarInstalacao(aviso: () => void) {
  ouvintes.add(aviso);
  return () => void ouvintes.delete(aviso);
}

export function podeInstalar() {
  return pedido !== null;
}

/** Abre o pedido do Chrome. Devolve true se a pessoa aceitou. */
export async function instalar(): Promise<boolean> {
  const p = pedido;
  if (!p) return false;
  pedido = null; // o mesmo pedido não pode ser usado duas vezes
  ouvintes.forEach((o) => o());
  await p.prompt();
  const { outcome } = await p.userChoice;
  return outcome === "accepted";
}

/** Já aberto pelo ícone da tela inicial (Android ou iPhone). */
export function jaInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone ou iPad no Safari: lá não existe pedido, só o caminho manual. */
export function ehIos() {
  const ua = navigator.userAgent;
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes("Macintosh") && navigator.maxTouchPoints > 1)
  );
}
