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
  // Testa o build de produção, como o usuário vai ver.
  webServer: {
    command: `npm run build && npm run start -- -p ${PORTA}`,
    url: `http://localhost:${PORTA}`,
    reuseExistingServer: !process.env.CI,
    // Libera /styleguide e as telas de exemplo no build de produção do teste.
    env: { ECOA_STYLEGUIDE: "1" },
    timeout: 180_000,
  },
});
