import type { MetadataRoute } from "next";
import { FORMATOS_AUDIO } from "@/lib/config";

// App instalável (T16). No Android, o Ecoa aparece no Compartilhar do WhatsApp: o service
// worker (public/sw.js) recebe os áudios e abre /compartilhar. Sem modo offline.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ecoa Memórias",
    short_name: "Ecoa",
    description: "Do primeiro áudio ao livro de memórias.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5efe4",
    theme_color: "#f5efe4",
    lang: "pt-BR",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icones/icone-mascara-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    share_target: {
      action: "/compartilhar/receber",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        files: [
          {
            name: "audios",
            accept: ["audio/*", ...FORMATOS_AUDIO.map((f) => `.${f}`)],
          },
        ],
      },
    },
  };
}
