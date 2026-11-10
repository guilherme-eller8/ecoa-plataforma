"use client";

// Registra o service worker do Compartilhar (public/sw.js). Só no navegador, sem bloquear nada.
import { useEffect } from "react";

export function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {});
  }, []);
  return null;
}
