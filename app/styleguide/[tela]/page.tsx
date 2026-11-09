import { notFound } from "next/navigation";
import { TELAS, type Tela } from "@/lib/styleguide";
import { Vitrine } from "./vitrine";

// Vitrine das telas com dados falsos, para o gate de design. Fora do build com ECOA_PREVIA=1, é 404.
export function generateStaticParams() {
  return TELAS.map((tela) => ({ tela }));
}

export default async function Styleguide({
  params,
}: PageProps<"/styleguide/[tela]">) {
  if (process.env.ECOA_PREVIA !== "1") notFound();
  const { tela } = await params;
  if (!TELAS.includes(tela as Tela)) notFound();
  return <Vitrine tela={tela as Tela} />;
}
