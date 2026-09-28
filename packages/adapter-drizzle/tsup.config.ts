import { defineConfig } from "tsup";
import { sitepingLibrary } from "../../tsup.preset.js";

// drizzle-orm stays external (peer dependency); each dialect is its own entry
// so importing ./pg never pulls the SQLite builders and vice versa.
export default defineConfig(
  sitepingLibrary({
    platform: "neutral",
    entry: { index: "src/index.ts", pg: "src/pg/index.ts", libsql: "src/libsql/index.ts" },
    external: [/^drizzle-orm(\/|$)/],
  }),
);
