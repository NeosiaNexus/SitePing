import { describe, expect, it } from "vitest";
import { buildThemeColors, getTypeColor } from "../../src/styles/theme.js";

describe("buildThemeColors", () => {
  it("uses default accent when none provided", () => {
    const colors = buildThemeColors();
    expect(colors.accent).toBe("#0066ff");
  });

  it("normalizes 6-digit hex", () => {
    const colors = buildThemeColors("#ff5500");
    expect(colors.accent).toBe("#ff5500");
    expect(colors.accentLight).toBe("#ff550014");
  });

  it("expands 3-digit shorthand hex", () => {
    const colors = buildThemeColors("#f50");
    expect(colors.accent).toBe("#ff5500");
  });

  it("strips alpha from 8-digit hex", () => {
    const colors = buildThemeColors("#ff5500cc");
    expect(colors.accent).toBe("#ff5500");
  });

  it("falls back to default for rgb() format", () => {
    const colors = buildThemeColors("rgb(255,85,0)");
    expect(colors.accent).toBe("#0066ff");
  });

  it("falls back to default for invalid string", () => {
    const colors = buildThemeColors("not-a-color");
    expect(colors.accent).toBe("#0066ff");
  });

  it("falls back to default for empty string", () => {
    const colors = buildThemeColors("");
    expect(colors.accent).toBe("#0066ff");
  });
});

describe("getTypeColor", () => {
  const colors = buildThemeColors();

  it("returns blue for question", () => {
    expect(getTypeColor("question", colors)).toBe(colors.typeQuestion);
  });

  it("returns orange for change", () => {
    expect(getTypeColor("change", colors)).toBe(colors.typeChange);
  });

  it("returns red for bug", () => {
    expect(getTypeColor("bug", colors)).toBe(colors.typeBug);
  });

  it("returns gray for other and unknown", () => {
    expect(getTypeColor("other", colors)).toBe(colors.typeOther);
    expect(getTypeColor("unknown", colors)).toBe(colors.typeOther);
  });
});

// WCAG 2.1 relative luminance and contrast ratio, from 6-digit hex.
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe("text colors (#388)", () => {
  // Every text token sits on `bg` or `bgHover` in small type, so AA asks 4.5:1 on both.
  it.each(["light", "dark"] as const)("reach 4.5:1 on bg and bgHover in the %s theme", (theme) => {
    const colors = buildThemeColors(undefined, theme);
    for (const text of [colors.text, colors.textSecondary, colors.textTertiary]) {
      expect(contrast(text, colors.bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(text, colors.bgHover)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
