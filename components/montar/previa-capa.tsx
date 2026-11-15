// A capa aberta (contracapa, lombada e frente). No celular a folha de 357 mm ficaria ilegível:
// mostra a lombada e a frente, que é onde está o título; a partir de 640 px, a capa inteira.
export function PreviaDaCapa({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-cartao bg-polen-2 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- data: URL do Typst ou URL assinada */}
        <img
          src={src}
          alt={alt}
          className="-ml-[85%] block h-auto w-[185%] max-w-none sm:ml-0 sm:w-full"
        />
      </div>
      <p className="text-ui-13 text-tinta-2 sm:hidden">
        Lombada e frente da capa.
      </p>
    </div>
  );
}
