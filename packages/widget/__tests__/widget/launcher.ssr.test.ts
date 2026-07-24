// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { initSiteping } from "../../src/index.js";

// SSR guard (#104) — Next.js/Remix hosts may run initSiteping() on the
// server, where `window` and `document` do not exist. The widget must
// return a no-op instance instead of throwing on DOM access.

describe("SSR guard (node environment, no window/document)", () => {
  it("returns a no-op instance and calls onSkip with 'ssr'", () => {
    const onSkip = vi.fn();
    const instance = initSiteping({ endpoint: "/api/siteping", projectName: "ssr-test", onSkip });

    expect(onSkip).toHaveBeenCalledWith("ssr");

    // Full no-op API surface — none of it may throw
    expect(instance.destroy).toBeTypeOf("function");
    expect(instance.open).toBeTypeOf("function");
    expect(instance.close).toBeTypeOf("function");
    expect(instance.refresh).toBeTypeOf("function");
    expect(instance.on).toBeTypeOf("function");
    expect(instance.off).toBeTypeOf("function");
    expect(() => {
      instance.open();
      instance.close();
      instance.refresh();
      const unsub = instance.on("panel:open", () => {});
      unsub();
      instance.off("panel:open", () => {});
      instance.destroy();
    }).not.toThrow();
    expect(instance.focusFeedback("any-id")).toBe(false);
  });

  it("forceShow does NOT bypass the SSR guard", () => {
    const onSkip = vi.fn();
    const instance = initSiteping({
      endpoint: "/api/siteping",
      projectName: "ssr-test",
      forceShow: true,
      onSkip,
    });

    expect(onSkip).toHaveBeenCalledWith("ssr");
    expect(() => instance.destroy()).not.toThrow();
  });
});
