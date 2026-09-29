import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { type MinifyOptions, minify } from "terser";
import type { Options } from "tsup";

/**
 * Shared tsup defaults for `@siteping/*` library packages.
 *
 * Every published package builds dual ESM+CJS with bundled `@siteping/core`
 * (core is an Internal Package — raw TS, never published; the regex also
 * catches its `/testing` subpath). Packages override only what genuinely
 * differs: platform, extra entries, externals, minification.
 *
 * NOTE: `fix-dts` intentionally stays in each package.json build script
 * (`tsup && node ../../scripts/fix-dts.mjs dist`) rather than an onSuccess
 * hook — onSuccess does not wait for the async dts build, and fix-dts must
 * run after the declarations exist. `scripts/check-consistency.mjs` asserts
 * no package forgets the chain.
 */
export function sitepingLibrary(overrides: Partial<Options> & Pick<Options, "platform">): Options {
  return {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    target: "es2022",
    dts: true,
    sourcemap: true,
    clean: true,
    noExternal: [/^@siteping\/core(\/|$)/],
    ...overrides,
  };
}

/**
 * Second minification pass with Terser over a finished bundle, run from a
 * build's `onSuccess` hook: `module` for an ES module (top-level names and
 * imports get mangled too), `toplevel` for a CommonJS file.
 *
 * It runs on the file rather than through tsup's `minify: "terser"`, which
 * ships the esbuild output when Terser fails and names that intermediate
 * bundle by its absolute path in the source map. Given esbuild's map, Terser
 * chains the two maps itself and leaves the code that has no original
 * position unmapped. `ascii_only` keeps esbuild's ASCII-only output, so a
 * classic `<script>` decodes the same under any page charset.
 */
export async function terserPass(
  file: string,
  options: Pick<MinifyOptions, "module" | "toplevel"> = {},
): Promise<void> {
  const name = basename(file);
  const [code, map] = await Promise.all([readFile(file, "utf8"), readFile(`${file}.map`, "utf8")]);
  const result = await minify(
    { [name]: code },
    {
      ...options,
      compress: { passes: 2 },
      format: { ascii_only: true },
      sourceMap: { content: map, url: `${name}.map` },
    },
  );
  if (result.code === undefined || typeof result.map !== "string") {
    throw new Error(`Terser returned no output for ${file}`);
  }
  await Promise.all([writeFile(file, result.code), writeFile(`${file}.map`, result.map)]);
}
