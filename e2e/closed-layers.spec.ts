import { expect, type Page, test } from "@playwright/test";

// Closed layers stay rendered (a transform or a fade animates them out), so
// they must be `inert` or Tab walks into controls nobody can see (#394).
// The fake API's test mode opens the Shadow DOM, which the helpers read.

const LAYERS = ".sp-panel:not(.sp-panel--open), .sp-radial, .sp-bulk-bar, .sp-detail, .sp-shortcuts-overlay";

test.beforeEach(async ({ page, browserName }) => {
  const project = `layers-${browserName}`;
  await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
  await page.request.post("http://localhost:3999/api/siteping", {
    data: {
      projectName: project,
      type: "bug",
      message: "The header overlaps the logo",
      url: "http://localhost:3999",
      viewport: "1280x720",
      userAgent: "Playwright",
      authorName: "Test",
      authorEmail: "test@test.com",
      annotations: [],
    },
  });
  await page.goto(`http://localhost:3999?project=${project}`);
  await page.waitForFunction(() => document.querySelector("siteping-widget")?.shadowRoot?.querySelector(".sp-fab"));
});

/** The focused element, inside the widget's shadow root when focus is there. */
async function focused(page: Page) {
  return page.evaluate((layers) => {
    let active = document.activeElement;
    while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
    return {
      className: active?.getAttribute("class") ?? active?.tagName ?? "",
      layer: active?.closest(layers)?.getAttribute("class") ?? null,
    };
  }, LAYERS);
}

/** Press Tab `count` times and record where focus lands each time. */
async function tabTrail(page: Page, count: number, key = "Tab") {
  const trail: Array<Awaited<ReturnType<typeof focused>>> = [];
  for (let i = 0; i < count; i++) {
    await page.keyboard.press(key);
    trail.push(await focused(page));
  }
  return trail;
}

async function openPanel(page: Page) {
  const fab = page.locator(".sp-fab");
  await fab.click();
  await page.locator('[data-item-id="chat"]').click();
  await expect(page.locator(".sp-panel--open")).toBeVisible();
  await expect(page.locator(".sp-card")).toHaveCount(1);
}

test("Tab through the page never enters the closed panel or the closed FAB menu", async ({ page }) => {
  const trail = await tabTrail(page, 25);
  expect(trail.filter((f) => f.layer)).toEqual([]);
  // The FAB itself is reachable.
  expect(trail.some((f) => f.className.includes("sp-fab"))).toBe(true);
});

test("Tab in the open panel skips the bulk bar, the detail view and the shortcuts overlay", async ({ page }) => {
  await openPanel(page);
  const trail = await tabTrail(page, 40);
  expect(trail.filter((f) => f.layer)).toEqual([]);
  // Wrapping inside the panel, never out to the page.
  expect(trail.every((f) => f.className !== "BODY")).toBe(true);
});

test("Tab stays inside the detail view, and closing it hands focus back to the card", async ({ page }) => {
  await openPanel(page);
  await page.locator(".sp-card").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".sp-detail--visible")).toBeVisible();

  for (const key of ["Tab", "Shift+Tab"]) {
    const trail = await tabTrail(page, 20, key);
    expect(trail.every((f) => f.layer?.includes("sp-detail"))).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(page.locator(".sp-detail--visible")).toHaveCount(0);
  await expect.poll(async () => (await focused(page)).className).toContain("sp-card");
});

test("Tab stays on the shortcuts overlay, and closing it hands focus back", async ({ page }) => {
  await openPanel(page);
  await page.locator(".sp-card").focus();
  await page.keyboard.press("Shift+Slash");
  await expect(page.locator(".sp-shortcuts-overlay--visible")).toBeVisible();

  const trail = await tabTrail(page, 6);
  expect(trail.every((f) => f.layer?.includes("sp-shortcuts-overlay"))).toBe(true);

  await page.keyboard.press("Escape");
  await expect(page.locator(".sp-shortcuts-overlay--visible")).toHaveCount(0);
  await expect.poll(async () => (await focused(page)).className).toContain("sp-card");
});

test("the bulk bar joins the tab order with a selection, and Deselect hands focus to select-all", async ({ page }) => {
  await openPanel(page);
  await page.locator(".sp-card .sp-bulk-checkbox").focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".sp-bulk-bar--visible")).toBeVisible();

  const trail = await tabTrail(page, 40);
  expect(trail.some((f) => f.layer?.includes("sp-bulk-bar"))).toBe(true);

  await page.locator(".sp-bulk-btn-deselect").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".sp-bulk-bar--visible")).toHaveCount(0);
  await expect.poll(async () => (await focused(page)).className).toContain("sp-bulk-checkbox");
  expect((await tabTrail(page, 40)).filter((f) => f.layer)).toEqual([]);
});
