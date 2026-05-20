// @vitest-environment jsdom

import type { FeedbackResponse, SitepingConfig } from "@siteping/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../helpers.js";

// jsdom does not implement window.matchMedia — provide a stub
mockMatchMedia(false);

// ---------------------------------------------------------------------------
// Mock modules before importing launcher
//
// This file deliberately does NOT mock `markers.js` — the FAB-badge tests in
// `launcher-integration.test.ts` stub MarkerManager wholesale and inject
// `markers:changed` by hand, so they only cover the listener -> updateBadge
// wiring. Here the REAL MarkerManager runs end-to-end, so a regression where a
// mutation path stops calling `render()` / `addFeedback()` — and therefore
// stops emitting `markers:changed` — would fail these tests.
// ---------------------------------------------------------------------------

const mockSendFeedback = vi.fn<[], Promise<FeedbackResponse>>();
const mockGetFeedbacks = vi.fn().mockResolvedValue({ feedbacks: [], total: 0 });

vi.mock(new URL("../../src/api-client.js", import.meta.url).pathname, () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    sendFeedback: mockSendFeedback,
    getFeedbacks: mockGetFeedbacks,
    resolveFeedback: vi.fn(),
    deleteFeedback: vi.fn(),
    deleteAllFeedbacks: vi.fn(),
  })),
  flushRetryQueue: vi.fn().mockResolvedValue(undefined),
}));

// Capture the EventBus instance that launch() creates so we can emit events on
// it and subscribe to internal events.
let capturedBus: {
  emit: (event: string, ...args: unknown[]) => void;
  on: (event: string, listener: (...args: unknown[]) => void) => () => void;
} | null = null;

vi.mock(new URL("../../src/annotator.js", import.meta.url).pathname, () => ({
  Annotator: vi.fn().mockImplementation(
    (
      _colors: unknown,
      bus: {
        emit: (event: string, ...args: unknown[]) => void;
        on: (event: string, listener: (...args: unknown[]) => void) => () => void;
      },
    ) => {
      capturedBus = bus;
      bus.on("annotation:start", () => {});
      return { destroy: vi.fn() };
    },
  ),
}));

vi.mock(new URL("../../src/styles/base.js", import.meta.url).pathname, () => ({
  buildStyles: vi.fn().mockReturnValue("/* styles */"),
}));

// Mock identity — simulate stored identity by default
const mockGetIdentity = vi.fn().mockReturnValue({ name: "Test User", email: "test@example.com" });
const mockSaveIdentity = vi.fn();

vi.mock(new URL("../../src/identity.js", import.meta.url).pathname, () => ({
  getIdentity: (...args: unknown[]) => mockGetIdentity(...args),
  saveIdentity: (...args: unknown[]) => mockSaveIdentity(...args),
}));

import { launch } from "../../src/launcher.js";
import { MarkerManager } from "../../src/markers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultConfig(overrides: Partial<SitepingConfig> = {}): SitepingConfig {
  return {
    endpoint: "/api/siteping",
    projectName: "test-project",
    forceShow: true,
    // Project-wide scope keeps the badge count equal to MarkerManager.openCount
    // without depending on jsdom's URL matching the mocked feedbacks' `url`.
    scopeAnnotationsByUrl: false,
    ...overrides,
  };
}

function makeFeedbackResponse(overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  return {
    id: "fb-1",
    projectName: "test-project",
    type: "bug",
    message: "Found a bug",
    status: "open",
    url: "http://localhost/",
    viewport: "1920x1080",
    userAgent: "test",
    authorName: "Test User",
    authorEmail: "test@example.com",
    resolvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    annotations: [],
    ...overrides,
  };
}

