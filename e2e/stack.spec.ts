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

  test("diagnostics buffers configured above the server caps still submit", async ({ page, request }, testInfo) => {
    const project = projectFor(testInfo);
    // Larger limits clamp to the server's caps: 50 console and 20 network entries.
    await openWidgetPage(page, { project, diag: "200" });
    await page.evaluate(async () => {
      for (let i = 0; i < 120; i++) console.error(`noisy log ${i}`);
      await Promise.all(Array.from({ length: 30 }, (_, i) => fetch(`/missing-${i}`)));
    });

    const response = await annotateAndSend(page, "With diagnostics");
    expect(response.status()).toBe(201);
    const [stored] = await listFeedbacks(request, project);
    expect(stored?.diagnostics?.console).toHaveLength(50);
    expect(stored?.diagnostics?.network).toHaveLength(20);
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

  test("the panel's 'Mine' filter lists only the feedback sent from this browser, after a reload too", async ({
    page,
    request,
  }, testInfo) => {
    const project = projectFor(testInfo);
    await seed(request, project, "Sent by someone else");
    await openWidgetPage(page, { project });
    expect((await annotateAndSend(page, "Sent from here")).status()).toBe(201);
    const cardMessages = () =>
      page.evaluate(() =>
        [...(document.querySelector("siteping-widget")?.shadowRoot?.querySelectorAll(".sp-card-message") ?? [])].map(
          (message) => message.textContent,
        ),
      );

    for (const pageLoad of ["after the send", "after a reload"]) {
      if (pageLoad === "after a reload") await openWidgetPage(page, { project });
      await clickInShadow(page, ".sp-fab");
      await clickInShadow(page, '[data-item-id="chat"]');
      await expect.poll(cardMessages, { message: pageLoad }).toEqual(["Sent from here", "Sent by someone else"]);

      await clickInShadow(page, ".sp-mine-toggle");
      await expect.poll(cardMessages, { message: pageLoad }).toEqual(["Sent from here"]);
    }
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

// ---------------------------------------------------------------------------
// Discussion thread: widget ↔ real handler ↔ inbox
// ---------------------------------------------------------------------------

/** The widget's detail view of the (only) seeded feedback, reached from the panel. */
async function openWidgetThread(page: Page, project: string): Promise<void> {
  await openWidgetPage(page, { project });
  await clickInShadow(page, ".sp-fab");
  await clickInShadow(page, '[data-item-id="chat"]');
  await clickInShadow(page, ".sp-card");
  await page.waitForFunction(
    () => !!document.querySelector("siteping-widget")?.shadowRoot?.querySelector(".sp-detail textarea"),
  );
}

/** The replies the widget's detail view shows, as text. */
function widgetReplies(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...(document.querySelector("siteping-widget")?.shadowRoot?.querySelectorAll(".sp-comment") ?? [])].map(
      (reply) => reply.textContent ?? "",
    ),
  );
}

test.describe("Discussion thread across the widget and the inbox", () => {
  test("a reply goes from the widget to the inbox and back, and the inbox deletes one", async ({
    page,
    request,
  }, testInfo) => {
    const project = projectFor(testInfo);
    const seeded = await seed(request, project, "Which font size?");

    // The widget: the server advertises threads, so the reviewer can answer.
    await openWidgetThread(page, project);
    const posted = page.waitForResponse((r) => r.url().startsWith(API) && r.request().method() === "POST");
    await page.evaluate(() => {
      const shadow = document.querySelector("siteping-widget")?.shadowRoot;
      const input = shadow?.querySelector<HTMLTextAreaElement>(".sp-detail textarea");
      if (input) input.value = "  16 px, please  ";
      shadow?.querySelector<HTMLButtonElement>(".sp-thread-foot button")?.click();
    });
    expect((await posted).status()).toBe(201);
    await expect.poll(() => widgetReplies(page)).toEqual([expect.stringContaining("16 px, please")]);

    // The inbox shows it in the drawer and answers.
    await openInbox(page, { project, author: "Studio" });
    await page.locator(".spd-list").focus();
    await page.keyboard.press("j");
    await page.keyboard.press("Enter");
    // 1280 px wide: the drawer sits beside the list, a region rather than a dialog.
    const drawer = page.getByRole("region", { name: /Feedback details/ });
    await expect(drawer.locator(".spd-comment .spd-message")).toHaveText(["16 px, please"]);
    await drawer.getByRole("textbox", { name: "Reply to the client…" }).fill("Done in the next deploy");
    const answered = page.waitForResponse((r) => r.url().startsWith(API) && r.request().method() === "POST");
    await drawer.getByRole("button", { name: "Send" }).click();
    expect((await answered).status()).toBe(201);
    await expect(drawer.locator(".spd-comment .spd-message")).toHaveText(["16 px, please", "Done in the next deploy"]);

    const [stored] = await listFeedbacks(request, project);
    expect(stored?.comments?.map((c) => [c.body, c.authorName, c.authorRole])).toEqual([
      ["16 px, please", "E2E Tester", "client"],
      // No apiKey on this handler: the role the inbox asks for is not kept.
      ["Done in the next deploy", "Studio", "client"],
    ]);

    // Back on the site, the reviewer reads the answer.
    await openWidgetThread(page, project);
    await expect
      .poll(() => widgetReplies(page))
      .toEqual([expect.stringContaining("16 px, please"), expect.stringContaining("Done in the next deploy")]);

    // The inbox deletes the first reply, after asking.
    await openInbox(page, { project, author: "Studio" });
    await page.locator(".spd-list").focus();
    await page.keyboard.press("j");
    await page.keyboard.press("Enter");
    await drawer.getByRole("button", { name: "Delete reply" }).first().click();
    const deleted = page.waitForResponse((r) => r.url().startsWith(API) && r.request().method() === "DELETE");
    await drawer.getByRole("button", { name: "Delete", exact: true }).click();
    expect((await deleted).status()).toBe(200);
    await expect(drawer.locator(".spd-comment .spd-message")).toHaveText(["Done in the next deploy"]);
    const [after] = await listFeedbacks(request, project);
    expect(after?.id).toBe(seeded.id);
    expect(after?.comments?.map((c) => c.body)).toEqual(["Done in the next deploy"]);
  });
});

test.describe("Typing in the widget's reply box", () => {
  test("never triggers the page's single-key shortcuts, nor loses a character to them", async ({
    page,
    request,
  }, testInfo) => {
    const project = projectFor(testInfo);
    await seed(request, project, "Which font size?");
    await openWidgetThread(page, project);
    // DocSearch-style: `/` opens the page's search, `s` stars — outside text fields.
    await page.evaluate(() => {
      const fired: string[] = [];
      Object.assign(window, { shortcutsFired: fired });
      document.addEventListener("keydown", (event) => {
        const target = event.target as HTMLElement;
        if ((event.key === "/" || event.key === "s") && !["INPUT", "TEXTAREA"].includes(target.tagName)) {
          event.preventDefault();
          fired.push(event.key);
        }
      });
      document
        .querySelector("siteping-widget")
        ?.shadowRoot?.querySelector<HTMLTextAreaElement>(".sp-detail textarea")
        ?.focus();
    });

    await page.keyboard.type("see https://x.io/a s");

    const typed = await page.evaluate(
      () =>
        document.querySelector("siteping-widget")?.shadowRoot?.querySelector<HTMLTextAreaElement>(".sp-detail textarea")
          ?.value,
    );
    expect(typed).toBe("see https://x.io/a s");
    expect(await page.evaluate(() => (window as unknown as { shortcutsFired: string[] }).shortcutsFired)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Permissions: what the server lets each requester do (#101)
// ---------------------------------------------------------------------------

test.describe("Permissions sent by the real handler", () => {
  const KEYED = "/api/siteping-keyed";

  test("a visitor without the key gets no triage action; the key holder's inbox has them", async ({
    page,
    request,
  }, testInfo) => {
    const project = projectFor(testInfo);
    await seed(request, project, "Only the team triages this");

    // The site's visitor: reads and replies, never resolves or deletes.
    await openWidgetPage(page, { project, endpoint: KEYED });
    await clickInShadow(page, ".sp-fab");
    await clickInShadow(page, '[data-item-id="chat"]');
    await clickInShadow(page, ".sp-card");
    await page.waitForFunction(
      () => !!document.querySelector("siteping-widget")?.shadowRoot?.querySelector(".sp-detail textarea"),
    );
    const offered = await page.evaluate(() => {
      const shadow = document.querySelector("siteping-widget")?.shadowRoot;
      return {
        card: !!shadow?.querySelector(".sp-card .sp-btn-resolve, .sp-card .sp-btn-delete"),
        detail: !!shadow?.querySelector(".sp-detail-btn-resolve, .sp-detail-btn-delete"),
        deleteAll: shadow?.querySelector<HTMLElement>(".sp-btn-delete-all")?.style.display !== "none",
      };
    });
    expect(offered).toEqual({ card: false, detail: false, deleteAll: false });

    // An inbox without the key reads the status; with it, changes it.
    await openInbox(page, { project, endpoint: KEYED });
    await page.locator(".spd-list").focus();
    await page.keyboard.press("j");
    await page.keyboard.press("Enter");
    const drawer = page.getByRole("region", { name: /Feedback details/ });
    await expect(drawer.locator('span.spd-status-menu-trigger[data-status="open"]')).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Delete feedback" })).toHaveCount(0);

    await openInbox(page, { project, endpoint: KEYED, apiKey: "e2e-key" });
    await page.locator(".spd-list").focus();
    await page.keyboard.press("j");
    await page.keyboard.press("Enter");
    await expect(drawer.getByRole("button", { name: "Open" })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Delete feedback" })).toBeVisible();
  });
});
