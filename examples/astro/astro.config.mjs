// @ts-check
import node from "@astrojs/node";
import { defineConfig, envField } from "astro/config";

export default defineConfig({
  // The SitePing endpoint is rendered on demand; pages stay static.
  adapter: node({ mode: "standalone" }),
  env: {
    schema: {
      // Read when the server starts, never inlined in the build.
      SITEPING_API_KEY: envField.string({ context: "server", access: "secret", optional: true }),
    },
  },
});