function makeAnnotationCompleteData() {
  return {
    annotation: {
      anchor: {
        cssSelector: "div.test",
        xpath: "/html/body/div",
        textSnippet: "test",
        elementTag: "DIV",
        textPrefix: "",
        textSuffix: "",
        fingerprint: "0:0:0",
        neighborText: "",
      },
      rect: { xPct: 0, yPct: 0, wPct: 1, hPct: 1 },
      scrollX: 0,
      scrollY: 0,
      viewportW: 1920,
      viewportH: 1080,
      devicePixelRatio: 1,
    },
    type: "bug",
    message: "Test annotation message",
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("launcher — FAB unread badge (real MarkerManager)", () => {
  afterEach(() => {
    for (const el of document.querySelectorAll("siteping-widget")) {
      el.remove();
    }
    for (const el of document.querySelectorAll('[role="status"]')) {
      el.remove();
    }
    // MarkerManager appends its marker container directly to <body>.
    for (const el of document.querySelectorAll("#siteping-markers")) {
      el.remove();
    }
    capturedBus = null;
    vi.clearAllMocks();
    mockGetFeedbacks.mockResolvedValue({ feedbacks: [], total: 0 });
    mockGetIdentity.mockReturnValue({ name: "Test User", email: "test@example.com" });
  });

  function getBadge(): HTMLElement | null {
    const widget = document.querySelector("siteping-widget");
    return widget!.shadowRoot!.querySelector<HTMLElement>(".sp-fab-badge");
  }

  it("renders the badge from the open count when the real MarkerManager.render() runs on load", async () => {
    // Two open + one resolved — only the open ones must reach the badge.
    mockGetFeedbacks.mockResolvedValue({
      feedbacks: [
        makeFeedbackResponse({ id: "fb-1", status: "open" }),
        makeFeedbackResponse({ id: "fb-2", status: "resolved" }),
        makeFeedbackResponse({ id: "fb-3", status: "open" }),
      ],
      total: 3,
    });

    const instance = launch(defaultConfig());

    // Badge appears once the initial getFeedbacks() resolves and render() runs.
    await vi.waitFor(() => {
      expect(getBadge()?.textContent).toBe("2");
    });

    instance.destroy();
  });

  it("increments the badge when a submitted feedback flows through the real addFeedback()", async () => {
    mockGetFeedbacks.mockResolvedValue({
      feedbacks: [makeFeedbackResponse({ id: "fb-1", status: "open" })],
      total: 1,
    });
    mockSendFeedback.mockResolvedValue(makeFeedbackResponse({ id: "fb-2", status: "open" }));

    const instance = launch(defaultConfig());
    await vi.waitFor(() => {
      expect(getBadge()?.textContent).toBe("1");
    });

    // Submitting drives launcher -> markers.addFeedback() -> markers:changed.
    capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

    await vi.waitFor(() => {
      expect(getBadge()?.textContent).toBe("2");
    });

    instance.destroy();
  });

  it("does not re-emit markers:changed when render() runs again with an unchanged open count", async () => {
    mockGetFeedbacks.mockResolvedValue({
      feedbacks: [makeFeedbackResponse({ id: "fb-1", status: "open" })],
      total: 1,
    });

    const instance = launch(defaultConfig());
    await vi.waitFor(() => {
      expect(getBadge()?.textContent).toBe("1");
    });

    // Watch for further emissions only after the initial render has settled.
    const onChanged = vi.fn();
    capturedBus!.on("markers:changed", onChanged);
    const renderSpy = vi.spyOn(MarkerManager.prototype, "render");

    // instance.refresh() (panel closed) re-fetches and calls the real
    // MarkerManager.render() — the same path a panel search keystroke / filter
    // toggle / "load more" exercises. The open count is unchanged, so the
    // count-change gate must suppress a redundant markers:changed emission and
    // the badge-rebuilding updateBadge() call behind it.
    instance.refresh();
    await vi.waitFor(() => {
      expect(renderSpy).toHaveBeenCalled();
    });

    expect(onChanged).not.toHaveBeenCalled();
    expect(getBadge()?.textContent).toBe("1");

    renderSpy.mockRestore();
    instance.destroy();
  });
});
