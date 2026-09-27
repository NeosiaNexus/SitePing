import { expect, test } from "@playwright/test";

// The widget on top of a host modal (real Radix Dialog, see fixtures/radix-dialog.tsx).
// Real pointer and keyboard input only: Playwright's actionability checks fail
// when `body { pointer-events: none }` makes a widget surface click-through.

test.beforeEach(async ({ page, browserName }) => {
  const project = `e2e-modal-${browserName}`;
  await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
  await page.goto(`http://localhost:3999/modal?project=${project}`);
  await expect(page.locator("#host-dialog")).toBeVisible();
  await expect(page.locator(".sp-fab")).toBeAttached();
});

test.describe("Widget over a host modal", () => {
  test("annotating and typing a comment keeps the modal open and the focus in the popup", async ({ page }) => {
    await page.locator(".sp-fab").click();
    await page.locator('[data-item-id="annotate"]').click();
    await expect(page.locator("#host-dialog")).toBeVisible();

    // Draw over the dialog itself — the typical "report this modal" gesture.
    const dialogBox = (await page.locator("#host-dialog").boundingBox())!;
    await page.mouse.move(dialogBox.x + 20, dialogBox.y + 20);
    await page.mouse.down();
    await page.mouse.move(dialogBox.x + 300, dialogBox.y + 80, { steps: 5 });
    await page.mouse.up();

    const popup = page.locator('[role="dialog"][data-siteping-ignore]');
    await popup.locator("button[data-type='bug']").click();
    const textarea = popup.locator("textarea");
    await textarea.click();
    await page.keyboard.type("Modal header is cut off");

    await expect(textarea).toBeFocused();
    await expect(textarea).toHaveValue("Modal header is cut off");
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("opening the feedback panel keeps the modal open", async ({ page }) => {
    await page.locator(".sp-fab").click();
    await page.locator('[data-item-id="chat"]').click();

    await expect(page.locator(".sp-panel.sp-panel--open")).toBeVisible();
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("Escape cancels the annotation overlay without closing the modal", async ({ page }) => {
    await page.locator(".sp-fab").click();
    await page.locator('[data-item-id="annotate"]').click();
    const overlay = page.locator('[role="application"][data-siteping-ignore]');
    await expect(overlay).toBeFocused();

    await page.keyboard.press("Escape");

    await expect(overlay).toHaveCount(0);
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("Escape in the comment popup closes it without closing the modal", async ({ page }) => {
    await page.locator(".sp-fab").click();
    await page.locator('[data-item-id="annotate"]').click();
    const dialogBox = (await page.locator("#host-dialog").boundingBox())!;
    await page.mouse.move(dialogBox.x + 20, dialogBox.y + 20);
    await page.mouse.down();
    await page.mouse.move(dialogBox.x + 300, dialogBox.y + 80, { steps: 5 });
    await page.mouse.up();
    const popup = page.locator('[role="dialog"][data-siteping-ignore]');
    await popup.locator("textarea").click();

    await page.keyboard.press("Escape");

    await expect(popup).toBeHidden();
    await expect(page.locator("#host-dialog")).toBeVisible();
  });

  test("the modal still closes on a genuine outside click", async ({ page }) => {
    await page.mouse.click(40, 40);
    await expect(page.locator("#host-dialog")).toHaveCount(0);
  });
});
