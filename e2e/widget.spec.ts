import { expect, type Page, test } from "@playwright/test";

test.beforeEach(async ({ page, browserName }) => {
  const project = `e2e-${browserName}`;
  await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
  await page.goto(`http://localhost:3999?project=${project}`);
  await page.waitForSelector("siteping-widget", { state: "attached" });
  await page.waitForFunction(() => {
    const host = document.querySelector("siteping-widget");
    return host?.shadowRoot?.querySelector(".sp-fab") !== null;
  });
});

/** Read the per-browser project name from the page URL */
function getProject(page: Page): string {
  return new URL(page.url()).searchParams.get("project") ?? "e2e-test";
}

// ---------------------------------------------------------------------------
// Helpers — shadow DOM is open in test mode
// ---------------------------------------------------------------------------

function shadow(page: Page) {
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
    await s.waitFor(".sp-panel--open");
    await s.waitFor(".sp-empty-text", { timeout: 10000 });
    const text = await s.text(".sp-empty-text");
    expect(text).toContain("No feedback yet");
  });

  test("renders type dropdown and 3-segment status filter", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-filter-dropdown-btn");
    expect(await s.count(".sp-filter-dropdown-btn")).toBe(1);
    // 3 status buttons + 3 scope buttons (page-scope feature). Use a
    // scoped selector so adding more segmented controls doesn't break
    // this assertion.
    expect(await s.count("[data-status-filter]")).toBe(3);
    expect(await s.count("[data-scope-filter]")).toBe(3);
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

  test("filter, sort and export menus toggle on their trigger and close on any other click", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-panel--open");

    // Real pointer clicks: the outside-click listeners must tell the trigger,
    // the rest of the shadow tree and the host page apart.
    for (const [trigger, menu] of [
      [".sp-filter-dropdown-btn", ".sp-filter-dropdown-menu"],
      [".sp-sort-btn", ".sp-sort-menu"],
      [".sp-export-btn", ".sp-export-menu--open"],
    ] as const) {
      const open = page.locator(menu);
      for (const dismiss of [
        () => page.click(trigger),
        () => page.click(".sp-panel-title"),
        () => page.mouse.click(40, 360),
      ]) {
        await page.click(trigger);
        await expect(open).toHaveCount(1);
        await dismiss();
        await expect(open).toHaveCount(0);
      }
    }

    // The group toggle shares the sort button's bar.
    await page.click(".sp-sort-btn");
    await expect(page.locator(".sp-sort-menu")).toHaveCount(1);
    await page.click(".sp-group-toggle");
    await expect(page.locator(".sp-sort-menu")).toHaveCount(0);
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
      return Array.from(btns).some((b) => b.textContent === "Cancel");
    });
    const hasCancel = await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      return Array.from(btns).some((b) => b.textContent === "Cancel");
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

    // A rectangle div with border should exist (poll — WebKit needs extra frames)
    await page.waitForFunction(
      () => {
        const divs = document.querySelectorAll("div[style*='pointer-events']");
        return Array.from(divs).some(
          (d) => (d as HTMLElement).style.width && parseInt((d as HTMLElement).style.width, 10) > 50,
        );
      },
      undefined,
      { timeout: 3000 },
    );

    await page.mouse.up();
  });
});

test.describe("Annotation popup lifecycle", () => {
  async function drawAndOpenPopup(page: Page) {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="annotate"]');
    await s.click('[data-item-id="annotate"]');
    await page.waitForFunction(() => !!document.querySelector("div[style*='crosshair']"));

    const box = await page.locator("#target-element").boundingBox();
    await page.mouse.move(box!.x + 10, box!.y + 10);
    await page.mouse.down();
    await page.mouse.move(box!.x + 250, box!.y + 60, { steps: 5 });
    await page.mouse.up();
    const dialog = page.locator('body > [role="dialog"][data-siteping-ignore]');
    await expect(dialog).toHaveCSS("opacity", "1");
    return dialog;
  }

  test("keeps its open/close transition after show()", async ({ page }) => {
    const dialog = await drawAndOpenPopup(page);
    await expect(dialog).toHaveCSS("transition-duration", "0.25s, 0.25s");
  });

  test("is not hit-testable while it fades out", async ({ page }) => {
    await drawAndOpenPopup(page);
    // Cancel and hit-test in the same task: deterministic, whatever the fade's timing
    const hit = await page.evaluate(() => {
      const dialog = document.querySelector<HTMLElement>('body > [role="dialog"][data-siteping-ignore]')!;
      const textarea = dialog.querySelector("textarea")!.getBoundingClientRect();
      Array.from(dialog.querySelectorAll("button"))
        .find((button) => button.textContent === "Cancel")!
        .click();
      const target = document.elementFromPoint(textarea.left + textarea.width / 2, textarea.top + textarea.height / 2);
      return { display: getComputedStyle(dialog).display, insideDialog: dialog.contains(target) };
    });
    expect(hit.display).toBe("block");
    expect(hit.insideDialog).toBe(false);
  });

  test("the toolbar Cancel closes an open popup and ends the session", async ({ page }) => {
    const dialog = await drawAndOpenPopup(page);

    await page.locator("body > div[data-siteping-ignore] > button", { hasText: "Cancel" }).click();

    await expect(dialog).toBeHidden();
    await expect(page.locator("div[style*='crosshair']")).toHaveCount(0);
  });
});

