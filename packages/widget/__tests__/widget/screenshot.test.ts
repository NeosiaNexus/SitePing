// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetScreenshotCacheForTests, captureScreenshot } from "../../src/screenshot.js";

describe("captureScreenshot — graceful degrade when html2canvas is missing", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    _resetScreenshotCacheForTests();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("returns null when html2canvas is not installed", async () => {
    // The dynamic import of "html2canvas" fails in this test environment
    // because the peer dep is not installed — the function must catch and
    // return null rather than throwing or breaking feedback submission.
    const result = await captureScreenshot(new DOMRect(0, 0, 100, 100));
    expect(result).toBeNull();
  });

  it("warns at most once across multiple capture attempts", async () => {
    await captureScreenshot(new DOMRect(0, 0, 100, 100));
    await captureScreenshot(new DOMRect(0, 0, 100, 100));
    await captureScreenshot(new DOMRect(0, 0, 100, 100));

    const installWarnings = warnSpy.mock.calls.filter((c) => /html2canvas is not installed/.test(String(c[0])));
    expect(installWarnings.length).toBe(1);
  });

  it("caches the missing-module result so subsequent calls are cheap", async () => {
    // First call hits the failing import; second call uses cached null.
    await captureScreenshot(new DOMRect(0, 0, 100, 100));
    const result = await captureScreenshot(new DOMRect(0, 0, 100, 100));
    expect(result).toBeNull();
  });
});
