import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  // e2e/*.test.mjs are vitest unit tests of the fixture servers' helpers.
  testMatch: "**/*.spec.ts",
  timeout: 15_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: [
    // Fake in-memory API — widget.spec.ts
    {
      command: "node e2e/server.mjs",
      port: 3999,
      reuseExistingServer: false,
    },
    // Real createSitepingHandler + MemoryStore, widget + dashboard — stack.spec.ts
    {
      command: "node e2e/stack-server.mjs",
      port: 3998,
      reuseExistingServer: false,
    },
  ],
});
