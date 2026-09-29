import { defineConfig } from "tsup";
import { sitepingLibrary } from "../../tsup.preset.js";

// One entry per provider so importing ./github never pulls the others.
// @siteping/server is a peer: only its types are imported.
export default defineConfig(
  sitepingLibrary({
    platform: "neutral",
    entry: {
      index: "src/index.ts",
      github: "src/github/index.ts",
      gitlab: "src/gitlab/index.ts",
    },
    external: [/^@siteping\/server(\/|$)/],
  }),
);
