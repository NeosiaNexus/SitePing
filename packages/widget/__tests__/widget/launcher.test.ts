// @vitest-environment jsdom

import type { SitepingConfig } from "@siteping/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom does not implement window.matchMedia — provide a stub
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ---------------------------------------------------------------------------
// Mock modules before importing launcher
// ---------------------------------------------------------------------------

// Mock the ApiClient to avoid real HTTP requests.
// Hoist `flushRetryQueueMock` so it is a stable reference across the factory and tests.
const { flushRetryQueueMock } = vi.hoisted(() => ({
  flushRetryQueueMock: vi.fn(),
}));
flushRetryQueueMock.mockResolvedValue(undefined);
vi.mock(new URL("../../src/api-client.js", import.meta.url).pathname, () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    sendFeedback: vi.fn().mockResolvedValue({}),
    getFeedbacks: vi.fn().mockResolvedValue({ feedbacks: [], total: 0 }),
    resolveFeedback: vi.fn(),
    deleteFeedback: vi.fn(),
    deleteAllFeedbacks: vi.fn(),
  })),
  flushRetryQueue: flushRetryQueueMock,
}));

// Mock heavy dependencies to keep tests fast and focused on launcher logic
// Capture the EventBus so we can emit events for callback wiring tests.
// Use a container object to work around vi.mock hoisting
const annotatorCapture: { bus: { emit: (event: string, ...args: unknown[]) => void } | null } = { bus: null };

vi.mock(new URL("../../src/annotator.js", import.meta.url).pathname, () => ({
  Annotator: vi.fn().mockImplementation(
    (
      _colors: unknown,
      bus: {
        emit: (event: string, ...args: unknown[]) => void;
        on: (event: string, listener: (...args: unknown[]) => void) => () => void;
      },
    ) => {
      annotatorCapture.bus = bus;
      bus.on("annotation:start", () => {});
      return { destroy: vi.fn() };
    },
  ),
}));

vi.mock("../../src/markers.js", () => ({
  MarkerManager: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
    highlight: vi.fn(),
    pinHighlight: vi.fn(),
    addFeedback: vi.fn(),
    destroy: vi.fn(),
    count: 0,
  })),
}));

vi.mock("../../src/tooltip.js", () => ({
  Tooltip: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
  })),
}));

vi.mock("../../src/styles/base.js", () => ({
  buildStyles: vi.fn().mockReturnValue("/* styles */"),
}));

