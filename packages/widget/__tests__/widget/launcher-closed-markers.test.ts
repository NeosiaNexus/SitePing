// @vitest-environment jsdom

import { MemoryStore } from "@siteping/adapter-memory";
import type { FeedbackStatus, SitepingStoreConfig } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../helpers.js";

// jsdom does not implement window.matchMedia — provide a stub
mockMatchMedia(false);

// ---------------------------------------------------------------------------
// `showClosedMarkers: false` end to end: the real launcher, panel,
// MarkerManager and StoreClient over a MemoryStore, which applies the status
// filter as the HTTP handler does. Every annotation resolves to the same box,
// so any two pins on the page sit close enough to stack into one cluster.
// ---------------------------------------------------------------------------

vi.mock(new URL("../../src/dom/resolver.js", import.meta.url).pathname, () => ({
  resolveAnnotation: () => ({
    element: document.body,
    rect: new DOMRect(100, 100, 200, 100),
    confidence: 1,
    strategy: "css" as const,
  }),
}));

vi.mock(new URL("../../src/annotator.js", import.meta.url).pathname, () => ({
  Annotator: vi.fn(function (this: unknown) {
    return { destroy: vi.fn(), refreshLabels: vi.fn() };
  }),
}));

vi.mock(new URL("../../src/styles/base.js", import.meta.url).pathname, () => ({
  buildStyles: vi.fn().mockReturnValue("/* styles */"),
}));

// jsdom does not implement CSS.escape.
if (typeof globalThis.CSS === "undefined") {
  (globalThis as Record<string, unknown>).CSS = { escape: (s: string) => s };
} else if (!CSS.escape) {
  CSS.escape = (s: string) => s;
}

// jsdom does not implement scrollIntoView, which a deep link's pin and card call.
Element.prototype.scrollIntoView = () => {};

import { launch } from "../../src/launcher.js";

const PAGE = "/here";

async function seed(store: MemoryStore, clientId: string, status: FeedbackStatus, url = PAGE): Promise<string> {
  const record = await store.createFeedback({
    projectName: "demo",
    type: "bug",
    message: `feedback ${clientId}`,
    status,
    url,
    viewport: "1920x1080",
    userAgent: "test",
    authorName: "Alice",
    authorEmail: "alice@example.com",
    clientId,
    annotations: [
      {
        cssSelector: "div.hero",
        xpath: "/html/body/div",
        textSnippet: "hero",
        elementTag: "DIV",
        textPrefix: "",
        textSuffix: "",
        fingerprint: "0:0:0",
        neighborText: "",
        xPct: 0.1,
        yPct: 0.1,
        wPct: 0.5,
        hPct: 0.5,
        scrollX: 0,
        scrollY: 0,
        viewportW: 1920,
        viewportH: 1080,
        devicePixelRatio: 1,
      },
    ],
  });
  return record.id;
}

const pinIds = () =>
  [...document.querySelectorAll<HTMLElement>("#siteping-markers [data-feedback-id]")].map((m) => m.dataset.feedbackId);
const clusterBadges = () => document.querySelectorAll("#siteping-markers .sp-cluster-badge");
const shadow = () => document.querySelector("siteping-widget")!.shadowRoot!;
const cardIds = () => [...shadow().querySelectorAll<HTMLElement>(".sp-card")].map((c) => c.dataset.feedbackId);

