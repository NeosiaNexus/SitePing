// @vitest-environment jsdom

import { type FeedbackResponse, MAX_PAGE_LIMIT } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GetFeedbacksOptions } from "../../src/api-client.js";
import { EventBus, type WidgetEvents } from "../../src/events.js";
import { createT } from "../../src/i18n/index.js";
import { Panel } from "../../src/panel.js";
import { buildThemeColors } from "../../src/styles/theme.js";
import { createShadowRoot } from "../helpers.js";

function makeFeedback(id: string, overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  return {
    id,
    projectName: "test-project",
    type: "bug",
    message: `Message ${id}`,
    status: "open",
    url: "/",
    viewport: "1920x1080",
    userAgent: "test",
    authorName: "Someone",
    // What the unauthenticated GET sends (#105): no email to filter on
    authorEmail: "",
    resolvedAt: null,
    // One timestamp: the list's newest-first sort keeps the server's order
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    annotations: [],
    urlPattern: null,
    screenshotUrl: null,
    screenshotRegion: null,
    diagnostics: null,
    ...overrides,
  };
}

/** A server answering `getFeedbacks` from `feedbacks`, newest first, one page at a time. */
function paginate(feedbacks: FeedbackResponse[]) {
  return async (_project: string, options: GetFeedbacksOptions = {}) => {
    const limit = options.limit ?? 50;
    const start = ((options.page ?? 1) - 1) * limit;
    return { feedbacks: feedbacks.slice(start, start + limit), total: feedbacks.length };
  };
}

// jsdom does not implement CSS.escape
if (typeof globalThis.CSS === "undefined") {
  (globalThis as Record<string, unknown>).CSS = { escape: (s: string) => s };
}