test.describe("Annotation popup placement", () => {
  const toolbarCancel = (page: Page) =>
    page.locator("body > div[data-siteping-ignore] > button", { hasText: "Cancel" });

  async function startAnnotating(page: Page) {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="annotate"]');
    await s.click('[data-item-id="annotate"]');
    await page.waitForFunction(() => !!document.querySelector("div[style*='crosshair']"));
  }

  async function drawRectangle(page: Page, fromY: number, toY: number) {
    await page.mouse.move(200, fromY);
    await page.mouse.down();
    await page.mouse.move(600, toY, { steps: 5 });
    await page.mouse.up();
    await page.waitForSelector("button[data-type='bug']");
  }

  /** Popup and toolbar boxes; the popup's from style.top + offsetHeight, which ignore its entry transform. */
  async function readLayout(page: Page) {
    const toolbar = await toolbarCancel(page).evaluate((button) => {
      const rect = button.parentElement!.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom };
    });
    const popup = await page.locator('body > [role="dialog"]').evaluate((dialog: HTMLElement) => {
      const top = Number.parseFloat(dialog.style.top);
      return { top, bottom: top + dialog.offsetHeight };
    });
    return { toolbar, popup, viewportHeight: await page.evaluate(() => window.innerHeight) };
  }

  test("does not flip above the rectangle into the top toolbar", async ({ page }) => {
    await startAnnotating(page);
    // Too tall to fit the popup below, and "above" lands inside the toolbar band
    await drawRectangle(page, 250, 650);

    const { toolbar, popup, viewportHeight } = await readLayout(page);
    expect(popup.top).toBeGreaterThanOrEqual(toolbar.bottom);
    expect(popup.bottom).toBeLessThanOrEqual(viewportHeight);
  });

  test("keeps clear of a toolbar the host moves to the bottom edge", async ({ page }) => {
    await startAnnotating(page);
    // A host moving the toolbar out of the way, e.g. off a modal's header
    await toolbarCancel(page).evaluate((button) => {
      const toolbar = button.parentElement!;
      toolbar.style.top = "auto";
      toolbar.style.bottom = "0";
    });
    // Below the rectangle would overlap the relocated toolbar
    await drawRectangle(page, 300, 420);

    const { toolbar, popup, viewportHeight } = await readLayout(page);
    expect(toolbar.top).toBeGreaterThan(viewportHeight / 2);
    expect(popup.bottom).toBeLessThanOrEqual(toolbar.top);
    expect(popup.top).toBeGreaterThanOrEqual(0);
  });

  test("caps a popup taller than the room left by the toolbar, scrolled to its type buttons", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 320 });
    await startAnnotating(page);
    await drawRectangle(page, 100, 200);
    const dialog = page.locator('body > [role="dialog"]');
    await expect(dialog).toHaveCSS("overflow-y", "auto");
    await expect(dialog).toHaveCSS("opacity", "1");

    const { toolbar, popup, viewportHeight } = await readLayout(page);
    expect(popup.top).toBeGreaterThanOrEqual(toolbar.bottom);
    expect(popup.bottom).toBeLessThanOrEqual(viewportHeight);
    // The type buttons enable Send: the popup starts on them, not scrolled to its bottom
    const typeRowOffset = await dialog.evaluate(
      (element) =>
        element.querySelector("button[data-type]")!.getBoundingClientRect().top - element.getBoundingClientRect().top,
    );
    expect(typeRowOffset).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Keyboard-only annotation", () => {
  test("FAB-launched Enter annotation targets the last focused page element", async ({ page }) => {
    const s = shadow(page);

    // 1. Focus a real page element — the fixture has no native button, so
    //    inject one (the focus tracker needs a focusin from page content).
    await page.evaluate(() => {
      const btn = document.createElement("button");
      btn.id = "kbd-target";
      btn.textContent = "Focus me";
      document.getElementById("target-element")?.after(btn);
      btn.focus();
    });

    // 2. Open the FAB via keyboard (Enter on the focused button = click).
    await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      (host?.shadowRoot?.querySelector(".sp-fab") as HTMLElement)?.focus();
    });
    await page.keyboard.press("Enter");
    await s.waitFor(".sp-radial-item--open");

    // 3. The first radial item (chat) receives focus after the open animation
    //    — ArrowDown to the annotate item, then Enter to activate it.
    await page.waitForFunction(() => {
      const host = document.querySelector("siteping-widget");
      return host?.shadowRoot?.activeElement?.classList.contains("sp-radial-item") ?? false;
    });
    await page.keyboard.press("ArrowDown");
    await page.waitForFunction(() => {
      const host = document.querySelector("siteping-widget");
      return host?.shadowRoot?.activeElement?.getAttribute("data-item-id") === "annotate";
    });
    await page.keyboard.press("Enter");

    // 4. The overlay is up and focused — Enter annotates the tracked button
    //    (the FAB stole focus, so only the tracker knows the real target).
    await page.waitForFunction(() => !!document.querySelector("div[style*='crosshair']"));
    await page.keyboard.press("Enter");

    // 5. The feedback popup appears...
    await page.waitForSelector("button[data-type='bug']");

    // ...and the keyboard highlight rect (fixed-position, screenshot-ignored)
    // covers the target element.
    const hasHighlight = await page.evaluate(() => {
      const overlay = document.querySelector("div[style*='crosshair']");
      const rect = overlay?.querySelector("div[data-siteping-ignore]") as HTMLElement | null;
      return !!rect && rect.style.position === "fixed" && parseFloat(rect.style.width) > 0;
    });
    expect(hasHighlight).toBe(true);
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
        if (b.textContent === "Send") {
          b.click();
          return;
        }
      }
    });

    // 6. Identity modal — fill if needed
    // Wait for either the identity modal to appear or a marker to be created
    await page.waitForFunction(
      () => {
        const host = document.querySelector("siteping-widget");
        const hasIdentity = host?.shadowRoot?.querySelector(".sp-identity-title") !== null;
        const hasMarker =
          (document.getElementById("siteping-markers")?.querySelectorAll("[data-feedback-id]").length ?? 0) >= 1;
        return hasIdentity || hasMarker;
      },
      undefined,
      { timeout: 5000 },
    );
    const identityTitle = await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      return host?.shadowRoot?.querySelector(".sp-identity-title") !== null;
    });
    if (identityTitle) {
      await page.evaluate(() => {
        const host = document.querySelector("siteping-widget");
        const sr = host?.shadowRoot;
        const inputs = sr?.querySelectorAll(".sp-input") as NodeListOf<HTMLInputElement>;
        const [nameInput, emailInput] = Array.from(inputs ?? []);
        if (nameInput && emailInput) {
          nameInput.value = "Test User";
          nameInput.dispatchEvent(new Event("input", { bubbles: true }));
          emailInput.value = "test@example.com";
          emailInput.dispatchEvent(new Event("input", { bubbles: true }));
        }
        (sr?.querySelector(".sp-btn-primary") as HTMLElement)?.click();
      });
      // Wait for the feedback to be submitted and a marker to appear
      await page.waitForFunction(
        () => {
          const c = document.getElementById("siteping-markers");
          return (c?.querySelectorAll("[data-feedback-id]").length ?? 0) >= 1;
        },
        undefined,
        { timeout: 10000 },
      );
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

    // 8. Verify API persistence (poll — POST may still be in flight)
    const project = getProject(page);
    await page.waitForFunction(
      async (pn) => {
        const r = await fetch(`http://localhost:3999/api/siteping?projectName=${pn}`);
        const d = await r.json();
        return d.total >= 1;
      },
      project,
      { timeout: 5000 },
    );
    const res = await page.request.get(`http://localhost:3999/api/siteping?projectName=${project}`);
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.feedbacks[0].type).toBe("bug");
    expect(data.feedbacks[0].message).toBe("Le bouton est cassé");
  });
});

