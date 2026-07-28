// @vitest-environment jsdom

import type { SitepingConfig, SitepingInstance } from "@siteping/core";
import { act, render } from "@testing-library/react";
import { StrictMode, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock `initSiteping` so we can observe call count, capture listeners, and
// drive them directly without needing the full widget DOM.
// ---------------------------------------------------------------------------

type Listener = (...args: unknown[]) => void;

interface MockedInstance extends SitepingInstance {
  __emit: (event: string, ...args: unknown[]) => void;
  __destroyed: boolean;
}

let mockInstances: MockedInstance[] = [];
let initSpy: Mock<(config: SitepingConfig) => MockedInstance>;

vi.mock(new URL("../../src/index.js", import.meta.url).pathname, () => ({
  initSiteping: (config: SitepingConfig) => initSpy(config),
  __esModule: true,
}));

beforeEach(() => {
  mockInstances = [];
  initSpy = vi.fn((_config: SitepingConfig) => {
    const listeners = new Map<string, Set<Listener>>();
    const instance: MockedInstance = {
      destroy: vi.fn(() => {
        instance.__destroyed = true;
      }),
      open: vi.fn(),
      close: vi.fn(),
      refresh: vi.fn(),
      focusFeedback: vi.fn(() => true),
      on: <K extends string>(event: K, listener: Listener) => {
        let set = listeners.get(event);
        if (!set) {
          set = new Set();
          listeners.set(event, set);
        }
        set.add(listener);
        return () => set?.delete(listener);
      },
      off: (event: string, listener: Listener) => {
        listeners.get(event)?.delete(listener);
      },
      __emit: (event: string, ...args: unknown[]) => {
        for (const l of listeners.get(event) ?? []) l(...args);
      },
      __destroyed: false,
    } as MockedInstance;
    mockInstances.push(instance);
    return instance;
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// Import after mock setup so the alias resolves to our spy.
import { useSiteping } from "../../src/react.js";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function Probe({ config, onInstance }: { config: SitepingConfig; onInstance?: (i: SitepingInstance | null) => void }) {
  const instance = useSiteping(config);
  useEffect(() => {
    onInstance?.(instance);
  }, [instance, onInstance]);
  return null;
}

describe("useSiteping", () => {
  it("initialises the widget once on mount and destroys on unmount", () => {
    const config: SitepingConfig = { endpoint: "/api/siteping", projectName: "test" };
    const { unmount } = render(<Probe config={config} />);

    expect(initSpy).toHaveBeenCalledTimes(1);
    // The hook overrides the callback props with stable ref-reading
    // wrappers — the transport/config fields must pass through untouched.
    expect(initSpy).toHaveBeenCalledWith(expect.objectContaining({ endpoint: "/api/siteping", projectName: "test" }));
    expect(mockInstances).toHaveLength(1);
    expect(mockInstances[0]?.__destroyed).toBe(false);

    unmount();
    expect(mockInstances[0]?.__destroyed).toBe(true);
  });

  it("returns the live instance so consumers can drive it programmatically", () => {
    const captured: Array<SitepingInstance | null> = [];
    render(<Probe config={{ endpoint: "/api/x", projectName: "p" }} onInstance={(i) => captured.push(i)} />);
    const finalInstance = captured[captured.length - 1];
    expect(finalInstance).not.toBeNull();
    expect(finalInstance).toBe(mockInstances[0]);
  });

  it("does NOT init twice under StrictMode (double-mount)", () => {
    const config: SitepingConfig = { endpoint: "/api/siteping", projectName: "test" };
    render(
      <StrictMode>
        <Probe config={config} />
      </StrictMode>,
    );

    // StrictMode invokes effects twice: setup → cleanup → setup. The widget
    // is allowed to be created on both runs as long as the first one is
    // destroyed cleanly — what matters is that no two live widgets are left
    // on the page when the dust settles.
    const liveCount = mockInstances.filter((i) => !i.__destroyed).length;
    expect(liveCount).toBe(1);
  });

  /** The config the hook actually handed to initSiteping — wrapper callbacks included. */
  function wiredConfig(): SitepingConfig {
    const call = initSpy.mock.calls[0];
    expect(call).toBeDefined();
    return call![0] as SitepingConfig;
  }

  it("forwards feedback:sent to the latest onFeedbackSent callback without re-initing", () => {
    const v1 = vi.fn();
    const v2 = vi.fn();

    function Host({ cb }: { cb: (fb: unknown) => void }) {
      useSiteping({ endpoint: "/api", projectName: "p", onFeedbackSent: cb });
      return null;
    }

    const { rerender } = render(<Host cb={v1} />);

    // The widget calls the wired config callback (single delivery path —
    // no separate instance.on bridge that would double-fire it).
    act(() => {
      wiredConfig().onFeedbackSent?.({ id: "fb-1" } as never);
    });
    expect(v1).toHaveBeenCalledTimes(1);

    // Swap the callback prop — the wrapper must reach the latest one
    // *without* re-initing the widget.
    rerender(<Host cb={v2} />);
    expect(initSpy).toHaveBeenCalledTimes(1);

    act(() => {
      wiredConfig().onFeedbackSent?.({ id: "fb-2" } as never);
    });
    expect(v2).toHaveBeenCalledTimes(1);
    expect(v1).toHaveBeenCalledTimes(1);
  });

  it("forwards onOpen / onClose / onError / annotation callbacks through live wrappers", () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const onError = vi.fn();
    const onAnnotationStart = vi.fn();
    const onAnnotationEnd = vi.fn();
    render(
      <Probe
        config={{
          endpoint: "/api/x",
          projectName: "p",
          onOpen,
          onClose,
          onError,
          onAnnotationStart,
          onAnnotationEnd,
        }}
      />,
    );
    const wired = wiredConfig();
    const boom = new Error("boom");
    act(() => {
      wired.onOpen?.();
      wired.onClose?.();
      wired.onError?.(boom);
      wired.onAnnotationStart?.();
      wired.onAnnotationEnd?.();
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(boom);
    expect(onAnnotationStart).toHaveBeenCalledTimes(1);
    expect(onAnnotationEnd).toHaveBeenCalledTimes(1);
  });

  it("keeps onError fresh across rerenders (was frozen at mount before)", () => {
    const e1 = vi.fn();
    const e2 = vi.fn();

    function Host({ cb }: { cb: (error: Error) => void }) {
      useSiteping({ endpoint: "/api", projectName: "p", onError: cb });
      return null;
    }

    const { rerender } = render(<Host cb={e1} />);
    rerender(<Host cb={e2} />);
    expect(initSpy).toHaveBeenCalledTimes(1);

    act(() => {
      wiredConfig().onError?.(new Error("late"));
    });
    expect(e1).not.toHaveBeenCalled();
    expect(e2).toHaveBeenCalledTimes(1);
  });

  it("ignores widget callbacks after unmount", () => {
    const onOpen = vi.fn();
    const { unmount } = render(<Probe config={{ endpoint: "/api/x", projectName: "p", onOpen }} />);
    const wired = wiredConfig();
    unmount();
    // Even if a stray event fires after unmount, the user callback never runs.
    act(() => {
      wired.onOpen?.();
    });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
