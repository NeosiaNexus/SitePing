import { describe, expect, it } from "vitest";
import { buildStyles } from "../../src/styles/base.js";
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

/** `color` (`#rrggbb`, `#rrggbbaa` or `rgba(r, g, b, a)`) composited over the opaque `base`. */
function over(color: string, base: string): string {
  const rgba = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(color);
  const [r, g, b, a] = rgba
    ? [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), Number(rgba[4])]
    : [1, 3, 5, 7].map((i, n) => {
        const part = color.slice(i, i + 2);
        return n < 3 ? Number.parseInt(part, 16) : part ? Number.parseInt(part, 16) / 255 : 1;
      });
  const mix = (value: number, i: number) =>
    Math.round(value * a! + Number.parseInt(base.slice(i, i + 2), 16) * (1 - a!))
      .toString(16)
      .padStart(2, "0");
  return `#${mix(r!, 1)}${mix(g!, 3)}${mix(b!, 5)}`;
}

describe("badge text on its tint (axe color-contrast)", () => {
  // A type or status badge draws its color on its own tint, on a card at rest
  // (`bg`) or hovered (`bgHover`): small text, so 4.5:1 on both.
  it.each(["light", "dark"] as const)("reaches 4.5:1 for every type and status in the %s theme", (theme) => {
    const c = buildThemeColors(undefined, theme);
    const pairs: Array<[string, string, string]> = [
      ["question", c.typeQuestion, c.typeQuestionBg],
      ["change", c.typeChange, c.typeChangeBg],
      ["bug", c.typeBug, c.typeBugBg],
      ["other", c.typeOther, c.typeOtherBg],
      ["open", c.statusOpen, c.statusOpenBg],
      ["in_progress", c.statusInProgress, c.statusInProgressBg],
      ["resolved", c.statusResolved, c.statusResolvedBg],
      ["wont_fix", c.statusWontFix, c.statusWontFixBg],
    ];
    for (const [name, text, tint] of pairs) {
      for (const ground of [c.bg, c.bgHover]) {
        expect(contrast(text, over(tint, ground)), `${name} on ${ground}`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});

describe("resolve and delete hover text", () => {
  // Hover is outside what axe computes; base.ts draws the hovered Resolve and
  // Delete text in statusOpen and typeBug on a 6% green / red tint.
  it("is drawn in the theme's tokens, not a fixed green and red", () => {
    const css = buildStyles(buildThemeColors());
    expect(css).toMatch(/\.sp-btn-resolve:hover\s*\{[^}]*[{;\s]color:\s*var\(--sp-status-open\)/);
    expect(css).toMatch(/\.sp-btn-delete:hover\s*\{[^}]*[{;\s]color:\s*var\(--sp-type-bug\)/);
  });

  it.each(["light", "dark"] as const)("reaches 4.5:1 on its tint in the %s theme", (theme) => {
    const c = buildThemeColors(undefined, theme);
    for (const ground of [c.bg, c.bgHover]) {
      expect(contrast(c.statusOpen, over("rgba(34, 197, 94, 0.06)", ground))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.typeBug, over("rgba(239, 68, 68, 0.06)", ground))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("accentText (axe color-contrast)", () => {
  // The accent is the host's to pick; text drawn in it — the active filter,
  // the selected sort — sits on the accent's own tint and must read at 4.5:1.
  const accents = ["#0066ff", "#22c55e", "#facc15", "#ec4899", "#7c3aed", "#000000", "#ffffff", "#808080"];
  it.each(["light", "dark"] as const)("reads at 4.5:1 on accentLight for any accent in the %s theme", (theme) => {
    for (const accent of accents) {
      const c = buildThemeColors(accent, theme);
      for (const ground of [c.bg, c.bgHover]) {
        expect(contrast(c.accentText, over(c.accentLight, ground)), `${accent} on ${ground}`).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });

  it("keeps an accent that already reads, untouched", () => {
    expect(buildThemeColors("#1d4ed8", "light").accentText).toBe("#1d4ed8");
  });
});

describe("dark glass over a light page (axe color-contrast)", () => {
  // The panel and the popup are translucent: on a white page, the worst case
  // for a dark surface, the tertiary text must still read at 4.5:1.
  it("leaves secondary and tertiary text at 4.5:1 on glassBg and glassBgHeavy", () => {
    const c = buildThemeColors(undefined, "dark");
    const panel = over(c.glassBg, "#ffffff");
    for (const ground of [panel, over(c.glassBgHeavy, "#ffffff"), over(c.glassBgHeavy, panel)]) {
      expect(contrast(c.textTertiary, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.textSecondary, ground)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

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
