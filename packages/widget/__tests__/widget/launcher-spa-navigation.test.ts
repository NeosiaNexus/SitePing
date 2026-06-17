// @vitest-environment jsdom

import type { PageScope, SitepingConfig } from "@siteping/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../helpers.js";

// jsdom does not implement window.matchMedia — provide a stub
mockMatchMedia(false);

// ---------------------------------------------------------------------------
// Mock modules before importing launcher
// ---------------------------------------------------------------------------

const mockGetFeedbacks = vi.fn().mockResolvedValue({ feedbacks: [], total: 0 });

vi.mock(new URL("../../src/api-client.js", import.meta.url).pathname, () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    sendFeedback: vi.fn(),
    getFeedbacks: mockGetFeedbacks,
    resolveFeedback: vi.fn(),
    deleteFeedback: vi.fn(),
    deleteAllFeedbacks: vi.fn(),
  })),
  flushRetryQueue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock(new URL("../../src/annotator.js", import.meta.url).pathname, () => ({
  Annotator: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    refreshLabels: vi.fn(),
  })),
}));

const mockMarkersRender = vi.fn();
vi.mock(new URL("../../src/markers.js", import.meta.url).pathname, () => ({
  MarkerManager: vi.fn().mockImplementation(() => ({
    render: mockMarkersRender,
    highlight: vi.fn(),
    pinHighlight: vi.fn(),
    addFeedback: vi.fn(),
    focusFeedback: vi.fn().mockReturnValue(false),
    destroy: vi.fn(),
    count: 0,
  })),
}));

