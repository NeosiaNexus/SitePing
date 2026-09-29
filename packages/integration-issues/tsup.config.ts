import { defineConfig } from "tsup";
import { sitepingLibrary } from "../../tsup.preset.js";

// One entry per provider so importing ./github never pulls the others.
// @siteping/server is a peer: only its types are imported.
export default defineConfig(
  sitepingLibrary({
    platform: "neutral",
    entry: {
      index: "src/index.ts",
      github: "src/providers/github.ts",
      gitlab: "src/providers/gitlab.ts",
    },
    external: [/^@siteping\/server(\/|$)/],
  }),
);
