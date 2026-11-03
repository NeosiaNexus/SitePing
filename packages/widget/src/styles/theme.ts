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
  /** The resolved scheme: the page surfaces (popup, tooltip, pins) branch on it. */
  scheme: "light" | "dark";
  /** Apple-style surfaces: materials, fills, separators and depth. */
  surface: SurfaceTokens;
}

/**
 * The native look's surface tokens, after Apple's system colours: thick
 * translucent materials over the page, inset grouped rows, tinted fills,
 * hairline separators and layered shadows. One set per scheme; text on the
 * materials reads 4.5:1 even over a black (light) or white (dark) page.
 */
export interface SurfaceTokens {
  /** The sheet itself: translucent, blurred and saturated behind. */
  material: string;
  /** Floating layers on top of the sheet (menus, callouts, bars). */
  materialThick: string;
  /** Inset grouped background, under the rows. */
  grouped: string;
  row: string;
  rowHover: string;
  /** Grey fills: fields, segmented tracks, secondary buttons. */
  fill: string;
  fillStrong: string;
  /** The fill under increased contrast. */
  fillContrast: string;
  separator: string;
  /** The bright edge where light catches the material. */
  edge: string;
  sheen: string;
  sheenSoft: string;
  hairline: string;
  /** The segmented control's raised thumb. */
  thumb: string;
  grabber: string;
  /** systemGray3, for inactive glyphs. */
  gray3: string;
  danger: string;
  dangerPress: string;
  /** Status and type inks: a tint pushed toward the text, so it reads on its own fill. */
  inkMix: string;
  inkPct: string;
  /** Badges push their ink a little less (they sit on a stronger tint). */
  inkPctBadge: string;
  shadowRow: string;
  shadowRowHover: string;
  shadowFloat: string;
  shadowSheet: string;
  shadowSheetUp: string;
  shadowPopover: string;
  shadowThumb: string;
  shadowEdgeDrop: string;
  /** Floating cards on the page (comment popup, pin tooltip). */
  shadowCard: string;
  /** The annotation overlay's tint over the page. */
  overlayTint: string;
}

