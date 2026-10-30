#!/usr/bin/env node
// Public API surface gate (#421): every change to what the 1.0 packages
// export shows up as a diff of a committed snapshot, api/<package>.api.md,
// so a breaking change can't ship as a minor or a patch unnoticed.
// Requires a prior `bun run build`.
//
//   bun run api:check    fail when a built surface differs from its snapshot
//   bun run api:update   rewrite the snapshots from the built dist/
//
// For each subpath of a package's `exports` map, a snapshot records:
//   - the type surface of the built ESM `.d.ts`: every exported declaration,
//     plus every declaration of the package's own dist those reach without
//     being exported (a field removed from a type the API only references is
//     as breaking as one removed from an exported type). Re-exports from
//     another package (adapter-prisma re-exporting @siteping/server types)
//     are listed by name — that package's snapshot holds their shape;
//   - the runtime export keys of the ESM and CJS builds.
//
// The snapshot is normalized so that it only moves when the API does:
// comments are dropped (a `@deprecated` or `@experimental` tag stays as a
// marker), interface/class/type-literal members and union constituents are
// sorted, and nothing depends on chunk names or minified identifiers.
//
// It also fails, whatever the snapshots say, when the ESM and CJS builds
// export different keys, when a value export of the `.d.ts` is missing at
// runtime (or the reverse), or when a `.d.cts` twin drifted from its `.d.ts`.
//
// Built on the TypeScript compiler API (already a dev dependency) rather
// than API Extractor: its reports list exported declarations only and leave
// a type reached through them as an "ae-forgotten-export" warning, without
// its shape — and the 1.0 packages reference many such types today.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const require = createRequire(import.meta.url);
const ts = require("typescript");

// The packages that go 1.0 together (#421). `cli` ships a binary and no
// programmatic API; adapter-drizzle, screenshot-storage and
// integration-issues stay 0.x for now — add a name here when one goes 1.0.
const PACKAGES = [
  "widget",
  "dashboard",
  "server",
  "adapter-prisma",
  "adapter-memory",
  "adapter-localstorage",
  "adapter-kit",
];

/** JSDoc tags that change what a declaration promises; kept as `// @tag` markers. */
const MARKER_TAGS = new Set(["deprecated", "experimental"]);

/**
 * ESM-only peers a CJS build can't `require()` in Node. Their exports are
 * only called inside a test run (adapter-kit/testing drives vitest), so a
 * stub stands in while the CJS keys are read.
 */
const ESM_ONLY_PEERS = new Set(["vitest"]);

const update = process.argv.includes("--update");
const posix = (path) => path.replaceAll("\\", "/");
const relativePath = (path) => posix(path).slice(posix(root).length);

// --- Entry points ------------------------------------------------------------

/**
 * A subpath that exports a data file as is — `./package.json`, the server's
 * `./openapi.json` — has no code surface: its own check owns its content.
 */
const isDataExport = (target) => typeof target === "string" && target.endsWith(".json");

/** One subpath of a package's `exports` map, with its built files. */
function entriesOf(pkg) {
  const dir = join(root, "packages", pkg);
  const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  return Object.entries(manifest.exports)
    .filter(([, conditions]) => !isDataExport(conditions))
    .map(([subpath, conditions]) => {
      // A code subpath of another shape must not slip past the gate unread.
      if (!conditions?.import?.types || !conditions.import.default || !conditions.require?.default) {
        throw new Error(`api: ${manifest.name} exports "${subpath}" without import/require conditions to read`);
      }
      return {
        name: subpath === "." ? manifest.name : `${manifest.name}/${subpath.slice(2)}`,
        types: join(dir, conditions.import.types),
        esm: join(dir, conditions.import.default),
        cjs: join(dir, conditions.require.default),
      };
    });
}

const packages = PACKAGES.map((pkg) => ({
  pkg,
  distDir: `${posix(join(root, "packages", pkg, "dist"))}/`,
  entries: entriesOf(pkg),
}));

// --- Program -------------------------------------------------------------------

const { options } = ts.convertCompilerOptionsFromJson(
  {
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: "es2022",
    lib: ["es2022", "dom", "dom.iterable"],
    module: "nodenext",
    moduleResolution: "nodenext",
    // Only what the declarations import: no ambient @types/* package.
    types: [],
  },
  root,
);
const program = ts.createProgram({
  rootNames: packages.flatMap(({ entries }) => entries.map((entry) => entry.types)),
  options,
});
const checker = program.getTypeChecker();
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

