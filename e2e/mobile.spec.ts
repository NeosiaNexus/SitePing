import { expect, type Page, test } from "@playwright/test";

// Phone emulation: a 390×844 touch screen. Playwright has no mobile mode for
// Firefox, so this file runs on Chromium and WebKit.
test.skip(({ browserName }) => browserName === "firefox", "Firefox has no mobile emulation in Playwright");
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test.beforeEach(async ({ page, browserName }) => {
  const project = `e2e-mobile-${browserName}`;
  await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
  // noForceShow=1 — a phone must get the widget from the defaults alone.
  await page.goto(`http://localhost:3999?project=${project}&noForceShow=1`);
  await page.waitForFunction(
    () => document.querySelector("siteping-widget")?.shadowRoot?.querySelector(".sp-fab") != null,
  );
});

function getProject(page: Page): string {
  return new URL(page.url()).searchParams.get("project") ?? "";
}

/** Bottom edge of an element, rounded — polled until its slide-in settles. */
async function bottomEdge(page: Page, selector: string): Promise<number> {
  const box = await page.locator(selector).boundingBox();
  return box ? Math.round(box.y + box.height) : -1;
}

test("the widget mounts on a phone with the default config", async ({ page }) => {
  await expect(page.locator(".sp-fab")).toBeVisible();
  expect(await page.evaluate(() => window.innerWidth)).toBe(390);
});

test("tap an element → feedback sheet → identity sheet → saved against that element", async ({ page }) => {
  await page.locator(".sp-fab").tap();
  await page.locator('[data-item-id="annotate"]').tap();
  await expect(page.locator("div[style*='crosshair']")).toBeVisible();

  // A tap (no drag) selects the element under the finger.
  const target = (await page.locator("#target-element").boundingBox())!;
  await page.touchscreen.tap(target.x + target.width / 2, target.y + target.height / 2);

  const form = page.locator('[role="dialog"][aria-label="Feedback form"]');
  await expect(form).toBeVisible();
  // A full-width sheet docked to the bottom edge
  await expect.poll(() => bottomEdge(page, '[role="dialog"][aria-label="Feedback form"]')).toBe(844);
  const formBox = (await form.boundingBox())!;
  expect(Math.round(formBox.x)).toBe(0);
  expect(Math.round(formBox.width)).toBe(390);

  await form.locator("button[data-type='bug']").tap();
  await form.locator("textarea").fill("Trop petit sur mobile");
  await form.locator("button", { hasText: "Send" }).tap();

  // First send asks who the client is — as a sheet too.
  const identity = page.locator(".sp-identity-modal");
  await expect(identity).toBeVisible();
  await identity.locator('input[type="text"]').fill("Test User");
  await identity.locator('input[type="email"]').fill("test@example.com");
  await identity.locator(".sp-btn-primary").tap();

  await expect(page.locator("#siteping-markers [data-feedback-id]")).toHaveCount(1);
  const project = getProject(page);
  await expect
    .poll(
      async () =>
        (await (await page.request.get(`http://localhost:3999/api/siteping?projectName=${project}`)).json()).total,
    )
    .toBe(1);
  const data = await (await page.request.get(`http://localhost:3999/api/siteping?projectName=${project}`)).json();
  expect(data.feedbacks[0].message).toBe("Trop petit sur mobile");
  expect(data.feedbacks[0].annotations[0].elementId).toBe("target-element");
  expect(data.feedbacks[0].annotations[0]).toMatchObject({ xPct: 0, yPct: 0, wPct: 1, hPct: 1 });
});

test("the filter row stays one row of finger-sized controls, the Mine toggle included", async ({
  page,
  browserName,
}) => {
  await page.locator(".sp-fab").tap();
  await page.locator('[data-item-id="chat"]').tap();
  await expect(page.locator(".sp-panel")).toHaveClass(/sp-panel--open/);

  const boxes = await page.locator(".sp-filter-bar > *").evaluateAll((controls) =>
    controls
      .map((control) => control.getBoundingClientRect())
      .filter((box) => box.height > 0)
      .map((box) => ({ top: box.top, bottom: box.bottom, height: box.height })),
  );
  expect(boxes.length).toBeGreaterThanOrEqual(3);
  // One row: the row scrolls sideways instead of wrapping onto a second line
  const firstBottom = Math.min(...boxes.map((box) => box.bottom));
  expect(boxes.filter((box) => box.top >= firstBottom)).toEqual([]);

  const mine = page.locator(".sp-mine-toggle");
  await mine.scrollIntoViewIfNeeded();
  // The sizes come from the `pointer: coarse` rules. Chromium's touch
  // emulation reports a coarse pointer; other engines' emulation may not.
  const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  if (browserName === "chromium") expect(coarse).toBe(true);
  if (coarse) {
    for (const box of boxes) expect(Math.round(box.height)).toBeGreaterThanOrEqual(32);
    expect(Math.round((await mine.boundingBox())!.height)).toBeGreaterThanOrEqual(36);
  }
  await mine.tap();
  await expect(mine).toHaveAttribute("aria-pressed", "true");
});

test("the panel is a bottom sheet that a tap on the dimmed page closes", async ({ page }) => {
  await page.locator(".sp-fab").tap();
  await page.locator('[data-item-id="chat"]').tap();

  const panel = page.locator(".sp-panel");
  await expect(panel).toHaveClass(/sp-panel--open/);
  await expect.poll(() => bottomEdge(page, ".sp-panel")).toBe(844);
  expect(Math.round((await panel.boundingBox())!.width)).toBe(390);
  await expect(page.locator(".sp-scrim--open")).toHaveCount(1);

  // The page above the sheet is the scrim
  await page.touchscreen.tap(195, 12);
  await expect(panel).not.toHaveClass(/sp-panel--open/);
});

test("the panel sheet is a modal dialog that Tab never leaves", async ({ page, browserName }) => {
  test.skip(browserName === "webkit", "WebKit's Tab order over buttons depends on its full-keyboard-access setting");
  await page.locator(".sp-fab").tap();
  await page.locator('[data-item-id="chat"]').tap();
  const panel = page.locator(".sp-panel");
  await expect(panel).toHaveClass(/sp-panel--open/);
  await expect(panel).toHaveAttribute("role", "dialog");
  await expect(panel).toHaveAttribute("aria-modal", "true");

  // A tablet keyboard: the touch layer hides the panel's trailing shortcuts
  // button, and Tab used to walk past it onto the page behind the scrim.
  const outside: string[] = [];
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const where = await page.evaluate(() => {
      const host = document.querySelector("siteping-widget");
      const inner = host?.shadowRoot?.activeElement;
      return document.activeElement === host && inner?.closest(".sp-panel") ? null : document.activeElement?.tagName;
    });
    if (where) outside.push(where);
  }
  expect(outside).toEqual([]);
});