test.describe("Shadow DOM anchoring (#177)", () => {
  test("an annotation inside an open web component survives a reload", async ({ page }) => {
    const s = shadow(page);

    // A web component with an open shadow root, mounted on every navigation,
    // plus a stored identity so the submit posts without the identity modal.
    await page.addInitScript(() => {
      customElements.define(
        "e2e-card",
        class extends HTMLElement {
          constructor() {
            super();
            this.attachShadow({ mode: "open" }).innerHTML =
              '<p id="shadow-target" style="margin:0;padding:32px;background:#fff4e5">Texte rendu dans un web component</p>';
          }
        },
      );
      document.addEventListener("DOMContentLoaded", () => {
        const card = document.createElement("e2e-card");
        card.id = "e2e-component";
        card.style.cssText = "display:block;margin-bottom:20px";
        document.getElementById("hero")?.after(card);
      });
      localStorage.setItem("siteping_identity", JSON.stringify({ name: "Test User", email: "test@example.com" }));
    });

    const ready = async () => {
      await page.waitForFunction(() => {
        const host = document.querySelector("siteping-widget");
        return host?.shadowRoot?.querySelector(".sp-fab") !== null && !!document.getElementById("e2e-component");
      });
    };
    await page.reload();
    await ready();

    // 1. Draw strictly inside the shadow paragraph.
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="annotate"]');
    await s.click('[data-item-id="annotate"]');
    await page.waitForFunction(() => !!document.querySelector("div[style*='crosshair']"));
    const box = (await page.locator("#shadow-target").boundingBox())!;
    await page.mouse.move(box.x + 8, box.y + 8);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 8, box.y + box.height - 8, { steps: 5 });
    await page.mouse.up();

    await page.waitForSelector("button[data-type='bug']");
    await page.click("button[data-type='bug']");
    await page.fill("textarea", "Le composant est mal aligné");
    await page.evaluate(() => {
      for (const b of document.querySelectorAll("button")) {
        if (b.textContent === "Send") return b.click();
      }
    });

    // 2. Capture pierced the boundary: one selector per tree, a shadow-rooted XPath.
    const project = getProject(page);
    await page.waitForFunction(
      async (pn) => (await (await fetch(`/api/siteping?projectName=${pn}`)).json()).total >= 1,
      project,
      { timeout: 5000 },
    );
    const data = await (await page.request.get(`http://localhost:3999/api/siteping?projectName=${project}`)).json();
    const annotation = data.feedbacks[0].annotations[0];
    expect(annotation.cssSelector).toBe("#e2e-component >>> #shadow-target");
    expect(annotation.xpath).toBe("./p[@id='shadow-target']");
    expect(annotation.elementTag).toBe("P");

    // 3. After a reload, resolution finds the element inside the shadow root:
    //    the marker sits on the drawn rect's top-right corner, solid (not
    //    "approximate").
    await page.reload();
    await ready();
    const marker = page.locator("#siteping-markers [data-feedback-id]");
    await expect(marker).toBeVisible();
    const placed = await page.evaluate(() => {
      const m = document.querySelector<HTMLElement>("#siteping-markers [data-feedback-id]");
      const r = document.getElementById("e2e-component")?.shadowRoot?.getElementById("shadow-target");
      const b = r?.getBoundingClientRect();
      return m && b
        ? {
            top: Number.parseFloat(m.style.top),
            left: Number.parseFloat(m.style.left),
            expectedTop: b.top + window.scrollY + 8 - 13,
            expectedLeft: b.right + window.scrollX - 8 - 13,
            dashed: m.style.borderStyle === "dashed",
          }
        : null;
    });
    expect(placed).not.toBeNull();
    expect(Math.abs(placed!.top - placed!.expectedTop)).toBeLessThan(2);
    expect(Math.abs(placed!.left - placed!.expectedLeft)).toBeLessThan(2);
    expect(placed!.dashed).toBe(false);
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

// ---------------------------------------------------------------------------
// New feature tests
// ---------------------------------------------------------------------------

test.describe("Double-init guard", () => {
  test("calling initSiteping() twice does not create duplicate widgets", async ({ page }) => {
    // Call initSiteping a second time from the page context
    const project = getProject(page);
    await page.evaluate((pn) => {
      // Dynamic import to call initSiteping again
      const script = document.createElement("script");
      script.type = "module";
      script.textContent = `
        import { initSiteping } from '/widget.js';
        window.__siteping2 = initSiteping({
          endpoint: '/api/siteping',
          projectName: '${pn}',
          forceShow: true,
          accentColor: '#6366f1',
        });
      `;
      document.body.appendChild(script);
    }, project);

    // Wait for the second script to execute
    await page.waitForFunction(
      () => (window as unknown as Record<string, unknown>).__siteping2 !== undefined,
      undefined,
      {
        timeout: 3000,
      },
    );

    // There should still be exactly one <siteping-widget> element
    const widgetCount = await page.evaluate(() => document.querySelectorAll("siteping-widget").length);
    expect(widgetCount).toBe(1);

    // There should still be exactly one FAB inside the shadow root
    const fabCount = await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      return host?.shadowRoot?.querySelectorAll(".sp-fab").length ?? 0;
    });
    expect(fabCount).toBe(1);
  });
});

