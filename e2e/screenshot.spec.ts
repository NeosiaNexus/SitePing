import { expect, test } from "@playwright/test";

// The screenshot is captured by html2canvas-pro from a clone of the page
// scrolled to the host's offset. On a page with `html { scroll-behavior:
// smooth }` (siteping.dev among them) Firefox animated that scroll, measured
// the clone before it moved and captured the top of the page whatever the
// annotated spot (#536). This spec annotates far down such a page and reads
// the pixels of the submitted JPEG back. It drives the IIFE bundle, the only
// one that embeds html2canvas-pro (the ESM build imports it from node_modules,
// which the fixture server does not serve).

const API = "http://localhost:3999/api/siteping";

test("captures the annotated spot, not the top of the page, on a smooth-scrolling page", async ({
  page,
  browserName,
}) => {
  const project = `e2e-${browserName}-screenshot-smooth`;
  await page.request.get(`http://localhost:3999/api/reset?projectName=${project}`);
  await page.goto(`http://localhost:3999?project=${project}&script=1&screenshot=1&smooth=1`);
  const fab = page.locator(".sp-fab");
  await expect(fab).toBeVisible();

  // The tall green section sits well below the first viewport.
  const heading = page.locator(".tall h2");
  await heading.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(720);

  await fab.click();
  await page.locator('[data-item-id="annotate"]').click();
  const box = (await heading.boundingBox())!;
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width, box.y + box.height, { steps: 5 });
  await page.mouse.up();
  const popup = page.locator('[role="dialog"][data-siteping-ignore]');
  await popup.locator("button[data-type='bug']").click();
  await popup.locator("textarea").fill("Far down a smooth-scrolling page");
  await popup.getByRole("button", { name: "Send" }).click();
  await page.locator(".sp-input").first().fill("Test User");
  await page.locator(".sp-input").nth(1).fill("test@example.com");
  await page.locator(".sp-btn-primary").click();
  await expect(page.locator("#siteping-markers [data-feedback-id]")).toHaveCount(1, { timeout: 10_000 });

  const res = await page.request.get(`${API}?projectName=${project}`);
  const { feedbacks } = await res.json();
  expect(feedbacks).toHaveLength(1);
  const { screenshotDataUrl, screenshotRegion } = feedbacks[0];
  expect(screenshotDataUrl).toMatch(/^data:image\/jpeg;base64,/);

  // Sample the capture just outside the drawn rect, inside the section's
  // padding: green when the capture is of the annotated spot, the page's
  // grey/white when it is of the top of the page.
  const samples = await page.evaluate(
    async ({ dataUrl, region, rectWidth }) => {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("screenshot did not decode"));
        img.src = dataUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      // Image pixels per CSS pixel: the rect's drawn width over its CSS width.
      const ratio = (region.wPct * canvas.width) / rectWidth;
      const left = region.xPct * canvas.width;
      const top = region.yPct * canvas.height;
      const read = (x: number, y: number) =>
        Array.from(ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data.slice(0, 3));
      return {
        size: [canvas.width, canvas.height],
        leftOfRect: read(left - 20 * ratio, top + 10 * ratio),
        aboveRect: read(left + 10 * ratio, top - 12 * ratio),
      };
    },
    { dataUrl: screenshotDataUrl as string, region: screenshotRegion, rectWidth: box.width },
  );

  const green = ([r = 0, g = 0, b = 0]: number[]) => r < 60 && g > 150 && b < 60;
  expect(green(samples.leftOfRect), `left of the rect: ${samples.leftOfRect}`).toBe(true);
  expect(green(samples.aboveRect), `above the rect: ${samples.aboveRect}`).toBe(true);
});
