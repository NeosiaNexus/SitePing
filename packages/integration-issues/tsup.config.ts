import { defineConfig } from "tsup";
import { sitepingLibrary } from "../../tsup.preset.js";

// One entry per provider so importing ./github never pulls the others.
// No @siteping/server import, not even a type (check:consistency enforces
// it): the hooks are typed structurally, so the package installs next to
// any server version.
export default defineConfig(
  sitepingLibrary({
    platform: "neutral",
    entry: {
      index: "src/index.ts",
      github: "src/providers/github.ts",
      gitlab: "src/providers/gitlab.ts",
    },
  }),
);