test.describe("Event delegation", () => {
  /**
   * Helper: create a feedback via API and open the panel so cards are visible.
   * Returns the created feedback id.
   */
  async function createFeedbackAndOpenPanel(page: Page) {
    // Seed a feedback via the API
    const res = await page.request.post("http://localhost:3999/api/siteping", {
      data: {
        projectName: getProject(page),
        type: "bug",
        message: "Delegation test feedback",
        url: "http://localhost:3999",
        viewport: "1280x720",
        userAgent: "Playwright",
        authorName: "Test",
        authorEmail: "test@test.com",
        annotations: [],
      },
    });
    const feedback = await res.json();

    // Open the panel
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-panel--open");

    // Wait for at least one card to render
    await s.waitFor(".sp-card");

    return feedback.id as string;
  }

  test("clicking resolve button via delegation updates feedback status", async ({ page }) => {
    await createFeedbackAndOpenPanel(page);

    // Find the card and its resolve button
    const hasResolveBtn = await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      const card = host?.shadowRoot?.querySelector(".sp-card");
      return card?.querySelector('[data-action="resolve"]') !== null;
    });
    expect(hasResolveBtn).toBe(true);

    // Click the resolve button via evaluate (event delegation should handle it)
    await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      const resolveBtn = host?.shadowRoot?.querySelector('[data-action="resolve"]') as HTMLElement;
      resolveBtn?.click();
    });

    // Wait for the card to get the resolved class (panel reloads after resolve)
    await page.waitForFunction(
      () => {
        const host = document.querySelector("siteping-widget");
        return host?.shadowRoot?.querySelector(".sp-card--resolved") !== null;
      },
      undefined,
      { timeout: 5000 },
    );
    const isResolved = await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      return host?.shadowRoot?.querySelector(".sp-card--resolved") !== null;
    });
    expect(isResolved).toBe(true);

    // Verify via API that the status changed
    const apiRes = await page.request.get(`http://localhost:3999/api/siteping?projectName=${getProject(page)}`);
    const data = await apiRes.json();
    expect(data.feedbacks[0].status).toBe("resolved");
  });

  test("clicking resolve button on a resolved card reopens it", async ({ page }) => {
    // Seed a feedback and resolve it via API
    const createRes = await page.request.post("http://localhost:3999/api/siteping", {
      data: {
        projectName: getProject(page),
        type: "change",
        message: "Reopen test feedback",
        url: "http://localhost:3999",
        viewport: "1280x720",
        userAgent: "Playwright",
        authorName: "Test",
        authorEmail: "test@test.com",
        annotations: [],
      },
    });
    const fb = await createRes.json();

    // Resolve it via PATCH
    await page.request.patch("http://localhost:3999/api/siteping", {
      data: { id: fb.id, status: "resolved" },
    });

    // Open the panel
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-panel--open");
    await s.waitFor(".sp-card--resolved", { timeout: 10000 });

    // Click the resolve (reopen) button
    await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      const card = host?.shadowRoot?.querySelector(".sp-card--resolved");
      const reopenBtn = card?.querySelector('[data-action="resolve"]') as HTMLElement;
      reopenBtn?.click();
    });

    // Wait for the card to lose the resolved class
    await page.waitForFunction(
      () => {
        const host = document.querySelector("siteping-widget");
        const cards = host?.shadowRoot?.querySelectorAll(".sp-card") ?? [];
        // All cards should not have the resolved class (we only have one feedback)
        return cards.length > 0 && host?.shadowRoot?.querySelector(".sp-card--resolved") === null;
      },
      undefined,
      { timeout: 5000 },
    );

    const apiRes = await page.request.get(`http://localhost:3999/api/siteping?projectName=${getProject(page)}`);
    const data = await apiRes.json();
    expect(data.feedbacks[0].status).toBe("open");
  });
});

