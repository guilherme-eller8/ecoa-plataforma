// /styleguide e as telas de exemplo existem só em desenvolvimento.
// Para o gate de design no build de produção: ECOA_STYLEGUIDE=1 npm run build.
export function styleguideLiberado(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NODE_ENV !== "production" || env.ECOA_STYLEGUIDE === "1";
}
