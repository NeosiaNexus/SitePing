import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    // Use the automatic JSX runtime so `*.test.tsx` files don't need a `React`
    // import in scope. Matches Next.js / modern React defaults.
    jsx: "automatic",
  },
  resolve: {
    conditions: ["import", "module", "default"],
  },
  test: {
    include: ["packages/**/__tests__/**/*.test.{ts,tsx}"],
    setupFiles: ["packages/widget/__tests__/setup-i18n.ts"],
    // Type-level tests: *.test-d.ts files are statically checked by tsc via
    // vitest's typecheck mode (they never execute). They lock the public
    // contracts — config unions rejecting invalid combos, the store
    // interface, event maps — so a d.ts-breaking refactor fails `test:run`
    // instead of a downstream consumer.
    typecheck: {
      enabled: true,
      include: ["packages/**/__tests__/**/*.test-d.{ts,tsx}"],
      tsconfig: "./tsconfig.typecheck.json",
    },
    // Cap workers so a local run leaves CPU headroom for the editor — on WSL2
    // vscode-server shares the VM and a full-core run freezes it. Don't go
    // lower: jsdom DOMs are retained in the heap, and a worker reused across
    // more files balloons to ~15 GB at 2. No-op in CI (≤4 cores).
    // (vitest 4 replaced poolOptions.forks.maxForks with top-level maxWorkers.)
    maxWorkers: 4,
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
        // Recalibrated for the vitest 4 measurement change: v4 always
        // reports executed files, so the 17 dashboard .tsx components —
        // silently excluded by the *.ts include glob until then — now
        // count. Same suite, honest totals: functions 97.7→94.3,
        // branches 92.3→88.2. Issue #252 tracks covering those components
        // and ratcheting these back up (branches toward 92 then 95,
        // functions to 95).
        functions: 94,
        branches: 88,
        statements: 95,
      },
    },
  },
});
