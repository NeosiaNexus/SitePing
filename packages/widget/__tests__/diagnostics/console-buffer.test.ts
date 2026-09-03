// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsoleBuffer } from "../../src/diagnostics/console-buffer.js";

describe("ConsoleBuffer", () => {
  // Capture the pristine console methods so we can re-install them between
  // tests in case a leak occurs — tests should never affect each other via
  // the global console.
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let infoSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Swallow console output so test logs aren't polluted with the entries
    // the test itself is producing. The buffer still records pre-spy state
    // because the buffer wraps `console.*` before we spy.
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    // Guard against a forgotten dispose() in some test.
    console.log = originalLog;
    console.info = originalInfo;
    console.warn = originalWarn;
    console.error = originalError;
  });

  it("captures the most recent log/info/warn/error calls", () => {
    const buffer = new ConsoleBuffer();
    console.log("hello", 42);
    console.info("info-line");
    console.warn("warn-line");
    console.error(new Error("oops"));

    const entries = buffer.getEntries();
    expect(entries).toHaveLength(4);
    expect(entries[0]?.level).toBe("log");
    expect(entries[0]?.message).toContain("hello");
    expect(entries[0]?.message).toContain("42");
    expect(entries[3]?.level).toBe("error");
    expect(entries[3]?.message).toContain("oops");
    buffer.dispose();
  });

  it("ring-buffer wraps at maxEntries", () => {
    const buffer = new ConsoleBuffer(5);
    for (let i = 0; i < 12; i++) {
      console.log(`msg-${i}`);
    }
    const entries = buffer.getEntries();
    expect(entries).toHaveLength(5);
    // The oldest five should be evicted — first remaining entry is the 8th log.
    expect(entries[0]?.message).toContain("msg-7");
    expect(entries[4]?.message).toContain("msg-11");
    buffer.dispose();
  });

  it("dispose restores the original console methods", () => {
    const before = console.log;
    const buffer = new ConsoleBuffer();
    expect(console.log).not.toBe(before);
    buffer.dispose();
    // After dispose we should be back to whatever `console.log` was before.
    expect(console.log).toBe(before);
    // Calling dispose() a second time is a no-op.
    buffer.dispose();
    expect(console.log).toBe(before);
  });

  it("serialises non-string args without throwing on circular references", () => {
    const buffer = new ConsoleBuffer();
    const circular: Record<string, unknown> = { name: "root" };
    circular.self = circular;
    console.log({ kind: "ok" }, circular, () => 1, Symbol("x"));
    const entry = buffer.getEntries()[0];
    expect(entry).toBeDefined();
    expect(entry?.message).toContain("[Circular]");
    expect(entry?.message).toContain("[Function]");
    buffer.dispose();
  });

  it("truncates very long messages to roughly 500 chars", () => {
    const buffer = new ConsoleBuffer();
    console.log("x".repeat(2000));
    const entry = buffer.getEntries()[0];
    expect(entry).toBeDefined();
    expect(entry?.message.length).toBeLessThanOrEqual(500);
    expect(entry?.message.endsWith("…")).toBe(true);
    buffer.dispose();
  });

  it("does not break when an Error is logged", () => {
    const buffer = new ConsoleBuffer();
    const err = new TypeError("kaboom");
    console.error(err);
    const entry = buffer.getEntries()[0];
    expect(entry).toBeDefined();
    expect(entry?.message).toContain("TypeError");
    expect(entry?.message).toContain("kaboom");
    buffer.dispose();
  });

  it("forwards calls to the original console (does not swallow output)", () => {
    // The setup spy on console.log replaces the *current* console.log
    // (which is the original at that point). When the buffer wraps, the
    // wrapper closes over the spy and still forwards into it.
    const buffer = new ConsoleBuffer();
    console.log("hello-pass-through");
    expect(logSpy).toHaveBeenCalledWith("hello-pass-through");
    buffer.dispose();
  });
});

describe("ConsoleBuffer — dispose() vs wrappers installed on top", () => {
  const originalError = console.error;
  const originalWarn = console.warn;

  afterEach(() => {
    console.error = originalError;
    console.warn = originalWarn;
  });

  it("leaves a console.error wrapper installed on top of the widget's in place, restores the rest", () => {
    const buffer = new ConsoleBuffer();
    const widgetError = console.error;
    const widgetWarn = console.warn;
    expect(widgetWarn).not.toBe(originalWarn);

    // A third-party SDK wraps console.error AFTER the widget.
    const thirdParty = (...args: unknown[]) => widgetError(...args);
    console.error = thirdParty;

    buffer.dispose();

    expect(console.error).toBe(thirdParty);
    expect(console.warn).toBe(originalWarn);
  });
});
