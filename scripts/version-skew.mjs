#!/usr/bin/env node
// Version-skew gate (#421 A3): the packages already on npm keep working with
// the code on `main`, before `main` ships.
//
//   1. Published adapters against main's server. `main`'s @siteping/server is
//      packed, installed next to the latest published adapters, and a strict
//      TypeScript consumer mounts each adapter's store behind its
//      `createSitepingHandler`. The adapters' own declaration files are
//      type-checked too, so a type they import from the server that `main`
//      renamed fails here. A runtime round trip (create, then list) runs
//      through the published stores that need no database.
//   2. Main's clients against the oldest supported server. The widget's HTTP
//      client (bundled from source: it is internal) and the dashboard's
//      endpoint source (from its built dist) send, list, reply, change a
//      status and delete through a published server's handler.
//
// Requires a build (`bun run build`) and network access to the npm registry.
// `--keep` leaves the temporary directory in place for inspection.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "tsup";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));

// The oldest @siteping/server that the widget and dashboard of `main` must
// keep talking to. Before 1.0 there is no compatibility floor, so it is the
// latest release; set it to "1.0.0" when 1.0 ships (1.x clients talk to any
// 1.x server).
const MINIMUM_SERVER = "latest";

// Published versions a change breaks on purpose: a `!` commit, whose package
// ships the matching release. Each entry names the highest published version
// known to break, so it stops matching once the fixed release is on npm and
// the check covers the package again (remove the entry then). A known break
// is reported, not failed. Example: { "@siteping/adapter-memory": "0.5.4" }.
const KNOWN_BREAKS = {};

const ENDPOINT = "https://skew.test/api/siteping";
const API_KEY = "skew-key";
const PROJECT = "skew";

// Each published adapter, with the strict TypeScript that mounts its store
// behind main's handler. One file per adapter, so an error names it.
const ADAPTERS = {
  "@siteping/adapter-memory": `
import { createSitepingHandler, type SitepingStore } from "@siteping/server";
import { MemoryStore } from "@siteping/adapter-memory";

const store: SitepingStore = new MemoryStore();
createSitepingHandler({ store, apiKey: "key" });
`,
  "@siteping/adapter-localstorage": `
import { createSitepingHandler, type SitepingStore } from "@siteping/server";
import { LocalStorageStore } from "@siteping/adapter-localstorage";

const store: SitepingStore = new LocalStorageStore({ key: "siteping" });
createSitepingHandler({ store, apiKey: "key" });
`,
  "@siteping/adapter-prisma": `
import { createSitepingHandler, type SitepingStore } from "@siteping/server";
import { createSitepingHandler as createPrismaHandler, PrismaStore } from "@siteping/adapter-prisma";

declare const prisma: ConstructorParameters<typeof PrismaStore>[0];
const store: SitepingStore = new PrismaStore(prisma);
createSitepingHandler({ store, apiKey: "key" });
createPrismaHandler({ prisma, apiKey: "key" });
createPrismaHandler({ store, apiKey: "key" });
`,
  "@siteping/adapter-drizzle": `
import { createSitepingHandler, type SitepingStore } from "@siteping/server";
import { type AnyLibSQLDatabase, createLibSQLSitepingStore } from "@siteping/adapter-drizzle/libsql";
import { type AnyPgDatabase, createPgSitepingStore } from "@siteping/adapter-drizzle/pg";

declare const pg: AnyPgDatabase;
declare const libsql: AnyLibSQLDatabase;
const stores: SitepingStore[] = [createPgSitepingStore(pg), createLibSQLSitepingStore(libsql)];
for (const store of stores) createSitepingHandler({ store, apiKey: "key" });
`,
};

const failures = [];
const acknowledged = [];
const keep = process.argv.includes("--keep");
const work = mkdtempSync(join(tmpdir(), "siteping-skew-"));

function step(label) {
  console.log(`\n[version-skew] ${label}`);
}

