import { beforeEach, describe, expect, it, vi } from "vitest";
import { getIdentity, saveIdentity } from "../../src/identity.js";

describe("identity", () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => store[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete store[key];
      }),
    });
  });

  it("returns null when no identity stored", () => {
    expect(getIdentity()).toBeNull();
  });

  it("saves and retrieves identity", () => {
    saveIdentity({ name: "Alice", email: "alice@test.com" });
    const identity = getIdentity();
    expect(identity).toEqual({ name: "Alice", email: "alice@test.com" });
  });

  it("returns null for corrupted JSON", () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue("not json");
    expect(getIdentity()).toBeNull();
  });

  it("returns null for partial identity (missing email)", () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('{"name":"Alice"}');
    expect(getIdentity()).toBeNull();
  });

  it("handles localStorage quota error gracefully", () => {
    (localStorage.setItem as ReturnType<typeof vi.fn>).mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    // Should not throw
    expect(() => saveIdentity({ name: "Alice", email: "a@b.com" })).not.toThrow();
  });
});