function resolveAlias(symbol) {
  return symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
}

/** Declarations sorted by file then position, so merged declarations print in a stable order. */
function sortedDeclarations(symbol, filter) {
  return (symbol.declarations ?? [])
    .filter(filter)
    .sort((a, b) =>
      a.getSourceFile().fileName === b.getSourceFile().fileName
        ? a.pos - b.pos
        : a.getSourceFile().fileName < b.getSourceFile().fileName
          ? -1
          : 1,
    );
}

const TOP_LEVEL_KINDS =
  ts.SymbolFlags.Interface |
  ts.SymbolFlags.TypeAlias |
  ts.SymbolFlags.Class |
  ts.SymbolFlags.Enum |
  ts.SymbolFlags.Function |
  ts.SymbolFlags.Variable |
  ts.SymbolFlags.Module;

/** Whether `symbol` is a module-level declaration (not a member, parameter or type parameter). */
function isTopLevel(symbol) {
  if (!(symbol.flags & TOP_LEVEL_KINDS) || symbol.flags & ts.SymbolFlags.TypeParameter) return false;
  return (symbol.declarations ?? []).some((declaration) => {
    const statement = ts.isVariableDeclaration(declaration) ? declaration.parent.parent : declaration;
    return statement.parent !== undefined && (ts.isSourceFile(statement.parent) || ts.isModuleBlock(statement.parent));
  });
}

// --- Printing -------------------------------------------------------------------

function markerTags(node) {
  const original = ts.getOriginalNode(node);
  return ts
    .getJSDocTags(original)
    .map((tag) => tag.tagName.text)
    .filter((tag, i, all) => MARKER_TAGS.has(tag) && all.indexOf(tag) === i)
    .sort();
}

function memberName(member, sourceFile) {
  if (!member.name) return "";
  return ts.isIdentifier(member.name) || ts.isPrivateIdentifier(member.name)
    ? member.name.text
    : printer.printNode(ts.EmitHint.Unspecified, member.name, sourceFile);
}

/**
 * Members in name order, signatures (call, construct, index) and the
 * constructor first in their original order. The sort is stable, so
 * overloads and get/set pairs keep their relative order.
 */
function sortMembers(members, sourceFile) {
  const keyed = members.map((member, index) => {
    const unnamed =
      ts.isCallSignatureDeclaration(member) ||
      ts.isConstructSignatureDeclaration(member) ||
      ts.isIndexSignatureDeclaration(member) ||
      ts.isConstructorDeclaration(member);
    return { member, index, unnamed, name: unnamed ? "" : memberName(member, sourceFile) };
  });
  keyed.sort((a, b) => {
    if (a.unnamed !== b.unnamed) return a.unnamed ? -1 : 1;
    if (a.unnamed || a.name === b.name) return a.index - b.index;
    return a.name < b.name ? -1 : 1;
  });
  return ts.factory.createNodeArray(keyed.map(({ member }) => member));
}

const DROPPED_MODIFIERS = new Set([
  ts.SyntaxKind.ExportKeyword,
  ts.SyntaxKind.DeclareKeyword,
  ts.SyntaxKind.DefaultKeyword,
]);

/** `node` with sorted members and unions, without `export`/`declare`, comments reduced to markers. */
function normalize(node, sourceFile) {
  const result = ts.transform(node, [
    (context) => (rootNode) => {
      const visit = (current) => {
        let next = ts.visitEachChild(current, visit, context);
        if (ts.isUnionTypeNode(next)) {
          const types = [...next.types].sort((a, b) => {
            const [x, y] = [a, b].map((type) => printer.printNode(ts.EmitHint.Unspecified, type, sourceFile));
            return x < y ? -1 : x > y ? 1 : 0;
          });
          next = ts.factory.updateUnionTypeNode(next, ts.factory.createNodeArray(types));
        } else if (ts.isTypeLiteralNode(next)) {
          next = ts.factory.updateTypeLiteralNode(next, sortMembers(next.members, sourceFile));
        } else if (ts.isInterfaceDeclaration(next)) {
          next = ts.factory.updateInterfaceDeclaration(
            next,
            next.modifiers,
            next.name,
            next.typeParameters,
            next.heritageClauses,
            sortMembers(next.members, sourceFile),
          );
        } else if (ts.isClassDeclaration(next)) {
          next = ts.factory.updateClassDeclaration(
            next,
            next.modifiers,
            next.name,
            next.typeParameters,
            next.heritageClauses,
            sortMembers(next.members, sourceFile),
          );
        }
        if (current === rootNode && ts.canHaveModifiers(next) && next.modifiers) {
          next = ts.factory.replaceModifiers(
            next,
            next.modifiers.filter((modifier) => !DROPPED_MODIFIERS.has(modifier.kind)),
          );
        }
        for (const tag of markerTags(current)) {
          ts.addSyntheticLeadingComment(next, ts.SyntaxKind.SingleLineCommentTrivia, ` @${tag}`, true);
        }
        return next;
      };
      return ts.visitNode(rootNode, visit);
    },
  ]);
  const normalized = result.transformed[0];
  // Drop every source comment; the synthetic markers added above still print.
  (function silence(current) {
    ts.setEmitFlags(current, ts.EmitFlags.NoComments);
    ts.forEachChild(current, silence);
  })(normalized);
  return normalized;
}

