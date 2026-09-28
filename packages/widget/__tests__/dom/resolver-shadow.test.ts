// @vitest-environment jsdom

// Resolution through open shadow roots (#177): a shadow-captured anchor
// (`host >>> inner`) re-runs the selector strategies inside the roots its
// host chain leads to, while light-DOM anchors must keep exactly the cost
// they had before — no whole-document walk, no shadow root ever queried.

import type { AnchorData } from "@siteping/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateAnchor } from "../../src/dom/anchor";
import { resolveAnchor } from "../../src/dom/resolver";

/** Minimal AnchorData with sensible defaults (mirrors resolver-v2.test.ts). */
function makeAnchor(overrides: Partial<AnchorData> = {}): AnchorData {
  return {
    cssSelector: "div",
    xpath: "/html/body/div[1]",
    textSnippet: "",
    elementTag: "DIV",
    elementId: undefined,
    textPrefix: "",
    textSuffix: "",
    fingerprint: "",
    neighborText: "",
    ...overrides,
  };
}

/** Append a light-DOM host carrying an open shadow root filled with `html`. */
function component(html: string, attrs: Record<string, string> = {}, parent: Node = document.body): ShadowRoot {
  const host = document.createElement("x-card");
  for (const [name, value] of Object.entries(attrs)) host.setAttribute(name, value);
  parent.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = html;
  return shadow;
}

function inner(shadow: ShadowRoot, selector: string): Element {
  const el = shadow.querySelector(selector);
  if (!el) throw new Error(`fixture: ${selector} missing`);
  return el;
}

/** Every querySelectorAll / XPath call, tagged with the node it ran on. */
function recordQueries(): { root: string; query: string }[] {
  const calls: { root: string; query: string }[] = [];
  const label = (node: Node) =>
    node === document ? "document" : node instanceof ShadowRoot ? "shadow-root" : (node as Element).tagName;
  for (const proto of [Document.prototype, DocumentFragment.prototype, Element.prototype]) {
    const original = proto.querySelectorAll;
    vi.spyOn(proto, "querySelectorAll").mockImplementation(function (this: ParentNode, selector: string) {
      calls.push({ root: label(this as unknown as Node), query: selector });
      return original.call(this, selector);
    } as typeof original);
  }
  const evaluate = document.evaluate;
  vi.spyOn(document, "evaluate").mockImplementation(function (this: Document, expression, ...rest) {
    calls.push({ root: "document", query: `xpath:${expression}` });
    return evaluate.call(this, expression, ...rest);
  } as typeof evaluate);
  return calls;
}

afterEach(() => {
  vi.restoreAllMocks();
  while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
});

describe("generate → resolve round trip", () => {
  it("resolves an element inside a single open root", () => {
    const shadow = component('<h3 id="title">Premium plan</h3><p>Everything included</p>', { id: "plan" });
    const target = inner(shadow, "#title");

    const result = resolveAnchor(generateAnchor(target));
    expect(result?.element).toBe(target);
    expect(result?.strategy).toBe("id");
    expect(result?.confidence).toBe(1);
  });

  it("resolves through nested open roots", () => {
    const outer = component('<section class="body"></section>', { id: "shell" });
    const nested = component('<p class="lead">Nested paragraph text</p>', {}, inner(outer, ".body"));
    const target = inner(nested, ".lead");

    const anchor = generateAnchor(target);
    expect(anchor.cssSelector.split(" >>> ")).toHaveLength(3);
    const result = resolveAnchor(anchor);
    expect(result?.element).toBe(target);
    expect(result?.strategy).toBe("css");
  });

  it("picks the right component among identical siblings", () => {
    const shadows = ["Starter", "Team", "Enterprise"].map((name) => component(`<h3 class="name">${name}</h3>`));
    const target = inner(shadows[1] as ShadowRoot, ".name");

    const result = resolveAnchor(generateAnchor(target));
    expect(result?.element).toBe(target);
  });

  it("verifies across every host an ambiguous host segment matches", () => {
    const shadows = ["Starter", "Team", "Enterprise"].map((name) => component(`<h3 class="name">${name}</h3>`));

    const result = resolveAnchor(
      makeAnchor({ cssSelector: "x-card >>> .name", elementTag: "H3", textSnippet: "Enterprise" }),
    );
    expect(result?.element).toBe(inner(shadows[2] as ShadowRoot, ".name"));
  });
});

