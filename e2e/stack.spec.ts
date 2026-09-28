import { type APIRequestContext, expect, type Page, type TestInfo, test } from "@playwright/test";
import type { FeedbackPayload, FeedbackResponse, FeedbackResponseList } from "../packages/core/src/index.js";

/**
 * Real-stack E2E — the widget and the dashboard against the real
 * `createSitepingHandler` + `MemoryStore` (see `stack-server.mjs`), where
 * `widget.spec.ts` runs against a hand-written fake API. Each scenario here
 * is one the fake could not catch: server-side validation, webhooks, and
 * the dashboard's optimistic updates against real PATCH responses.
 */

const ORIGIN = "http://localhost:3998";
const API = `${ORIGIN}/api/siteping`;

/**
 * One project per test attempt — the store is shared and never reset, so this
 * is the isolation. Retries and `--repeat-each` runs start from an empty project.
 */
function projectFor(testInfo: TestInfo): string {
  return `stack-${testInfo.project.name}-${testInfo.testId}-${testInfo.repeatEachIndex}-${testInfo.retry}`;
}

async function listFeedbacks(request: APIRequestContext, projectName: string): Promise<FeedbackResponse[]> {
  const res = await request.get(`${API}?projectName=${encodeURIComponent(projectName)}&limit=100`);
  expect(res.ok()).toBe(true);
  return ((await res.json()) as FeedbackResponseList).feedbacks;
}

/** Generic-webhook bodies received for `projectName`, in arrival order. */
async function receivedWebhooks(request: APIRequestContext, projectName: string): Promise<FeedbackResponse[]> {
  const res = await request.get(`${ORIGIN}/__e2e/webhooks?projectName=${encodeURIComponent(projectName)}`);
  return (await res.json()) as FeedbackResponse[];
}

/** Create a feedback through the real POST route (full schema validation). */
async function seed(request: APIRequestContext, projectName: string, message: string): Promise<FeedbackResponse> {
  const res = await request.post(API, {
    data: {
      projectName,
      type: "bug",
      message,
      url: "/",
      viewport: "1280x720",
      userAgent: "e2e",
      authorName: "Seeder",
      authorEmail: "seed@example.com",
      annotations: [],
      clientId: `seed-${Math.random().toString(36).slice(2)}`,
    } satisfies FeedbackPayload,
  });
  expect(res.status()).toBe(201);
  return (await res.json()) as FeedbackResponse;
}

// ---------------------------------------------------------------------------
// Widget helpers — shadow DOM is open in test mode
// ---------------------------------------------------------------------------

async function openWidgetPage(page: Page, query: Record<string, string>): Promise<void> {
  await page.goto(`${ORIGIN}/?${new URLSearchParams(query)}`);
  await page.waitForFunction(() => !!document.querySelector("siteping-widget")?.shadowRoot?.querySelector(".sp-fab"));
}

async function clickInShadow(page: Page, selector: string): Promise<void> {
  await page.waitForFunction(
    (sel) => !!document.querySelector("siteping-widget")?.shadowRoot?.querySelector(sel),
    selector,
  );
  await page.evaluate((sel) => {
    document.querySelector("siteping-widget")?.shadowRoot?.querySelector<HTMLElement>(sel)?.click();
  }, selector);
}

/**
 * Draw a rectangle over the part of `#target-element` inside the viewport,
 * pick "bug", type `message`, send — and return the POST response.
 */
async function annotateAndSend(page: Page, message: string) {
  await clickInShadow(page, ".sp-fab");
  await clickInShadow(page, '[data-item-id="annotate"]');
  await page.waitForFunction(() => !!document.querySelector("div[style*='crosshair']"));

  const box = await page.locator("#target-element").boundingBox();
  if (!box) throw new Error("#target-element has no box");
  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };
  const left = Math.max(box.x, 0) + 10;
  const right = Math.min(box.x + box.width, viewport.width) - 10;
  await page.mouse.move(left, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(Math.min(left + 200, right), box.y + 50, { steps: 5 });
  await page.mouse.up();

  await page.click("button[data-type='bug']");
  await page.fill("textarea", message);

  const posted = page.waitForResponse((r) => r.url().startsWith(API) && r.request().method() === "POST");
  await page.evaluate(() => {
    for (const b of document.querySelectorAll("button")) {
      if (b.textContent === "Send") {
        b.click();
        return;
      }
    }
  });
  return posted;
}

