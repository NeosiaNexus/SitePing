// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { adjacentText, boundedText, boundedTextEnd, neighborText } from "../../src/dom/text-context";

describe("adjacentText", () => {
  let parent: HTMLDivElement;
  let target: HTMLDivElement;

  beforeEach(() => {
    parent = document.createElement("div");
    target = document.createElement("div");
  });

  it('"before" returns last 32 chars of previous sibling text', () => {
    const prev = document.createElement("span");
    prev.textContent = "previous sibling text";
    parent.append(prev, target);

    expect(adjacentText(target, "before")).toBe("previous sibling text");
  });

  it('"after" returns first 32 chars of next sibling text', () => {
    const next = document.createElement("span");
    next.textContent = "next sibling text";
    parent.append(target, next);

    expect(adjacentText(target, "after")).toBe("next sibling text");
  });

  it("returns empty string when no siblings exist", () => {
    parent.append(target);

    expect(adjacentText(target, "before")).toBe("");
    expect(adjacentText(target, "after")).toBe("");
  });

  it("skips empty siblings and returns text from the next one (up to 3 attempts)", () => {
    const empty1 = document.createElement("div");
    const empty2 = document.createElement("div");
    const withText = document.createElement("div");
    withText.textContent = "found it";

    // before: target walks left → empty1 → empty2 → withText
    parent.append(withText, empty2, empty1, target);
    expect(adjacentText(target, "before")).toBe("found it");

    // after: target walks right → empty → withText
    const parent2 = document.createElement("div");
    const target2 = document.createElement("div");
    const emptyAfter1 = document.createElement("div");
    const emptyAfter2 = document.createElement("div");
    const afterText = document.createElement("div");
    afterText.textContent = "after found";
    parent2.append(target2, emptyAfter1, emptyAfter2, afterText);
    expect(adjacentText(target2, "after")).toBe("after found");
  });

  it("returns empty string when all 3 siblings are empty", () => {
    const e1 = document.createElement("div");
    const e2 = document.createElement("div");
    const e3 = document.createElement("div");
    parent.append(e1, e2, e3, target);

    expect(adjacentText(target, "before")).toBe("");
  });

  it('"before" slices to last 32 chars of long text', () => {
    const prev = document.createElement("span");
    prev.textContent = "A".repeat(50);
    parent.append(prev, target);

    expect(adjacentText(target, "before")).toBe("A".repeat(32));
  });

  it('"after" slices to first 32 chars of long text', () => {
    const next = document.createElement("span");
    next.textContent = "B".repeat(50);
    parent.append(target, next);

    expect(adjacentText(target, "after")).toBe("B".repeat(32));
  });
});

describe("neighborText", () => {
  let parent: HTMLDivElement;
  let target: HTMLDivElement;

  beforeEach(() => {
    parent = document.createElement("div");
    target = document.createElement("div");
  });

  it('returns "prevText | nextText" when both siblings exist', () => {
    const prev = document.createElement("span");
    prev.textContent = "left";
    const next = document.createElement("span");
    next.textContent = "right";
    parent.append(prev, target, next);

    expect(neighborText(target)).toBe("left | right");
  });

  it("returns only previous text when no next sibling", () => {
    const prev = document.createElement("span");
    prev.textContent = "only left";
    parent.append(prev, target);

    expect(neighborText(target)).toBe("only left");
  });

  it("returns only next text when no previous sibling", () => {
    const next = document.createElement("span");
    next.textContent = "only right";
    parent.append(target, next);

    expect(neighborText(target)).toBe("only right");
  });

  it("returns empty string when neither sibling exists", () => {
    parent.append(target);

    expect(neighborText(target)).toBe("");
  });

  it("truncates long text to 40 chars each", () => {
    const prev = document.createElement("span");
    prev.textContent = "X".repeat(60);
    const next = document.createElement("span");
    next.textContent = "Y".repeat(60);
    parent.append(prev, target, next);

    expect(neighborText(target)).toBe(`${"X".repeat(40)} | ${"Y".repeat(40)}`);
  });
});

describe("boundedText / boundedTextEnd", () => {
  it("boundedText returns the leading text of a leaf element up to the cap", () => {
    const el = document.createElement("div");
    el.textContent = "abcdefghij";
    expect(boundedText(el, 4)).toBe("abcd");
    expect(boundedText(el, 100)).toBe("abcdefghij");
  });

  it("boundedText walks nested elements in tree order and stops at the cap", () => {
    const el = document.createElement("div");
    const b = document.createElement("b");
    b.textContent = "Hello ";
    const i = document.createElement("i");
    i.textContent = "world";
    el.append(b, i);
    expect(boundedText(el, 8)).toBe("Hello wo");
    expect(boundedText(el, 100)).toBe("Hello world");
  });

  it("boundedTextEnd returns the trailing text, walking nested elements in reverse", () => {
    const el = document.createElement("div");
    const b = document.createElement("b");
    b.textContent = "Hello ";
    const i = document.createElement("i");
    i.textContent = "world";
    el.append(b, i);
    // Budget filled inside the nested <i> — the recursion's early-return path.
    expect(boundedTextEnd(el, 3)).toBe("rld");
    // Budget spans both nested elements.
    expect(boundedTextEnd(el, 8)).toBe("lo world");
    expect(boundedTextEnd(el, 100)).toBe("Hello world");
  });

  it("boundedTextEnd returns empty for an element with no text", () => {
    const el = document.createElement("div");
    el.appendChild(document.createElement("span"));
    expect(boundedTextEnd(el, 10)).toBe("");
  });
});
