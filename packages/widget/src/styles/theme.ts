/** Color palette and glassmorphism tokens derived from the accent color */
export interface ThemeColors {
  accent: string;
  accentLight: string;
  accentDark: string;
  accentGlow: string;
  accentGradient: string;
  /** Accent for text: reads at 4.5:1 on the accent's own tinted background (`accentLight`). */
  accentText: string;
  bg: string;
  bgHover: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  shadow: string;
  // Glass tokens
  glassBg: string;
  glassBgHeavy: string;
  glassBorder: string;
  glassBorderSubtle: string;
  // Feedback type colors
  typeQuestion: string;
  typeChange: string;
  typeBug: string;
  typeOther: string;
  // Soft type backgrounds (pastel)
  typeQuestionBg: string;
  typeChangeBg: string;
  typeBugBg: string;
  typeOtherBg: string;
  // Status filter colors
  statusOpen: string;
  statusOpenBg: string;
  statusResolved: string;
  statusResolvedBg: string;
  statusInProgress: string;
  statusInProgressBg: string;
  statusWontFix: string;
  statusWontFixBg: string;
}

const DEFAULT_ACCENT = "#0066ff";
const HEX6_RE = /^#[0-9a-fA-F]{6}$/;
const HEX3_RE = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
const HEX8_RE = /^#[0-9a-fA-F]{8}$/;

/**
 * Normalize an accent color to a 6-digit hex string.
 *
 * **Only hex formats are accepted:**
 * - `#RGB`      (3-digit shorthand, expanded to 6-digit)
 * - `#RRGGBB`   (standard 6-digit)
 * - `#RRGGBBAA` (8-digit with alpha, alpha is stripped)
 *
 * Any other CSS color format (named colors like `"red"`, `hsl()`, `rgb()`,
 * `oklch()`, etc.) is **not** supported and will fall back to the default
 * accent color with a console warning.
 */
function normalizeHex(raw: string): string {
  if (HEX6_RE.test(raw)) return raw;
  const short = HEX3_RE.test(raw) ? raw.match(HEX3_RE) : null;
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  if (HEX8_RE.test(raw)) return raw.slice(0, 7);

  console.warn(
    `[siteping] Invalid accentColor "${raw}" — only hex colors (#RGB, #RRGGBB, #RRGGBBAA) are supported. Using default.`,
  );
  return DEFAULT_ACCENT;
}

/** `hex` mixed toward `toward` by `amount` (0-1), both 6-digit hex. */
function mixHex(hex: string, toward: string, amount: number): string {
  let out = "#";
  for (let i = 1; i < 7; i += 2) {
    const from = parseInt(hex.slice(i, i + 2), 16);
    const channel = Math.round(from + (parseInt(toward.slice(i, i + 2), 16) - from) * amount);
    out += channel.toString(16).padStart(2, "0");
  }
  return out;
}

/** WCAG 2.1 relative luminance of a 6-digit hex color. */
function luminance(hex: string): number {
  let sum = 0;
  for (const [i, weight] of [
    [1, 0.2126],
    [3, 0.7152],
    [5, 0.0722],
  ] as const) {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    sum += weight * (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  }
  return sum;
}

/**
 * `hex` moved toward `toward` (black or white) in 10% steps until it reads at
 * 4.5:1 on `bg` — AA for small text. The accent is the host's to pick, so
 * text drawn in it is derived from it rather than trusted.
 */
function readableOn(hex: string, bg: string, toward: string): string {
  const background = luminance(bg);
  let color = hex;
  for (let step = 1; step <= 10; step++) {
    const text = luminance(color);
    if ((Math.max(text, background) + 0.05) / (Math.min(text, background) + 0.05) >= 4.5) break;
    color = mixHex(hex, toward, step / 10);
  }
  return color;
}

const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Detect if user prefers dark mode via media query */
function prefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia(DARK_QUERY).matches;
}

/** Call `onChange` whenever the OS color scheme flips; returns the unsubscribe. */
export function watchColorScheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** Resolve 'auto' theme to 'light' or 'dark' based on system preference */
export function resolveTheme(theme?: "light" | "dark" | "auto"): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "auto") return prefersDark() ? "dark" : "light";
  return "light";
}

