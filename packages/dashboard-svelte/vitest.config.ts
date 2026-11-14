import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

// A project of the root vitest config (see its `projects`): compiles the
// `.svelte` components and `.svelte.ts` rune modules, and resolves Svelte's
// `browser` entry points — its default `node` entry has no client runtime,
// so `mount` would throw under jsdom.
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ["browser", "import", "module", "default"],
  },
  test: {
    name: "dashboard-svelte",
    include: ["__tests__/**/*.test.ts"],
    typecheck: {
      enabled: true,
      include: ["__tests__/**/*.test-d.ts"],
      tsconfig: "./tsconfig.json",
    },
  },
});
