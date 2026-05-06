import { describe, expect, it, vi } from "vitest";
import { EventBus } from "../../src/events.js";

interface TestEvents extends Record<string, unknown[]> {
  ping: [];
  data: [string, number];
  error: [Error];
}

describe("EventBus", () => {
  it("emits events to listeners", () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();

    bus.on("ping", fn);
    bus.emit("ping");

    expect(fn).toHaveBeenCalledOnce();
  });

  it("passes arguments to listeners", () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();

    bus.on("data", fn);
    bus.emit("data", "hello", 42);

    expect(fn).toHaveBeenCalledWith("hello", 42);
  });

  it("supports multiple listeners for the same event", () => {
    const bus = new EventBus<TestEvents>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    bus.on("ping", fn1);
    bus.on("ping", fn2);
    bus.emit("ping");

    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it("returns an unsubscribe function", () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();

    const unsub = bus.on("ping", fn);
    unsub();
    bus.emit("ping");

    expect(fn).not.toHaveBeenCalled();
  });

  it("does not affect other listeners when unsubscribing", () => {
    const bus = new EventBus<TestEvents>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    const unsub1 = bus.on("ping", fn1);
    bus.on("ping", fn2);
    unsub1();
    bus.emit("ping");

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it("removeAll clears all listeners", () => {
    const bus = new EventBus<TestEvents>();
    const fn1 = vi.fn();
    const fn2 = vi.fn();

    bus.on("ping", fn1);
    bus.on("data", fn2);
    bus.removeAll();
    bus.emit("ping");
    bus.emit("data", "x", 1);

    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it("handles emit with no listeners gracefully", () => {
    const bus = new EventBus<TestEvents>();
    expect(() => bus.emit("ping")).not.toThrow();
  });

  it("double unsubscribe does not throw", () => {
    const bus = new EventBus<TestEvents>();
    const fn = vi.fn();

    const unsub = bus.on("ping", fn);
    unsub();
    expect(() => unsub()).not.toThrow();
  });

  describe("off", () => {
    it("removes a registered listener", () => {
      const bus = new EventBus<TestEvents>();
      const fn = vi.fn();

      bus.on("ping", fn);
      bus.off("ping", fn);
      bus.emit("ping");

      expect(fn).not.toHaveBeenCalled();
    });

    it("does nothing for events without listeners", () => {
      const bus = new EventBus<TestEvents>();
      const fn = vi.fn();

      // off() on event that has never been registered should be a no-op
      expect(() => bus.off("ping", fn)).not.toThrow();
    });

    it("only removes the matching listener — others are kept", () => {
      const bus = new EventBus<TestEvents>();
      const fn1 = vi.fn();
      const fn2 = vi.fn();

      bus.on("ping", fn1);
      bus.on("ping", fn2);
      bus.off("ping", fn1);
      bus.emit("ping");

      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).toHaveBeenCalledOnce();
    });
  });

  describe("emit error isolation", () => {
    it("isolates listener errors and continues invoking others", () => {
      const bus = new EventBus<TestEvents>();
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const failing = vi.fn(() => {
        throw new Error("boom");
      });
      const surviving = vi.fn();

      bus.on("ping", failing);
      bus.on("ping", surviving);
      bus.emit("ping");

      expect(failing).toHaveBeenCalledOnce();
      expect(surviving).toHaveBeenCalledOnce();
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event listener for "ping"'),
        expect.any(Error),
      );

      errorSpy.mockRestore();
    });
  });
});
