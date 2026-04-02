import { describe, expect, it, vi } from "vitest";
import { EventBus } from "../../widget/events.js";

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
});
