import { MARCA } from "@/lib/config";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
      <h1 className="font-livro text-tinta text-5xl">{MARCA}</h1>
      <p className="font-livro text-tinta-2 text-xl">
        Do primeiro áudio ao livro.
      </p>
    </main>
  );
}
