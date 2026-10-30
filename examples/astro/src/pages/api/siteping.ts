import { MemoryStore } from "@siteping/adapter-memory";
import { createSitepingHandler, type SitepingHandler } from "@siteping/server";
import type { APIRoute } from "astro";
import { SITEPING_API_KEY } from "astro:env/server";

// Rendered on demand: the handler answers every request.
export const prerender = false;

// In memory: feedback lives until the server restarts. See the README to
// switch to a database.
const store = new MemoryStore();

// Built on the first request, not at import: the handler refuses to start in
// production without a key.
let handler: SitepingHandler | undefined;
const siteping = () => (handler ??= createSitepingHandler({ store, apiKey: SITEPING_API_KEY }));

export const GET: APIRoute = ({ request }) => siteping().GET(request);
export const POST: APIRoute = ({ request }) => siteping().POST(request);
export const PATCH: APIRoute = ({ request }) => siteping().PATCH(request);
export const DELETE: APIRoute = ({ request }) => siteping().DELETE(request);
export const OPTIONS: APIRoute = ({ request }) => siteping().OPTIONS(request);
