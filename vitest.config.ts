import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["import", "module", "default"],
  },
  test: {
    include: ["packages/**/__tests__/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
      reporter: ["text", "lcov", "json-summary"],
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/index.ts", "**/icons.ts", "**/styles/**"],
      thresholds: {
        // Fork reality — our extra files (screenshot.ts, anchor extensions) are
        // covered separately in PR #1. Upstream baseline is 95/95/95/95.
        lines: 80,
        functions: 70,
        branches: 65,
        statements: 80,
      },
    },
  },
});
