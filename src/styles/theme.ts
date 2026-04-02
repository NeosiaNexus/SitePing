/** Color palette derived from the accent color */
export interface ThemeColors {
  accent: string;
  accentLight: string;
  accentDark: string;
  bg: string;
  bgHover: string;
  text: string;
  textSecondary: string;
  border: string;
  shadow: string;
  // Feedback type colors
  typeQuestion: string;
  typeChangement: string;
  typeBug: string;
  typeAutre: string;
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

export function buildThemeColors(accent: string = DEFAULT_ACCENT): ThemeColors {
  const hex = normalizeHex(accent);
  return {
    accent: hex,
    accentLight: hex + "1a", // 10% opacity
    accentDark: hex + "cc", // 80% opacity
    bg: "#ffffff",
    bgHover: "#f7f7f8",
    text: "#1a1a1a",
    textSecondary: "#6b7280",
    border: "#e5e7eb",
    shadow: "rgba(0, 0, 0, 0.08)",
    typeQuestion: "#3b82f6",
    typeChangement: "#f59e0b",
    typeBug: "#ef4444",
    typeAutre: "#6b7280",
  };
}

export function getTypeColor(
  type: string,
  colors: ThemeColors,
): string {
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

export function cssVariables(colors: ThemeColors): string {
  return `
    --sp-accent: ${colors.accent};
    --sp-accent-light: ${colors.accentLight};
    --sp-accent-dark: ${colors.accentDark};
    --sp-bg: ${colors.bg};
    --sp-bg-hover: ${colors.bgHover};
    --sp-text: ${colors.text};
    --sp-text-secondary: ${colors.textSecondary};
    --sp-border: ${colors.border};
    --sp-shadow: ${colors.shadow};
    --sp-type-question: ${colors.typeQuestion};
    --sp-type-changement: ${colors.typeChangement};
    --sp-type-bug: ${colors.typeBug};
    --sp-type-autre: ${colors.typeAutre};
    --sp-radius: 8px;
    --sp-radius-lg: 12px;
    --sp-font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  `;
}