const SURFACES: Record<"light" | "dark", SurfaceTokens> = {
  light: {
    material: "rgba(246, 246, 248, 0.84)",
    materialThick: "rgba(248, 248, 250, 0.92)",
    grouped: "#f2f2f7",
    row: "#ffffff",
    rowHover: "#f8f8fa",
    fill: "rgba(118, 118, 128, 0.12)",
    fillStrong: "rgba(118, 118, 128, 0.2)",
    fillContrast: "rgba(118, 118, 128, 0.22)",
    separator: "rgba(60, 60, 67, 0.17)",
    edge: "rgba(255, 255, 255, 0.8)",
    sheen: "rgba(255, 255, 255, 0.55)",
    sheenSoft: "rgba(255, 255, 255, 0.4)",
    hairline: "rgba(0, 0, 0, 0.1)",
    thumb: "#ffffff",
    grabber: "rgba(60, 60, 67, 0.3)",
    gray3: "#c7c7cc",
    danger: "#d70015",
    dangerPress: "#b8000f",
    inkMix: "#000",
    inkPct: "76%",
    inkPctBadge: "74%",
    shadowRow: "0 1px 2px rgba(0, 0, 0, 0.04)",
    shadowRowHover: "0 1px 2px rgba(0, 0, 0, 0.04), 0 6px 16px rgba(0, 0, 0, 0.06)",
    shadowFloat: "0 0 0 0.5px rgba(0, 0, 0, 0.1), 0 10px 30px rgba(0, 0, 0, 0.14), 0 2px 6px rgba(0, 0, 0, 0.05)",
    shadowSheet: "0 0 0 0.5px rgba(0, 0, 0, 0.1), 0 24px 60px -8px rgba(0, 0, 0, 0.22), 0 6px 18px rgba(0, 0, 0, 0.06)",
    shadowSheetUp: "0 -0.5px 0 rgba(0, 0, 0, 0.1), 0 -10px 40px rgba(0, 0, 0, 0.12)",
    shadowPopover: "0 0 0 0.5px rgba(0, 0, 0, 0.1), 0 18px 50px rgba(0, 0, 0, 0.22)",
    shadowThumb: "0 3px 8px rgba(0, 0, 0, 0.12), 0 1px 1px rgba(0, 0, 0, 0.04), 0 0 0 0.5px rgba(0, 0, 0, 0.04)",
    shadowEdgeDrop: "0 1px 0 rgba(0, 0, 0, 0.14)",
    shadowCard: "0 0 0 0.5px rgba(0, 0, 0, 0.1), 0 18px 48px -6px rgba(0, 0, 0, 0.2), 0 4px 14px rgba(0, 0, 0, 0.06)",
    overlayTint: "rgba(0, 0, 0, 0.06)",
  },
  dark: {
    // 0.86, not 0.84: over a white page, the worst case, tertiary text keeps 4.65:1 (4.37 at 0.84).
    material: "rgba(28, 28, 30, 0.86)",
    materialThick: "rgba(38, 38, 40, 0.92)",
    grouped: "#1c1c1e",
    row: "#2c2c2e",
    rowHover: "#333336",
    fill: "rgba(118, 118, 128, 0.24)",
    fillStrong: "rgba(118, 118, 128, 0.36)",
    fillContrast: "rgba(118, 118, 128, 0.4)",
    separator: "rgba(84, 84, 88, 0.6)",
    edge: "rgba(255, 255, 255, 0.12)",
    sheen: "rgba(255, 255, 255, 0.06)",
    sheenSoft: "rgba(255, 255, 255, 0.06)",
    hairline: "rgba(0, 0, 0, 0.55)",
    thumb: "#636366",
    grabber: "rgba(235, 235, 245, 0.3)",
    gray3: "#636366",
    danger: "#e0251b",
    dangerPress: "#c81e15",
    inkMix: "#fff",
    inkPct: "62%",
    inkPctBadge: "62%",
    shadowRow: "0 1px 2px rgba(0, 0, 0, 0.2)",
    shadowRowHover: "0 1px 2px rgba(0, 0, 0, 0.2), 0 6px 16px rgba(0, 0, 0, 0.25)",
    shadowFloat: "0 0 0 0.5px rgba(0, 0, 0, 0.55), 0 10px 30px rgba(0, 0, 0, 0.5), 0 2px 6px rgba(0, 0, 0, 0.25)",
    shadowSheet: "0 0 0 0.5px rgba(0, 0, 0, 0.55), 0 24px 60px -8px rgba(0, 0, 0, 0.66), 0 6px 18px rgba(0, 0, 0, 0.3)",
    shadowSheetUp: "0 -0.5px 0 rgba(0, 0, 0, 0.55), 0 -10px 40px rgba(0, 0, 0, 0.5)",
    shadowPopover: "0 0 0 0.5px rgba(0, 0, 0, 0.55), 0 18px 50px rgba(0, 0, 0, 0.6)",
    shadowThumb: "0 3px 8px rgba(0, 0, 0, 0.3), 0 1px 1px rgba(0, 0, 0, 0.2), 0 0 0 0.5px transparent",
    shadowEdgeDrop: "0 1px 0 rgba(0, 0, 0, 0.6)",
    shadowCard: "0 0 0 0.5px rgba(0, 0, 0, 0.55), 0 18px 48px -6px rgba(0, 0, 0, 0.6), 0 4px 14px rgba(0, 0, 0, 0.3)",
    overlayTint: "rgba(0, 0, 0, 0.22)",
  },
};

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

function prefers(query: string): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
}

/**
 * The OS accessibility signals, read when the theme is built (like the colour
 * scheme), for the surfaces painted from JS on the host page; styles/mobile.ts
 * swaps the same tokens live in the Shadow DOM.
 * - Reduced transparency: the materials turn solid (the grouped background).
 * - Increased contrast: solid too, and firmer fills, separators and hairlines.
 */
