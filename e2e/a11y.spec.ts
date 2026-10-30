import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

// The docs say the widget and the inbox meet WCAG 2.1 AA (#421 A2). axe-core
// checks it in a real browser on every UI state a reviewer or a triager
// reaches, light and dark, and the build fails on a serious or critical
// violation. Hover states and translucent glass backgrounds are outside what
// axe can compute (it reports those as "incomplete"): unit tests lock the
// hover contrast instead (styles-contrast.test.ts, theme.test.ts).

const ORIGIN = "http://localhost:3998";
const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

/** Everything the widget renders: its shadow host, and the surfaces it appends to `<body>`. */
const WIDGET_SURFACES = ["siteping-widget", '[data-siteping-ignore="true"]', "#siteping-markers", "#sp-tooltip"];

interface Finding {
  rule: string;
  impact: string | null | undefined;
  targets: string[];
}

/**
 * Known findings, each tied to one rule on one target, never a whole rule.
 * Remove an entry with its fix: a stale one hides nothing, but must go.
 */
const KNOWN: ReadonlyArray<{ rule: string; target: string; why: string }> = [];

/**
 * Every finite animation and transition has ended — the shadow root's
 * included. Mid fade-in, axe samples text lighter than it rests and reports
 * a contrast failure no reader sees. Infinite ones (the FAB pulse) never end.
 */
async function settled(page: Page): Promise<void> {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getTiming().iterations !== Number.POSITIVE_INFINITY)
        .map((animation) => animation.finished.catch(() => undefined)),
    ),
  );
}

/** Serious and critical WCAG 2.1 A/AA violations inside `include`, readable in a test diff. */
async function violations(page: Page, include: string[]): Promise<Finding[]> {
  await settled(page);
  let builder = new AxeBuilder({ page }).withTags(WCAG_AA);
  for (const selector of include) builder = builder.include(selector);
  const { violations } = await builder.analyze();
  return violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      rule: v.id,
      impact: v.impact,
      targets: v.nodes
        .map((n) => n.target.join(","))
        .filter((target) => !KNOWN.some((k) => k.rule === v.id && k.target === target)),
    }))
    .filter((finding) => finding.targets.length > 0);
}

async function seedFeedback(page: Page, project: string): Promise<void> {
  const res = await page.request.post(`${ORIGIN}/api/siteping`, {
    data: {
      projectName: project,
      type: "bug",
      message: "The header overlaps the logo on the pricing page",
      url: "/",
      viewport: "1280x720",
      userAgent: "Playwright",
      authorName: "Axe",
      authorEmail: "axe@example.com",
      clientId: `axe-${project}`,
      annotations: [],
    },
  });
  expect(res.ok()).toBe(true);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`axe, ${theme} theme`, () => {
    // Resting colors are the same in both modes; reduced motion collapses the
    // shadow root's entrance animations, which \`settled\` can't see from the
    // page (\`document.getAnimations()\` stops at a closed shadow root).
    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
    });

    test("widget: FAB, FAB menu, panel, detail view, comment popup", async ({ page, browserName }) => {
      const project = `axe-widget-${theme}-${browserName}`;
      await seedFeedback(page, project);
      await page.goto(`${ORIGIN}/?project=${project}&theme=${theme}`);
      await expect(page.locator(".sp-fab")).toBeVisible();
      expect.soft(await violations(page, WIDGET_SURFACES), "FAB").toEqual([]);

      await page.locator(".sp-fab").click();
      await expect(page.locator(".sp-radial-item--open").first()).toBeVisible();
      expect.soft(await violations(page, WIDGET_SURFACES), "FAB menu").toEqual([]);

      await page.locator('[data-item-id="chat"]').click();
      await expect(page.locator(".sp-card")).toHaveCount(1);
      expect.soft(await violations(page, WIDGET_SURFACES), "panel").toEqual([]);

      await page.locator(".sp-card").click();
      await expect(page.locator(".sp-detail--visible")).toBeVisible();
      expect.soft(await violations(page, WIDGET_SURFACES), "detail view").toEqual([]);

      await page.keyboard.press("Escape");
      await page.keyboard.press("Escape");
      await expect(page.locator(".sp-panel--open")).toHaveCount(0);
      await page.locator(".sp-fab").click();
      await page.locator('[data-item-id="annotate"]').click();
      await page.mouse.move(200, 200);
      await page.mouse.down();
      await page.mouse.move(420, 300, { steps: 5 });
      await page.mouse.up();
      await expect(page.locator('[role="dialog"][data-siteping-ignore] textarea')).toBeFocused();
      expect.soft(await violations(page, WIDGET_SURFACES), "comment popup").toEqual([]);
    });

    test("inbox: list and open feedback", async ({ page, browserName }) => {
      const project = `axe-inbox-${theme}-${browserName}`;
      await seedFeedback(page, project);
      await page.goto(`${ORIGIN}/inbox?project=${project}&theme=${theme}`);
      const row = page.locator(".spd-row").first();
      await expect(row).toBeVisible();
      expect.soft(await violations(page, [".spd-root"]), "inbox list").toEqual([]);

      await row.click();
      await expect(page.locator(".spd-drawer")).toBeVisible();
      expect.soft(await violations(page, [".spd-root"]), "open feedback").toEqual([]);
    });
  });
}
