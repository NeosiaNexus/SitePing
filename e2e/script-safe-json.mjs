const ESCAPES = { "<": "\\u003c", "\u2028": "\\u2028", "\u2029": "\\u2029" };

/**
 * `JSON.stringify(value)`, safe to inline in an HTML `<script>` element.
 *
 * JSON alone is not: the HTML parser ends the element at the first
 * `</script` whatever JS string it sits in, and a `<!--` changes how it looks
 * for that end. `<` is the one character it acts on there, so escaping it as
 * `\u003c` leaves nothing for the parser and the same value for JS. U+2028
 * and U+2029 are escaped too: they end a line in pre-ES2019 engines.
 *
 * @param {unknown} value A JSON-serializable value.
 * @returns {string} A JS expression evaluating to a copy of `value`.
 */
export function scriptSafeJson(value) {
  return JSON.stringify(value).replace(/[<\u2028\u2029]/g, (char) => ESCAPES[char]);
}
