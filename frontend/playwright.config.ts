import { defineConfig } from "@playwright/test";

const useViteFrontend = process.env.E2E_USE_VITE === "true";
const baseURL = process.env.E2E_FRONTEND_URL ?? (useViteFrontend ? "http://localhost:5173" : "http://localhost");

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL,
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },
  webServer: useViteFrontend
    ? {
        command: "npm run dev",
        port: 5173,
        reuseExistingServer: true
      }
    : undefined
});