describe("Panel — 'Mine' filter", () => {
  const t = createT("en");
  let shadow: ShadowRoot;
  let panel: Panel;
  let own: Set<string>;
  let client: {
    sendFeedback: ReturnType<typeof vi.fn>;
    getFeedbacks: ReturnType<typeof vi.fn>;
    resolveFeedback: ReturnType<typeof vi.fn>;
    deleteFeedback: ReturnType<typeof vi.fn>;
    deleteAllFeedbacks: ReturnType<typeof vi.fn>;
  };
  let markers: {
    render: ReturnType<typeof vi.fn>;
    highlight: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
  };

  const toggle = () => shadow.querySelector<HTMLButtonElement>(".sp-mine-toggle")!;
  const cardIds = () => [...shadow.querySelectorAll<HTMLElement>(".sp-card")].map((card) => card.dataset.feedbackId);
  /** The options of every list request (the page-marker query carries no `page`). */
  const listCalls = () =>
    client.getFeedbacks.mock.calls.map((call) => call[1] as GetFeedbacksOptions).filter((o) => o.page !== undefined);

  beforeEach(() => {
    shadow = createShadowRoot();
    own = new Set();
    client = {
      sendFeedback: vi.fn(),
      getFeedbacks: vi.fn().mockResolvedValue({ feedbacks: [], total: 0 }),
      resolveFeedback: vi.fn(),
      deleteFeedback: vi.fn(),
      deleteAllFeedbacks: vi.fn(),
    };
    markers = { render: vi.fn(), highlight: vi.fn(), destroy: vi.fn() };
    panel = new Panel(
      shadow,
      buildThemeColors(),
      new EventBus<WidgetEvents>(),
      client as never,
      "test-project",
      markers as never,
      t,
      "en",
      { getScope: () => ({ url: "/", urlPattern: null }), scopeAnnotationsByUrl: true, ownFeedbackIds: () => own },
    );
  });

  afterEach(() => {
    panel.destroy();
    shadow.host.remove();
  });

  it("is an unpressed toggle button in the filter bar, labelled and explained", () => {
    const button = toggle();

    expect(button.closest(".sp-filter-bar")).not.toBeNull();
    expect(button.type).toBe("button");
    expect(button.getAttribute("aria-pressed")).toBe("false");
    expect(button.textContent).toBe(t("panel.filterMine"));
    expect(button.title).toBe(t("panel.filterMineHint"));
  });

  it("lists only the feedback sent from this browser, and everything again once released", async () => {
    const all = [makeFeedback("theirs-1"), makeFeedback("mine-1"), makeFeedback("theirs-2"), makeFeedback("mine-2")];
    own = new Set(["mine-1", "mine-2"]);
    client.getFeedbacks.mockImplementation(paginate(all));
    await panel.open();
    expect(cardIds()).toEqual(["theirs-1", "mine-1", "theirs-2", "mine-2"]);

    toggle().click();
    await vi.waitFor(() => expect(cardIds()).toEqual(["mine-1", "mine-2"]));
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    expect(toggle().classList.contains("sp-mine-toggle--active")).toBe(true);

    toggle().click();
    await vi.waitFor(() => expect(cardIds()).toHaveLength(4));
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    expect(listCalls().at(-1)).toEqual({ page: 1, limit: 20, url: "/" });
  });

  it("walks the query's pages until every remembered id has turned up, then stops", async () => {
    const all = Array.from({ length: 250 }, (_, i) => makeFeedback(`fb-${i}`));
    own = new Set(["fb-3", "fb-150"]);
    client.getFeedbacks.mockImplementation(paginate(all));
    await panel.open();
    client.getFeedbacks.mockClear();

    toggle().click();

    await vi.waitFor(() => expect(cardIds()).toEqual(["fb-3", "fb-150"]));
    // Page 3 is never fetched: both ids were found on pages 1 and 2
    expect(listCalls()).toEqual([
      { page: 1, limit: MAX_PAGE_LIMIT, url: "/" },
      { page: 2, limit: MAX_PAGE_LIMIT, url: "/" },
    ]);
    // Everything is listed at once: no "Load more"
    expect(shadow.querySelector(".sp-btn-load-more")).toBeNull();
  });

  it("stops at the last page when a remembered id is gone", async () => {
    const all = Array.from({ length: 150 }, (_, i) => makeFeedback(`fb-${i}`));
    own = new Set(["fb-120", "deleted-elsewhere"]);
    client.getFeedbacks.mockImplementation(paginate(all));
    await panel.open();
    client.getFeedbacks.mockClear();

    toggle().click();

    await vi.waitFor(() => expect(cardIds()).toEqual(["fb-120"]));
    expect(listCalls().map((o) => o.page)).toEqual([1, 2]);
  });

  it("lists a feedback once when a new one shifts it onto the next page mid-walk", async () => {
    const page1 = Array.from({ length: MAX_PAGE_LIMIT }, (_, i) => makeFeedback(`fb-${i}`));
    const shifted = page1.at(-1) as FeedbackResponse;
    own = new Set([shifted.id, "fb-200"]);
    await panel.open();
    // Page 2 is fetched after a feedback was created: its first item is page 1's last
    client.getFeedbacks.mockImplementation(async (_project: string, options: GetFeedbacksOptions) => {
      if (options.page === 1) return { feedbacks: page1, total: 150 };
      if (options.page === 2) return { feedbacks: [shifted, makeFeedback("fb-200")], total: 151 };
      return { feedbacks: [], total: 0 }; // Page markers
    });

    toggle().click();

    await vi.waitFor(() => expect(cardIds()).toEqual([shifted.id, "fb-200"]));
  });

  it("sends no list request when this browser has sent nothing", async () => {
    await panel.open();
    client.getFeedbacks.mockClear();

    toggle().click();

    await vi.waitFor(() => expect(shadow.querySelector(".sp-empty")).not.toBeNull());
    expect(listCalls()).toEqual([]);
  });

  it("keeps the other filters on the walk", async () => {
    own = new Set(["mine-1"]);
    await panel.open();
    shadow.querySelector<HTMLButtonElement>('[data-status-filter="open"]')!.click();
    shadow.querySelector<HTMLButtonElement>('[data-scope-filter="all"]')!.click();
    client.getFeedbacks.mockClear();

    toggle().click();

    await vi.waitFor(() => expect(listCalls()).toHaveLength(1));
    expect(listCalls()[0]).toEqual({ page: 1, limit: MAX_PAGE_LIMIT, statuses: ["open", "in_progress"] });
  });

  it("reads the remembered ids on every load, so a feedback just sent shows up", async () => {
    const all = [makeFeedback("theirs"), makeFeedback("sent-now")];
    client.getFeedbacks.mockImplementation(paginate(all));
    await panel.open();
    toggle().click();
    await vi.waitFor(() => expect(shadow.querySelector(".sp-empty")).not.toBeNull());

    own.add("sent-now");
    await panel.refresh();

    expect(cardIds()).toEqual(["sent-now"]);
  });

  it("leaves the page markers showing every feedback of the page", async () => {
    const all = [makeFeedback("theirs"), makeFeedback("mine")];
    own = new Set(["mine"]);
    client.getFeedbacks.mockImplementation(paginate(all));
    await panel.open();

    toggle().click();

    await vi.waitFor(() => expect(cardIds()).toEqual(["mine"]));
    await vi.waitFor(() => expect(markers.render.mock.calls.at(-1)?.[0]).toEqual(all));
  });
});
