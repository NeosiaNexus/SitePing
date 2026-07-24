/** Theme requested by the host — `auto` follows the system preference live. */
export type InboxTheme = "light" | "dark" | "auto";

/** Concrete theme applied to the root element's `data-theme` attribute. */
export type ResolvedTheme = "light" | "dark";

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
 * accent color with a console warning. Every accent derivative in the
 * stylesheet is a `color-mix()` of this single value — no further JS color
 * math is needed.
 */
export function normalizeAccent(raw: string): string {
  if (HEX6_RE.test(raw)) return raw;
  const short = HEX3_RE.test(raw) ? raw.match(HEX3_RE) : null;
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  if (HEX8_RE.test(raw)) return raw.slice(0, 7);

  console.warn(
    `[siteping] Invalid accentColor "${raw}" — only hex colors (#RGB, #RRGGBB, #RRGGBBAA) are supported. Using default.`,
  );
  return DEFAULT_ACCENT;
}

/** Detect if the user prefers dark mode via media query. SSR-safe (false). */
function prefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Resolve the requested theme to the concrete `light`/`dark` value applied at
 * mount time. `auto` reads the system preference once — pair it with
 * {@link watchSystemTheme} to follow later preference changes live.
 */
export function resolveInitialTheme(theme: InboxTheme): ResolvedTheme {
  if (theme === "dark") return "dark";
  if (theme === "auto") return prefersDark() ? "dark" : "light";
  return "light";
}

/**
 * Subscribe to system color-scheme changes. Returns an unsubscribe function.
 * No-ops (and returns a no-op disposer) outside the browser so SSR renders
 * never touch `window`.
 */
export function watchSystemTheme(callback: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => {};
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = (event: MediaQueryListEvent): void => {
    callback(event.matches ? "dark" : "light");
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