vi.mock(new URL("../../src/tooltip.js", import.meta.url).pathname, () => ({
  Tooltip: vi.fn().mockImplementation(() => ({
    tooltipId: "sp-tooltip",
    show: vi.fn(),
    scheduleHide: vi.fn(),
    contains: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock(new URL("../../src/styles/base.js", import.meta.url).pathname, () => ({
  buildStyles: vi.fn().mockReturnValue("/* styles */"),
}));

vi.mock(new URL("../../src/identity.js", import.meta.url).pathname, () => ({
  getIdentity: vi.fn().mockReturnValue({ name: "Test User", email: "test@example.com" }),
  saveIdentity: vi.fn(),
}));

// Mock the lazily-imported Panel so the open/closed branch of the navigation
// watcher is fully deterministic (the real Panel only fetches on open(), but
// the stub lets us flip `isCurrentlyOpen` at will and assert delegation).
const mockPanelOpen = vi.fn();
const mockPanelRefresh = vi.fn().mockResolvedValue(undefined);
let panelIsOpen = false;

vi.mock(new URL("../../src/panel.js", import.meta.url).pathname, () => ({
  Panel: vi.fn().mockImplementation(() => ({
    open: mockPanelOpen,
    close: vi.fn(),
    refresh: mockPanelRefresh,
    destroy: vi.fn(),
    get isCurrentlyOpen() {
      return panelIsOpen;
    },
  })),
}));

import { launch } from "../../src/launcher.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultConfig(overrides: Partial<SitepingConfig> = {}): SitepingConfig {
  return {
    endpoint: "/api/siteping",
    projectName: "test-project",
    forceShow: true,
    ...overrides,
  };
}

/** Wait until the initial markers load has fired once, then clear the spy so
 *  subsequent assertions only count navigation-triggered fetches. */
async function settleInitialLoad(): Promise<void> {
  await vi.waitFor(() => {
    expect(mockGetFeedbacks).toHaveBeenCalled();
  });
  mockGetFeedbacks.mockClear();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("launcher — SPA navigation watcher", () => {
  // A controllable scope so tests never depend on jsdom's history/location
  // quirks: the watcher reads getScope() → config.getPageScope() → this value.
  let currentScope: PageScope = { url: "/page-1", urlPattern: null };

  afterEach(() => {
    for (const el of document.querySelectorAll("siteping-widget")) el.remove();
    for (const el of document.querySelectorAll('[role="status"]')) el.remove();
    vi.clearAllMocks();
    mockGetFeedbacks.mockResolvedValue({ feedbacks: [], total: 0 });
    mockPanelRefresh.mockResolvedValue(undefined);
    panelIsOpen = false;
    currentScope = { url: "/page-1", urlPattern: null };
  });

  it("re-fetches feedbacks for the new scope when pushState changes the route", async () => {
    const instance = launch(defaultConfig({ getPageScope: () => currentScope }));
    await settleInitialLoad();

    // Simulate a Next.js App Router client-side navigation: the host's route
    // state advances, and Next calls history.pushState under the hood.
    currentScope = { url: "/page-2", urlPattern: null };
    window.history.pushState(null, "", "/page-2");

    await vi.waitFor(() => {
      expect(mockGetFeedbacks).toHaveBeenCalledTimes(1);
    });
    expect(mockGetFeedbacks).toHaveBeenCalledWith("test-project", expect.objectContaining({ url: "/page-2" }));

    instance.destroy();
  });

  it("re-fetches on replaceState route changes", async () => {
    const instance = launch(defaultConfig({ getPageScope: () => currentScope }));
    await settleInitialLoad();

    currentScope = { url: "/page-3", urlPattern: null };
    window.history.replaceState(null, "", "/page-3");

    await vi.waitFor(() => {
      expect(mockGetFeedbacks).toHaveBeenCalledWith("test-project", expect.objectContaining({ url: "/page-3" }));
    });

    instance.destroy();
  });

  it("re-fetches on popstate (browser back/forward)", async () => {
    const instance = launch(defaultConfig({ getPageScope: () => currentScope }));
    await settleInitialLoad();

    currentScope = { url: "/page-4", urlPattern: null };
    window.dispatchEvent(new PopStateEvent("popstate"));

    await vi.waitFor(() => {
      expect(mockGetFeedbacks).toHaveBeenCalledWith("test-project", expect.objectContaining({ url: "/page-4" }));
    });

    instance.destroy();
  });

  it("does NOT re-fetch when the scope is unchanged (e.g. query-only navigation)", async () => {
    const instance = launch(defaultConfig({ getPageScope: () => currentScope }));
    await settleInitialLoad();

    // pushState fires, but the scope key (url + template) is identical.
    window.history.pushState(null, "", "/page-1?tab=2");

    // Give the watcher a chance to (wrongly) fire.
    await new Promise((r) => setTimeout(r, 30));
    expect(mockGetFeedbacks).not.toHaveBeenCalled();

    instance.destroy();
  });

  it("delegates to the open panel's refresh() instead of fetching markers itself", async () => {
    // This is the exact symptom reported: the panel list stays frozen across
    // SPA navigation because nothing re-runs loadFeedbacks() while it's open.
    const instance = launch(defaultConfig({ getPageScope: () => currentScope }));
    await settleInitialLoad();

    // Open the panel so panelInstance exists and reports as open.
    instance.open();
    await vi.waitFor(() => {
      expect(mockPanelOpen).toHaveBeenCalled();
    });
    panelIsOpen = true;
    mockGetFeedbacks.mockClear();
    mockPanelRefresh.mockClear();

    currentScope = { url: "/page-5", urlPattern: null };
    window.history.pushState(null, "", "/page-5");

    await vi.waitFor(() => {
      expect(mockPanelRefresh).toHaveBeenCalledTimes(1);
    });
    // When the panel is open it owns the fetch — the launcher must not also
    // fetch markers (that would race and clobber the panel's render).
    expect(mockGetFeedbacks).not.toHaveBeenCalled();

    instance.destroy();
  });

  it("does not patch History or re-fetch when watchNavigation is false", async () => {
    const nativePushState = window.history.pushState;

    const instance = launch(defaultConfig({ getPageScope: () => currentScope, watchNavigation: false }));
    await settleInitialLoad();

    // History is left untouched.
    expect(window.history.pushState).toBe(nativePushState);

    currentScope = { url: "/page-6", urlPattern: null };
    window.history.pushState(null, "", "/page-6");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await new Promise((r) => setTimeout(r, 30));
    expect(mockGetFeedbacks).not.toHaveBeenCalled();

    instance.destroy();
  });

  it("ignores a stale in-flight fetch when a newer navigation supersedes it", async () => {
    // A->B->C burst where B's fetch resolves AFTER C's. B (the older request)
    // must not clobber the markers C already rendered. Mirrors the panel's
    // AbortController staleness guard for the closed-panel marker path.
    const instance = launch(defaultConfig({ getPageScope: () => currentScope }));
    await settleInitialLoad();
    // Wait for the initial render to land, then reset the render spy so we only
    // count navigation-driven renders.
    await vi.waitFor(() => {
      expect(mockMarkersRender).toHaveBeenCalled();
    });
    mockMarkersRender.mockClear();

    let resolveSlow: (v: { feedbacks: unknown[]; total: number }) => void = () => {};
    const slow = new Promise<{ feedbacks: unknown[]; total: number }>((r) => {
      resolveSlow = r;
    });
    mockGetFeedbacks.mockReturnValueOnce(slow).mockResolvedValueOnce({ feedbacks: [], total: 0 });

    // Nav to page-2 (slow fetch), then immediately to page-3 (fast fetch).
    currentScope = { url: "/page-2", urlPattern: null };
    window.history.pushState(null, "", "/page-2");
    currentScope = { url: "/page-3", urlPattern: null };
    window.history.pushState(null, "", "/page-3");

    // page-3 resolves first and renders.
    await vi.waitFor(() => {
      expect(mockMarkersRender).toHaveBeenCalledTimes(1);
    });

    // Now the older page-2 fetch resolves — it is stale and must be dropped.
    resolveSlow({ feedbacks: [], total: 0 });
    await new Promise((r) => setTimeout(r, 30));
    expect(mockMarkersRender).toHaveBeenCalledTimes(1);

    instance.destroy();
  });

  it("re-arms the dedup after a failed refresh so re-pushing the same route retries", async () => {
    const instance = launch(defaultConfig({ getPageScope: () => currentScope }));
    await settleInitialLoad();

    // Navigate to a page whose fetch fails.
    currentScope = { url: "/page-fail", urlPattern: null };
    mockGetFeedbacks.mockRejectedValueOnce(new Error("network down"));
    window.history.pushState(null, "", "/page-fail");
    await vi.waitFor(() => {
      expect(mockGetFeedbacks).toHaveBeenCalledWith("test-project", expect.objectContaining({ url: "/page-fail" }));
    });
    // Let the rejection + re-arm microtask settle.
    await new Promise((r) => setTimeout(r, 20));
    mockGetFeedbacks.mockClear();

    // Re-push the SAME route. Without the re-arm, the dedup guard would suppress
    // this (lastScopeKey still == /page-fail) and the stale markers would never
    // recover via the watcher.
    window.history.pushState(null, "", "/page-fail");
    await vi.waitFor(() => {
      expect(mockGetFeedbacks).toHaveBeenCalledWith("test-project", expect.objectContaining({ url: "/page-fail" }));
    });

    instance.destroy();
  });

  it("restores History and stops watching after destroy()", async () => {
    const nativePushState = window.history.pushState;
    const nativeReplaceState = window.history.replaceState;

    const instance = launch(defaultConfig({ getPageScope: () => currentScope }));
    await settleInitialLoad();

    // While alive, History is patched.
    expect(window.history.pushState).not.toBe(nativePushState);
    expect(window.history.replaceState).not.toBe(nativeReplaceState);

    instance.destroy();

    // After destroy, the originals are restored…
    expect(window.history.pushState).toBe(nativePushState);
    expect(window.history.replaceState).toBe(nativeReplaceState);

    // …and a subsequent navigation triggers no fetch.
    currentScope = { url: "/page-7", urlPattern: null };
    window.history.pushState(null, "", "/page-7");
    window.dispatchEvent(new PopStateEvent("popstate"));

    await new Promise((r) => setTimeout(r, 30));
    expect(mockGetFeedbacks).not.toHaveBeenCalled();
  });
});
