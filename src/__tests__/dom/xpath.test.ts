// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { generateXPath } from "../../dom/xpath";

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

    expect(generateXPath(div)).toBe(
      `//div[@id=concat('it',\"'\",'s')]`,
    );
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
});
