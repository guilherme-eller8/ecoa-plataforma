import { defineConfig, devices } from "@playwright/test";

const PORTA = 3000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORTA}`,
    trace: "off",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "celular", use: { ...devices["Pixel 7"] } },
  ],
  // Testa o build de produção, como o usuário vai ver. Sem Supabase real: as variáveis são falsas
  // e as telas públicas não chamam o Supabase ao abrir. Nunca reaproveita um servidor de prévia.
  webServer: {
    command: `npm run build && npm run start -- -p ${PORTA}`,
    url: `http://localhost:${PORTA}/entrar`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_teste",
      SUPABASE_SECRET_KEY: "sb_secret_teste",
      RESEND_API_KEY: "re_teste",
      LINKS_SEGREDO_V1: "segredo_de_teste_com_mais_de_32_caracteres",
      // Libera /styleguide e as telas de exemplo no build de produção do teste.
      ECOA_STYLEGUIDE: "1",
    },
  },
});
