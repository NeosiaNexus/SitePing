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

  it("keeps a stored identity with an internationalised email", () => {
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      '{"name":"François","email":"françois@exemple.fr"}',
    );
    expect(getIdentity()).toEqual({ name: "François", email: "françois@exemple.fr" });
  });

  it("treats a stored identity whose email the server would reject as absent", () => {
    // Persisted by an older, laxer modal — the server answers 400 to every
    // submission, so the modal must ask again instead of replaying it forever.
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue('{"name":"Alice","email":"alice@exa_mple.com"}');
    expect(getIdentity()).toBeNull();
  });

  it("treats a stored identity longer than the server's 200-char cap as absent", () => {
    // adapter-prisma rejects authorName / authorEmail > 200 chars — replaying
    // such an identity would 400 every submission.
    const longEmail = `${"a".repeat(64)}@${"b".repeat(60)}.${"c".repeat(60)}.${"d".repeat(60)}.com`;
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({ name: "N".repeat(201), email: "alice@example.com" }),
    );
    expect(getIdentity()).toBeNull();
    (localStorage.getItem as ReturnType<typeof vi.fn>).mockReturnValue(
      JSON.stringify({ name: "Alice", email: longEmail }),
    );
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