test.describe("Default locale is English", () => {
  test("FAB aria-label uses English text", async ({ page }) => {
    const s = shadow(page);
    const ariaLabel = await s.attr(".sp-fab", "aria-label");
    // English: "Siteping — Feedback menu"
    expect(ariaLabel).toBe("Siteping \u2014 Feedback menu");
  });

  test("radial menu items use English labels", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor(".sp-radial-item--open");

    // Check the aria-labels on radial items
    const chatLabel = await s.attr('[data-item-id="chat"]', "aria-label");
    const annotateLabel = await s.attr('[data-item-id="annotate"]', "aria-label");
    const toggleLabel = await s.attr('[data-item-id="toggle-annotations"]', "aria-label");

    expect(chatLabel).toBe("Show sidebar");
    expect(annotateLabel).toBe("Create new annotation");
    expect(toggleLabel).toBe("Show or hide markers");
  });

  test("panel header and empty state use English text", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-panel--open");

    // Panel title should be "Feedbacks" (same in both locales, but verifying)
    const title = await s.text(".sp-panel-title");
    expect(title).toBe("Feedbacks");

    // Empty state should use English
    await s.waitFor(".sp-empty-text");
    const emptyText = await s.text(".sp-empty-text");
    expect(emptyText).toContain("No feedback yet");
  });

  test("search placeholder uses English text", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-panel--open");

    const placeholder = await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      const input = host?.shadowRoot?.querySelector(".sp-search") as HTMLInputElement;
      return input?.placeholder ?? null;
    });
    expect(placeholder).toBe("Search...");
  });

  test("annotation mode cancel button uses English text", async ({ page }) => {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="annotate"]');
    await s.click('[data-item-id="annotate"]');

    await page.waitForFunction(() => {
      const btns = document.querySelectorAll("button");
      return Array.from(btns).some((b) => b.textContent === "Cancel");
    });
    const hasCancel = await page.evaluate(() => {
      const btns = document.querySelectorAll("button");
      return Array.from(btns).some((b) => b.textContent === "Cancel");
    });
    expect(hasCancel).toBe(true);
  });
});

