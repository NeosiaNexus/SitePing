// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { generateXPath } from "../../src/dom/xpath";

describe("generateXPath", () => {
  afterEach(() => {
    // Remove all child nodes from body to reset DOM between tests
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("returns //tag[@id='value'] for element with unique ID", () => {
    const div = document.createElement("div");
    div.id = "main";
    document.body.appendChild(div);

    expect(generateXPath(div)).toBe("//div[@id='main']");
  });

  it("returns positional path for element 3 levels deep without IDs", () => {
    const div = document.createElement("div");
    const section = document.createElement("section");
    const p = document.createElement("p");
    div.appendChild(section);
    section.appendChild(p);
    document.body.appendChild(div);

    expect(generateXPath(p)).toBe("/html/body/div[1]/section[1]/p[1]");
  });

  it("uses correct position index for 2nd same-tag sibling", () => {
    const container = document.createElement("div");
    const span1 = document.createElement("span");
    const span2 = document.createElement("span");
    container.appendChild(span1);
    container.appendChild(span2);
    document.body.appendChild(container);

    expect(generateXPath(span2)).toBe("/html/body/div[1]/span[2]");
  });

  it("stops at ancestor with ID", () => {
    const wrapper = document.createElement("div");
    wrapper.id = "wrapper";
    const ul = document.createElement("ul");
    const li = document.createElement("li");
    wrapper.appendChild(ul);
    ul.appendChild(li);
    document.body.appendChild(wrapper);

    expect(generateXPath(li)).toBe("//div[@id='wrapper']/ul[1]/li[1]");
  });

  it("uses concat() escaping for ID containing single quote", () => {
    const div = document.createElement("div");
    div.id = "it's";
    document.body.appendChild(div);

    expect(generateXPath(div)).toBe(`//div[@id=concat('it',"'",'s')]`);
  });

  it("caps depth at 6 segments for deeply nested element", () => {
    // Build a chain 8+ levels deep: body > div > div > div > div > div > div > div > div > span
    let current: Element = document.body;
    for (let i = 0; i < 8; i++) {
      const div = document.createElement("div");
      current.appendChild(div);
      current = div;
    }
    const leaf = document.createElement("span");
    current.appendChild(leaf);

    const xpath = generateXPath(leaf);
    // Strip the /html/body prefix, then count segments
    const afterPrefix = xpath.replace("/html/body", "");
    const segments = afterPrefix.split("/").filter(Boolean);
    expect(segments.length).toBeLessThanOrEqual(6);
  });

  it("returns short path for element directly inside body", () => {
    const p = document.createElement("p");
    document.body.appendChild(p);

    expect(generateXPath(p)).toBe("/html/body/p[1]");
  });

  it("uses concat() escaping when an ancestor (not the leaf) has a single-quoted ID", () => {
    const wrapper = document.createElement("div");
    wrapper.id = "user's-list"; // ancestor with quote in ID
    const ul = document.createElement("ul");
    const li = document.createElement("li");
    wrapper.appendChild(ul);
    ul.appendChild(li);
    document.body.appendChild(wrapper);

    // The ancestor branch in the loop must hit the `concat(...)` path (line 24-26)
    expect(generateXPath(li)).toBe(`//div[@id=concat('user',"'",'s-list')]/ul[1]/li[1]`);
  });

  it("handles an element detached from the document (no parent)", () => {
    // Orphan element: current.parentElement === null inside the loop,
    // exercising the `if (parent)` false branch (line 33) for position calc.
    const orphan = document.createElement("article");
    expect(generateXPath(orphan)).toBe("/html/body/article[1]");
  });

  it("handles an orphan element with an ID via the early-return id path", () => {
    // The element-with-id early return (line 11) — never enters the loop
    const orphan = document.createElement("article");
    orphan.id = "lonely";
    expect(generateXPath(orphan)).toBe("//article[@id='lonely']");
  });

  it("handles an orphan element with a quoted ID via the early-return path", () => {
    // The element-with-id early return when id contains a single quote
    const orphan = document.createElement("article");
    orphan.id = "qu'ote";
    expect(generateXPath(orphan)).toBe(`//article[@id=concat('qu',"'",'ote')]`);
  });

  it("ignores siblings with a different tag when computing the position index", () => {
    // container has [<p>, <h1>, <span> target] — the for loop walks <p> and <h1>
    // (different tags), exercising the `sibling.localName === tag` FALSE branch
    // (line 36) before hitting the target.
    const container = document.createElement("div");
    container.appendChild(document.createElement("p"));
    container.appendChild(document.createElement("h1"));
    const target = document.createElement("span");
    container.appendChild(target);
    document.body.appendChild(container);

    // Only one preceding <span> sibling (zero), so position = 1
    expect(generateXPath(target)).toBe("/html/body/div[1]/span[1]");
  });
});
