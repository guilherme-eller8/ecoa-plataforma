#!/usr/bin/env node
// Gate de design: roda o inspetor da skill design-taste-frontend em cada tela,
// em 390, 768 e 1440 px, com as regras de tela de app. Screenshots em
// .taste-skill/inspect/<tela>/. Precisa do build rodando (npm run start).
//
//   npm run taste:inspect                 → todas as telas
//   npm run taste:inspect -- autor        → só uma
import { spawnSync } from "node:child_process";

const BASE = process.env.TASTE_BASE ?? "http://localhost:3000";
const TELAS = {
  responsavel: "/styleguide/responsavel",
  autor: "/styleguide/autor",
  styleguide: "/styleguide",
  entrar: "/styleguide/entrar",
  livro: "/styleguide/livro",
  admin: "/styleguide/admin",
};

const escolhidas = process.argv.slice(2).filter((a) => a in TELAS);
let falhou = false;

for (const nome of escolhidas.length ? escolhidas : Object.keys(TELAS)) {
  console.log(`\n━━ ${nome} (${TELAS[nome]}) ━━`);
  const r = spawnSync(
    process.execPath,
    [
      ".claude/skills/design-taste-frontend/scripts/inspect.mjs",
      BASE + TELAS[nome],
      "--app",
      "--allow",
      "palette-cream",
      "--out",
      `.taste-skill/inspect/${nome}`,
    ],
    { stdio: "inherit" },
  );
  if (r.status !== 0) falhou = true;
}

process.exit(falhou ? 1 : 0);
