import { notFound } from "next/navigation";
import { TELAS, type Tela } from "@/lib/styleguide";
import { Vitrine } from "./vitrine";

// Vitrine das telas com dados falsos, para o gate de design. O layout do grupo (dev)
// devolve 404 fora do desenvolvimento, a menos que ECOA_STYLEGUIDE=1.
export function generateStaticParams() {
  return TELAS.map((tela) => ({ tela }));
}

export default async function Styleguide({
  params,
}: PageProps<"/styleguide/[tela]">) {
  const { tela } = await params;
  if (!TELAS.includes(tela as Tela)) notFound();
  return <Vitrine tela={tela as Tela} />;
}
