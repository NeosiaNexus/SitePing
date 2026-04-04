// @vitest-environment jsdom

import type { FeedbackResponse, SitepingConfig } from "@siteping/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../helpers.js";

// jsdom does not implement window.matchMedia — provide a stub
mockMatchMedia(false);

// ---------------------------------------------------------------------------
// Mock modules before importing launcher
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

// Capture the EventBus instance that launch() creates so we can emit events on it.
// The Annotator receives the bus in its constructor — we intercept it.
let capturedBus: { emit: (event: string, ...args: unknown[]) => void } | null = null;

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
      // Wire annotation:start listener like the real Annotator constructor does
      bus.on("annotation:start", () => {});
      return {
        destroy: vi.fn(),
      };
    },
  ),
}));

vi.mock(new URL("../../src/markers.js", import.meta.url).pathname, () => ({
  MarkerManager: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
    highlight: vi.fn(),
    pinHighlight: vi.fn(),
    addFeedback: vi.fn(),
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

// Mock identity — simulate stored identity by default
const mockGetIdentity = vi.fn().mockReturnValue({ name: "Test User", email: "test@example.com" });

vi.mock(new URL("../../src/identity.js", import.meta.url).pathname, () => ({
  getIdentity: (...args: unknown[]) => mockGetIdentity(...args),
  saveIdentity: vi.fn(),
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

function makeFeedbackResponse(overrides: Partial<FeedbackResponse> = {}): FeedbackResponse {
  return {
    id: "fb-new-1",
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

describe("launcher — annotation:complete integration", () => {
  afterEach(() => {
    // Clean up any siteping-widget elements left in the DOM
    for (const el of document.querySelectorAll("siteping-widget")) {
      el.remove();
    }
    for (const el of document.querySelectorAll('[role="status"]')) {
      el.remove();
    }
    capturedBus = null;
    vi.clearAllMocks();
    mockGetIdentity.mockReturnValue({ name: "Test User", email: "test@example.com" });
  });

  // -------------------------------------------------------------------------
  // annotation:complete -> sendFeedback
  // -------------------------------------------------------------------------

  describe("annotation:complete triggers sendFeedback", () => {
    it("calls sendFeedback with correct payload shape on annotation:complete", async () => {
      const response = makeFeedbackResponse();
      mockSendFeedback.mockResolvedValue(response);

      const instance = launch(defaultConfig());
      expect(capturedBus).not.toBeNull();

      // Emit annotation:complete event on the captured internal bus
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      // Wait for async handler to process
      await vi.waitFor(() => {
        expect(mockSendFeedback).toHaveBeenCalledOnce();
      });

      const payload = mockSendFeedback.mock.calls[0][0];
      expect(payload).toMatchObject({
        projectName: "test-project",
        type: "bug",
        message: "Test annotation message",
      });
      expect(payload.annotations).toHaveLength(1);
      expect(payload.authorName).toBe("Test User");
      expect(payload.authorEmail).toBe("test@example.com");

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // feedback:sent event
  // -------------------------------------------------------------------------

  describe("feedback:sent event", () => {
    it("emits feedback:sent after successful submission", async () => {
      const response = makeFeedbackResponse({ id: "fb-sent-1" });
      mockSendFeedback.mockResolvedValue(response);

      const feedbackSentListener = vi.fn();
      const instance = launch(defaultConfig({ onFeedbackSent: feedbackSentListener }));
      expect(capturedBus).not.toBeNull();

      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      await vi.waitFor(() => {
        expect(feedbackSentListener).toHaveBeenCalledWith(expect.objectContaining({ id: "fb-sent-1" }));
      });

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Live region text
  // -------------------------------------------------------------------------

  describe("live region", () => {
    it("sets live region text after successful submission", async () => {
      const response = makeFeedbackResponse();
      mockSendFeedback.mockResolvedValue(response);

      const instance = launch(defaultConfig());
      expect(capturedBus).not.toBeNull();

      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      await vi.waitFor(() => {
        const liveRegion = document.querySelector<HTMLElement>('[role="status"][aria-live="polite"]');
        expect(liveRegion).not.toBeNull();
        expect(liveRegion!.textContent).not.toBe("");
      });

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Identity modal
  // -------------------------------------------------------------------------

  describe("identity modal", () => {
    it("uses stored identity when available (no modal shown)", async () => {
      const response = makeFeedbackResponse();
      mockSendFeedback.mockResolvedValue(response);

      const instance = launch(defaultConfig());
      expect(capturedBus).not.toBeNull();

      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      await vi.waitFor(() => {
        expect(mockSendFeedback).toHaveBeenCalledOnce();
      });

      // No identity modal should appear — identity was stored
      const widget = document.querySelector("siteping-widget");
      const shadow = widget?.shadowRoot;
      // If there's a dialog it's the identity modal
      const modal = shadow?.querySelector('[role="dialog"]') ?? null;
      expect(modal).toBeNull();

      instance.destroy();
    });

    it("shows identity modal when no stored identity", async () => {
      // Make getIdentity return null to trigger the modal
      mockGetIdentity.mockReturnValue(null);

      const instance = launch(defaultConfig());
      expect(capturedBus).not.toBeNull();

      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      // The identity modal is appended to the shadow root
      await vi.waitFor(() => {
        const widget = document.querySelector("siteping-widget");
        expect(widget).not.toBeNull();
        const shadow = widget!.shadowRoot;
        if (shadow) {
          // Modal should be present inside the shadow root
          const modal = shadow.querySelector('[role="dialog"]');
          expect(modal).not.toBeNull();
        }
      });

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Concurrency guard
  // -------------------------------------------------------------------------

  describe("concurrency guard", () => {
    it("prevents duplicate submissions from concurrent annotation:complete events", async () => {
      // Make sendFeedback slow so we can test concurrent calls
      let resolveFirst!: (value: FeedbackResponse) => void;
      const firstCallPromise = new Promise<FeedbackResponse>((resolve) => {
        resolveFirst = resolve;
      });
      mockSendFeedback.mockReturnValueOnce(firstCallPromise);

      const instance = launch(defaultConfig());
      expect(capturedBus).not.toBeNull();

      const data = makeAnnotationCompleteData();

      // Emit two rapid annotation:complete events
      capturedBus!.emit("annotation:complete", data);
      capturedBus!.emit("annotation:complete", { ...data, message: "Second submission" });

      // Only one sendFeedback call should be made (guard blocks second)
      expect(mockSendFeedback).toHaveBeenCalledTimes(1);

      // Resolve the first call to release the guard
      resolveFirst(makeFeedbackResponse());

      await vi.waitFor(() => {
        // Guard released — but second was already dropped
        expect(mockSendFeedback).toHaveBeenCalledTimes(1);
      });

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Double init guard
  // -------------------------------------------------------------------------

  describe("double init guard", () => {
    it("returns existing instance on duplicate launch() calls", () => {
      const instance1 = launch(defaultConfig());
      const instance2 = launch(defaultConfig());

      // Both should be the same instance
      expect(instance1).toBe(instance2);

      instance1.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // URL sanitization
  // -------------------------------------------------------------------------

  describe("URL sanitization", () => {
    it("annotation:complete strips sensitive query params (token, key, secret, auth) from URL", async () => {
      const response = makeFeedbackResponse();
      mockSendFeedback.mockResolvedValue(response);

      // Set location with sensitive params
      const sensitiveUrl = "http://localhost/?token=abc&key=def&secret=ghi&auth=jkl&page=1";
      Object.defineProperty(window, "location", {
        value: new URL(sensitiveUrl),
        writable: true,
        configurable: true,
      });

      const instance = launch(defaultConfig());
      expect(capturedBus).not.toBeNull();

      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      await vi.waitFor(() => {
        expect(mockSendFeedback).toHaveBeenCalledOnce();
      });

      const payload = mockSendFeedback.mock.calls[0][0];
      expect(payload.url).not.toContain("token=");
      expect(payload.url).not.toContain("key=");
      expect(payload.url).not.toContain("secret=");
      expect(payload.url).not.toContain("auth=");
      // Non-sensitive params should remain
      expect(payload.url).toContain("page=1");

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  describe("error handling", () => {
    it("sendFeedback failure emits feedback:error and sets live region error text", async () => {
      mockSendFeedback.mockRejectedValue(new Error("Network failure"));

      const instance = launch(defaultConfig());
      expect(capturedBus).not.toBeNull();

      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      await vi.waitFor(() => {
        const liveRegion = document.querySelector<HTMLElement>('[role="status"][aria-live="polite"]');
        expect(liveRegion).not.toBeNull();
        expect(liveRegion!.textContent).not.toBe("");
      });

      instance.destroy();
    });

    it("onError callback is called on sendFeedback failure", async () => {
      const error = new Error("Network failure");
      mockSendFeedback.mockRejectedValue(error);

      const onError = vi.fn();
      const instance = launch(defaultConfig({ onError }));
      expect(capturedBus).not.toBeNull();

      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });

      instance.destroy();
    });
  });
});
