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
      exclude: [
        "**/*.test.ts",
        "**/index.ts",
        "**/icons.ts",
        "**/styles/**",
        // html2canvas wrapper — the success/downscale paths require a real
        // browser canvas (jsdom can't drive `getContext('2d').drawImage` or
        // `toDataURL` for image data). Failure-path test lives in
        // `__tests__/widget/screenshot.test.ts`; the happy path is covered
        // by E2E and manual smoke tests.
        "**/widget/src/screenshot.ts",
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
});
