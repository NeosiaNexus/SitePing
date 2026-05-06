/** Color palette and glassmorphism tokens derived from the accent color */
export interface ThemeColors {
  accent: string;
  accentLight: string;
  accentDark: string;
  accentGlow: string;
  accentGradient: string;
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

/** Darken a hex color by a percentage (0-1) */
function darkenHex(hex: string, amount: number): string {
  const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Detect if user prefers dark mode via media query */
function prefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Resolve 'auto' theme to 'light' or 'dark' based on system preference */
export function resolveTheme(theme?: "light" | "dark" | "auto"): "light" | "dark" {
  if (theme === "dark") return "dark";
  if (theme === "auto") return prefersDark() ? "dark" : "light";
  return "light";
}

export function buildThemeColors(accent: string = DEFAULT_ACCENT, theme?: "light" | "dark" | "auto"): ThemeColors {
  const hex = normalizeHex(accent);
  const dark = darkenHex(hex, 0.15);
  const resolved = resolveTheme(theme);

  if (resolved === "dark") {
    return {
      accent: hex,
      accentLight: hex + "22", // slightly more visible on dark bg
      accentDark: dark,
      accentGlow: hex + "44",
      accentGradient: `linear-gradient(135deg, ${hex}, ${dark})`,
      bg: "#0f172a",
      bgHover: "#1e293b",
      text: "#f1f5f9",
      textSecondary: "#94a3b8",
      textTertiary: "#64748b",
      border: "#334155",
      shadow: "rgba(0, 0, 0, 0.3)",
      // Glass tokens — dark frosted glass
      glassBg: "rgba(15, 23, 42, 0.78)",
      glassBgHeavy: "rgba(15, 23, 42, 0.88)",
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
      statusResolved: "#94a3b8",
      statusResolvedBg: "rgba(148, 163, 184, 0.15)",
    };
  }

  return {
    accent: hex,
    accentLight: hex + "14", // 8% opacity
    accentDark: dark,
    accentGlow: hex + "33", // 20% opacity
    accentGradient: `linear-gradient(135deg, ${hex}, ${dark})`,
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
    // Vibrant type colors
    typeQuestion: "#3b82f6",
    typeChange: "#b45309",
    typeBug: "#ef4444",
    typeOther: "#64748b",
    // Pastel backgrounds
    typeQuestionBg: "#eff6ff",
    typeChangeBg: "#fffbeb",
    typeBugBg: "#fef2f2",
    typeOtherBg: "#f8fafc",
    // Status colors — saturated green / cool gray on light
    statusOpen: "#16a34a",
    statusOpenBg: "#f0fdf4",
    statusResolved: "#64748b",
    statusResolvedBg: "#f1f5f9",
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
  return `
    --sp-accent: ${colors.accent};
    --sp-accent-light: ${colors.accentLight};
    --sp-accent-dark: ${colors.accentDark};
    --sp-accent-glow: ${colors.accentGlow};
    --sp-accent-gradient: ${colors.accentGradient};
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
