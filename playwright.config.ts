import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./playwright/tests",
  timeout: 60_000,
  expect: {
    timeout: 5_000,
  },
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:5010",
    headless: true,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx tsx server/index.ts",
    url: "http://127.0.0.1:5010",
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NODE_ENV: "development",
      PORT: "5010",
      DATABASE_URL: "postgresql://user:password@localhost:5432/test",
      SESSION_SECRET: "test-session-secret",
      REPLIT_DOMAINS: "localhost",
      REPL_ID: "local-repl",
      ISSUER_URL: "https://replit.com/oidc",
      GEMINI_API_KEY: "test-gemini-key",
    },
  },
});