/** The declaration as TypeScript source: `export ` prefixed when exported. */
function printDeclaration(declaration, exportedAs) {
  const sourceFile = declaration.getSourceFile();
  let text;
  if (ts.isVariableDeclaration(declaration)) {
    const list = declaration.parent;
    const keyword = list.flags & ts.NodeFlags.Const ? "const" : list.flags & ts.NodeFlags.Let ? "let" : "var";
    const markers = markerTags(declaration).map((tag) => `// @${tag}\n`);
    text = `${markers.join("")}${keyword} ${printer.printNode(ts.EmitHint.Unspecified, normalize(declaration, sourceFile), sourceFile)};`;
  } else {
    text = printer.printNode(ts.EmitHint.Unspecified, normalize(declaration, sourceFile), sourceFile);
  }
  if (exportedAs === undefined) return text;
  const declaredName = declaration.name && ts.isIdentifier(declaration.name) ? declaration.name.text : undefined;
  const lines = text.split("\n");
  // Markers stay above the declaration; `export` goes on its first code line.
  const first = lines.findIndex((line) => !line.startsWith("//"));
  lines[first] = `export ${lines[first]}`;
  if (declaredName !== undefined && declaredName !== exportedAs) lines.splice(first, 0, `// exported as ${exportedAs}`);
  return lines.join("\n");
}

/**
 * The module an external re-export comes from, read off the alias chain
 * (`export { X } from "@siteping/server"`, or an import re-exported).
 */
function externalSpecifier(symbol) {
  let current = symbol;
  for (let depth = 0; current && depth < 16; depth++) {
    for (const declaration of current.declarations ?? []) {
      let node = declaration;
      while (node && !ts.isExportDeclaration(node) && !ts.isImportDeclaration(node)) node = node.parent;
      const specifier = node?.moduleSpecifier;
      if (specifier && ts.isStringLiteral(specifier) && !specifier.text.startsWith(".")) return specifier.text;
    }
    if (!(current.flags & ts.SymbolFlags.Alias)) break;
    current = checker.getImmediateAliasedSymbol(current);
  }
  return undefined;
}

// --- Surface of one entry point ---------------------------------------------------

/**
 * The type surface of one entry: its exports (in name order) and the
 * declarations of the package's own dist they reach, walked transitively.
 * `exportedElsewhere` maps a symbol to the sibling entry point exporting
 * it, which holds its shape.
 */
