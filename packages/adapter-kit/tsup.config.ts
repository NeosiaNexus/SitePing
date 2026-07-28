import { defineConfig } from "tsup";
import { sitepingLibrary } from "../../tsup.preset.js";

// vitest stays external automatically (optional peer, only needed by ./testing).
export default defineConfig(
  sitepingLibrary({
    platform: "neutral",
    entry: ["src/index.ts", "src/testing.ts"],
  }),
);
