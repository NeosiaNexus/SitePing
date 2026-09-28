/**
 * Real-stack E2E server (port 3998).
 *
 * `server.mjs` fakes the HTTP API with a hand-written in-memory store, so it
 * never exercises the server side. This one wires the widget and the
 * dashboard to the real thing — built dists, no mocks:
 *
 *   /api/siteping   → `createSitepingHandler` (adapter-prisma) over a
 *                     `MemoryStore` (adapter-memory): real schema validation,
 *                     replay detection, webhooks, status/resolvedAt pairing.
 *   /               → a page running the widget in HTTP mode against it.
 *   /inbox          → `<SitepingInbox />` (dashboard) against the same API,
 *                     bundled with esbuild at startup.
 *   /__e2e/webhook  → generic-webhook receiver; GET /__e2e/webhooks lists
 *                     what it received, for assertions.
 *
 * Tests isolate by project name, one per test attempt (retry and repeat-each
 * included — see `projectFor` in stack.spec.ts), so no global reset is needed
 * and specs can run in parallel against the shared store.
 *
 * Requires `bun run build` (widget, dashboard, adapter-prisma, adapter-memory).
 */
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PORT = 3998;
const ORIGIN = `http://localhost:${PORT}`;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkg = (name) => join(root, "packages", name);

// Workspace packages use isolated installs: resolve each dist by path, and
// its own dependencies (zod, react, esbuild) from the package that owns them.
const { createSitepingHandler } = await import(pathToFileURL(join(pkg("adapter-prisma"), "dist/index.js")).href);
const { MemoryStore } = await import(pathToFileURL(join(pkg("adapter-memory"), "dist/index.js")).href);
const esbuild = createRequire(join(pkg("widget"), "package.json"))("esbuild");

const store = new MemoryStore();
/** Bodies received by the generic webhook, in arrival order. */
const webhookLog = [];

const handler = createSitepingHandler({
  store,
  // Same posture as the demo app: no apiKey, destructive methods left open
  // so the dashboard (PATCH/DELETE) works without auth plumbing.
  requireAuthForDestructive: false,
  webhooks: [{ url: `${ORIGIN}/__e2e/webhook`, type: "generic" }],
});

const widgetDist = join(pkg("widget"), "dist");

const inboxBundle = (
  await esbuild.build({
    stdin: {
      contents: `
        import { createElement } from "react";
        import { createRoot } from "react-dom/client";
        import { SitepingInbox } from ${JSON.stringify(join(pkg("dashboard"), "dist/index.js"))};
        const params = new URLSearchParams(location.search);
        createRoot(document.getElementById("root")).render(
          createElement(SitepingInbox, {
            endpoint: params.get("endpoint") ?? "/api/siteping",
            projects: [params.get("project") ?? "e2e-stack"],
            locale: "en",
            theme: "light",
          }),
        );
      `,
      resolveDir: pkg("dashboard"),
      loader: "js",
    },
    bundle: true,
    format: "esm",
    write: false,
    define: { "process.env.NODE_ENV": '"production"' },
  })
).outputFiles[0].text;

function widgetPage(params) {
  const project = params.get("project") ?? "e2e-stack";
  const rtl = params.get("rtl") === "1";
  const diag = Number(params.get("diag"));
  const config = {
    endpoint: params.get("endpoint") ?? "/api/siteping",
    projectName: project,
    forceShow: true,
    // Skips the identity modal — the submission path is what's under test.
    identity: { name: "E2E Tester", email: "e2e@example.com" },
    ...(diag ? { captureDiagnostics: { maxConsoleEntries: diag, maxNetworkEntries: diag } } : {}),
  };
  // Inlined into a <script>: `<` is escaped so a query param can neither
  // close the element (`</script>`) nor open a `<!--`.
  return `<!DOCTYPE html>
<html lang="en"${rtl ? ' dir="rtl"' : ""}>
<head>
  <meta charset="UTF-8">
  <title>Siteping real-stack E2E</title>
  <style>
    body { font-family: system-ui; margin: 0; padding: 40px; }
    #target-element { background: #e8f4ff; padding: 40px; width: 600px; }
    /* RTL pages overflow to the left: window.scrollX goes negative. */
    .wide { width: 4000px; height: 20px; }
  </style>
</head>
<body>
  <h1>Real-stack test page</h1>
  <p id="target-element">Annotate me.</p>
  ${rtl ? '<div class="wide"></div>' : ""}
  <div style="height: 1500px"></div>
  <script>globalThis.process = { env: { NODE_ENV: "test" } };</script>
  <script type="module">
    import { initSiteping } from "/widget.js";
    window.__siteping = initSiteping(${JSON.stringify(config).replace(/</g, "\\u003c")});
  </script>
</body>
</html>`;
}

const INBOX_PAGE = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Siteping inbox E2E</title></head>
<body style="margin:0"><div id="root" style="height:100vh"></div><script type="module" src="/inbox.js"></script></body>
</html>`;

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Node request → Fetch `Request` → handler → Node response. */
async function callHandler(req, res, url) {
  const method = req.method ?? "GET";
  const route = handler[method];
  if (!route) {
    res.writeHead(405).end();
    return;
  }
  const body = method === "GET" || method === "HEAD" || method === "OPTIONS" ? undefined : await readBody(req);
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(name, value);
  }
  const response = await route(new Request(url, { method, headers, ...(body ? { body } : {}) }));
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", ORIGIN);
  try {
    if (url.pathname === "/api/siteping") return await callHandler(req, res, url);

    if (url.pathname === "/__e2e/webhook" && req.method === "POST") {
      webhookLog.push(JSON.parse((await readBody(req)).toString("utf-8")));
      res.writeHead(204).end();
      return;
    }
    if (url.pathname === "/__e2e/webhooks") {
      const project = url.searchParams.get("projectName");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(webhookLog.filter((w) => !project || w.projectName === project)));
      return;
    }

    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": "text/html" }).end(widgetPage(url.searchParams));
      return;
    }
    if (url.pathname === "/inbox") {
      res.writeHead(200, { "Content-Type": "text/html" }).end(INBOX_PAGE);
      return;
    }
    if (url.pathname === "/inbox.js") {
      res.writeHead(200, { "Content-Type": "application/javascript" }).end(inboxBundle);
      return;
    }
    // Widget ESM entry + its code-split chunks.
    if (/^\/[A-Za-z0-9_-]+\.js$/.test(url.pathname)) {
      const file = url.pathname === "/widget.js" ? "index.js" : url.pathname.slice(1);
      const filePath = normalize(join(widgetDist, file));
      if (filePath.startsWith(widgetDist) && existsSync(filePath)) {
        res.writeHead(200, { "Content-Type": "application/javascript" }).end(readFileSync(filePath));
        return;
      }
    }
    res.writeHead(404).end("not found");
  } catch (error) {
    console.error("[stack-server]", error);
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
});

// Loopback only: the API is unauthenticated and destructive methods are open.
server.listen(PORT, "127.0.0.1", () => console.log(`[stack-server] listening on ${ORIGIN}`));
