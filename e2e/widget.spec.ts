import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.request.get("http://localhost:3999/api/reset");
  await page.goto("http://localhost:3999");
  await page.waitForSelector("siteping-widget", { state: "attached" });
  await page.waitForTimeout(500);
});

// ---------------------------------------------------------------------------
// Helpers — shadow DOM is open in test mode
// ---------------------------------------------------------------------------

function shadow(page: ReturnType<typeof test.extend>) {
  return {
    /** Query inside the shadow root */
    async query(selector: string) {
      return page.evaluate((sel) => {
        const host = document.querySelector("siteping-widget");
        return host?.shadowRoot?.querySelector(sel) !== null;
      }, selector);
    },
    /** Get text content of an element inside shadow root */
    async text(selector: string) {
      return page.evaluate((sel) => {
        const host = document.querySelector("siteping-widget");
        return host?.shadowRoot?.querySelector(sel)?.textContent ?? null;
      }, selector);
    },
    /** Click an element inside shadow root */
    async click(selector: string) {
      await page.evaluate((sel) => {
        const host = document.querySelector("siteping-widget");
        (host?.shadowRoot?.querySelector(sel) as HTMLElement)?.click();
      }, selector);
    },
    /** Count matching elements */
    async count(selector: string) {
      return page.evaluate((sel) => {
        const host = document.querySelector("siteping-widget");
        return host?.shadowRoot?.querySelectorAll(sel).length ?? 0;
      }, selector);
    },
    /** Get attribute value */
    async attr(selector: string, attr: string) {
      return page.evaluate(
        ({ sel, a }) => {
          const host = document.querySelector("siteping-widget");
          return host?.shadowRoot?.querySelector(sel)?.getAttribute(a) ?? null;
        },
        { sel: selector, a: attr },
      );
    },
    /** Wait for an element to appear inside shadow root */
    async waitFor(selector: string, options?: { timeout?: number }) {
      await page.waitForFunction(
        (sel) => {
          const host = document.querySelector("siteping-widget");
          return host?.shadowRoot?.querySelector(sel) !== null;
        },
        selector,
        { timeout: options?.timeout ?? 5000 },
      );
    },
    /** Wait for an element to disappear inside shadow root */
    async waitForHidden(selector: string, options?: { timeout?: number }) {
      await page.waitForFunction(
        (sel) => {
          const host = document.querySelector("siteping-widget");
          return host?.shadowRoot?.querySelector(sel) === null;
        },
        selector,
        { timeout: options?.timeout ?? 5000 },
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe("Widget injection", () => {
  test("injects the siteping-widget element", async ({ page }) => {
    await expect(page.locator("siteping-widget")).toBeAttached();
  });

  test("renders the FAB button", async ({ page }) => {
    const s = shadow(page);
    expect(await s.query(".sp-fab")).toBe(true);
  });

  test("FAB has correct z-index on host", async ({ page }) => {
    const zIndex = await page.locator("siteping-widget").evaluate((el) => getComputedStyle(el).zIndex);
    expect(zIndex).toBe("2147483647");
  });
});

test.describe("FAB radial menu", () => {
  test("opens on click and shows 3 items", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor(".sp-radial-item--open");
    expect(await s.count(".sp-radial-item--open")).toBe(3);
  });

  test("closes on second click", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor(".sp-radial-item--open");
    await s.click(".sp-fab");
    await s.waitForHidden(".sp-radial-item--open");
    expect(await s.count(".sp-radial-item--open")).toBe(0);
  });

  test("sets aria-expanded correctly", async ({ page }) => {
    const s = shadow(page);
    expect(await s.attr(".sp-fab", "aria-expanded")).toBe("false");
    await s.click(".sp-fab");
    await s.waitFor(".sp-radial-item--open");
    expect(await s.attr(".sp-fab", "aria-expanded")).toBe("true");
  });
});

test.describe("Panel", () => {
  test("opens when chat button is clicked", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-panel--open");
    expect(await s.query(".sp-panel--open")).toBe(true);
  });

  test("shows empty state", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-empty-text");
    const text = await s.text(".sp-empty-text");
    expect(text).toContain("Aucun feedback");
  });

  test("has 5 filter chips", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-chip");
    expect(await s.count(".sp-chip")).toBe(5);
  });

  test("closes via close button", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-panel--open");
    await s.click(".sp-panel-close");
    await s.waitForHidden(".sp-panel--open");
    expect(await s.query(".sp-panel--open")).toBe(false);
  });
});