test.describe("Panel search", () => {
  test("typing in search input filters feedbacks", async ({ page }) => {
    const project = getProject(page);
    // Seed two feedbacks with different messages
    await page.request.post("http://localhost:3999/api/siteping", {
      data: {
        projectName: project,
        type: "bug",
        message: "The login button is broken",
        url: "http://localhost:3999",
        viewport: "1280x720",
        userAgent: "Playwright",
        authorName: "Test",
        authorEmail: "test@test.com",
        annotations: [],
      },
    });
    await page.request.post("http://localhost:3999/api/siteping", {
      data: {
        projectName: project,
        type: "question",
        message: "How does the sidebar work",
        url: "http://localhost:3999",
        viewport: "1280x720",
        userAgent: "Playwright",
        authorName: "Test",
        authorEmail: "test@test.com",
        annotations: [],
      },
    });

    // Open the panel
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-panel--open");

    // Wait for at least 2 cards (parallel workers may add more via shared store)
    await page.waitForFunction(
      () => {
        const host = document.querySelector("siteping-widget");
        return (host?.shadowRoot?.querySelectorAll(".sp-card").length ?? 0) >= 2;
      },
      undefined,
      { timeout: 5000 },
    );
    const countBefore = await s.count(".sp-card");
    expect(countBefore).toBeGreaterThanOrEqual(2);

    // Type in the search input — "login" should filter to only matching feedbacks
    await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      const input = host?.shadowRoot?.querySelector(".sp-search") as HTMLInputElement;
      input.value = "login";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // Wait for cards to decrease (search is filtering)
    await page.waitForFunction(
      (before) => {
        const host = document.querySelector("siteping-widget");
        return (host?.shadowRoot?.querySelectorAll(".sp-card").length ?? before) < before;
      },
      countBefore,
      { timeout: 5000 },
    );

    // The remaining card(s) should all contain "login"
    const cardText = await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      const card = host?.shadowRoot?.querySelector(".sp-card-message");
      return card?.textContent ?? "";
    });
    expect(cardText).toContain("login");
  });

  test("clearing search shows all feedbacks again", async ({ page }) => {
    const project = getProject(page);
    // Seed two feedbacks
    await page.request.post("http://localhost:3999/api/siteping", {
      data: {
        projectName: project,
        type: "bug",
        message: "Alpha feedback",
        url: "http://localhost:3999",
        viewport: "1280x720",
        userAgent: "Playwright",
        authorName: "Test",
        authorEmail: "test@test.com",
        annotations: [],
      },
    });
    await page.request.post("http://localhost:3999/api/siteping", {
      data: {
        projectName: project,
        type: "change",
        message: "Beta feedback",
        url: "http://localhost:3999",
        viewport: "1280x720",
        userAgent: "Playwright",
        authorName: "Test",
        authorEmail: "test@test.com",
        annotations: [],
      },
    });

    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-panel--open");

    // Wait for both cards
    await page.waitForFunction(
      () => {
        const host = document.querySelector("siteping-widget");
        return (host?.shadowRoot?.querySelectorAll(".sp-card").length ?? 0) >= 2;
      },
      undefined,
      { timeout: 5000 },
    );

    // Search for "Alpha"
    await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      const input = host?.shadowRoot?.querySelector(".sp-search") as HTMLInputElement;
      input.value = "Alpha";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    await page.waitForFunction(
      () => {
        const host = document.querySelector("siteping-widget");
        return (host?.shadowRoot?.querySelectorAll(".sp-card").length ?? 0) === 1;
      },
      undefined,
      { timeout: 5000 },
    );

    // Clear the search
    await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      const input = host?.shadowRoot?.querySelector(".sp-search") as HTMLInputElement;
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // All feedbacks should reappear
    await page.waitForFunction(
      () => {
        const host = document.querySelector("siteping-widget");
        return (host?.shadowRoot?.querySelectorAll(".sp-card").length ?? 0) >= 2;
      },
      undefined,
      { timeout: 5000 },
    );
    expect(await s.count(".sp-card")).toBe(2);
  });

  test("search with no matches shows empty state", async ({ page }) => {
    // Seed a feedback
    await page.request.post("http://localhost:3999/api/siteping", {
      data: {
        projectName: getProject(page),
        type: "bug",
        message: "Some real feedback",
        url: "http://localhost:3999",
        viewport: "1280x720",
        userAgent: "Playwright",
        authorName: "Test",
        authorEmail: "test@test.com",
        annotations: [],
      },
    });

    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-panel--open");
    await s.waitFor(".sp-card");

    // Search for something that does not exist
    await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      const input = host?.shadowRoot?.querySelector(".sp-search") as HTMLInputElement;
      input.value = "xyznonexistent";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });

    // Should show empty state
    await s.waitFor(".sp-empty-text", { timeout: 5000 });
    const emptyText = await s.text(".sp-empty-text");
    expect(emptyText).toContain("No feedback yet");
  });
});

test.describe("Touch annotation", () => {
  test("a touch drag on the overlay creates an annotation rectangle", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "TouchEvent constructor not supported in Firefox/WebKit headless");
    const s = shadow(page);

    // Enter annotation mode
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="annotate"]');
    await s.click('[data-item-id="annotate"]');
    await page.waitForFunction(() => !!document.querySelector("div[style*='crosshair']"));

    // Use touch events to simulate drawing a rectangle
    const box = await page.locator("#target-element").boundingBox();

    // Simulate touch start + move + end via dispatching touch events
    await page.evaluate(
      ({ x, y, endX, endY }) => {
        const overlay = document.querySelector("div[style*='crosshair']") as HTMLElement;
        if (!overlay) return;

        const createTouch = (clientX: number, clientY: number) =>
          new Touch({
            identifier: 0,
            target: overlay,
            clientX,
            clientY,
            pageX: clientX,
            pageY: clientY,
          });

        overlay.dispatchEvent(
          new TouchEvent("touchstart", {
            bubbles: true,
            touches: [createTouch(x, y)],
            changedTouches: [createTouch(x, y)],
          }),
        );

        // Move in steps to simulate drag
        const steps = 5;
        for (let i = 1; i <= steps; i++) {
          const cx = x + ((endX - x) * i) / steps;
          const cy = y + ((endY - y) * i) / steps;
          overlay.dispatchEvent(
            new TouchEvent("touchmove", {
              bubbles: true,
              touches: [createTouch(cx, cy)],
              changedTouches: [createTouch(cx, cy)],
            }),
          );
        }

        overlay.dispatchEvent(
          new TouchEvent("touchend", {
            bubbles: true,
            touches: [],
            changedTouches: [createTouch(endX, endY)],
          }),
        );
      },
      {
        x: box!.x + 10,
        y: box!.y + 10,
        endX: box!.x + 200,
        endY: box!.y + 60,
      },
    );

    // After touch end, the feedback popup should appear (type selection buttons)
    // or a rectangle should have been drawn
    const hasPopupOrRect = await page.waitForFunction(
      () => {
        // Check for popup (type selection)
        const hasPopup = !!document.querySelector("button[data-type='bug']");
        // Check for drawn rectangle
        const divs = document.querySelectorAll("div[style*='pointer-events']");
        const hasRect = Array.from(divs).some(
          (d) => (d as HTMLElement).style.width && parseInt((d as HTMLElement).style.width, 10) > 50,
        );
        return hasPopup || hasRect;
      },
      undefined,
      { timeout: 5000 },
    );
    expect(hasPopupOrRect).toBeTruthy();
  });
});