/** Record an incompatibility; `published` is the npm release it concerns, which `KNOWN_BREAKS` may excuse. */
function fail(subject, against, detail, published) {
  const message = `${subject}, against ${against}:\n    ${detail.replaceAll("\n", "\n    ")}`;
  const known = published && KNOWN_BREAKS[published.name];
  if (known && compare(parseVersion(published.version), parseVersion(known)) <= 0) acknowledged.push(message);
  else failures.push(message);
}

function run(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

function npmInstall(dir, dependencies, overrides) {
  mkdirSync(dir, { recursive: true });
  const manifest = { name: "siteping-skew", private: true, type: "module", dependencies, overrides };
  writeFileSync(join(dir, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--no-package-lock", "--loglevel=error"], dir);
}

/** The package's installed manifest; says so when a `KNOWN_BREAKS` entry for it is outdated. */
function installed(dir, name) {
  const pkg = JSON.parse(readFileSync(join(dir, "node_modules", name, "package.json"), "utf8"));
  const known = KNOWN_BREAKS[name];
  if (known && compare(parseVersion(pkg.version), parseVersion(known)) > 0) {
    console.log(`  note: ${name}@${pkg.version} is out, so KNOWN_BREAKS["${name}"] ("${known}") can go`);
  }
  return pkg;
}

/** `major.minor.patch` as numbers; a prerelease tag is ignored. */
function parseVersion(version) {
  return version
    .replace(/^[=v]+/, "")
    .split("-")[0]
    .split(".")
    .map(Number);
}

function compare(a, b) {
  return a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
}

/** Whether `version` satisfies an npm range of the forms the packages publish: `^`, `~`, comparators, `||`. */
function satisfies(version, range) {
  const v = parseVersion(version);
  const test = (comparator) => {
    const [, op = "", bound] = /^(\^|~|>=|<=|>|<|=)?(.+)$/.exec(comparator) ?? [];
    const b = parseVersion(bound);
    if (op === "^") {
      const upper = b[0] > 0 ? [b[0] + 1, 0, 0] : b[1] > 0 ? [0, b[1] + 1, 0] : [0, 0, b[2] + 1];
      return compare(v, b) >= 0 && compare(v, upper) < 0;
    }
    if (op === "~") return compare(v, b) >= 0 && compare(v, [b[0], b[1] + 1, 0]) < 0;
    const order = compare(v, b);
    return { ">=": order >= 0, "<=": order <= 0, ">": order > 0, "<": order < 0 }[op] ?? order === 0;
  };
  return range.split("||").some((set) => set.trim().split(/\s+/).every(test));
}

/** A feedback the widget would send, valid for every server since 0.1.0. */
function payload(clientId) {
  return {
    projectName: PROJECT,
    type: "bug",
    message: "Version-skew round trip",
    url: "/skew",
    viewport: "1280x800",
    userAgent: "siteping-version-skew",
    authorName: "Skew",
    authorEmail: "skew@example.com",
    clientId,
    annotations: [
      {
        anchor: {
          cssSelector: "main > h1",
          xpath: "/html/body/main/h1",
          textSnippet: "Title",
          elementTag: "H1",
          textPrefix: "",
          textSuffix: "",
          fingerprint: "h1",
          neighborText: "",
          anchorKey: null,
        },
        rect: { xPct: 0.1, yPct: 0.1, wPct: 0.5, hPct: 0.5 },
        scrollX: 0,
        scrollY: 0,
        viewportW: 1280,
        viewportH: 800,
        devicePixelRatio: 1,
      },
    ],
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

/** A `localStorage` for Node: the stores and the widget client persist to it. */
function installLocalStorage() {
  const items = new Map();
  globalThis.localStorage = {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => items.set(key, String(value)),
    removeItem: (key) => items.delete(key),
    clear: () => items.clear(),
    key: (index) => [...items.keys()][index] ?? null,
    get length() {
      return items.size;
    },
  };
}

/** Create a feedback then list it, straight through a handler. */
async function roundTrip(handler) {
  const headers = { Authorization: `Bearer ${API_KEY}` };
  const created = await handler.POST(
    new Request(ENDPOINT, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(payload(`skew-${Date.now()}`)),
    }),
  );
  if (created.status !== 201) throw new Error(`POST answered ${created.status}: ${await created.text()}`);
  const { id } = await created.json();
  const listed = await handler.GET(new Request(`${ENDPOINT}?projectName=${PROJECT}`, { headers }));
  if (listed.status !== 200) throw new Error(`GET answered ${listed.status}: ${await listed.text()}`);
  const { feedbacks } = await listed.json();
  assert(
    feedbacks.some((feedback) => feedback.id === id),
    "the created feedback is missing from the list",
  );
}

/** Type-check the adapter consumers, and the published declaration files they reach. */
function typeCheck(dir, files) {
  const program = ts.createProgram(
    files.map((file) => join(dir, file)),
    {
      strict: true,
      exactOptionalPropertyTypes: true,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
      types: [],
      skipLibCheck: false,
    },
  );
  const ours = (fileName) => fileName.includes("/node_modules/@siteping/") || !fileName.includes("/node_modules/");
  const diagnostics = [
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...program
      .getSourceFiles()
      .flatMap((source) => (ours(source.fileName) ? program.getSemanticDiagnostics(source) : [])),
  ];
  const host = { getCanonicalFileName: (f) => f, getCurrentDirectory: () => dir, getNewLine: () => "\n" };
  return diagnostics.map((d) => ts.formatDiagnostic(d, host).trim().replaceAll(`${dir}/`, ""));
}

async function checkAdapters() {
  step("published adapters against main's @siteping/server");
  const serverDir = join(root, "packages/server");
  const mainServer = JSON.parse(readFileSync(join(serverDir, "package.json"), "utf8")).version;
  const [tarball] = JSON.parse(
    run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", work], serverDir),
  );
  const against = `main's @siteping/server (${mainServer})`;

  const dir = join(work, "adapters");
  npmInstall(
    dir,
    {
      "@siteping/server": `file:${join(work, tarball.filename)}`,
      ...Object.fromEntries(Object.keys(ADAPTERS).map((name) => [name, "latest"])),
      "drizzle-orm": "<1",
    },
    // An adapter that depends on the server (adapter-prisma) resolves it to
    // main's build too, instead of a published copy of its own.
    { "@siteping/server": "$@siteping/server" },
  );

  const checked = [];
  for (const name of Object.keys(ADAPTERS)) {
    const pkg = installed(dir, name);
    const range = pkg.dependencies?.["@siteping/server"] ?? pkg.peerDependencies?.["@siteping/server"];
    // Pre-1.0, a breaking server minor sits outside the range the published
    // adapter pins: npm then installs the adapter with its own server, and
    // the adapter ships re-pinned with the server's release.
    if (range && !satisfies(mainServer, range)) {
      console.log(
        `  skip ${name}@${pkg.version}: it pins @siteping/server ${range}, npm never pairs it with ${mainServer}`,
      );
      continue;
    }
    const file = `${name.split("/")[1]}.ts`;
    writeFileSync(join(dir, file), ADAPTERS[name].trimStart());
    checked.push({ name, version: pkg.version, file });
  }

  const errors = typeCheck(
    dir,
    checked.map(({ file }) => file),
  );
  for (const { name, version, file } of checked) {
    const own = errors.filter((e) => e.startsWith(file) || e.includes(`node_modules/${name}/`));
    if (own.length > 0) fail(`${name}@${version} (types)`, against, own.join("\n"), { name, version });
    else console.log(`  types ok: ${name}@${version}`);
  }
  const unattributed = errors.filter(
    (e) => !checked.some(({ name, file }) => e.startsWith(file) || e.includes(`node_modules/${name}/`)),
  );
  if (unattributed.length > 0)
    fail("main's @siteping/server (types)", "the published adapters", unattributed.join("\n"));

  writeFileSync(
    join(dir, "entry.mjs"),
    [
      'export * as server from "@siteping/server";',
      ...checked.map(({ name }, i) => `export * as adapter${i} from "${name}";`),
    ].join("\n"),
  );
  const modules = await import(pathToFileURL(join(dir, "entry.mjs")).href);
  installLocalStorage();
  const runtime = [
    [
      "@siteping/adapter-memory",
      (m) => m.server.createSitepingHandler({ store: new m.adapter.MemoryStore(), apiKey: API_KEY }),
    ],
    [
      "@siteping/adapter-localstorage",
      (m) => m.server.createSitepingHandler({ store: new m.adapter.LocalStorageStore(), apiKey: API_KEY }),
    ],
  ];
  for (const [name, mount] of runtime) {
    const index = checked.findIndex((c) => c.name === name);
    if (index === -1) continue;
    const { version } = checked[index];
    try {
      await roundTrip(mount({ server: modules.server, adapter: modules[`adapter${index}`] }));
      console.log(`  round trip ok: ${name}@${version}`);
    } catch (error) {
      fail(`${name}@${version} (create + list)`, against, String(error?.stack ?? error), { name, version });
    }
  }
  // adapter-prisma's handler delegates to the server it is installed with —
  // main's here. Mounted on a published MemoryStore, it needs no database.
  const prisma = checked.findIndex((c) => c.name === "@siteping/adapter-prisma");
  const memory = checked.findIndex((c) => c.name === "@siteping/adapter-memory");
  if (prisma !== -1 && memory !== -1) {
    const { version } = checked[prisma];
    try {
      const store = new modules[`adapter${memory}`].MemoryStore();
      await roundTrip(modules[`adapter${prisma}`].createSitepingHandler({ store, apiKey: API_KEY }));
      console.log(`  round trip ok: @siteping/adapter-prisma@${version} handler`);
    } catch (error) {
      fail(`@siteping/adapter-prisma@${version} handler (create + list)`, against, String(error?.stack ?? error), {
        name: "@siteping/adapter-prisma",
        version,
      });
    }
  }
}

async function checkClients() {
  step(`main's widget and dashboard clients against @siteping/server@${MINIMUM_SERVER}`);
  const dir = join(work, "clients");
  npmInstall(dir, { "@siteping/server": MINIMUM_SERVER, "@siteping/adapter-memory": "latest" });
  const serverVersion = installed(dir, "@siteping/server").version;
  const against = `the published @siteping/server@${serverVersion}`;
  const published = { name: "@siteping/server", version: serverVersion };

  writeFileSync(
    join(dir, "entry.mjs"),
    'export * as server from "@siteping/server";\nexport * as memory from "@siteping/adapter-memory";\n',
  );
  const { server, memory } = await import(pathToFileURL(join(dir, "entry.mjs")).href);
  const handler = server.createSitepingHandler({ store: new memory.MemoryStore(), apiKey: API_KEY });

  // The widget's HTTP client is internal to its bundle: build it from source.
  await build({
    entry: { "widget-client": join(root, "packages/widget/src/api-client.ts") },
    outDir: dir,
    format: ["esm"],
    outExtension: () => ({ js: ".mjs" }),
    platform: "neutral",
    target: "es2022",
    noExternal: [/.*/],
    dts: false,
    sourcemap: false,
    splitting: false,
    clean: false,
    silent: true,
    config: false,
  });
  const { ApiClient } = await import(pathToFileURL(join(dir, "widget-client.mjs")).href);
  const { createEndpointSource } = await import(pathToFileURL(join(root, "packages/dashboard/dist/index.js")).href);

  installLocalStorage();
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const request = new Request(input, init);
    const method = handler[request.method];
    assert(method, `the server has no ${request.method} handler`);
    return method(request);
  };
  try {
    const widget = new ApiClient(ENDPOINT, PROJECT, { apiKey: API_KEY });
    await clientFlow("main's widget client", against, published, async (check) => {
      const sent = await check("send a feedback", () => widget.sendFeedback(payload("skew-widget")));
      assert(sent.id && sent.status === "open", `unexpected feedback: ${JSON.stringify(sent)}`);
      const list = await check("list feedback", () => widget.getFeedbacks(PROJECT));
      assert(
        list.feedbacks.some((f) => f.id === sent.id),
        "the sent feedback is missing from the list",
      );
      const comment = await check("reply on the thread", () =>
        widget.addComment(sent.id, {
          body: "Reply",
          authorName: "Skew",
          authorEmail: "skew@example.com",
          authorRole: "client",
          clientId: "skew-widget-reply",
        }),
      );
      assert(comment.body === "Reply", `unexpected comment: ${JSON.stringify(comment)}`);
      const resolved = await check("resolve it", () => widget.resolveFeedback(sent.id, true));
      assert(resolved.status === "resolved" && resolved.resolvedAt, `unexpected feedback: ${JSON.stringify(resolved)}`);
      await check("delete it", () => widget.deleteFeedback(sent.id));
    });

    const sent = await widget.sendFeedback(payload("skew-dashboard"));
    const inbox = createEndpointSource({ endpoint: ENDPOINT, apiKey: API_KEY });
    await clientFlow("main's dashboard endpoint source", against, published, async (check) => {
      const page = await check("list feedback", () => inbox.list({ projectName: PROJECT }));
      const record = page.feedbacks.find((f) => f.id === sent.id);
      assert(record, "the feedback is missing from the list");
      assert(record.createdAt instanceof Date, "createdAt is not revived as a Date");
      const changed = await check("set a status", () => inbox.setStatus(sent.id, PROJECT, "wont_fix"));
      assert(
        changed.status === "wont_fix" && changed.resolvedAt instanceof Date,
        `unexpected record: ${JSON.stringify(changed)}`,
      );
      const comment = await check("reply on the thread", () =>
        inbox.addComment(sent.id, PROJECT, {
          body: "Team reply",
          authorName: "Team",
          authorEmail: "team@example.com",
          authorRole: "team",
          clientId: "skew-dashboard-reply",
        }),
      );
      assert(comment.body === "Team reply", `unexpected comment: ${JSON.stringify(comment)}`);
      await check("delete it", () => inbox.remove(sent.id, PROJECT));
    });
  } finally {
    globalThis.fetch = realFetch;
  }
}

/** Run a client's steps in order, failing at the first broken one with its name. */
async function clientFlow(subject, against, published, steps) {
  let current = "setup";
  const check = async (label, call) => {
    current = label;
    return call();
  };
  try {
    await steps(check);
    console.log(`  ok: ${subject}`);
  } catch (error) {
    fail(subject, against, `step "${current}" failed: ${error?.message ?? error}`, published);
  }
}

try {
  for (const dist of ["packages/server/dist/index.js", "packages/dashboard/dist/index.js"]) {
    if (!existsSync(join(root, dist))) throw new Error(`${dist} is missing — run \`bun run build\` first`);
  }
  await checkAdapters();
  await checkClients();
} catch (error) {
  failures.push(`the check itself failed: ${error?.stack ?? error}`);
} finally {
  if (keep) console.log(`\n[version-skew] kept ${work}`);
  else rmSync(work, { recursive: true, force: true });
}

for (const message of acknowledged) console.warn(`\n[version-skew] known break (KNOWN_BREAKS): ${message}`);

if (failures.length > 0) {
  console.error(`\n[version-skew] FAILED — ${failures.length} incompatibility(ies):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  console.error(
    [
      "",
      "This change and what is already on npm no longer work together. Keep the old shape: deprecate",
      "instead of removing, add optional members, and have the clients feature-detect what an older",
      "server lacks. A deliberate break is a `!` commit: for the adapters' contract it ships their fix,",
      "for the clients it also raises MINIMUM_SERVER in scripts/version-skew.mjs.",
    ].join("\n"),
  );
  process.exit(1);
}
console.log(
  "\n[version-skew] OK — the published adapters work with main's server, and main's clients with the published server",
);
