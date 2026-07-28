/**
 * The `SitepingStore` conformance suite, published for third-party adapter
 * authors (requires `vitest` — an optional peer dependency of this
 * package).
 *
 * @example
 * ```ts
 * import { testSitepingStore } from "@siteping/adapter-kit/testing";
 * import { DrizzleStore } from "../src/index.js";
 *
 * testSitepingStore(() => new DrizzleStore(db));
 * ```
 */

export type { StoreConformanceOptions } from "@siteping/core/testing";
export { testSitepingStore } from "@siteping/core/testing";
