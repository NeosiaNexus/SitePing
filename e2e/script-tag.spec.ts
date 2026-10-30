import { expect, test } from "@playwright/test";

// The IIFE bundle (`dist/index.global.js`) is what a plain `<script src>` embed
// runs, exactly as shipped — and the only widget bundle a second minifier
// (Terser) goes over. Every other spec loads the ESM build, so this one drives
// the script bundle end to end: the `SitePing` global, the stylesheet, the
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

// A site without a bundler has no NODE_ENV: the page's host decides whether
// the widget shows by default (#313). These pages run the IIFE exactly as the
// script-tag docs install it — no `process` shim, no inline script (/embed).
const embedGlobal = (page: import("@playwright/test").Page, key: "__skip" | "__cspViolations") =>
  page.evaluate((name) => (window as unknown as Record<string, unknown>)[name], key);

test("without a bundler, the <script> bundle mounts by default on localhost", async ({ page, browserName }) => {
  await page.goto(`http://localhost:3999/embed?project=e2e-${browserName}-embed-local`);
  await expect(page.locator("siteping-widget")).toHaveCount(1);
  expect(await embedGlobal(page, "__skip")).toBeNull();
});

test("without a bundler, the <script> bundle stays hidden on a public host unless forceShow", async ({
  page,
  browserName,
}) => {
  // The same pages, served under a public origin.
  await page.route("https://client-site.example/**", async (route) => {
    const url = route.request().url().replace("https://client-site.example", "http://localhost:3999");
    await route.fulfill({ response: await route.fetch({ url }) });
  });
  const project = `e2e-${browserName}-embed-public`;

  await page.goto(`https://client-site.example/embed?project=${project}`);
  await expect.poll(() => embedGlobal(page, "__skip")).toBe("production");
  await expect(page.locator("siteping-widget")).toHaveCount(0);

  await page.goto(`https://client-site.example/embed?project=${project}&forceShow=1`);
  await expect(page.locator("siteping-widget")).toHaveCount(1);
  expect(await embedGlobal(page, "__skip")).toBeNull();
});

test("the <script> bundle runs under a strict CSP, without 'unsafe-inline'", async ({ page, browserName }) => {
  const project = `e2e-${browserName}-embed-csp`;
  await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
  await page.goto(`http://localhost:3999/embed?csp=1&test=1&forceShow=1&project=${project}`);

  // Mount, the panel, the annotation toolbar and the popup: every surface
  // the widget styles, under `style-src 'self'`.
  const fab = page.locator(".sp-fab");
  await expect(fab).toBeVisible();
  await fab.click();
  await page.locator('[data-item-id="chat"]').click();
  const panel = page.locator(".sp-panel.sp-panel--open");
  await expect(panel.locator(".sp-search")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);

  await fab.click();
  await page.locator('[data-item-id="annotate"]').click();
  // Unstyled, the target starts at the top of the page: draw on its lower
  // part, below the annotation toolbar.
  const box = (await page.locator("#target-element").boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + box.height - 40);
  await page.mouse.down();
  await page.mouse.move(box.x + 250, box.y + box.height - 5, { steps: 5 });
  await page.mouse.up();
  const popup = page.locator('[role="dialog"][data-siteping-ignore]');
  await popup.locator("button[data-type='bug']").click();
  await popup.locator("textarea").fill("Sent under a strict CSP");
  await popup.getByRole("button", { name: "Send" }).click();
  await page.locator(".sp-input").first().fill("Test User");
  await page.locator(".sp-input").nth(1).fill("test@example.com");
  await page.locator(".sp-btn-primary").click();
  await expect(page.locator("#siteping-markers [data-feedback-id]")).toHaveCount(1, { timeout: 10_000 });

  expect(await embedGlobal(page, "__cspViolations")).toEqual([]);
});
