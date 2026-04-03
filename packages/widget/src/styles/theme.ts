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
  typeChangement: string;
  typeBug: string;
  typeAutre: string;
  // Soft type backgrounds (pastel)
  typeQuestionBg: string;
  typeChangementBg: string;
  typeBugBg: string;
  typeAutreBg: string;
}

const DEFAULT_ACCENT = "#0066ff";
const HEX6_RE = /^#[0-9a-fA-F]{6}$/;
const HEX3_RE = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
const HEX8_RE = /^#[0-9a-fA-F]{8}$/;

/** Normalize any accent color to a 6-digit hex, or fall back to default */
function normalizeHex(color: string): string {
  if (HEX6_RE.test(color)) return color;
  const short = HEX3_RE.test(color) ? color.match(HEX3_RE) : null;
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  if (HEX8_RE.test(color)) return color.slice(0, 7);
  return DEFAULT_ACCENT;
}

/** Darken a hex color by a percentage (0-1) */
function darkenHex(hex: string, amount: number): string {
  const r = Math.max(0, Math.round(parseInt(hex.slice(1, 3), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(hex.slice(3, 5), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(hex.slice(5, 7), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function buildThemeColors(accent: string = DEFAULT_ACCENT): ThemeColors {
  const hex = normalizeHex(accent);
  const dark = darkenHex(hex, 0.15);
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
    typeChangement: "#b45309",
    typeBug: "#ef4444",
    typeAutre: "#64748b",
    // Pastel backgrounds
    typeQuestionBg: "#eff6ff",
    typeChangementBg: "#fffbeb",
    typeBugBg: "#fef2f2",
    typeAutreBg: "#f8fafc",
  };
}

export function getTypeColor(type: string, colors: ThemeColors): string {
  switch (type) {
    case "question":
      return colors.typeQuestion;
    case "changement":
      return colors.typeChangement;
    case "bug":
      return colors.typeBug;
    default:
      return colors.typeAutre;
  }
}

export function getTypeBgColor(type: string, colors: ThemeColors): string {
  switch (type) {
    case "question":
      return colors.typeQuestionBg;
    case "changement":
      return colors.typeChangementBg;
    case "bug":
      return colors.typeBugBg;
    default:
      return colors.typeAutreBg;
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
    --sp-type-changement: ${colors.typeChangement};
    --sp-type-bug: ${colors.typeBug};
    --sp-type-autre: ${colors.typeAutre};
    --sp-type-question-bg: ${colors.typeQuestionBg};
    --sp-type-changement-bg: ${colors.typeChangementBg};
    --sp-type-bug-bg: ${colors.typeBugBg};
    --sp-type-autre-bg: ${colors.typeAutreBg};
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