function typeSurface(entry, distDir, exportedElsewhere, errors) {
  const isOwn = (declaration) => declaration.getSourceFile().fileName.startsWith(distDir);
  const sourceFile = program.getSourceFile(posix(entry.types));
  const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) {
    errors.push(`${entry.name}: cannot read ${posix(entry.types)} — run \`bun run build\` first`);
    return { exported: [], referenced: [], siblings: [], valueExports: new Set() };
  }

  const exported = [];
  const valueExports = new Set();
  const exportedTargets = new Set();
  const queue = [];
  const seen = new Set();
  const siblings = new Set();

  const reach = (node) => {
    const visit = (current) => {
      if (ts.isIdentifier(current)) {
        const symbol = checker.getSymbolAtLocation(current);
        const target = symbol && resolveAlias(symbol);
        if (target && !seen.has(target) && !exportedTargets.has(target) && isTopLevel(target)) {
          if ((target.declarations ?? []).some(isOwn)) {
            seen.add(target);
            const sibling = exportedElsewhere.get(target);
            if (sibling && sibling !== entry.name) siblings.add(`${target.getName()} (exported by ${sibling})`);
            else queue.push(target);
          }
        }
      }
      ts.forEachChild(current, visit);
    };
    visit(node);
  };

  const exports = checker.getExportsOfModule(moduleSymbol).sort((a, b) => (a.getName() < b.getName() ? -1 : 1));
  for (const symbol of exports) exportedTargets.add(resolveAlias(symbol));

  for (const symbol of exports) {
    const name = symbol.getName();
    const target = resolveAlias(symbol);
    if (target.flags & ts.SymbolFlags.Value) valueExports.add(name);
    const own = sortedDeclarations(target, isOwn);
    if (own.length > 0) {
      for (const declaration of own) {
        exported.push(printDeclaration(declaration, name));
        reach(declaration);
      }
      continue;
    }
    const from = externalSpecifier(symbol);
    if (from === undefined) {
      errors.push(`${entry.name}: cannot resolve the declaration of export "${name}"`);
      continue;
    }
    const sourceName = target.getName();
    exported.push(`export { ${sourceName === name ? name : `${sourceName} as ${name}`} } from "${from}";`);
  }

  const referenced = [];
  while (queue.length > 0) {
    const symbol = queue.shift();
    for (const declaration of sortedDeclarations(symbol, isOwn)) {
      referenced.push({ name: symbol.getName(), text: printDeclaration(declaration) });
      reach(declaration);
    }
  }
  referenced.sort((a, b) => (a.name === b.name ? 0 : a.name < b.name ? -1 : 1));

  return {
    exported,
    referenced: referenced.map(({ text }) => text),
    siblings: [...siblings].sort(),
    valueExports,
  };
}

// --- Runtime exports ---------------------------------------------------------

const esmOnlyStub = new Proxy({}, { get: () => () => {} });
const load = Module._load;
Module._load = function loadWithStubs(request, ...rest) {
  return ESM_ONLY_PEERS.has(request) ? esmOnlyStub : load.call(this, request, ...rest);
};

function describeKeys(namespace) {
  return Object.keys(namespace)
    .filter((key) => key !== "default" || typeof namespace.default !== "undefined")
    .sort()
    .map((key) => `${key}: ${typeof namespace[key]}`);
}

async function runtimeSurface(entry, errors) {
  const keys = {};
  for (const [format, read] of [
    ["ESM", () => import(pathToFileURL(entry.esm).href)],
    ["CJS", () => require(entry.cjs)],
  ]) {
    try {
      keys[format] = describeKeys(await read());
    } catch (error) {
      errors.push(
        `${entry.name}: the ${format} build failed to load — ${error instanceof Error ? error.message : error}`,
      );
      keys[format] = [];
    }
  }
  if (keys.ESM.join() !== keys.CJS.join()) {
    errors.push(`${entry.name}: ESM exports [${keys.ESM.join(", ")}] but CJS exports [${keys.CJS.join(", ")}]`);
  }
  return keys;
}

// --- .d.cts twins ------------------------------------------------------------

