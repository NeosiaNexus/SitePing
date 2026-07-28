/**
 * General-purpose TypeScript utility types used across `@siteping/*`.
 *
 * These are kept dependency-free and re-exported from the package entry
 * so adapters and integrators can rely on the same primitives the core
 * uses internally.
 */

/**
 * Force TypeScript to expand a computed type into a flat object literal in
 * tooltips and error messages. Purely cosmetic — same structural type, just
 * easier to read.
 *
 * @example
 *   type Raw = Omit<FeedbackRecord, "annotations"> & { annotations: number };
 *   type Pretty = Prettify<Raw>; // displayed as a flat object
 */
export type Prettify<T> = { [K in keyof T]: T[K] } & {};

/**
 * Returns `Y` when `A` is exactly assignable to `B` and vice-versa,
 * otherwise `N`. Powers compile-time equality assertions.
 */
export type IfEquals<A, B, Y = true, N = false> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? Y : N;

/**
 * Compile-time exact-type guard — resolves to `true` when `Actual` and
 * `Expected` are identical, `never` otherwise. Assign the result to a
 * `const _lock: AssertEqual<A, B> = true;` so any drift becomes a compile
 * error at the declaration site.
 */
export type AssertEqual<Actual, Expected> = IfEquals<Actual, Expected, true, never>;

/**
 * JSON-serialized shape of `T` — the wire form produced by `Response.json()`
 * / `JSON.stringify`: `Date` becomes ISO `string` (nullability preserved),
 * arrays are serialized element-wise, everything else is untouched.
 *
 * Used to derive the `*Response` API types from the `*Record` store types so
 * the two can never drift: add a field to `FeedbackRecord` and
 * `FeedbackResponse` follows automatically.
 */
export type Serialized<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K] extends (infer U)[]
        ? Serialized<U>[]
        : T[K];
};

/**
 * Type guard that narrows `value` to a non-null `Record<PropertyKey, unknown>`.
 * Useful when validating arbitrary inputs before reading fields.
 */
export function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Returns true when `value` is an object that exposes the requested key.
 * Type-narrows `value` so the property can be accessed without further
 * casting — a strictly typed replacement for `"k" in obj`.
 *
 * Named after the standardised `Object.hasOwn` helper rather than the
 * legacy `Object.prototype.hasOwnProperty`, which the linter forbids
 * shadowing.
 */
export function hasOwn<K extends PropertyKey>(value: unknown, key: K): value is Record<K, unknown> {
  return isRecord(value) && key in value;
}
