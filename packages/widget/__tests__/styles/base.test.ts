import { describe, expect, it } from "vitest";
import { buildStyles } from "../../src/styles/base.js";
import { buildThemeColors } from "../../src/styles/theme.js";

describe("buildStyles", () => {
  // Regression for #157: interactive states (`.sp-input:focus`, `.sp-search:focus`,
  // `.sp-card:hover`) hardcoded `background: #fff` while the text color stayed
  // `var(--sp-text)`. In the dark palette that token is near-white (#f1f5f9), so a
  // focused/hovered surface became white-on-white and unreadable while typing.
  it("never hardcodes a white background — interactive surfaces stay theme-aware", () => {
    for (const theme of ["light", "dark"] as const) {
      const css = buildStyles(buildThemeColors("#0066ff", theme));
      // `#fff` (background) is forbidden; `#ffffff` (the light `--sp-bg` token value)
      // and `color: #fff` (white text on accent surfaces) remain legitimate.
      expect(css).not.toMatch(/background:\s*#fff\b/i);
    }
  });

  it("makes focus/hover surfaces follow the resolved theme via var(--sp-bg)", () => {
    const dark = buildStyles(buildThemeColors("#0066ff", "dark"));
    for (const block of [".sp-input:focus", ".sp-search:focus", ".sp-card:hover"]) {
      const rule = dark.slice(dark.indexOf(block), dark.indexOf("}", dark.indexOf(block)));
      expect(rule, `${block} should set a theme-aware background`).toContain("background: var(--sp-bg)");
    }
  });

  it("declares a theme-aware color-scheme on the host so native sub-controls match", () => {
    expect(buildStyles(buildThemeColors("#0066ff", "dark"))).toContain("color-scheme: dark");
    expect(buildStyles(buildThemeColors("#0066ff", "light"))).toContain("color-scheme: light");
  });

  // The phone layer overrides desktop rules of equal specificity, so it only
  // works while it comes last — e.g. the sheet's translateY must beat the
  // drawer's translateX from the animation layer.
  it("appends the phone layer after the desktop rules it overrides", () => {
    const css = buildStyles(buildThemeColors());
    expect(css.lastIndexOf("transform: translateY(105%)")).toBeGreaterThan(
      css.lastIndexOf("transform: translateX(110%)"),
    );
    expect(css.indexOf("@media (max-width: 640px)")).toBeGreaterThan(css.lastIndexOf(".sp-detail-btn-goto"));
  });

  it("dims the page behind phone sheets with a theme-aware scrim", () => {
    expect(buildStyles(buildThemeColors("#0066ff", "light"))).toContain("--sp-scrim: rgba(15, 23, 42, 0.32)");
    expect(buildStyles(buildThemeColors("#0066ff", "dark"))).toContain("--sp-scrim: rgba(0, 0, 0, 0.5)");
  });
});
