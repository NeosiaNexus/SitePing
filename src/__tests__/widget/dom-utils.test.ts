import { describe, expect, it } from "vitest";
import { formatRelativeDate } from "../../widget/dom-utils.js";

describe("formatRelativeDate", () => {
  it("returns 'maintenant' for just now", () => {
    expect(formatRelativeDate(new Date().toISOString())).toBe("maintenant");
  });

  it("returns minutes for < 60min", () => {
    const d = new Date(Date.now() - 15 * 60_000).toISOString();
    expect(formatRelativeDate(d)).toBe("il y a 15min");
  });

  it("returns hours for < 24h", () => {
    const d = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(formatRelativeDate(d)).toBe("il y a 3h");
  });

  it("returns days for < 7d", () => {
    const d = new Date(Date.now() - 2 * 86400_000).toISOString();
    expect(formatRelativeDate(d)).toBe("il y a 2j");
  });

  it("returns formatted date for > 7d", () => {
    const d = new Date(Date.now() - 30 * 86400_000).toISOString();
    const result = formatRelativeDate(d);
    // Should contain a / separator (FR locale format dd/mm/yyyy)
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
