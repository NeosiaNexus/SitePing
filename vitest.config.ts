import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["import", "module", "default"],
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
