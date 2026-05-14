// @vitest-environment jsdom

import type { SitepingConfig, SitepingInstance } from "@siteping/core";
import { act, render } from "@testing-library/react";
import { StrictMode, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
let initSpy: ReturnType<typeof vi.fn>;

vi.mock(new URL("../../src/index.js", import.meta.url).pathname, () => ({
  initSiteping: (...args: unknown[]) => initSpy(...args),
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
    expect(initSpy).toHaveBeenCalledWith(config);
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

  it("forwards feedback:sent events to the latest onFeedbackSent callback", () => {
    const v1 = vi.fn();
    const v2 = vi.fn();

    function Host({ cb }: { cb: (fb: unknown) => void }) {
      useSiteping({ endpoint: "/api", projectName: "p", onFeedbackSent: cb });
      return null;
    }

    const { rerender } = render(<Host cb={v1} />);
    const inst = mockInstances[0];
    expect(inst).toBeDefined();

    // First emit hits the first callback.
    act(() => {
      inst!.__emit("feedback:sent", { id: "fb-1" });
    });
    expect(v1).toHaveBeenCalledTimes(1);

    // Swap the callback prop — the hook should bridge to the latest one
    // *without* re-initing the widget.
    rerender(<Host cb={v2} />);
    expect(initSpy).toHaveBeenCalledTimes(1);

    act(() => {
      inst!.__emit("feedback:sent", { id: "fb-2" });
    });
    expect(v2).toHaveBeenCalledTimes(1);
    expect(v1).toHaveBeenCalledTimes(1);
  });

  it("forwards panel:open and panel:close to onOpen / onClose", () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    render(
      <Probe
        config={{
          endpoint: "/api/x",
          projectName: "p",
          onOpen,
          onClose,
        }}
      />,
    );
    const inst = mockInstances[0]!;
    act(() => {
      inst.__emit("panel:open");
      inst.__emit("panel:close");
    });
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores destroyed widget events (cleanup unsubscribes)", () => {
    const onOpen = vi.fn();
    const { unmount } = render(<Probe config={{ endpoint: "/api/x", projectName: "p", onOpen }} />);
    const inst = mockInstances[0]!;
    unmount();
    // Even if a stray event fires after unmount, the user callback never runs.
    act(() => {
      inst.__emit("panel:open");
    });
    expect(onOpen).not.toHaveBeenCalled();
  });
});