/** Every declaration file of `distDir` the program read must match its `.d.cts` twin, specifiers aside. */
function checkCjsTwins(distDir, errors) {
  for (const file of program.getSourceFiles()) {
    if (!file.fileName.startsWith(distDir) || !file.fileName.endsWith(".d.ts")) continue;
    const twin = `${file.fileName.slice(0, -".d.ts".length)}.d.cts`;
    let cjs;
    try {
      cjs = readFileSync(twin, "utf8");
    } catch {
      errors.push(`${relativePath(twin)}: missing — the require condition has no types for it`);
      continue;
    }
    if (cjs.replace(/(["'])\.\/([^"']+)\.cjs\1/g, "$1./$2.js$1") !== readFileSync(file.fileName, "utf8")) {
      errors.push(`${relativePath(twin)}: differs from its .d.ts twin beyond import specifiers`);
    }
  }
}

// --- Snapshot ----------------------------------------------------------------

const fence = (lines) => ["```ts", lines.join("\n\n"), "```"];

async function snapshot({ pkg, distDir, entries }, errors) {
  // Which entry point exports what, so a sibling's type is named, not repeated.
  const exportedElsewhere = new Map();
  for (const entry of entries) {
    const sourceFile = program.getSourceFile(posix(entry.types));
    const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const target = resolveAlias(symbol);
      if (!exportedElsewhere.has(target)) exportedElsewhere.set(target, entry.name);
    }
  }

  const out = [
    `# Public API of ${entries[0].name}`,
    "",
    '<!-- Generated by `bun run api:update` from the built dist/ — do not edit. See CONTRIBUTING.md, "Public API snapshots". -->',
  ];
  for (const entry of entries) {
    const types = typeSurface(entry, distDir, exportedElsewhere, errors);
    const runtime = await runtimeSurface(entry, errors);
    const runtimeNames = new Set(runtime.ESM.map((line) => line.slice(0, line.indexOf(":"))));
    const missing = [...types.valueExports].filter((name) => !runtimeNames.has(name));
    const undeclared = [...runtimeNames].filter((name) => !types.valueExports.has(name));
    if (missing.length > 0) errors.push(`${entry.name}: the .d.ts declares ${missing.join(", ")}, missing at runtime`);
    if (undeclared.length > 0)
      errors.push(`${entry.name}: the build exports ${undeclared.join(", ")}, absent from the .d.ts`);

    out.push("", `## ${entry.name}`, "", "Runtime exports (ESM and CJS):", "");
    out.push(...(runtime.ESM.length > 0 ? runtime.ESM.map((line) => `- \`${line}\``) : ["- (none)"]));
    out.push("", "Types:", "", ...fence(types.exported));
    if (types.referenced.length > 0) out.push("", "Referenced, not exported:", "", ...fence(types.referenced));
    if (types.siblings.length > 0) {
      out.push("", "Referenced from another entry point:", "", ...types.siblings.map((line) => `- ${line}`));
    }
  }
  checkCjsTwins(distDir, errors);
  return { file: join(root, "api", `${pkg}.api.md`), content: `${out.join("\n")}\n` };
}

/** A line diff of `before` → `after` (LCS), changed lines with two lines of context. */
function diff(before, after) {
  const a = before.split("\n");
  const b = after.split("\n");
  const lcs = Array.from({ length: a.length + 1 }, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const ops = [];
  let [i, j] = [0, 0];
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      ops.push([" ", a[i]]);
      i++;
      j++;
    } else if (i < a.length && (j === b.length || lcs[i + 1][j] >= lcs[i][j + 1])) {
      ops.push(["-", a[i++]]); // removals first, as in a unified diff
    } else {
      ops.push(["+", b[j++]]);
    }
  }
  const keep = new Set();
  ops.forEach(([op], index) => {
    if (op === " ") return;
    for (let k = Math.max(0, index - 2); k <= Math.min(ops.length - 1, index + 2); k++) keep.add(k);
  });
  const lines = [];
  let last = -1;
  for (const index of [...keep].sort((x, y) => x - y)) {
    if (last !== -1 && index > last + 1) lines.push("  ...");
    lines.push(`${ops[index][0]} ${ops[index][1]}`);
    last = index;
  }
  return lines.join("\n");
}

// --- Main ----------------------------------------------------------------------

const errors = [];
const changed = [];
let written = 0;
for (const pkg of packages) {
  const { file, content } = await snapshot(pkg, errors);
  let current = "";
  try {
    current = readFileSync(file, "utf8");
  } catch {
    // no snapshot yet: a new package
  }
  if (current === content) continue;
  if (update) {
    mkdirSync(join(root, "api"), { recursive: true });
    writeFileSync(file, content, "utf8");
    written++;
    console.log(`api: updated ${relativePath(file)}`);
  } else {
    changed.push(pkg.pkg);
    console.error(`\napi/${pkg.pkg}.api.md is out of date with the build:\n${diff(current, content)}`);
  }
}
Module._load = load;

if (errors.length > 0) {
  console.error("\napi: FAILED");
  for (const error of errors) console.error(`  - ${error}`);
}
if (changed.length > 0) {
  console.error(
    `\napi: the public API of ${changed.map((pkg) => `@siteping/${pkg}`).join(", ")} changed.\n` +
      "If the change is intended, run `bun run build && bun run api:update` and commit the snapshots.\n" +
      "A removed or renamed export, a narrower type or a new required member is a breaking change:\n" +
      'mark the commit with `!` (e.g. `feat(widget)!: …`). See CONTRIBUTING.md, "Public API snapshots".',
  );
}
if (errors.length > 0 || changed.length > 0) process.exit(1);
const verdict = !update
  ? "public API matches the snapshots"
  : written > 0
    ? `${written} snapshot(s) updated`
    : "snapshots already up to date";
console.log(`api: ${verdict} (${PACKAGES.length} packages)`);