export function buildThemeColors(accent: string = DEFAULT_ACCENT, theme?: "light" | "dark" | "auto"): ThemeColors {
  const colors = buildPalette(accent, theme);
  const moreContrast = prefers("(prefers-contrast: more)");
  if (!moreContrast && !prefers("(prefers-reduced-transparency: reduce)")) return colors;
  const { surface } = colors;
  const solid = surface.grouped;
  return {
    ...colors,
    glassBg: solid,
    glassBgHeavy: solid,
    ...(moreContrast ? { glassBorderSubtle: colors.textSecondary } : {}),
    surface: {
      ...surface,
      material: solid,
      materialThick: solid,
      ...(moreContrast
        ? { fill: surface.fillContrast, separator: colors.textSecondary, hairline: colors.textSecondary }
        : {}),
    },
  };
}

function buildPalette(accent: string, theme?: "light" | "dark" | "auto"): ThemeColors {
  const hex = normalizeHex(accent);
  const dark = mixHex(hex, "#000000", 0.15);
  const resolved = resolveTheme(theme);

  if (resolved === "dark") {
    return {
      accent: hex,
      accentLight: hex + "22", // slightly more visible on dark bg
      accentDark: dark,
      accentGlow: hex + "44",
      // Flat: system controls carry one colour, not a gradient.
      accentGradient: hex,
      // Lightened until it reads on accentLight over bgHover, the lighter of the two grounds.
      accentText: readableOn(hex, mixHex("#2c2c2e", hex, 0x22 / 255), "#ffffff"),
      // Apple's dark system palette (systemBackground, secondary fills, labels).
      bg: "#1c1c1e",
      bgHover: "#2c2c2e",
      text: "#f5f5f7",
      textSecondary: "#c1c1c6",
      textTertiary: "#a8a8ae",
      border: "#3a3a3c",
      shadow: "rgba(0, 0, 0, 0.4)",
      // Glass tokens: the sheet's material (see SURFACES).
      glassBg: SURFACES.dark.material,
      glassBgHeavy: SURFACES.dark.materialThick,
      glassBorder: SURFACES.dark.edge,
      glassBorderSubtle: SURFACES.dark.separator,
      // Type colors stay vibrant on dark
      typeQuestion: "#60a5fa",
      typeChange: "#fbbf24",
      // Lifted from #f87171, which read 4.3:1 on its tint over the #2c2c2e row.
      typeBug: "#fa7f7f",
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
      scheme: "dark",
      surface: SURFACES.dark,
    };
  }

  return {
    accent: hex,
    accentLight: hex + "14", // 8% opacity
    accentDark: dark,
    accentGlow: hex + "33", // 20% opacity
    accentGradient: hex,
    // Darkened until it reads on accentLight over bgHover, the darker of the two grounds.
    accentText: readableOn(hex, mixHex("#f2f2f7", hex, 0x14 / 255), "#000000"),
    // Apple's light system palette. Secondary text reads 5:1 on the material
    // even over a black page; tertiary text only ever sits on solid rows.
    bg: "#ffffff",
    bgHover: "#f2f2f7",
    text: "#1d1d1f",
    textSecondary: "#4f4f54",
    textTertiary: "#636368",
    border: "#e3e3e8",
    shadow: "rgba(0, 0, 0, 0.08)",
    // Glass tokens: the sheet's material (see SURFACES).
    glassBg: SURFACES.light.material,
    glassBgHeavy: SURFACES.light.materialThick,
    glassBorder: SURFACES.light.edge,
    glassBorderSubtle: SURFACES.light.separator,
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
    scheme: "light",
    surface: SURFACES.light,
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

/**
 * A layered shadow whose hairline ring reads `--sp-hairline`, so the live
 * increased-contrast swap (styles/mobile.ts) firms it up too.
 */
function hairlined(shadow: string, hairline: string): string {
  return shadow.split(hairline).join("var(--sp-hairline)");
}

/** The system UI face, for the Shadow DOM and the surfaces on the page alike. */
export const SYSTEM_FONT = `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, system-ui, sans-serif`;

export function cssVariables(colors: ThemeColors): string {
  const { surface } = colors;
  const dark = colors.scheme === "dark";
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
    --sp-status-in-progress: ${colors.statusInProgress};
    --sp-status-in-progress-bg: ${colors.statusInProgressBg};
    --sp-status-wont-fix: ${colors.statusWontFix};
    --sp-status-wont-fix-bg: ${colors.statusWontFixBg};
    --sp-radius: 10px;
    --sp-radius-lg: 14px;
    --sp-radius-xl: 22px;
    --sp-radius-full: 9999px;
    --sp-blur: 20px;
    --sp-blur-heavy: 30px;
    --sp-shadow-xs: ${surface.shadowRow};
    --sp-shadow-sm: var(--sp-shadow-float);
    --sp-shadow-md: var(--sp-shadow-float);
    --sp-shadow-lg: var(--sp-shadow-float);
    --sp-shadow-xl: var(--sp-shadow-sheet);
    /* The system face where there is one (San Francisco on Apple), Inter before
       the generic fallbacks so Linux does not land on DejaVu. */
    --sp-font: ${SYSTEM_FONT};
    --sp-font-display: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Inter, system-ui, sans-serif;
    --sp-font-mono: ui-monospace, "SF Mono", Menlo, "Cascadia Code", Consolas, monospace;

    /* Native surfaces (see SURFACES) */
    --sp-material: ${surface.material};
    --sp-material-thick: ${surface.materialThick};
    --sp-material-blur: blur(30px) saturate(180%);
    --sp-grouped: ${surface.grouped};
    --sp-row: ${surface.row};
    --sp-row-hover: ${surface.rowHover};
    --sp-fill: ${surface.fill};
    --sp-fill-strong: ${surface.fillStrong};
    --sp-fill-contrast: ${surface.fillContrast};
    --sp-separator: ${surface.separator};
    --sp-edge: ${surface.edge};
    --sp-sheen: ${surface.sheen};
    --sp-sheen-soft: ${surface.sheenSoft};
    --sp-hairline: ${surface.hairline};
    --sp-thumb: ${surface.thumb};
    --sp-grabber: ${surface.grabber};
    --sp-gray3: ${surface.gray3};
    --sp-danger: ${surface.danger};
    --sp-danger-press: ${surface.dangerPress};
    --sp-shadow-row: ${surface.shadowRow};
    --sp-shadow-row-hover: ${surface.shadowRowHover};
    --sp-shadow-float: ${hairlined(surface.shadowFloat, SURFACES[colors.scheme].hairline)};
    --sp-shadow-sheet: ${hairlined(surface.shadowSheet, SURFACES[colors.scheme].hairline)};
    --sp-shadow-sheet-up: ${hairlined(surface.shadowSheetUp, SURFACES[colors.scheme].hairline)};
    --sp-shadow-popover: ${hairlined(surface.shadowPopover, SURFACES[colors.scheme].hairline)};
    --sp-shadow-thumb: ${surface.shadowThumb};
    --sp-shadow-edge-drop: ${surface.shadowEdgeDrop};
    --sp-ring: 0 0 0 3px color-mix(in srgb, var(--sp-accent) 30%, transparent);
    /* Inks: a status, type or chip colour pushed toward the text, so it reads
       on its own tint. Per element: color-mix(in srgb, <colour> var(--sp-ink-pct), var(--sp-ink-mix)). */
    --sp-ink-mix: ${surface.inkMix};
    --sp-ink-pct: ${surface.inkPct};
    --sp-ink-pct-badge: ${surface.inkPctBadge};
    --sp-ink-green: ${dark ? "color-mix(in srgb, var(--sp-status-open) 80%, #fff)" : "color-mix(in srgb, var(--sp-status-open) 82%, #000)"};
    --sp-ink-red: ${dark ? "color-mix(in srgb, var(--sp-type-bug) 66%, #fff)" : "color-mix(in srgb, var(--sp-type-bug) 86%, #000)"};
    --sp-ink-amber: ${dark ? "color-mix(in srgb, var(--sp-status-in-progress) 70%, #fff)" : "color-mix(in srgb, var(--sp-status-in-progress) 80%, #000)"};
    --sp-accent-ink: ${dark ? "color-mix(in srgb, var(--sp-accent-text) 70%, #fff)" : "var(--sp-accent-text)"};
  `;
}