import { launch } from "../../src/launcher.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultConfig(overrides: Partial<SitepingConfig> = {}): SitepingConfig {
  return {
    endpoint: "/api/siteping",
    projectName: "test-project",
    forceShow: true, // bypass production guard in tests
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("launch", () => {
  afterEach(() => {
    // Clean up any siteping-widget elements left in the DOM
    for (const el of document.querySelectorAll("siteping-widget")) {
      el.remove();
    }
    for (const el of document.querySelectorAll('[role="status"]')) {
      el.remove();
    }
    annotatorCapture.bus = null;
  });

  // -------------------------------------------------------------------------
  // Production guard
  // -------------------------------------------------------------------------

  describe("production guard", () => {
    it("returns a no-op instance when NODE_ENV is production and forceShow is not set", () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const instance = launch({ endpoint: "/api", projectName: "test" });

        // No widget element should be added
        const widget = document.querySelector("siteping-widget");
        expect(widget).toBeNull();

        // Should return an instance with no-op methods
        expect(instance.destroy).toBeTypeOf("function");
        expect(instance.open).toBeTypeOf("function");
        expect(instance.close).toBeTypeOf("function");
        expect(instance.refresh).toBeTypeOf("function");
        expect(instance.on).toBeTypeOf("function");
        expect(instance.off).toBeTypeOf("function");

        // No-ops should not throw
        instance.destroy();
        instance.open();
        instance.close();
        instance.refresh();
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it("initializes normally when forceShow is true even in production", () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const instance = launch(defaultConfig({ forceShow: true }));

        const widget = document.querySelector("siteping-widget");
        expect(widget).not.toBeNull();

        instance.destroy();
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it("calls onSkip callback with 'production' reason when skipped", () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const onSkip = vi.fn();
        launch({ endpoint: "/api", projectName: "test", onSkip });

        expect(onSkip).toHaveBeenCalledWith("production");
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  // -------------------------------------------------------------------------
  // Mobile guard
  // -------------------------------------------------------------------------

  describe("mobile guard", () => {
    it("returns a no-op instance when viewport is narrow (< 768px)", () => {
      const origWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { value: 600, writable: true, configurable: true });

      try {
        const instance = launch(defaultConfig());

        const widget = document.querySelector("siteping-widget");
        expect(widget).toBeNull();

        // Shouldn't throw
        instance.destroy();
      } finally {
        Object.defineProperty(window, "innerWidth", { value: origWidth, writable: true, configurable: true });
      }
    });

    it("calls onSkip with 'mobile' reason on narrow viewport", () => {
      const origWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { value: 500, writable: true, configurable: true });

      try {
        const onSkip = vi.fn();
        launch(defaultConfig({ onSkip }));

        expect(onSkip).toHaveBeenCalledWith("mobile");
      } finally {
        Object.defineProperty(window, "innerWidth", { value: origWidth, writable: true, configurable: true });
      }
    });

    it("initializes normally when viewport is >= 768px", () => {
      const origWidth = window.innerWidth;
      Object.defineProperty(window, "innerWidth", { value: 1024, writable: true, configurable: true });

      try {
        const instance = launch(defaultConfig());

        const widget = document.querySelector("siteping-widget");
        expect(widget).not.toBeNull();

        instance.destroy();
      } finally {
        Object.defineProperty(window, "innerWidth", { value: origWidth, writable: true, configurable: true });
      }
    });
  });

  // -------------------------------------------------------------------------
  // Returns API
  // -------------------------------------------------------------------------

  describe("returned API", () => {
    let instance: ReturnType<typeof launch>;

    beforeEach(() => {
      instance = launch(defaultConfig());
    });

    afterEach(() => {
      instance.destroy();
    });

    it("returns an object with all expected methods", () => {
      expect(instance).toHaveProperty("destroy");
      expect(instance).toHaveProperty("open");
      expect(instance).toHaveProperty("close");
      expect(instance).toHaveProperty("refresh");
      expect(instance).toHaveProperty("on");
      expect(instance).toHaveProperty("off");
    });

    it("open() does not throw", () => {
      expect(() => instance.open()).not.toThrow();
    });

    it("close() does not throw", () => {
      expect(() => instance.close()).not.toThrow();
    });

    it("refresh() does not throw", () => {
      expect(() => instance.refresh()).not.toThrow();
    });

    it("on() returns an unsubscribe function", () => {
      const unsub = instance.on("panel:open", () => {});
      expect(unsub).toBeTypeOf("function");
      // Unsubscribe should not throw
      unsub();
    });

    it("off() does not throw", () => {
      const listener = () => {};
      expect(() => instance.off("panel:open", listener)).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Widget DOM structure
  // -------------------------------------------------------------------------

  describe("widget DOM structure", () => {
    it("creates a siteping-widget custom element", () => {
      const instance = launch(defaultConfig());

      const widget = document.querySelector("siteping-widget");
      expect(widget).not.toBeNull();

      instance.destroy();
    });

    it("creates a live region for screen reader announcements", () => {
      const instance = launch(defaultConfig());

      const liveRegions = document.querySelectorAll('[role="status"][aria-live="polite"]');
      expect(liveRegions.length).toBeGreaterThan(0);

      instance.destroy();
    });

    it("uses open shadow mode in test environment", () => {
      const instance = launch(defaultConfig());

      const widget = document.querySelector("siteping-widget")!;
      expect(widget.shadowRoot).not.toBeNull();

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------

  describe("destroy", () => {
    it("removes the siteping-widget element", () => {
      const instance = launch(defaultConfig());
      instance.destroy();

      const widget = document.querySelector("siteping-widget");
      expect(widget).toBeNull();
    });

    it("removes the live region element", () => {
      const instance = launch(defaultConfig());
      instance.destroy();

      // After destroy, no live regions created by the widget should remain
      // (other tests may leave their own elements, so we just check the count didn't go up)
      const liveRegions = document.querySelectorAll('[aria-live="polite"][aria-atomic="true"]');
      expect(liveRegions.length).toBe(0);
    });

    it("can be called multiple times without throwing", () => {
      const instance = launch(defaultConfig());
      instance.destroy();
      // Second destroy should not throw (DOM elements already removed)
      expect(() => instance.destroy()).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Config callbacks
  // -------------------------------------------------------------------------

  describe("config callbacks", () => {
    it("wires onOpen callback to bus 'open' event", () => {
      const onOpen = vi.fn();
      const instance = launch(defaultConfig({ onOpen }));

      instance.open();

      // onOpen is called via event bus when panel opens
      expect(onOpen).toHaveBeenCalled();

      instance.destroy();
    });

    it("wires onClose callback to bus 'close' event", () => {
      const onClose = vi.fn();
      const instance = launch(defaultConfig({ onClose }));

      instance.open();
      instance.close();

      expect(onClose).toHaveBeenCalled();

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Locale
  // -------------------------------------------------------------------------

  describe("locale", () => {
    it("defaults to French locale", () => {
      const instance = launch(defaultConfig());

      const widget = document.querySelector("siteping-widget")!;
      const shadow = widget.shadowRoot!;
      const fabBtn = shadow.querySelector<HTMLButtonElement>(".sp-fab")!;
      // French ARIA label
      expect(fabBtn.getAttribute("aria-label")).toContain("Siteping");

      instance.destroy();
    });

    it("supports English locale", () => {
      const instance = launch(defaultConfig({ locale: "en" }));

      const widget = document.querySelector("siteping-widget")!;
      const shadow = widget.shadowRoot!;
      const panel = shadow.querySelector<HTMLElement>('[role="complementary"]')!;
      expect(panel.getAttribute("aria-label")).toBe("Siteping feedback panel");

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Config validation guards
  // -------------------------------------------------------------------------

  describe("config validation guards", () => {
    it("returns no-op when endpoint is missing", () => {
      const instance = launch({ projectName: "test", forceShow: true } as SitepingConfig);

      const widget = document.querySelector("siteping-widget");
      expect(widget).toBeNull();
      expect(instance.destroy).toBeTypeOf("function");
      instance.destroy();
    });

    it("returns no-op when endpoint is empty string", () => {
      const instance = launch(defaultConfig({ endpoint: "" }));

      const widget = document.querySelector("siteping-widget");
      expect(widget).toBeNull();
      instance.destroy();
    });

    it("returns no-op when projectName is missing", () => {
      const instance = launch({ endpoint: "/api", forceShow: true } as SitepingConfig);

      const widget = document.querySelector("siteping-widget");
      expect(widget).toBeNull();
      instance.destroy();
    });

    it("returns no-op when projectName is empty string", () => {
      const instance = launch(defaultConfig({ projectName: "" }));

      const widget = document.querySelector("siteping-widget");
      expect(widget).toBeNull();
      instance.destroy();
    });

    it("returns no-op when endpoint is not a string (number)", () => {
      const instance = launch(defaultConfig({ endpoint: 42 as unknown as string }));

      const widget = document.querySelector("siteping-widget");
      expect(widget).toBeNull();
      instance.destroy();
    });

    it("returns no-op when projectName is not a string", () => {
      const instance = launch(defaultConfig({ projectName: 123 as unknown as string }));

      const widget = document.querySelector("siteping-widget");
      expect(widget).toBeNull();
      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Additional callback wiring
  // -------------------------------------------------------------------------

  describe("additional callback wiring", () => {
    it("onAnnotationStart callback fires on annotation:start event", () => {
      const onAnnotationStart = vi.fn();
      const instance = launch(defaultConfig({ onAnnotationStart }));

      expect(annotatorCapture.bus).not.toBeNull();
      annotatorCapture.bus!.emit("annotation:start");
      expect(onAnnotationStart).toHaveBeenCalled();

      instance.destroy();
    });

    it("onAnnotationEnd callback fires on annotation:end event", () => {
      const onAnnotationEnd = vi.fn();
      const instance = launch(defaultConfig({ onAnnotationEnd }));

      expect(annotatorCapture.bus).not.toBeNull();
      annotatorCapture.bus!.emit("annotation:end");
      expect(onAnnotationEnd).toHaveBeenCalled();

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // Skipped instance API surface (no-op methods + on/off)
  // -------------------------------------------------------------------------

  describe("skipped instance API", () => {
    it("on() of skipped instance returns a no-op function", () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      try {
        const instance = launch({ endpoint: "/api", projectName: "test" });

        const listener = () => {};
        const unsub = instance.on("panel:open", listener);
        expect(unsub).toBeTypeOf("function");

        // Calling unsub or off should not throw (it's a no-op)
        expect(() => unsub()).not.toThrow();
        expect(() => instance.off("panel:open", listener)).not.toThrow();
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });
  });

  // -------------------------------------------------------------------------
  // Debug logging
  // -------------------------------------------------------------------------

  describe("debug logging", () => {
    it("logs initialization details to console.debug when config.debug = true", () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      try {
        const instance = launch(defaultConfig({ debug: true }));

        // The launcher logs "Initializing widget", "Panel opened/closed", etc.
        // The first init log is fired synchronously
        expect(debugSpy).toHaveBeenCalled();
        const initialCalls = debugSpy.mock.calls.filter(
          (c: unknown[]) => typeof c[0] === "string" && c[0].includes("[siteping]"),
        );
        expect(initialCalls.length).toBeGreaterThan(0);

        instance.destroy();
        // destroy also logs
        const destroyCalls = debugSpy.mock.calls.filter(
          (c: unknown[]) => typeof c[1] === "string" && c[1].includes("Destroying"),
        );
        expect(destroyCalls.length).toBeGreaterThan(0);
      } finally {
        debugSpy.mockRestore();
      }
    });

    it("does not log when config.debug is false/undefined", () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      try {
        const instance = launch(defaultConfig());

        // No "[siteping]" debug messages should be emitted
        const sitepingCalls = debugSpy.mock.calls.filter(
          (c: unknown[]) => typeof c[0] === "string" && c[0].includes("[siteping]"),
        );
        expect(sitepingCalls.length).toBe(0);

        instance.destroy();
      } finally {
        debugSpy.mockRestore();
      }
    });

    it("debug log on duplicate launch() returns existing instance", () => {
      const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
      try {
        const first = launch(defaultConfig({ debug: true }));
        const second = launch(defaultConfig({ debug: true }));
        expect(first).toBe(second);

        // The second call should have triggered a debug log about "called more than once"
        const dupCalls = debugSpy.mock.calls.filter(
          (c: unknown[]) => typeof c[1] === "string" && c[1].includes("more than once"),
        );
        expect(dupCalls.length).toBeGreaterThan(0);

        first.destroy();
      } finally {
        debugSpy.mockRestore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // process.env undefined branch (line 58)
  // -------------------------------------------------------------------------

  describe("production guard with process undefined", () => {
    it("does not skip when process is undefined (browser context)", () => {
      const origProcess = (globalThis as unknown as { process?: unknown }).process;
      // Simulate browser environment with no process global
      delete (globalThis as unknown as { process?: unknown }).process;

      try {
        const instance = launch({ endpoint: "/api", projectName: "test" });

        // Without process.env, the production guard's typeof check returns "undefined"
        // and the guard short-circuits — widget should mount
        const widget = document.querySelector("siteping-widget");
        expect(widget).not.toBeNull();

        instance.destroy();
      } finally {
        if (origProcess) {
          (globalThis as unknown as { process: unknown }).process = origProcess;
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // store config path (line 99)
  // -------------------------------------------------------------------------

  describe("store config path", () => {
    it("uses StoreClient when config.store is provided (no endpoint)", () => {
      const fakeStore = {
        createFeedback: vi.fn().mockResolvedValue({}),
        getFeedbacks: vi.fn().mockResolvedValue({ feedbacks: [], total: 0 }),
        getFeedback: vi.fn(),
        updateFeedback: vi.fn(),
        deleteFeedback: vi.fn(),
        deleteAllFeedbacks: vi.fn(),
      };
      const instance = launch({
        store: fakeStore as unknown as SitepingConfig["store"],
        projectName: "test",
        forceShow: true,
      });

      // Widget should be mounted (no endpoint required)
      const widget = document.querySelector("siteping-widget");
      expect(widget).not.toBeNull();
      // store.getFeedbacks should be called for initial markers load
      expect(fakeStore.getFeedbacks).toHaveBeenCalled();
      // The "if (config.endpoint)" branch (line 251) should NOT call flushRetryQueue
      // (we can't directly check that from this side without exposing the mock)

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // flushRetryQueue rejection (line 254)
  // -------------------------------------------------------------------------

  describe("flushRetryQueue rejection", () => {
    it("does not throw when flushRetryQueue rejects on initial load", async () => {
      flushRetryQueueMock.mockRejectedValueOnce(new Error("Network failure"));

      const instance = launch(defaultConfig());
      // Wait for the .catch(() => {}) handler to run on the rejection
      await new Promise((r) => setTimeout(r, 50));

      // Widget should still mount even if flushRetryQueue rejects
      const widget = document.querySelector("siteping-widget");
      expect(widget).not.toBeNull();

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // feedback:deleted bridge (line 113 — anonymous_7)
  // -------------------------------------------------------------------------

  describe("feedback:deleted public bridge", () => {
    it("emits feedback:deleted on the public bus when internal bus emits it", () => {
      const instance = launch(defaultConfig());
      const listener = vi.fn();
      instance.on("feedback:deleted", listener);

      expect(annotatorCapture.bus).not.toBeNull();
      annotatorCapture.bus!.emit("feedback:deleted", "feedback-id-123");

      expect(listener).toHaveBeenCalledWith("feedback-id-123");

      instance.destroy();
    });
  });

  // -------------------------------------------------------------------------
  // adoptedStyleSheets branch (modern browsers)
  // -------------------------------------------------------------------------

  describe("style injection", () => {
    it("uses adoptedStyleSheets when supported", () => {
      // jsdom does not support adoptedStyleSheets — temporarily polyfill
      const proto = ShadowRoot.prototype as unknown as { adoptedStyleSheets?: CSSStyleSheet[] };
      const hadProp = Object.hasOwn(proto, "adoptedStyleSheets");

      // Provide a writable adoptedStyleSheets so the "in ShadowRoot.prototype" check passes
      Object.defineProperty(ShadowRoot.prototype, "adoptedStyleSheets", {
        value: [],
        writable: true,
        configurable: true,
      });

      // Polyfill CSSStyleSheet — jsdom's may not allow construction with replaceSync
      const origCSSStyleSheet = (globalThis as unknown as { CSSStyleSheet?: typeof CSSStyleSheet }).CSSStyleSheet;
      class FakeCSSStyleSheet {
        replaceSync = vi.fn();
      }
      (globalThis as unknown as { CSSStyleSheet: typeof CSSStyleSheet }).CSSStyleSheet =
        FakeCSSStyleSheet as unknown as typeof CSSStyleSheet;

      try {
        const instance = launch(defaultConfig());

        const widget = document.querySelector("siteping-widget")!;
        expect(widget).not.toBeNull();
        // Shadow root should have been mutated with the constructed sheet
        const shadow = widget.shadowRoot as ShadowRoot & { adoptedStyleSheets: CSSStyleSheet[] };
        expect(shadow.adoptedStyleSheets.length).toBe(1);

        instance.destroy();
      } finally {
        if (origCSSStyleSheet) {
          (globalThis as unknown as { CSSStyleSheet: typeof CSSStyleSheet }).CSSStyleSheet = origCSSStyleSheet;
        } else {
          delete (globalThis as unknown as { CSSStyleSheet?: typeof CSSStyleSheet }).CSSStyleSheet;
        }
        if (hadProp) {
          Object.defineProperty(ShadowRoot.prototype, "adoptedStyleSheets", {
            value: [],
            writable: true,
            configurable: true,
          });
        } else {
          delete (proto as { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets;
        }
      }
    });
  });
});