test.describe("Production guard at dist level (#104)", () => {
  // Regression test against bundler constant-folding: esbuild's browser
  // platform statically replaces the literal `process.env.NODE_ENV` in the
  // dist bundle, which used to fold the production guard into an
  // unconditional skip. Without forceShow and with NODE_ENV='test'
  // (non-production, set by the page before loading the widget), the real
  // dist bundle must still mount the widget.
  test("widget mounts without forceShow when NODE_ENV is not production", async ({ page, browserName }) => {
    const project = `e2e-${browserName}-noforce`;
    await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
    await page.goto(`http://localhost:3999?project=${project}&noForceShow=1`);
    await page.waitForSelector("siteping-widget", { state: "attached" });
    await page.waitForFunction(() => {
      const host = document.querySelector("siteping-widget");
      return host?.shadowRoot?.querySelector(".sp-fab") !== null;
    });
    await expect(page.locator("siteping-widget")).toBeAttached();
  });
});

test.describe("Fixture page", () => {
  // The server inlines ?project= into the page's init script. It must reach
  // the widget as data: no `</script>` breakout, no `$'` splicing the rest of
  // the page in through String#replace.
  test("inlines ?project= into the init script as data, never markup", async ({ page, browserName }) => {
    const project = `e2e-${browserName}-$'</script><script>window.__pwned = true</script>\u2028`;
    const listed = page.waitForRequest((req) => new URL(req.url()).pathname === "/api/siteping");
    await page.goto(`http://localhost:3999?project=${encodeURIComponent(project)}`);
    expect(new URL((await listed).url()).searchParams.get("projectName")).toBe(project);
    expect(await page.evaluate(() => "__pwned" in window)).toBe(false);
  });
});

test.describe("Panel actions", () => {
  // Real-browser checks jsdom cannot make: icon inertness (Chromium runs an
  // <img onerror> hoisted out of an <svg> parsed with createContextualFragment),
  // link attributes as the browser resolves them, and layout geometry.
  let feedbackId = "";
  let external: string[] = [];

  test.beforeEach(async ({ page, browserName }) => {
    external = [];
    await page.route(/^https?:\/\/evil\.test\//, (route) => route.abort());
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.protocol.startsWith("http") && url.host !== "localhost:3999") external.push(url.href);
    });
    const project = `e2e-${browserName}-actions`;
    await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
    const created = await page.request.post("http://localhost:3999/api/siteping", {
      data: {
        projectName: project,
        type: "bug",
        message: "Panel actions feedback",
        url: "http://localhost:3999",
        viewport: "1280x720",
        userAgent: "Playwright",
        authorName: "Test",
        authorEmail: "test@test.com",
        annotations: [],
      },
    });
    feedbackId = (await created.json()).id;
    await page.goto(`http://localhost:3999?project=${project}&panelActions=1`);
    const s = shadow(page);
    await s.waitFor(".sp-fab");
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-card");
    await s.click(".sp-card");
    await s.waitFor(".sp-detail-actions--custom");
  });

  test("renders a sanitized icon that never runs nor fetches, and safe links", async ({ page }) => {
    // Give a hoisted <img src="x"> ample time to 404 and fire onerror, and
    // the icon's CSS-parsed attributes time to request their resources.
    await page.waitForTimeout(500);
    const result = await page.evaluate(() => {
      const root = document.querySelector("siteping-widget")!.shadowRoot!;
      const control = (id: string) => root.querySelector<HTMLElement>(`[data-action-id="${id}"]`)!;
      const link = (id: string) => control(id) as HTMLAnchorElement;
      return {
        pwned: (window as { __pwned?: boolean }).__pwned ?? false,
        imgs: document.querySelectorAll("img").length + root.querySelectorAll("img").length,
        icon: control("record").querySelector("svg")?.outerHTML,
        record: control("record").tagName,
        tracker: {
          tag: link("tracker").tagName,
          href: link("tracker").href,
          target: link("tracker").target,
          rel: link("tracker").rel,
        },
        mail: { href: link("long").href, target: link("long").target },
      };
    });

    expect(result.pwned).toBe(false);
    expect(result.imgs).toBe(0);
    expect(external).toEqual([]);
    expect(result.icon).toBe(
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16"></path>' +
        '<rect width="8" height="8"></rect><rect x="8" width="8" height="8"></rect>' +
        '<rect x="16" width="8" height="8"></rect></svg>',
    );
    expect(result.record).toBe("BUTTON");
    expect(result.tracker).toEqual({
      tag: "A",
      href: `https://tracker.example/fb/${feedbackId}`,
      target: "_blank",
      rel: "noopener noreferrer",
    });
    expect(result.mail).toEqual({ href: "mailto:dev@example.com", target: "" });
  });

  test("a pending action disables the view and hands the host a frozen feedback", async ({ page }) => {
    const s = shadow(page);
    await s.click('[data-action-id="record"]');

    expect(await s.attr('[data-action-id="record"]', "aria-busy")).toBe("true");
    expect(await s.attr('[data-action-id="record"]', "aria-label")).toBe("Record");
    expect(await s.attr(".sp-detail-btn-resolve", "disabled")).not.toBeNull();
    expect(await s.attr(".sp-detail-btn-delete", "disabled")).not.toBeNull();
    expect(await page.evaluate(() => (window as { __panelActionCalls?: unknown }).__panelActionCalls)).toEqual([
      { id: feedbackId, frozen: true },
    ]);

    await page.evaluate(() => (window as { __releasePanelAction?: () => void }).__releasePanelAction?.());
    await page.waitForFunction(() => {
      const root = document.querySelector("siteping-widget")!.shadowRoot!;
      return !root.querySelector<HTMLButtonElement>(".sp-detail-btn-resolve")!.disabled;
    });
    expect(await s.attr('[data-action-id="record"]', "aria-busy")).toBeNull();
    expect(await s.text('[data-action-id="record"]')).toBe("Record");
  });

  test("host actions wrap and truncate instead of squashing Resolve/Delete", async ({ page }) => {
    const layout = await page.evaluate(() => {
      const root = document.querySelector("siteping-widget")!.shadowRoot!;
      const row = root.querySelector<HTMLElement>(".sp-detail-actions--custom")!;
      const rowRect = row.getBoundingClientRect();
      const longLabel = root.querySelector<HTMLElement>('[data-action-id="long"] span')!;
      return {
        rowOverflow: row.scrollWidth - row.clientWidth,
        outside: [...row.children].filter((c) => c.getBoundingClientRect().right > rowRect.right + 0.5).length,
        lines: new Set([...row.children].map((c) => Math.round(c.getBoundingClientRect().top))).size,
        truncated: longLabel.scrollWidth > longLabel.clientWidth,
        textOverflow: getComputedStyle(longLabel).textOverflow,
        resolveWidth: root.querySelector(".sp-detail-btn-resolve")!.getBoundingClientRect().width,
      };
    });

    expect(layout.rowOverflow).toBeLessThanOrEqual(0);
    expect(layout.outside).toBe(0);
    expect(layout.lines).toBeGreaterThan(1);
    expect(layout.truncated).toBe(true);
    expect(layout.textOverflow).toBe("ellipsis");
    expect(layout.resolveWidth).toBeGreaterThan(120);
  });
});