describe("tree-scoped strategies never reach across trees", () => {
  it("ignores a light-DOM element sharing the shadow element's id", () => {
    const decoy = document.createElement("button");
    decoy.id = "close";
    document.body.appendChild(decoy);
    const shadow = component('<button id="close"></button>', { id: "dialog" });
    const target = inner(shadow, "#close");

    const result = resolveAnchor(generateAnchor(target));
    expect(result?.element).toBe(target);
  });

  it("never lands a textless shadow button on the light-DOM button its drifted anchor resembles", () => {
    const decoy = document.createElement("button");
    document.body.appendChild(decoy);
    const shadow = component('<button class="icon"></button>', { id: "toolbar" });
    const anchor = generateAnchor(inner(shadow, ".icon"));
    expect(anchor.cssSelector).toBe("#toolbar >>> .icon");

    // The component re-renders its icon button under a new class: the inner
    // segment misses, and nothing may fall back to body > button.
    inner(shadow, ".icon").className = "icon-v2";
    const result = resolveAnchor(anchor);
    expect(result?.element).not.toBe(decoy);
    expect(result?.element).toBe(inner(shadow, ".icon-v2"));
    expect(result?.strategy).toBe("scan");
  });

  it("never evaluates a shadow anchor's XPath against the document", () => {
    const decoy = document.createElement("button");
    document.body.appendChild(decoy);
    component('<button class="icon"></button>', { id: "toolbar" });
    const calls = recordQueries();

    // Foreign data: a document-absolute XPath next to a shadow selector.
    const result = resolveAnchor(
      makeAnchor({ cssSelector: "#toolbar >>> .gone", xpath: "/html/body/button[1]", elementTag: "BUTTON" }),
    );
    expect(result).toBeNull();
    expect(calls.some((c) => c.query.startsWith("xpath:"))).toBe(false);
  });
});

describe("anchorKey through shadow roots", () => {
  it("finds a key set on an element inside the shadow tree", () => {
    const shadow = component('<article data-feedback-anchor="plan.card"><p>Card body</p></article>', {
      id: "pricing",
    });
    const target = inner(shadow, "article");
    const anchor = generateAnchor(target);
    expect(anchor.anchorKey).toBe("plan.card");

    const result = resolveAnchor({ ...anchor, cssSelector: "#pricing >>> .renamed", elementTag: "SECTION" });
    expect(result?.element).toBe(target);
    expect(result?.strategy).toBe("anchorKey");
  });

  it("finds a key on an intermediate host of a nested chain", () => {
    const outer = component('<div class="slot"></div>', { id: "shell" });
    const nested = component(
      "<p>Nested body copy</p>",
      { "data-feedback-anchor": "shell.body" },
      inner(outer, ".slot"),
    );
    const keyed = nested.host;

    const result = resolveAnchor(
      makeAnchor({ cssSelector: "#shell >>> x-card >>> .gone", anchorKey: "shell.body", elementTag: "P" }),
    );
    expect(result?.element).toBe(keyed);
    expect(result?.strategy).toBe("anchorKey");
  });

  it("keeps the inner element when the key sits on its light-DOM host", () => {
    const shadow = component("<p>Only the shadow tree holds this text</p>", {
      id: "card",
      "data-feedback-anchor": "page.card",
    });
    const target = inner(shadow, "p");
    const anchor = generateAnchor(target);
    expect(anchor.anchorKey).toBe("page.card");

    const result = resolveAnchor(anchor);
    expect(result?.element).toBe(target);
  });
});

describe("closed roots and broken chains", () => {
  it("round-trips a closed root's host as a plain light-DOM anchor", () => {
    const host = document.createElement("x-card");
    host.id = "sealed";
    host.textContent = "Slotted label";
    document.body.appendChild(host);
    host.attachShadow({ mode: "closed" }).innerHTML = "<slot></slot>";

    const result = resolveAnchor(generateAnchor(host));
    expect(result?.element).toBe(host);
  });

  it("orphans (without throwing or sweeping) when the host chain is gone", () => {
    const shadow = component("<p>Gone with its host</p>", { id: "card" });
    const anchor = generateAnchor(inner(shadow, "p"));
    shadow.host.remove();

    const budget = { remaining: 1, starved: false };
    expect(resolveAnchor(anchor, { scanBudget: budget })).toBeNull();
    expect(budget).toEqual({ remaining: 1, starved: false });
  });

  it("orphans when the host's root became closed", () => {
    const shadow = component("<p>Sealed later</p>", { id: "card" });
    const anchor = generateAnchor(inner(shadow, "p"));
    shadow.host.remove();
    const host = document.createElement("x-card");
    host.id = "card";
    document.body.appendChild(host);
    host.attachShadow({ mode: "closed" }).innerHTML = "<p>Sealed later</p>";

    expect(resolveAnchor(anchor)).toBeNull();
  });
});

