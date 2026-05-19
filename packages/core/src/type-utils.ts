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
 * Branded primitive — opaque alias safer than a raw `string` for IDs and
 * other opaque tokens. Cast through `as` at the construction boundary.
 *
 * @example
 *   type FeedbackId = Brand<string, "FeedbackId">;
 *   const id = "abc" as FeedbackId;
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

/**
 * Tuple type for arrays guaranteed to contain at least one element. Useful
 * for invariants enforced at the type system level.
 */
export type NonEmptyArray<T> = readonly [T, ...T[]];

/**
 * Returns `Y` when `A` is exactly assignable to `B` and vice-versa,
 * otherwise `N`. Powers compile-time equality assertions.
 */
export type IfEquals<A, B, Y = true, N = false> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? Y : N;

/**
 * Compile-time exact-type guard — throws a type error when `Actual` and
 * `Expected` drift apart. Use inside dead-code `void` statements to lock
 * inferred types against manually-written interfaces.
 */
export type AssertEqual<Actual, Expected> = IfEquals<Actual, Expected, true, never>;

/**
 * Extract literal keys whose values match the predicate type `V`.
 * Useful to derive enums or maps from a config record.
 */
export type KeysOfType<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];

/**
 * Mark every property of `T` as required AND non-nullable. Stricter than
 * `Required<T>` because it also strips `null`.
 */
export type RequiredNonNull<T> = { [K in keyof T]-?: NonNullable<T[K]> };

/**
 * Replace properties of `T` whose names are in `K` with the shape `R[K]`.
 * Preserves the rest. Cheaper than chaining `Omit` + `Pick`.
 */
export type Replace<T, K extends keyof T, R extends { [P in K]: unknown }> = Prettify<Omit<T, K> & R>;

/**
 * Deep readonly — recurses through arrays and plain objects, leaves
 * primitives, classes, and built-ins (Date, Map, Set, …) untouched.
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepReadonly<U>>
    : T extends object
      ? T extends (...args: never[]) => unknown
        ? T
        : T extends Date | RegExp | Map<unknown, unknown> | Set<unknown> | Promise<unknown>
          ? T
          : { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

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