test.describe("Go to annotation", () => {
  // The panel follows the live pin, and falls back to the offsets stored with
  // the feedback when no pin has a box to scroll to.
  const STORED_SCROLL_Y = 500;

  async function seed(page: Page, project: string, anchor: Record<string, unknown>) {
    await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
    await page.request.post("http://localhost:3999/api/siteping", {
      data: {
        projectName: project,
        type: "bug",
        message: "Go to annotation feedback",
        url: "/",
        viewport: "1280x720",
        userAgent: "Playwright",
        authorName: "Test",
        authorEmail: "test@test.com",
        annotations: [
          {
            anchor: { textPrefix: "", textSuffix: "", fingerprint: "", neighborText: "", ...anchor },
            rect: { xPct: 0, yPct: 0, wPct: 1, hPct: 1 },
            scrollX: 0,
            scrollY: STORED_SCROLL_Y,
            viewportW: 1280,
            viewportH: 720,
            devicePixelRatio: 1,
          },
        ],
      },
    });
    await page.goto(`http://localhost:3999?project=${project}`);
    await shadow(page).waitFor(".sp-fab");
  }

  async function goToAnnotation(page: Page) {
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="chat"]');
    await s.click('[data-item-id="chat"]');
    await s.waitFor(".sp-card");
    await s.click(".sp-card");
    await s.waitFor(".sp-detail-btn-goto");
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    await s.click(".sp-detail-btn-goto");
  }

  test("scrolls to the stored offsets when the anchor no longer resolves", async ({ page, browserName }) => {
    await seed(page, `e2e-${browserName}-goto-orphan`, {
      cssSelector: "#removed-since",
      xpath: "/html/body/div[99]",
      textSnippet: "Text that is no longer on the page",
      elementTag: "SECTION",
      elementId: "removed-since",
    });
    await goToAnnotation(page);

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(STORED_SCROLL_Y);
  });

  test("scrolls to the stored offsets while the markers are hidden", async ({ page, browserName }) => {
    await seed(page, `e2e-${browserName}-goto-hidden`, {
      cssSelector: "#target-element",
      xpath: "/html/body/div[2]/p",
      textSnippet: "Ceci est un element cible pour les annotations.",
      elementTag: "P",
      elementId: "target-element",
    });
    await expect(page.locator("#siteping-markers [data-feedback-id]")).toBeVisible();
    const s = shadow(page);
    await s.click(".sp-fab");
    await s.waitFor('[data-item-id="toggle-annotations"]');
    await s.click('[data-item-id="toggle-annotations"]');
    await expect(page.locator("#siteping-markers")).toBeHidden();

    await goToAnnotation(page);

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(STORED_SCROLL_Y);
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
