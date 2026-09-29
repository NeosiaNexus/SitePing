import { expect, test } from "@playwright/test";
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
test("probe tab trail", async ({ page, browserName }) => {
  test.skip(browserName !== "chromium");
  await page.goto(`http://localhost:3999?project=probe-tab&noForceShow=1`);
  await page.waitForFunction(() => document.querySelector("siteping-widget")?.shadowRoot?.querySelector(".sp-fab") != null);
  await page.locator(".sp-fab").tap();
  await page.locator('[data-item-id="chat"]').tap();
  await expect(page.locator(".sp-panel")).toHaveClass(/sp-panel--open/);
  await page.waitForTimeout(500);
  const trail: string[] = [];
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press("Tab");
    trail.push(await page.evaluate(() => {
      const host = document.querySelector("siteping-widget")!;
      const a = host.shadowRoot!.activeElement as HTMLElement | null;
      if (document.activeElement === host && a) return "W:" + a.tagName + "." + (a.className || "").toString().slice(0, 30);
      const d = document.activeElement as HTMLElement;
      return "P:" + d.tagName;
    }));
  }
  console.log(trail.join("\n"));
  const hidden = await page.evaluate(() => {
    const root = document.querySelector("siteping-widget")!.shadowRoot!.querySelector(".sp-panel")!;
    const f = Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
    const last = f[f.length - 1]!;
    return { lastClass: last.className, lastDisplay: getComputedStyle(last).display, rects: last.getClientRects().length };
  });
  console.log(JSON.stringify(hidden));
});
