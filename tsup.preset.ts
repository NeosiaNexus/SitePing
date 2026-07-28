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