export function buildThemeColors(accent: string = DEFAULT_ACCENT, theme?: "light" | "dark" | "auto"): ThemeColors {
  const hex = normalizeHex(accent);
  const dark = mixHex(hex, "#000000", 0.15);
  const resolved = resolveTheme(theme);

  if (resolved === "dark") {
    return {
      accent: hex,
      accentLight: hex + "22", // slightly more visible on dark bg
      accentDark: dark,
      accentGlow: hex + "44",
      accentGradient: `linear-gradient(135deg, ${hex}, ${dark})`,
      // Lightened until it reads on accentLight over bgHover, the lighter of the two grounds.
      accentText: readableOn(hex, mixHex("#1e293b", hex, 0x22 / 255), "#ffffff"),
      bg: "#0f172a",
      bgHover: "#1e293b",
      text: "#f1f5f9",
      textSecondary: "#94a3b8",
      // 5.9:1 on bg, 4.8:1 on bgHover (AA for small text; slate-500 was 3.1–3.8:1).
      textTertiary: "#8695aa",
      border: "#334155",
      shadow: "rgba(0, 0, 0, 0.3)",
      // Glass tokens — dark frosted glass. Opaque enough that a white page
      // behind it, the worst case, leaves tertiary text at 5:1 (0.78 left 2.9:1).
      glassBg: "rgba(15, 23, 42, 0.94)",
      glassBgHeavy: "rgba(15, 23, 42, 0.96)",
      glassBorder: "rgba(51, 65, 85, 0.5)",
      glassBorderSubtle: "rgba(51, 65, 85, 0.3)",
      // Type colors stay vibrant on dark
      typeQuestion: "#60a5fa",
      typeChange: "#fbbf24",
      typeBug: "#f87171",
      typeOther: "#94a3b8",
      // Dark pastel backgrounds
      typeQuestionBg: "rgba(59, 130, 246, 0.15)",
      typeChangeBg: "rgba(245, 158, 11, 0.15)",
      typeBugBg: "rgba(239, 68, 68, 0.15)",
      typeOtherBg: "rgba(100, 116, 139, 0.15)",
      // Status colors — vivid green / cool gray on dark
      statusOpen: "#4ade80",
      statusOpenBg: "rgba(74, 222, 128, 0.15)",
      // Slate lifted from #94a3b8, which read 4.4:1 on its tint over bgHover.
      statusResolved: "#a3b0c2",
      statusResolvedBg: "rgba(148, 163, 184, 0.15)",
      statusInProgress: "#fbbf24",
      statusInProgressBg: "rgba(245, 158, 11, 0.15)",
      statusWontFix: "#a3b0c2",
      statusWontFixBg: "rgba(148, 163, 184, 0.15)",
    };
  }

  return {
    accent: hex,
    accentLight: hex + "14", // 8% opacity
    accentDark: dark,
    accentGlow: hex + "33", // 20% opacity
    accentGradient: `linear-gradient(135deg, ${hex}, ${dark})`,
    // Darkened until it reads on accentLight over bgHover, the darker of the two grounds.
    accentText: readableOn(hex, mixHex("#f8f9fb", hex, 0x14 / 255), "#000000"),
    bg: "#ffffff",
    bgHover: "#f8f9fb",
    text: "#0f172a",
    textSecondary: "#475569",
    textTertiary: "#64748b",
    border: "#e2e8f0",
    shadow: "rgba(0, 0, 0, 0.06)",
    // Glass tokens
    glassBg: "rgba(255, 255, 255, 0.72)",
    glassBgHeavy: "rgba(255, 255, 255, 0.85)",
    glassBorder: "rgba(255, 255, 255, 0.35)",
    glassBorderSubtle: "rgba(255, 255, 255, 0.18)",
    // Type colors, dark enough to read as badge text on their pastel (4.5:1+);
    // blue-500, red-500 and slate-500 read 3.4–4.5:1 there.
    typeQuestion: "#2563eb",
    typeChange: "#b45309",
    typeBug: "#d01f1f",
    typeOther: "#5b6778",
    // Pastel backgrounds
    typeQuestionBg: "#eff6ff",
    typeChangeBg: "#fffbeb",
    typeBugBg: "#fef2f2",
    typeOtherBg: "#f8fafc",
    // Status colors, same rule: green-700, amber-700 and a deeper slate (green-600
    // and amber-600 read 3.1:1 on their pastel).
    statusOpen: "#15803d",
    statusOpenBg: "#f0fdf4",
    statusResolved: "#5b6778",
    statusResolvedBg: "#f1f5f9",
    statusInProgress: "#b45309",
    statusInProgressBg: "#fffbeb",
    statusWontFix: "#5b6778",
    statusWontFixBg: "#f1f5f9",
  };
}

