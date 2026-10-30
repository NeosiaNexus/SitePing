import { describe, expect, it } from "vitest";
import { INBOX_CSS } from "../../src/styles.js";

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

/** `color-mix(in srgb, <base> <percent>%, <other>)`, both colors as 6-digit hex. */
function mixSrgb(base: string, percent: number, other: string): string {
  const channels = [1, 3, 5].map((i) => {
    const a = Number.parseInt(base.slice(i, i + 2), 16);
    const b = Number.parseInt(other.slice(i, i + 2), 16);
    return Math.round((a * percent + b * (100 - percent)) / 100)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${channels.join("")}`;
}

/** The `color-mix` a rule's hover background declares over one of the inbox variables. */
function hoverMix(selector: string): { variable: string; percent: number; other: string } {
  const escaped = selector.replace(/[.:]/g, (c) => `\\${c}`);
  const rule = new RegExp(
    `${escaped}:hover\\s*\\{\\s*background:\\s*color-mix\\(in srgb, var\\((--[\\w-]+)\\) (\\d+)%, (#[0-9a-f]{6})\\)`,
  );
  const match = rule.exec(INBOX_CSS);
  if (!match) throw new Error(`no color-mix hover background for ${selector}`);
  return { variable: match[1] as string, percent: Number(match[2]), other: match[3] as string };
}

function declaredHex(variable: string): string {
  const match = new RegExp(`${variable}:\\s*(#[0-9a-f]{6})`).exec(INBOX_CSS);
  if (!match) throw new Error(`no hex value for ${variable}`);
  return match[1] as string;
}

describe("filled button hovers (#388)", () => {
  // White labels on filled buttons: a hover may never cost contrast, with the
  // default colors or with any accent a host sets inline.
  it.each([".spd-btn-primary", ".spd-btn-danger"])("%s keeps its white label at AA on hover", (selector) => {
    const { variable, percent, other } = hoverMix(selector);
    const resting = declaredHex(variable);
    const hover = mixSrgb(resting, percent, other);
    expect(contrast("#ffffff", hover)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", hover)).toBeGreaterThanOrEqual(contrast("#ffffff", resting));
  });

  it.each(["#0066ff", "#7c3aed", "#059669", "#e11d48", "#f59e0b", "#111827"])(
    "the primary hover never lowers the label's contrast with --spd-accent %s",
    (accent) => {
      const { percent, other } = hoverMix(".spd-btn-primary");
      expect(contrast("#ffffff", mixSrgb(accent, percent, other))).toBeGreaterThanOrEqual(contrast("#ffffff", accent));
    },
  );
});