describe("bounded cost", () => {
  it("caps a degenerate host segment at 16 hosts per level", () => {
    for (let i = 0; i < 40; i++) component(`<p class="name">Card ${i}</p>`);
    const calls = recordQueries();

    resolveAnchor(makeAnchor({ cssSelector: "x-card >>> .missing", elementTag: "P", textSnippet: "Card 39" }));
    const shadowQueries = calls.filter((c) => c.root === "shadow-root");
    // css + sweep, each across at most 16 roots.
    expect(shadowQueries.filter((c) => c.query === ".missing")).toHaveLength(16);
    expect(shadowQueries.filter((c) => c.query === "p")).toHaveLength(16);
    expect(shadowQueries).toHaveLength(32);
  });

  it("applies SCAN_HARD_CAP across roots, not per root", () => {
    const filler = "<i></i>".repeat(5_000);
    component(filler, { id: "a" });
    const second = component(`${filler}<i>needle phrase to rescue</i>`, { id: "b" });
    const needle = second.lastElementChild;

    const anchor = makeAnchor({
      cssSelector: "x-card >>> .gone",
      elementTag: "I",
      textSnippet: "needle phrase to rescue",
    });
    // 10,001st candidate overall — past the cap however the roots split it.
    expect(resolveAnchor(anchor)).toBeNull();

    // Within the cap, the same sweep does rescue it (the fixture is sound).
    (second.firstElementChild as Element).remove();
    expect(resolveAnchor(anchor)?.element).toBe(needle);
  });

  it("starves instead of sweeping shadow roots when the budget is exhausted", () => {
    const shadow = component('<p class="lead">Drifted lead paragraph</p>', { id: "card" });
    const anchor = generateAnchor(inner(shadow, ".lead"));
    inner(shadow, ".lead").className = "intro";
    const calls = recordQueries();

    const budget = { remaining: 0, starved: false };
    expect(resolveAnchor(anchor, { scanBudget: budget })).toBeNull();
    expect(budget.starved).toBe(true);
    expect(calls.filter((c) => c.query === "p")).toHaveLength(0);

    // A fresh budget pays exactly one unit for the whole cross-root sweep.
    const fresh = { remaining: 1, starved: false };
    expect(resolveAnchor(anchor, { scanBudget: fresh })?.element).toBe(inner(shadow, ".intro"));
    expect(fresh).toEqual({ remaining: 0, starved: false });
  });
});

describe("light-DOM resolution cost is unchanged", () => {
  /** A light-DOM page, optionally sharing the document with 30 open components. */
  function page(withComponents: boolean): HTMLElement {
    const main = document.createElement("main");
    main.innerHTML = Array.from({ length: 60 }, (_, i) => `<p class="row">Row ${i} copy</p>`).join("");
    document.body.appendChild(main);
    const target = document.createElement("p");
    target.id = "promo";
    target.textContent = "Spring promo banner";
    main.appendChild(target);
    if (withComponents) {
      for (let i = 0; i < 30; i++) {
        component(Array.from({ length: 20 }, (_, j) => `<p class="row">Shadow ${i}.${j}</p>`).join(""));
      }
    }
    return target;
  }

  function trace(withComponents: boolean, anchor: AnchorData) {
    const target = page(withComponents);
    const calls = recordQueries();
    const result = resolveAnchor(anchor);
    vi.restoreAllMocks();
    while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
    return { calls, element: result?.element === target ? "target" : (result?.element ?? null), result };
  }

  const happy = makeAnchor({
    cssSelector: "#promo",
    xpath: "//p[@id='promo']",
    elementId: "promo",
    elementTag: "P",
    textSnippet: "Spring promo banner",
  });
  // Selector misses → the tag sweep runs: the worst case a light anchor pays.
  const drifted = makeAnchor({
    cssSelector: ".banner",
    xpath: "/html/body/aside[1]",
    elementTag: "P",
    textSnippet: "Spring promo banner",
  });

  it.each([
    ["happy path", happy, ['[id="promo"]', "#promo", "xpath://p[@id='promo']"]],
    ["sweep path", drifted, [".banner", "xpath:/html/body/aside[1]", "p"]],
  ])("%s: same document queries with or without shadow roots on the page", (_label, anchor, expected) => {
    const bare = trace(false, anchor);
    const crowded = trace(true, anchor);

    expect(bare.element).toBe("target");
    expect(crowded.element).toBe("target");
    expect(bare.calls).toEqual(expected.map((query) => ({ root: "document", query })));
    // Identical query plan: no "*" walk, no shadow root or host ever queried.
    expect(crowded.calls).toEqual(bare.calls);
  });
});
