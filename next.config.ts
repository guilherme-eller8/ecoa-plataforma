import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Os prompts são lidos do disco em tempo de execução (leitura dinâmica: o tracing não vê).
  // Typst (binário nativo) e mupdf (WASM) ficam fora do bundle e vão inteiros para a função.
  serverExternalPackages: ["@myriaddreamin/typst-ts-node-compiler", "mupdf"],
  outputFileTracingIncludes: {
    // Página de amostra: template e fontes lidos do disco.
    "/livro/[id]/historias/[historiaId]/amostra": [
      "./lib/livro/amostra.typ",
      "./lib/livro/fontes/*.ttf",
    ],
    // O ffmpeg do recorte do QR é achado em tempo de execução (o tracing não vê).
    "/api/inngest": [
      "./lib/ai/prompts/**/*",
      "./node_modules/ffmpeg-static/ffmpeg",
    ],
  },
  partialPrefetching: true,
  // O service worker nunca fica em cache: uma versão nova vale na próxima abertura.
  async headers() {
    return [
      // Player do QR: a URL assinada do áudio nunca fica em cache de ninguém.
      {
        source: "/ouvir/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
