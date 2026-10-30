import { SITEPING_API_KEY } from "$app/env/private";
import { MemoryStore } from "@siteping/adapter-memory";
import { createSitepingHandler, type SitepingHandler } from "@siteping/server";
import type { RequestHandler } from "./$types";

// In memory: feedback lives until the server restarts. See the README to
// switch to a database.
const store = new MemoryStore();

// Built on the first request, not at import: `vite build` imports this module
// to analyse it, and the handler refuses to start in production without a key.
let handler: SitepingHandler | undefined;
const siteping = () => (handler ??= createSitepingHandler({ store, apiKey: SITEPING_API_KEY }));

export const GET: RequestHandler = ({ request }) => siteping().GET(request);
export const POST: RequestHandler = ({ request }) => siteping().POST(request);
export const PATCH: RequestHandler = ({ request }) => siteping().PATCH(request);
export const DELETE: RequestHandler = ({ request }) => siteping().DELETE(request);
export const OPTIONS: RequestHandler = ({ request }) => siteping().OPTIONS(request);
