import { INBOX_CSS } from "./styles.js";

const STYLE_ID = "siteping-inbox-styles";

/**
 * Append the inbox stylesheet to `document.head` exactly once.
 *
 * - Idempotent: keyed by element id, so multiple `<SitepingInbox />`
 *   instances (or remounts) share a single `<style>` tag.
 * - SSR-safe: no-op when `document` is unavailable — call it from an effect
 *   on mount and the styles land before first paint on the client.
 */
export function ensureStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = INBOX_CSS;
  document.head.appendChild(style);
}