export function getTypeColor(type: string, colors: ThemeColors): string {
  switch (type) {
    case "question":
      return colors.typeQuestion;
    case "change":
      return colors.typeChange;
    case "bug":
      return colors.typeBug;
    default:
      return colors.typeOther;
  }
}

export function getStatusColor(status: string, colors: ThemeColors): string {
  switch (status) {
    case "in_progress":
      return colors.statusInProgress;
    case "resolved":
      return colors.statusResolved;
    case "wont_fix":
      return colors.statusWontFix;
    default:
      return colors.statusOpen;
  }
}

export function getStatusBgColor(status: string, colors: ThemeColors): string {
  switch (status) {
    case "in_progress":
      return colors.statusInProgressBg;
    case "resolved":
      return colors.statusResolvedBg;
    case "wont_fix":
      return colors.statusWontFixBg;
    default:
      return colors.statusOpenBg;
  }
}

export function getTypeBgColor(type: string, colors: ThemeColors): string {
  switch (type) {
    case "question":
      return colors.typeQuestionBg;
    case "change":
      return colors.typeChangeBg;
    case "bug":
      return colors.typeBugBg;
    default:
      return colors.typeOtherBg;
  }
}

export function cssVariables(colors: ThemeColors): string {
  return /* css */ `
    --sp-accent: ${colors.accent};
    --sp-accent-light: ${colors.accentLight};
    --sp-accent-dark: ${colors.accentDark};
    --sp-accent-glow: ${colors.accentGlow};
    --sp-accent-gradient: ${colors.accentGradient};
    --sp-accent-text: ${colors.accentText};
    --sp-bg: ${colors.bg};
    --sp-bg-hover: ${colors.bgHover};
    --sp-text: ${colors.text};
    --sp-text-secondary: ${colors.textSecondary};
    --sp-text-tertiary: ${colors.textTertiary};
    --sp-border: ${colors.border};
    --sp-shadow: ${colors.shadow};
    --sp-glass-bg: ${colors.glassBg};
    --sp-glass-bg-heavy: ${colors.glassBgHeavy};
    --sp-glass-border: ${colors.glassBorder};
    --sp-glass-border-subtle: ${colors.glassBorderSubtle};
    --sp-type-question: ${colors.typeQuestion};
    --sp-type-change: ${colors.typeChange};
    --sp-type-bug: ${colors.typeBug};
    --sp-type-other: ${colors.typeOther};
    --sp-type-question-bg: ${colors.typeQuestionBg};
    --sp-type-change-bg: ${colors.typeChangeBg};
    --sp-type-bug-bg: ${colors.typeBugBg};
    --sp-type-other-bg: ${colors.typeOtherBg};
    --sp-status-open: ${colors.statusOpen};
    --sp-status-open-bg: ${colors.statusOpenBg};
    --sp-status-resolved: ${colors.statusResolved};
    --sp-status-resolved-bg: ${colors.statusResolvedBg};
    --sp-radius: 12px;
    --sp-radius-lg: 16px;
    --sp-radius-xl: 20px;
    --sp-radius-full: 9999px;
    --sp-blur: 20px;
    --sp-blur-heavy: 32px;
    --sp-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
    --sp-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.04);
    --sp-shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04);
    --sp-shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.1), 0 4px 8px rgba(0, 0, 0, 0.04);
    --sp-shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.12), 0 8px 16px rgba(0, 0, 0, 0.06);
    --sp-font: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  `;
}
