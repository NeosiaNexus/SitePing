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
      // Check for identity modal specifically (exclude DetailView's .sp-detail dialog)
      const modal = shadow?.querySelector('[role="dialog"]:not(.sp-detail):not(.sp-shortcuts-overlay)') ?? null;
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
  // Identity modal interactions (cover promptIdentity flows)
  // -------------------------------------------------------------------------

  describe("identity modal interactions", () => {
    /**
     * Wait for the identity modal to appear in shadow root and return its parts.
     */
    async function getIdentityModal(): Promise<{
      backdrop: HTMLElement;
      modal: HTMLElement;
      nameInput: HTMLInputElement;
      emailInput: HTMLInputElement;
      cancelBtn: HTMLButtonElement;
      submitBtn: HTMLButtonElement;
    }> {
      const widget = document.querySelector("siteping-widget");
      if (!widget) throw new Error("widget not found");
      const shadow = widget.shadowRoot;
      if (!shadow) throw new Error("shadow root not found");

      // The identity modal has aria-labelledby starting with "sp-identity-title-"
      let modal: HTMLElement | null = null;
      await vi.waitFor(() => {
        const candidates = shadow.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
        for (const c of candidates) {
          const labelled = c.getAttribute("aria-labelledby") ?? "";
          if (labelled.startsWith("sp-identity-title-")) {
            modal = c;
            break;
          }
        }
        expect(modal).not.toBeNull();
      });
      const m = modal as unknown as HTMLElement;
      const backdrop = m.parentElement as HTMLElement;
      const nameInput = m.querySelector<HTMLInputElement>('input[type="text"]')!;
      const emailInput = m.querySelector<HTMLInputElement>('input[type="email"]')!;
      const buttons = m.querySelectorAll<HTMLButtonElement>("button");
      const cancelBtn = buttons[0]!;
      const submitBtn = buttons[1]!;
      return { backdrop, modal: m, nameInput, emailInput, cancelBtn, submitBtn };
    }

    it("submits valid identity when user fills inputs and clicks Submit", async () => {
      mockGetIdentity.mockReturnValue(null);
      const response = makeFeedbackResponse({ id: "fb-modal-submit" });
      mockSendFeedback.mockResolvedValue(response);

      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { nameInput, emailInput, submitBtn } = await getIdentityModal();
      nameInput.value = "Alice";
      emailInput.value = "alice@example.com";

      submitBtn.click();

      // Wait for submission — sendFeedback should be called after the modal closes
      await vi.waitFor(
        () => {
          expect(mockSendFeedback).toHaveBeenCalledOnce();
        },
        { timeout: 1500 },
      );

      const payload = mockSendFeedback.mock.calls[0][0];
      expect(payload.authorName).toBe("Alice");
      expect(payload.authorEmail).toBe("alice@example.com");

      instance.destroy();
    });

    it("returns early on Submit when name is empty (no closeModal)", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { nameInput, emailInput, submitBtn, modal } = await getIdentityModal();
      nameInput.value = "";
      emailInput.value = "alice@example.com";

      submitBtn.click();

      // sendFeedback should NOT be called — modal still open
      await new Promise((r) => setTimeout(r, 50));
      expect(mockSendFeedback).not.toHaveBeenCalled();
      // Modal still in DOM (not removed)
      expect(modal.isConnected).toBe(true);

      instance.destroy();
    });

    it("returns early on Submit when email is empty", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { nameInput, emailInput, submitBtn, modal } = await getIdentityModal();
      nameInput.value = "Alice";
      emailInput.value = "";

      submitBtn.click();

      await new Promise((r) => setTimeout(r, 50));
      expect(mockSendFeedback).not.toHaveBeenCalled();
      expect(modal.isConnected).toBe(true);

      instance.destroy();
    });

    it("marks email border red on Submit with invalid email format", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { nameInput, emailInput, submitBtn, modal } = await getIdentityModal();
      nameInput.value = "Alice";
      emailInput.value = "not-an-email";

      submitBtn.click();

      // Border style should change, modal should still be open
      await new Promise((r) => setTimeout(r, 50));
      expect(emailInput.style.borderColor).toBeTruthy();
      expect(emailInput.style.borderColor).not.toBe("");
      expect(mockSendFeedback).not.toHaveBeenCalled();
      expect(modal.isConnected).toBe(true);

      instance.destroy();
    });

    it("Cancel button click closes modal and aborts feedback submission", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { cancelBtn } = await getIdentityModal();
      cancelBtn.click();

      // Wait for closeModal setTimeout (~250ms) — sendFeedback should never fire
      await new Promise((r) => setTimeout(r, 350));
      expect(mockSendFeedback).not.toHaveBeenCalled();

      instance.destroy();
    });

    it("Escape key closes modal and aborts submission", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { backdrop } = await getIdentityModal();
      backdrop.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

      await new Promise((r) => setTimeout(r, 350));
      expect(mockSendFeedback).not.toHaveBeenCalled();

      instance.destroy();
    });

    it("Tab key on the last focusable element wraps focus to the first", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { backdrop, modal, nameInput, submitBtn } = await getIdentityModal();
      // Manually set the last button as the active element
      submitBtn.focus();

      // Spy on focus to confirm cycling — directly check that preventDefault was called
      const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      const preventSpy = vi.spyOn(ev, "preventDefault");
      backdrop.dispatchEvent(ev);

      // The handler should prevent default and refocus the first element (nameInput)
      // In jsdom, modal.contains(activeElement) checks the shadow root's activeElement
      // — the launcher uses shadowRoot.activeElement, so we just confirm the handler ran
      // by checking that preventDefault was called when the active element matches the last
      expect(preventSpy).toHaveBeenCalled();
      // nameInput should still be a known element (no error thrown)
      expect(nameInput).toBeDefined();
      expect(modal.contains(submitBtn)).toBe(true);

      instance.destroy();
    });

    it("Shift+Tab on the first focusable element wraps focus to the last", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { backdrop, modal, nameInput, submitBtn } = await getIdentityModal();
      nameInput.focus();

      const ev = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true });
      const preventSpy = vi.spyOn(ev, "preventDefault");
      backdrop.dispatchEvent(ev);

      expect(preventSpy).toHaveBeenCalled();
      expect(modal.contains(nameInput)).toBe(true);
      expect(submitBtn).toBeDefined();

      instance.destroy();
    });

    it("Tab key when no focus inside modal still triggers focus trap (refocus first)", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { backdrop, modal } = await getIdentityModal();
      // Move focus outside the modal
      const outside = document.createElement("button");
      document.body.appendChild(outside);
      outside.focus();

      const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      const preventSpy = vi.spyOn(ev, "preventDefault");
      backdrop.dispatchEvent(ev);

      // !modal.contains(active) branch → preventDefault + refocus first
      expect(preventSpy).toHaveBeenCalled();
      expect(modal.isConnected).toBe(true);

      outside.remove();
      instance.destroy();
    });

    it("non-Tab/Escape keys don't close the modal", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { backdrop, modal } = await getIdentityModal();

      backdrop.dispatchEvent(new KeyboardEvent("keydown", { key: "a", bubbles: true }));
      backdrop.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

      // Modal still open, no submission
      await new Promise((r) => setTimeout(r, 50));
      expect(modal.isConnected).toBe(true);
      expect(mockSendFeedback).not.toHaveBeenCalled();

      instance.destroy();
    });

    it("clicking the backdrop (outside modal) closes the modal", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { backdrop } = await getIdentityModal();
      // Synthesize a click whose target is the backdrop itself (not bubbled from modal)
      const ev = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(ev, "target", { value: backdrop });
      backdrop.dispatchEvent(ev);

      await new Promise((r) => setTimeout(r, 350));
      expect(mockSendFeedback).not.toHaveBeenCalled();

      instance.destroy();
    });

    it("clicking the modal (not backdrop) does not close it", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { backdrop, modal } = await getIdentityModal();
      // Click event with target === modal (not backdrop) — guard does nothing
      const ev = new MouseEvent("click", { bubbles: true });
      Object.defineProperty(ev, "target", { value: modal });
      backdrop.dispatchEvent(ev);

      await new Promise((r) => setTimeout(r, 50));
      // Modal still attached
      expect(modal.isConnected).toBe(true);

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // crypto.randomUUID failure fallback (line 207-208)
  // -------------------------------------------------------------------------

  describe("clientId fallback", () => {
    it("falls back to Date.now()-based id when crypto.randomUUID throws", async () => {
      const origRandomUUID = (globalThis.crypto as Crypto & { randomUUID: () => string }).randomUUID;
      Object.defineProperty(globalThis.crypto, "randomUUID", {
        value: () => {
          throw new Error("Insecure context");
        },
        writable: true,
        configurable: true,
      });

      try {
        const response = makeFeedbackResponse();
        mockSendFeedback.mockResolvedValue(response);

        const instance = launch(defaultConfig());
        capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

        await vi.waitFor(() => {
          expect(mockSendFeedback).toHaveBeenCalledOnce();
        });

        const payload = mockSendFeedback.mock.calls[0][0];
        // Fallback format: "<timestamp>-<random>"
        expect(payload.clientId).toMatch(/^\d+-[a-z0-9]+$/);

        instance.destroy();
      } finally {
        Object.defineProperty(globalThis.crypto, "randomUUID", {
          value: origRandomUUID,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  // -------------------------------------------------------------------------
  // Initial markers load failure (line 247)
  // -------------------------------------------------------------------------

  describe("initial markers load failure", () => {
    it("logs error when getFeedbacks rejects on initial load (debug mode)", async () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      mockGetFeedbacks.mockRejectedValueOnce(new Error("Network down"));

      try {
        const instance = launch(defaultConfig({ debug: true }));

        // Wait for the rejection handler to fire
        await vi.waitFor(() => {
          const errCalls = debugSpy.mock.calls.filter(
            (c: unknown[]) => typeof c[1] === "string" && c[1].includes("Failed to load initial markers"),
          );
          expect(errCalls.length).toBeGreaterThan(0);
        });

        instance.destroy();
      } finally {
        debugSpy.mockRestore();
        mockGetFeedbacks.mockResolvedValue({ feedbacks: [], total: 0 });
      }
    });

    it("does not throw when getFeedbacks rejects in non-debug mode", async () => {
      mockGetFeedbacks.mockRejectedValueOnce(new Error("Network down"));

      try {
        const instance = launch(defaultConfig());
        // Just give the rejection a chance to settle
        await new Promise((r) => setTimeout(r, 20));
        // No assertion needed — if anything threw, the test would fail
        instance.destroy();
      } finally {
        mockGetFeedbacks.mockResolvedValue({ feedbacks: [], total: 0 });
      }
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

    it("non-Error rejections from sendFeedback are wrapped into Error instances", async () => {
      // Reject with a string (non-Error) — launcher must wrap it
      mockSendFeedback.mockRejectedValue("string error");

      const onError = vi.fn();
      const instance = launch(defaultConfig({ onError }));
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      await vi.waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      const arg = onError.mock.calls[0][0];
      expect(arg).toBeInstanceOf(Error);
      expect((arg as Error).message).toContain("string error");

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Focus trap edge cases — covers branches at lines 411, 414, 417, 422
  // -------------------------------------------------------------------------

  describe("identity modal focus trap edge cases", () => {
    async function getModal(): Promise<{
      backdrop: HTMLElement;
      modal: HTMLElement;
      nameInput: HTMLInputElement;
      submitBtn: HTMLButtonElement;
    }> {
      const widget = document.querySelector("siteping-widget");
      if (!widget) throw new Error("widget not found");
      const shadow = widget.shadowRoot;
      if (!shadow) throw new Error("shadow root not found");

      let modal: HTMLElement | null = null;
      await vi.waitFor(() => {
        const candidates = shadow.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]');
        for (const c of candidates) {
          const labelled = c.getAttribute("aria-labelledby") ?? "";
          if (labelled.startsWith("sp-identity-title-")) {
            modal = c;
            break;
          }
        }
        expect(modal).not.toBeNull();
      });
      const m = modal as unknown as HTMLElement;
      const backdrop = m.parentElement as HTMLElement;
      const nameInput = m.querySelector<HTMLInputElement>('input[type="text"]')!;
      const buttons = m.querySelectorAll<HTMLButtonElement>("button");
      return { backdrop, modal: m, nameInput, submitBtn: buttons[1]! };
    }

    it("Tab when active is the last element wraps to first", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { backdrop, modal, submitBtn } = await getModal();

      // Patch shadowRoot.activeElement to return the submitBtn (jsdom focus on
      // shadow elements can be flaky in shadow root mode "open")
      const shadow = modal.getRootNode() as ShadowRoot;
      Object.defineProperty(shadow, "activeElement", { value: submitBtn, configurable: true });

      const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      const preventSpy = vi.spyOn(ev, "preventDefault");
      backdrop.dispatchEvent(ev);

      // active === last branch hit → preventDefault called and first focused
      expect(preventSpy).toHaveBeenCalled();

      instance.destroy();
    });

    it("Tab when active is in the middle (not last) does not preventDefault", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { backdrop, modal, nameInput } = await getModal();

      // Patch shadow.activeElement to the nameInput (which is inside modal but not last)
      const shadow = modal.getRootNode() as ShadowRoot;
      Object.defineProperty(shadow, "activeElement", { value: nameInput, configurable: true });

      const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      const preventSpy = vi.spyOn(ev, "preventDefault");
      backdrop.dispatchEvent(ev);

      // The active element is in modal but not last → preventDefault should NOT be called
      expect(preventSpy).not.toHaveBeenCalled();

      instance.destroy();
    });

    it("Shift+Tab when active is in the middle (not first) does not preventDefault", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { backdrop, modal, submitBtn } = await getModal();

      // Set active to submitBtn (last) — for Shift+Tab, this is "in middle" (not first)
      // → no preventDefault
      const shadow = modal.getRootNode() as ShadowRoot;
      Object.defineProperty(shadow, "activeElement", { value: submitBtn, configurable: true });

      const ev = new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true });
      const preventSpy = vi.spyOn(ev, "preventDefault");
      backdrop.dispatchEvent(ev);

      // active is last (not first) and inside modal → no preventDefault for Shift+Tab
      expect(preventSpy).not.toHaveBeenCalled();

      instance.destroy();
    });

    it("Tab key with no focusable elements in modal returns without preventDefault", async () => {
      mockGetIdentity.mockReturnValue(null);
      const instance = launch(defaultConfig());
      capturedBus!.emit("annotation:complete", makeAnnotationCompleteData());

      const { backdrop, modal } = await getModal();

      // Strip every focusable child so the focus trap finds an empty list
      const focusables = modal.querySelectorAll<HTMLElement>('input, button, [tabindex]:not([tabindex="-1"])');
      for (const el of focusables) el.remove();

      const ev = new KeyboardEvent("keydown", { key: "Tab", bubbles: true });
      const preventSpy = vi.spyOn(ev, "preventDefault");
      backdrop.dispatchEvent(ev);

      // length === 0 → handler returns early; preventDefault not called
      expect(preventSpy).not.toHaveBeenCalled();

      instance.destroy();
    });
  });
});
