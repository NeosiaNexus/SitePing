import { expect, type Page, test } from "@playwright/test";

// A pin on something inside a host menu that closes with `visibility: hidden`:
// the menu keeps its box while closed, so only its `visibility` says that
// nothing is there to pin. Opening and closing it changes a style, not the
// DOM tree, and scrolls nothing. Real layout and real transitions only: jsdom
// has neither.

const API = "http://localhost:3999/api/siteping";

/** A feedback pinned to the link inside the host menu. */
function feedbackPayload(projectName: string) {
  return {
    projectName,
    type: "change",
    message: "Bigger images in the menu",
    url: "/",
    viewport: "1280x720",
    userAgent: "Playwright",
    authorName: "Test",
    authorEmail: "test@test.com",
    annotations: [
      {
        anchor: {
          cssSelector: "#host-menu-item",
          xpath: "/html/body/nav/a",
          textSnippet: "Collection",
          elementTag: "A",
          elementId: "host-menu-item",
          textPrefix: "",
          textSuffix: "",
          fingerprint: "0:0:0",
          neighborText: "",
        },
        rect: { xPct: 0, yPct: 0, wPct: 1, hPct: 1 },
        scrollX: 0,
        scrollY: 0,
        viewportW: 1280,
        viewportH: 720,
        devicePixelRatio: 1,
      },
    ],
  };
}

/**
 * Adds a menu to the page before the widget starts: a fixed panel, closed,
 * and a button that opens and closes it by flipping its inline style.
 */
async function addHostMenu(page: Page, transition: string) {
  await page.addInitScript((menuTransition) => {
    document.addEventListener("DOMContentLoaded", () => {
      const menu = document.createElement("nav");
      menu.id = "host-menu";
      menu.style.cssText = `position:fixed;top:0;left:0;bottom:0;width:320px;padding:96px 24px;background:#fff;visibility:hidden;opacity:0;transition:${menuTransition};`;
      const item = document.createElement("a");
      item.id = "host-menu-item";
      item.href = "#collection";
      item.textContent = "Collection";
      item.style.cssText = "display:inline-block;padding:8px 16px;";
      menu.appendChild(item);

      const toggle = document.createElement("button");
      toggle.id = "host-menu-toggle";
      toggle.type = "button";
      toggle.textContent = "Menu";
      toggle.style.cssText = "position:fixed;top:16px;right:16px;";
      toggle.addEventListener("click", () => {
        const open = menu.style.visibility === "hidden";
        menu.style.visibility = open ? "visible" : "hidden";
        menu.style.opacity = open ? "1" : "0";
      });
      document.body.append(menu, toggle);
    });
  }, transition);
}

for (const [name, transition] of [
  ["a menu that fades", "opacity 150ms, visibility 150ms"],
  ["a menu that opens at once", "none"],
] as const) {
  test.describe(`Pin inside ${name}`, () => {
    test.beforeEach(async ({ page, browserName }, testInfo) => {
      const project = `e2e-menu-${browserName}-${testInfo.parallelIndex}`;
      await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
      await page.request.post(API, { data: feedbackPayload(project) });
      await addHostMenu(page, transition);
      await page.goto(`http://localhost:3999?project=${project}`);
      await expect(page.locator("#siteping-markers [data-feedback-id]")).toBeAttached();
    });

    test("shows with the menu and goes away with it", async ({ page }) => {
      const pin = page.locator("#siteping-markers [data-feedback-id]");
      const toggle = page.locator("#host-menu-toggle");

      // Closed: the link keeps its box, and nothing is painted there.
      expect((await page.locator("#host-menu-item").boundingBox())?.width).toBeGreaterThan(0);
      await expect(pin).toBeHidden();

      await toggle.click();
      await expect(pin).toBeVisible();
      const item = (await page.locator("#host-menu-item").boundingBox())!;
      const dot = (await pin.boundingBox())!;
      // The pin sits on the link's top-right corner.
      expect(Math.abs(dot.x + dot.width / 2 - (item.x + item.width))).toBeLessThan(dot.width);
      expect(Math.abs(dot.y + dot.height / 2 - item.y)).toBeLessThan(dot.height);

      await toggle.click();
      await expect(pin).toBeHidden();
    });
  });
}