describe("launcher — showClosedMarkers over a real store and real markers", () => {
  let store: MemoryStore;
  let openId: string;
  let closedId: string;
  let instance: ReturnType<typeof launch> | undefined;

  const start = (options: Pick<SitepingStoreConfig, "showClosedMarkers" | "deepLink" | "defaultPanelScope"> = {}) => {
    instance = launch({
      store,
      projectName: "demo",
      forceShow: true,
      getPageScope: () => ({ url: PAGE, urlPattern: null }),
      ...options,
    });
  };
  /** A deep link's outcome: the lookup has answered and the panel, if asked for, has loaded. */
  const settled = async (getFeedbacks: { mock: { results: { value: unknown }[] } }, calls: number) => {
    await vi.waitFor(() => expect(getFeedbacks.mock.results).toHaveLength(calls));
    await Promise.all(getFeedbacks.mock.results.map((r) => r.value));
    await vi.dynamicImportSettled();
  };

  beforeEach(async () => {
    localStorage.clear();
    store = new MemoryStore();
    openId = await seed(store, "a", "open");
    closedId = await seed(store, "b", "resolved");
  });

  afterEach(() => {
    instance?.destroy();
    instance = undefined;
    for (const el of document.querySelectorAll("siteping-widget, #siteping-markers")) el.remove();
    localStorage.clear();
    window.history.replaceState(null, "", "/");
  });

  it("by default stacks a closed pin with the open one beside it", async () => {
    start();

    await vi.waitFor(() => expect(pinIds().sort()).toEqual([openId, closedId].sort()));
    expect(clusterBadges()).toHaveLength(1);
    expect(clusterBadges()[0]?.textContent).toBe("2");
  });

  it("false draws the open pin alone, with nothing to stack it with", async () => {
    const getFeedbacks = vi.spyOn(store, "getFeedbacks");
    start({ showClosedMarkers: false });

    await vi.waitFor(() => expect(pinIds()).toEqual([openId]));
    expect(clusterBadges()).toHaveLength(0);
    expect(getFeedbacks).toHaveBeenCalledWith(expect.objectContaining({ statuses: ["open", "in_progress"] }));
  });

  it("false keeps the closed feedback in the panel's All list", async () => {
    start({ showClosedMarkers: false });
    await vi.waitFor(() => expect(pinIds()).toEqual([openId]));

    instance!.open();

    await vi.waitFor(() => expect(cardIds().sort()).toEqual([openId, closedId].sort()));
    expect(pinIds()).toEqual([openId]);
  });

  it("false takes the pin off the page once the panel resolves its feedback", async () => {
    start({ showClosedMarkers: false });
    await vi.waitFor(() => expect(pinIds()).toEqual([openId]));
    instance!.open();
    await vi.waitFor(() => expect(cardIds()).toContain(openId));

    shadow().querySelector<HTMLButtonElement>(`[data-feedback-id="${openId}"] .sp-btn-resolve`)!.click();

    await vi.waitFor(() => expect(pinIds()).toEqual([]));
    expect(cardIds().sort()).toEqual([openId, closedId].sort());
  });

  it("false still draws in-progress feedback, which counts as open", async () => {
    const inProgressId = await seed(store, "c", "in_progress");
    start({ showClosedMarkers: false });

    await vi.waitFor(() => expect(pinIds().sort()).toEqual([openId, inProgressId].sort()));
  });

  it("by default a deep link to a closed feedback focuses its pin and opens its detail view", async () => {
    window.history.replaceState(null, "", `/?siteping=${closedId}`);
    start({ deepLink: true });

    await vi.waitFor(() => expect(shadow().querySelector(".sp-detail--visible")).not.toBeNull());
    expect(shadow().querySelector(".sp-detail")!.textContent).toContain("feedback b");
    expect(pinIds().sort()).toEqual([openId, closedId].sort());
  });

  it("false still opens a deep link to a closed feedback, in the panel's detail view", async () => {
    window.history.replaceState(null, "", `/?siteping=${closedId}`);
    start({ showClosedMarkers: false, deepLink: true });

    await vi.waitFor(() => expect(shadow().querySelector(".sp-detail--visible")).not.toBeNull());
    expect(shadow().querySelector(".sp-detail")!.textContent).toContain("feedback b");
    expect(pinIds()).toEqual([openId]);
  });

  it("false opens nothing for a deep link that matches no feedback", async () => {
    const getFeedbacks = vi.spyOn(store, "getFeedbacks");
    window.history.replaceState(null, "", "/?siteping=nope");
    start({ showClosedMarkers: false, deepLink: true });

    // The markers' query, then the lookup without the status filter
    await settled(getFeedbacks, 2);
    expect(getFeedbacks.mock.calls[1]?.[0]?.statuses).toBeUndefined();
    expect(shadow().querySelector(".sp-panel--open")).toBeNull();
  });

  it("false opens nothing once the page has changed during the lookup", async () => {
    const getFeedbacks = store.getFeedbacks.bind(store);
    const spy = vi
      .spyOn(store, "getFeedbacks")
      .mockImplementationOnce(getFeedbacks)
      .mockImplementationOnce((query) => {
        void instance!.refresh(); // An SPA navigation, as the lookup is in flight
        return getFeedbacks(query);
      });
    window.history.replaceState(null, "", `/?siteping=${closedId}`);
    start({ showClosedMarkers: false, deepLink: true });

    await settled(spy, 3);
    expect(shadow().querySelector(".sp-panel--open")).toBeNull();
  });

  it("false looks the link up where the panel opens: all pages, under defaultPanelScope 'all'", async () => {
    const getFeedbacks = vi.spyOn(store, "getFeedbacks");
    window.history.replaceState(null, "", `/?siteping=${closedId}`);
    start({ showClosedMarkers: false, deepLink: true, defaultPanelScope: "all" });

    await vi.waitFor(() => expect(shadow().querySelector(".sp-detail--visible")).not.toBeNull());
    expect(getFeedbacks.mock.calls[1]?.[0]?.url).toBeUndefined();
  });

  it("false opens nothing for a closed feedback of another page, which would have no pin here", async () => {
    const elsewhereId = await seed(store, "d", "resolved", "/elsewhere");
    const getFeedbacks = vi.spyOn(store, "getFeedbacks");
    window.history.replaceState(null, "", `/?siteping=${elsewhereId}`);
    start({ showClosedMarkers: false, deepLink: true, defaultPanelScope: "all" });

    await settled(getFeedbacks, 2);
    expect(shadow().querySelector(".sp-panel--open")).toBeNull();
  });
});