// ---------------------------------------------------------------------------
// Widget → real handler
// ---------------------------------------------------------------------------

test.describe("Widget against the real handler", () => {
  test("a drawn annotation passes real validation, persists, and notifies the webhook once, replay included", async ({
    page,
    request,
  }, testInfo) => {
    const project = projectFor(testInfo);
    await openWidgetPage(page, { project });

    const response = await annotateAndSend(page, "Real stack bug");
    expect(response.status()).toBe(201);
    const created = (await response.json()) as FeedbackResponse;
    expect(created).not.toHaveProperty("clientId");

    const [stored] = await listFeedbacks(request, project);
    expect(stored?.message).toBe("Real stack bug");
    expect(stored?.annotations).toHaveLength(1);
    const ann = stored?.annotations[0];
    for (const v of [ann?.xPct, ann?.yPct, ann?.wPct, ann?.hPct]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }

    // Fire-and-forget dispatch: poll until it lands.
    await expect.poll(async () => (await receivedWebhooks(request, project)).length).toBe(1);
    const [hook] = await receivedWebhooks(request, project);
    expect(hook?.message).toBe("Real stack bug");
    expect(hook).not.toHaveProperty("clientId");

    // The widget's retry path: the same submission (same clientId) again
    // answers with the stored record, and must neither insert nor notify.
    const replay = await request.post(API, { data: response.request().postDataJSON() });
    expect(replay.status()).toBe(201);
    expect(((await replay.json()) as FeedbackResponse).id).toBe(created.id);
    // Dispatch starts before the handler answers, so any webhook the replay
    // sent was on its way before the barrier's: wait for the barrier's.
    await seed(request, project, "Barrier");
    const messages = async () => (await receivedWebhooks(request, project)).map((w) => w.message);
    await expect.poll(messages).toContain("Barrier");
    expect(await messages()).toEqual(["Real stack bug", "Barrier"]);
    expect(await listFeedbacks(request, project)).toHaveLength(2);
  });

  test("an annotation from a horizontally scrolled RTL page is accepted (negative scrollX)", async ({
    page,
    request,
  }, testInfo) => {
    const project = projectFor(testInfo);
    await openWidgetPage(page, { project, rtl: "1" });
    await page.evaluate(() => window.scrollTo(-300, 0));
    expect(await page.evaluate(() => window.scrollX)).toBeLessThan(0);

    const response = await annotateAndSend(page, "RTL feedback");
    expect(response.status()).toBe(201);
    const [stored] = await listFeedbacks(request, project);
    expect(stored?.annotations[0]?.scrollX).toBeLessThan(0);
  });

  test("a diagnostics buffer configured above the server cap still submits", async ({ page, request }, testInfo) => {
    const project = projectFor(testInfo);
    // The launcher's own docs example: maxConsoleEntries 200 (server cap: 50).
    await openWidgetPage(page, { project, diag: "200" });
    await page.evaluate(() => {
      for (let i = 0; i < 120; i++) console.error(`noisy log ${i}`);
    });

    const response = await annotateAndSend(page, "With diagnostics");
    expect(response.status()).toBe(201);
    const [stored] = await listFeedbacks(request, project);
    expect(stored?.diagnostics?.console).toHaveLength(50);
  });

  test("the panel loads from an endpoint that already carries a query string", async ({ page, request }, testInfo) => {
    const project = projectFor(testInfo);
    await seed(request, project, "Seeded for the panel");
    await openWidgetPage(page, { project, endpoint: "/api/siteping?tenant=acme" });

    await clickInShadow(page, ".sp-fab");
    await clickInShadow(page, '[data-item-id="chat"]');
    await page.waitForFunction(
      () =>
        document
          .querySelector("siteping-widget")
          ?.shadowRoot?.querySelector(".sp-card")
          ?.textContent?.includes("Seeded for the panel") ?? false,
    );
  });
});

