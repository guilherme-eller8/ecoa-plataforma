// Mensagem curta de retorno de uma ação (sucesso ou problema), lida por leitores de tela.
export function Aviso({
  ok,
  children,
}: {
  ok: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      role={ok ? "status" : "alert"}
      className={`font-ui rounded-2xl px-4 py-3 text-[16px] ${ok ? "bg-floresta/10 text-floresta" : "bg-[#f3dcd2] text-[#7a2e14]"}`}
    >
      {children}
    </p>
  );
}
