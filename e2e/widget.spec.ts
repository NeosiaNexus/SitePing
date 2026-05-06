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
    expect(await s.count(".sp-segmented__btn")).toBe(3);
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
        if (inputs?.length >= 2) {
          inputs[0].value = "Test User";
          inputs[0].dispatchEvent(new Event("input", { bubbles: true }));
          inputs[1].value = "test@example.com";
          inputs[1].dispatchEvent(new Event("input", { bubbles: true }));
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

    expect(chatLabel).toBe("Messages");
    expect(annotateLabel).toBe("Annotate");
    expect(toggleLabel).toBe("Annotations");
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
  test("tap on overlay creates an annotation rectangle", async ({ page, browserName }) => {
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
