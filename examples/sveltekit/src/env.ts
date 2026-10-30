import { defineEnvVars } from "@sveltejs/kit/env";

export const variables = defineEnvVars({
  // Optional in development; the handler refuses to start in production without it.
  SITEPING_API_KEY: { schema: (value) => value },
});
