import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Os prompts são lidos do disco em tempo de execução (leitura dinâmica: o tracing não vê).
  outputFileTracingIncludes: {
    "/api/inngest": ["./lib/ai/prompts/**/*"],
  },
  partialPrefetching: true,
  // O service worker nunca fica em cache: uma versão nova vale na próxima abertura.
  async headers() {
    return [
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