// ---------------------------------------------------------------------------
// Dashboard inbox → real handler
// ---------------------------------------------------------------------------

async function openInbox(page: Page, query: Record<string, string>): Promise<void> {
  await page.goto(`${ORIGIN}/inbox?${new URLSearchParams(query)}`);
  await page.locator(".spd-list").waitFor();
}

function rowMessages(page: Page) {
  return page.locator('[role="option"] .spd-row-message');
}

test.describe("Dashboard inbox against the real handler", () => {
  test("resolving from the keyboard persists status and resolvedAt on the server", async ({
    page,
    request,
  }, testInfo) => {
    const project = projectFor(testInfo);
    const seeded = await seed(request, project, "Resolve me");
    await openInbox(page, { project });
    await expect(rowMessages(page)).toHaveText(["Resolve me"]);

    const patched = page.waitForResponse((r) => r.url().startsWith(API) && r.request().method() === "PATCH");
    const beforeResolve = Date.now();
    await page.locator(".spd-list").focus();
    await page.keyboard.press("j");
    await page.keyboard.press("e");
    expect((await patched).status()).toBe(200);

    await expect(rowMessages(page)).toHaveCount(0); // left the Open tab
    const [stored] = await listFeedbacks(request, project);
    expect(stored?.id).toBe(seeded.id);
    expect(stored?.status).toBe("resolved");
    // The closure timestamp is derived by the handler, not sent by the dashboard.
    expect(Date.parse(stored?.resolvedAt ?? "")).toBeGreaterThanOrEqual(beforeResolve);
  });

  test("a failed change rolls back only its own row, not a concurrent success", async ({ page, request }, testInfo) => {
    const project = projectFor(testInfo);
    const older = await seed(request, project, "Will succeed");
    const newer = await seed(request, project, "Will fail");
    await openInbox(page, { project });
    await expect(rowMessages(page)).toHaveText(["Will fail", "Will succeed"]);

    // Hold the first PATCH (for "Will fail") until the second one has been
    // answered by the real server, then fail it.
    let releaseFailure!: () => void;
    const secondDone = new Promise<void>((resolve) => {
      releaseFailure = resolve;
    });
    await page.route(API, async (route) => {
      if (route.request().method() !== "PATCH") return route.continue();
      const { id } = route.request().postDataJSON() as { id: string };
      if (id === newer.id) {
        await secondDone;
        return route.fulfill({ status: 500, json: { error: "boom" } });
      }
      const response = await route.fetch();
      await route.fulfill({ response });
      releaseFailure();
    });

    await page.locator(".spd-list").focus();
    await page.keyboard.press("j"); // "Will fail" (newest first)
    await page.keyboard.press("e"); // held → fails later
    await expect(rowMessages(page)).toHaveText(["Will succeed"]);
    await page.keyboard.press("e"); // "Will succeed" — real PATCH

    await expect(page.getByText("Something went wrong. Change reverted.")).toBeVisible();
    // Only the failed row comes back; the successful change stays applied.
    await expect(rowMessages(page)).toHaveText(["Will fail"]);

    const byId = new Map((await listFeedbacks(request, project)).map((f) => [f.id, f.status]));
    expect(byId.get(older.id)).toBe("resolved");
    expect(byId.get(newer.id)).toBe("open");

    await page.keyboard.press("4"); // Resolved tab reflects the server
    await expect(rowMessages(page)).toHaveText(["Will succeed"]);
  });

  test("the inbox loads from an endpoint that already carries a query string", async ({ page, request }, testInfo) => {
    const project = projectFor(testInfo);
    await seed(request, project, "Tenant-scoped");
    await openInbox(page, { project, endpoint: "/api/siteping?tenant=acme" });
    await expect(rowMessages(page)).toHaveText(["Tenant-scoped"]);
  });
});
