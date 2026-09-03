// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkBuffer } from "../../src/diagnostics/network-buffer.js";

const originalFetch = globalThis.fetch;
const originalXhrOpen = XMLHttpRequest.prototype.open;
const originalXhrSend = XMLHttpRequest.prototype.send;

describe("NetworkBuffer — fetch", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("captures fetch responses with status >= 400", async () => {
    fetchSpy.mockResolvedValue(new Response("nope", { status: 500 }));
    const buffer = new NetworkBuffer();
    const res = await fetch("/api/broken", { method: "POST" });
    expect(res.status).toBe(500);
    const entries = buffer.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      url: "/api/broken",
      method: "POST",
      status: 500,
    });
    expect(typeof entries[0]?.durationMs).toBe("number");
    expect(entries[0]?.timestamp).toMatch(/T/);
    buffer.dispose();
  });

  it("skips fetch responses with status < 400", async () => {
    fetchSpy.mockResolvedValue(new Response("ok", { status: 200 }));
    const buffer = new NetworkBuffer();
    await fetch("/api/ok");
    expect(buffer.getEntries()).toHaveLength(0);
    buffer.dispose();
  });

  it("captures network errors (status = 0) and re-throws", async () => {
    fetchSpy.mockRejectedValue(new TypeError("Failed to fetch"));
    const buffer = new NetworkBuffer();
    await expect(fetch("/api/down")).rejects.toBeInstanceOf(TypeError);
    const entries = buffer.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe(0);
    expect(entries[0]?.url).toBe("/api/down");
    buffer.dispose();
  });

  it("ring-buffer wraps at the configured maxEntries", async () => {
    fetchSpy.mockResolvedValue(new Response("", { status: 500 }));
    const buffer = new NetworkBuffer(3);
    for (let i = 0; i < 5; i++) {
      await fetch(`/api/err-${i}`);
    }
    const entries = buffer.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0]?.url).toBe("/api/err-2");
    expect(entries[2]?.url).toBe("/api/err-4");
    buffer.dispose();
  });

  it("dispose restores the original fetch", () => {
    const buffer = new NetworkBuffer();
    expect(globalThis.fetch).not.toBe(fetchSpy);
    buffer.dispose();
    // After disposal we restore the *function we replaced*, which in this
    // test was `fetchSpy` set in beforeEach.
    expect(globalThis.fetch).toBe(fetchSpy);
  });

  it("extracts method from a Request input when init.method is undefined", async () => {
    fetchSpy.mockResolvedValue(new Response("", { status: 404 }));
    const buffer = new NetworkBuffer();
    // jsdom's Request constructor requires an absolute URL.
    const req = new Request("https://example.com/api/foo", { method: "DELETE" });
    await fetch(req);
    expect(buffer.getEntries()[0]?.method).toBe("DELETE");
    expect(buffer.getEntries()[0]?.url).toBe("https://example.com/api/foo");
    buffer.dispose();
  });
});

describe("NetworkBuffer — XHR", () => {
  afterEach(() => {
    XMLHttpRequest.prototype.open = originalXhrOpen;
    XMLHttpRequest.prototype.send = originalXhrSend;
  });

  it("captures XHR with status >= 400", async () => {
    const buffer = new NetworkBuffer();
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/xhr-bad");
    // jsdom XHR transitions via dispatchEvent — synthesise a failure end-state.
    // We do not actually issue a request; we simulate the loadend by manually
    // dispatching it after setting a status.
    xhr.send();
    // Patch readonly status property for the test.
    Object.defineProperty(xhr, "status", { value: 502, configurable: true });
    xhr.dispatchEvent(new Event("loadend"));

    const entries = buffer.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ method: "GET", url: "/xhr-bad", status: 502 });
    buffer.dispose();
  });

  it("skips XHR with successful status", () => {
    const buffer = new NetworkBuffer();
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/xhr-ok");
    xhr.send();
    Object.defineProperty(xhr, "status", { value: 200, configurable: true });
    xhr.dispatchEvent(new Event("loadend"));
    expect(buffer.getEntries()).toHaveLength(0);
    buffer.dispose();
  });

  it("captures XHR network errors (status === 0)", () => {
    const buffer = new NetworkBuffer();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/xhr-network-err");
    xhr.send();
    Object.defineProperty(xhr, "status", { value: 0, configurable: true });
    xhr.dispatchEvent(new Event("loadend"));
    const entries = buffer.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.status).toBe(0);
    expect(entries[0]?.method).toBe("POST");
    buffer.dispose();
  });
});

describe("NetworkBuffer — dispose() vs wrappers installed on top", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXhrOpen;
    XMLHttpRequest.prototype.send = originalXhrSend;
  });

  it("restores fetch when the widget's wrapper is still the one installed", () => {
    const base = vi.fn() as unknown as typeof fetch;
    globalThis.fetch = base;
    const buffer = new NetworkBuffer();
    expect(globalThis.fetch).not.toBe(base);
    buffer.dispose();
    expect(globalThis.fetch).toBe(base);
  });

  it("leaves a fetch wrapper installed on top of the widget's in place", () => {
    globalThis.fetch = vi.fn() as unknown as typeof fetch;
    const buffer = new NetworkBuffer();
    const widgetPatched = globalThis.fetch;

    // A third-party SDK (error tracker, RUM agent) wraps fetch AFTER the widget.
    const thirdParty: typeof fetch = (...args) => widgetPatched(...args);
    globalThis.fetch = thirdParty;

    buffer.dispose();

    // Same rule the launcher applies to history.pushState: only restore when
    // we are still the top of the chain — the other library keeps working.
    expect(globalThis.fetch).toBe(thirdParty);
  });

  it("leaves XHR wrappers installed on top of the widget's in place", () => {
    const buffer = new NetworkBuffer();
    const widgetOpen = XMLHttpRequest.prototype.open;
    const thirdPartyOpen = function (this: XMLHttpRequest, ...args: unknown[]) {
      return (widgetOpen as unknown as (...a: unknown[]) => void).apply(this, args);
    } as typeof XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = thirdPartyOpen;

    buffer.dispose();

    expect(XMLHttpRequest.prototype.open).toBe(thirdPartyOpen);
    // `send` was still ours, so it is restored.
    expect(XMLHttpRequest.prototype.send).toBe(originalXhrSend);
  });
});
