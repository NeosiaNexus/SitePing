// @vitest-environment jsdom
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { scriptSafeJson } from "./script-safe-json.mjs";

/** Inlines `value` the way the fixture servers do and parses the page as a browser would. */
function parseInlined(value) {
  return new DOMParser().parseFromString(`<script>(${scriptSafeJson(value)})</script><p id="after"></p>`, "text/html");
}

/** Strings built from the pieces that end a script element, open a comment or end a JS line. */
const hostile = fc.string({
  unit: fc.constantFrom(
    "</script>",
    "</SCRIPT ",
    "<script>",
    "<!--",
    "-->",
    "<",
    "\u2028",
    "\u2029",
    "'",
    '"',
    "\\",
    "a",
  ),
  maxLength: 12,
});

describe("scriptSafeJson", () => {
  it("escapes <, U+2028 and U+2029 as JSON unicode escapes", () => {
    expect(scriptSafeJson({ project: "</script><!--\u2028\u2029" })).toBe(
      '{"project":"\\u003c/script>\\u003c!--\\u2028\\u2029"}',
    );
  });

  it("keeps any hostile string inside one script element, evaluating back to itself", () => {
    fc.assert(
      fc.property(fc.oneof(hostile, fc.dictionary(hostile, hostile)), (value) => {
        const doc = parseInlined(value);
        expect(doc.scripts).toHaveLength(1);
        expect(doc.body.lastElementChild?.id).toBe("after");
        expect(new Function(`return ${doc.scripts[0]?.text}`)()).toEqual(value);
      }),
    );
  });
});
