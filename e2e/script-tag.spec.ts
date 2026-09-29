import { expect, test } from "@playwright/test";

// The IIFE bundle (`dist/index.global.js`) is what a plain `<script src>` embed
// runs, exactly as shipped — and the only bundle a second minifier (Terser)
// goes over. Every other spec loads the ESM build, so this one drives the
// script bundle end to end: the `SitePing` global, the stylesheet, the
// lazily initialized panel, and a feedback with a screenshot (html2canvas-pro
// is bundled into it).

const API = "http://localhost:3999/api/siteping";

test("the <script> bundle mounts, opens the panel and sends a feedback with a screenshot", async ({
  page,
  browserName,
}) => {
  const project = `e2e-${browserName}-script`;
  await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
  await page.goto(`http://localhost:3999?project=${project}&script=1&screenshot=1`);

  const fab = page.locator(".sp-fab");
  await expect(fab).toBeVisible();
  const api = await page.evaluate(() => {
    const global = (window as unknown as { SitePing: Record<string, unknown> }).SitePing;
    return Object.fromEntries(Object.entries(global).map(([name, value]) => [name, typeof value]));
  });
  expect(api).toEqual({ initSiteping: "function", loadLocale: "function", registerLocale: "function" });
  expect(await fab.evaluate((element) => getComputedStyle(element).width)).toBe("52px");

  await fab.click();
  await page.locator('[data-item-id="chat"]').click();
  const panel = page.locator(".sp-panel.sp-panel--open");
  await expect(panel.locator(".sp-search")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);

  await fab.click();
  await page.locator('[data-item-id="annotate"]').click();
  const box = (await page.locator("#target-element").boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 250, box.y + 60, { steps: 5 });
  await page.mouse.up();
  const popup = page.locator('[role="dialog"][data-siteping-ignore]');
  await popup.locator("button[data-type='bug']").click();
  await popup.locator("textarea").fill("Sent from the script bundle");
  await popup.getByRole("button", { name: "Send" }).click();

  const [name, email] = [page.locator(".sp-input").first(), page.locator(".sp-input").nth(1)];
  await name.fill("Test User");
  await email.fill("test@example.com");
  await page.locator(".sp-btn-primary").click();

  await expect(page.locator("#siteping-markers [data-feedback-id]")).toHaveCount(1, { timeout: 10_000 });
  const res = await page.request.get(`${API}?projectName=${project}`);
  const { feedbacks } = await res.json();
  expect(feedbacks).toHaveLength(1);
  expect(feedbacks[0].message).toBe("Sent from the script bundle");
  expect(feedbacks[0].screenshotDataUrl).toMatch(/^data:image\/jpeg;base64,/);
});
