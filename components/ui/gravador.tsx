// Gravador visual (sem MediaRecorder: a gravação real chega no prompt 5).
// Botão de 120px, cronômetro e o ponto que pulsa enquanto grava.
import { formatarCronometro, falarDuracao } from "@/lib/ui/tempo";
import { IconeMicrofone, IconePausa } from "./icones";

export type EstadoGravador = "pronto" | "gravando" | "pausado";

type Props = {
  estado: EstadoGravador;
  segundos: number;
  aoTocar?: () => void; // gravar, pausar ou continuar
  aoConcluir?: () => void;
  desabilitado?: boolean;
};

const rotulos: Record<EstadoGravador, { botao: string; legenda: string }> = {
  pronto: { botao: "Gravar", legenda: "Toque para gravar" },
  gravando: { botao: "Pausar", legenda: "Gravando" },
  pausado: { botao: "Continuar gravando", legenda: "Pausado" },
};

export function Gravador({
  estado,
  segundos,
  aoTocar,
  aoConcluir,
  desabilitado,
}: Props) {
  const r = rotulos[estado];
  const ativo = estado !== "pronto";

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex min-h-11 items-center gap-3" aria-live="polite">
        {ativo ? (
          <>
            <span
              aria-hidden="true"
              className={
                "size-3.5 rounded-full " +
                (estado === "gravando"
                  ? "animate-pulsar bg-gravando"
                  : "bg-tinta-2")
              }
            />
            <span
              className="num font-ui text-livro-36 text-tinta"
              role="timer"
              aria-label={`${r.legenda}, ${falarDuracao(segundos)}`}
            >
              {formatarCronometro(segundos)}
            </span>
          </>
        ) : (
          <span className="text-ui-20 text-tinta-2">{r.legenda}</span>
        )}
      </div>

      <button
        type="button"
        onClick={aoTocar}
        disabled={desabilitado}
        aria-label={r.botao}
        className={
          "size-gravar text-papel inline-flex items-center justify-center rounded-full " +
          "ease-saida transition-[background-color,transform] duration-[var(--dur-rapida)] active:scale-95 " +
          "disabled:bg-polen-2 disabled:text-tinta-2 " +
          (estado === "gravando"
            ? "bg-tinta hover:bg-tinta/90"
            : "bg-floresta hover:bg-floresta-escuro")
        }
      >
        {estado === "gravando" ? (
          <IconePausa tamanho={44} />
        ) : (
          <IconeMicrofone tamanho={44} />
        )}
      </button>

      {ativo ? (
        <div className="min-h-alvo-autor flex items-center">
          <button
            type="button"
            onClick={aoConcluir}
            className="min-h-alvo-autor rounded-controle border-linha-forte bg-papel text-ui-20 text-tinta hover:bg-polen-2 inline-flex items-center border px-8 font-medium"
          >
            Concluir
          </button>
        </div>
      ) : null}
    </div>
  );
}
