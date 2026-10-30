/**
 * Text a database may refuse — shared by the stores that write to one.
 *
 * PostgreSQL rejects NUL in `text` and `jsonb`, and a surrogate without its
 * pair, which UTF-8 cannot encode: `jsonb` rejects it and `text` turns it
 * into U+FFFD. A string cut inside an emoji ends with such an unpaired
 * surrogate. The store contract accepts either the text as sent or U+FFFD in
 * place of each such code unit (see the conformance suite), so a SQL store
 * normalizes everything it writes or looks up with {@link toStorableText}.
 */

/** The UTF-16 code units a JavaScript string may hold but PostgreSQL cannot store: NUL and an unpaired surrogate. */
export const UNSTORABLE_CODE_UNITS = /\0|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** U+FFFD, the Unicode replacement character — what stands for each unstorable code unit. */
export const REPLACEMENT_CHARACTER = "�";

/**
 * `text` with every code unit PostgreSQL cannot store (NUL, an unpaired
 * surrogate) replaced by U+FFFD. Applied to everything a store writes or
 * looks up, a submission holding one is stored instead of failing, a record
 * reads back exactly as the store returned it, and a search or lookup
 * holding one matches what was stored for it.
 */
export function toStorableText(text: string): string {
  return text.replace(UNSTORABLE_CODE_UNITS, REPLACEMENT_CHARACTER);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * `value` with {@link toStorableText} applied to every string it holds, keys
 * included, through arrays and plain objects (annotations, diagnostics…).
 * Other values — numbers, dates, `null` — are kept as they are.
 */
export function toStorableValue<Value>(value: Value): Value {
  if (typeof value === "string") return toStorableText(value) as Value;
  if (Array.isArray(value)) return value.map(toStorableValue) as Value;
  if (!isPlainObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [toStorableText(key), toStorableValue(item)]),
  ) as Value;
}
