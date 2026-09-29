import { REPLACEMENT_CHARACTER, UNSTORABLE_CODE_UNITS } from "../constants/text.js";

/**
 * `text` with every code unit PostgreSQL cannot store (NUL, an unpaired
 * surrogate) replaced by U+FFFD. The store applies it to everything it
 * writes or looks up, on both dialects: a submission holding one is stored
 * instead of failing, a record reads back exactly as the store returned it,
 * and a search or lookup holding one matches what was stored for it.
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