test.describe("Annotation mode", () => {
  test("activates overlay on annotate click", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="annotate"]');
    await s.click('[data-item-id="annotate"]');

    await page.waitForFunction(() => !!document.querySelector("div[style*='crosshair']"));
    const hasOverlay = await page.evaluate(() => !!document.querySelector("div[style*='crosshair']"));
    expect(hasOverlay).toBe(true);
  });

  test("shows cancel button in toolbar", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="annotate"]');
    await s.click('[data-item-id="annotate"]');

    await page.waitForFunction(() => {
      const btns = document.querySelectorAll("button");
      return Array.from(btns).some((b) => b.textContent === "Annuler");
    });
    const hasCancel = await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      return Array.from(btns).some((b) => b.textContent === "Annuler");
    });
    expect(hasCancel).toBe(true);
  });

  test("deactivates on Escape", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="annotate"]');
    await s.click('[data-item-id="annotate"]');

    await page.waitForFunction(() => !!document.querySelector("div[style*='crosshair']"));
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("div[style*='crosshair']"));

    const hasOverlay = await page.evaluate(() => !!document.querySelector("div[style*='crosshair']"));
    expect(hasOverlay).toBe(false);
  });

  test("draws a rectangle on drag", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="annotate"]');
    await s.click('[data-item-id="annotate"]');

    await page.waitForFunction(() => !!document.querySelector("div[style*='crosshair']"));

    const box = await page.locator("#target-element").boundingBox();
    await page.mouse.move(box!.x + 10, box!.y + 10);
    await page.mouse.down();
    await page.mouse.move(box!.x + 200, box!.y + 50, { steps: 5 });

    // A rectangle div with border should exist
    const hasRect = await page.evaluate(() => {
      const divs = document.querySelectorAll("div[style*='pointer-events']");
      return Array.from(divs).some(
        (d) => (d as HTMLElement).style.width && parseInt((d as HTMLElement).style.width, 10) > 50,
      );
    });
    expect(hasRect).toBe(true);

    await page.mouse.up();
  });
});

test.describe("Full annotation flow", () => {
  test("draw → popup → submit → marker + API persist", async ({ page }) => {
    const s = shadow(page);

    // 1. Annotate mode
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="annotate"]');
    await s.click('[data-item-id="annotate"]');
    await page.waitForFunction(() => !!document.querySelector("div[style*='crosshair']"));

    // 2. Draw rectangle over target
    const box = await page.locator("#target-element").boundingBox();
    await page.mouse.move(box!.x + 10, box!.y + 10);
    await page.mouse.down();
    await page.mouse.move(box!.x + 250, box!.y + 60, { steps: 5 });
    await page.mouse.up();

    // 3. Popup should appear — select Bug
    await page.waitForSelector("button[data-type='bug']");
    await page.click("button[data-type='bug']");

    // 4. Type message
    await page.waitForSelector("textarea");
    await page.fill("textarea", "Le bouton est cassé");

    // 5. Submit (use evaluate — the overlay may intercept pointer events)
    await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      for (const b of btns) {
        if (b.textContent === "Envoyer") {
          b.click();
          return;
        }
      }
    });

    // 6. Identity modal — fill if needed
    await page.waitForTimeout(500);
    const identityTitle = await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      return host?.shadowRoot?.querySelector(".sp-identity-title") !== null;
    });
    if (identityTitle) {
      await page.evaluate(() => {
        const host = document.querySelector("siteping-widget");
        const sr = host?.shadowRoot;
        const inputs = sr?.querySelectorAll(".sp-input") as NodeListOf<HTMLInputElement>;
        if (inputs?.length >= 2) {
          inputs[0].value = "Test User";
          inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
          inputs[1].value = "test@example.com";
          inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
        }
        (sr?.querySelector(".sp-btn-primary") as HTMLElement)?.click();
      });
      await page.waitForTimeout(1000);
    }

    // 7. Verify marker appeared
    await page.waitForFunction(
      () => {
        const c = document.getElementById("siteping-markers");
        return (c?.querySelectorAll("[data-feedback-id]").length ?? 0) >= 1;
      },
      undefined,
      { timeout: 5000 },
    );
    const markerCount = await page.evaluate(() => {
      const c = document.getElementById("siteping-markers");
      return c?.querySelectorAll("[data-feedback-id]").length ?? 0;
    });
    expect(markerCount).toBeGreaterThanOrEqual(1);

    // 8. Verify API persistence
    const res = await page.request.get("http://localhost:3999/api/siteping?projectName=e2e-test");
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.feedbacks[0].type).toBe("bug");
    expect(data.feedbacks[0].message).toBe("Le bouton est cassé");
  });
});

test.describe("Annotation toggle", () => {
  test("hides and shows markers container", async ({ page }) => {
    const s = shadow(page);

    // Toggle off
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="toggle-annotations"]');
    await s.click('[data-item-id="toggle-annotations"]');

    await page.waitForFunction(() => {
      const c = document.getElementById("siteping-markers");
      return c?.style.display === "none";
    });
    const hidden = await page.evaluate(() => {
      const c = document.getElementById("siteping-markers");
      return c?.style.display === "none";
    });
    expect(hidden).toBe(true);

    // Toggle on
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="toggle-annotations"]');
    await s.click('[data-item-id="toggle-annotations"]');

    await page.waitForFunction(() => {
      const c = document.getElementById("siteping-markers");
      return c?.style.display !== "none";
    });
    const visible = await page.evaluate(() => {
      const c = document.getElementById("siteping-markers");
      return c?.style.display !== "none";
    });
    expect(visible).toBe(true);
  });
});

test.describe("Cleanup", () => {
  test("destroy() removes all injected elements", async ({ page }) => {
    await expect(page.locator("siteping-widget")).toBeAttached();

    await page.evaluate(() => {
      (window as unknown as { __siteping: { destroy: () => void } }).__siteping.destroy();
    });

    await page.waitForFunction(() => !document.querySelector("siteping-widget"));
    const widgetGone = await page.evaluate(() => !document.querySelector("siteping-widget"));
    const markersGone = await page.evaluate(() => !document.getElementById("siteping-markers"));
    expect(widgetGone).toBe(true);
    expect(markersGone).toBe(true);
  });
});
