import { describe, expect, it, vi } from "vitest";
import { warnSafely } from "../src/logger.js";

describe("warnSafely", () => {
  it("hands the message and context to logger.warn", () => {
    const warn = vi.fn();

    warnSafely({ warn }, "screenshot dropped", { clientId: "c1" });

    expect(warn).toHaveBeenCalledExactlyOnceWith("screenshot dropped", { clientId: "c1" });
  });

  it("never lets a logger that throws reach its caller", () => {
    const warn = vi.fn(() => {
      throw new Error("logger down");
    });

    expect(() => warnSafely({ warn }, "m", {})).not.toThrow();
  });

  it("drops a rejection, which would otherwise go unhandled", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      warnSafely({ warn: () => Promise.reject(new Error("log shipper down")) }, "m", {});
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });
});
