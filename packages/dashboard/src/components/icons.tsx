import type { ReactElement } from "react";
import { useId } from "react";

/**
 * Inline SVG icon set — 16×16, stroke 1.5, `currentColor`, decorative
 * (`aria-hidden`). Status glyphs are the signature language: circles for
 * status, so shape (not color alone) distinguishes them — squares mark type.
 * Never emoji.
 */
export interface IconProps {
  className?: string | undefined;
}

// Shared frame attributes for every icon.
const SVG = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** ○ — circle outline. */
export function StatusOpenIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="6" />
    </svg>
  );
}

/** ◐ — circle outline with the right half filled. */
export function StatusInProgressIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2.5a5.5 5.5 0 0 1 0 11Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** ● — filled circle with the check knocked out (mask keeps it transparent). */
export function StatusResolvedIcon({ className }: IconProps): ReactElement {
  // Sanitized per-instance mask id — React's useId wrappers (`:` / `«»`) are
  // unsafe inside `url(#…)` references in some engines.
  const maskId = `spd-resolved-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <mask id={maskId}>
        <rect width="16" height="16" fill="#fff" />
        <path d="M5.1 8.4l2 2 3.8-4.4" stroke="#000" strokeWidth="1.7" fill="none" />
      </mask>
      <circle cx="8" cy="8" r="6.75" fill="currentColor" stroke="none" mask={`url(#${maskId})`} />
    </svg>
  );
}

/** ⊘ — circle outline with a 45° slash. */
export function StatusWontFixIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="6" />
      <path d="M4.3 11.7 11.7 4.3" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <circle cx="7.25" cy="7.25" r="4.75" />
      <path d="m10.75 10.75 3 3" />
    </svg>
  );
}

export function RefreshIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <path d="M14 8a6 6 0 1 1-6-6c1.68 0 3.29.67 4.49 1.83L14 5.33" />
      <path d="M14 2v3.33h-3.33" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

export function ChevronDownIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <path d="m4 6.5 4 4 4-4" />
    </svg>
  );
}

export function ExternalIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <path d="M12.5 8.5V12a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 12V5A1.5 1.5 0 0 1 4 3.5h3.5" />
      <path d="M9.5 2.5h4v4" />
      <path d="M13.5 2.5 8 8" />
    </svg>
  );
}

export function CameraIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h1.3l1-1.5h3.4l1 1.5H12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 12 13H4a1.5 1.5 0 0 1-1.5-1.5v-6Z" />
      <circle cx="8" cy="8.25" r="2.25" />
    </svg>
  );
}

export function TrashIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <path d="M2.5 4.5h11" />
      <path d="M5.5 4.5V3.25A1.25 1.25 0 0 1 6.75 2h2.5a1.25 1.25 0 0 1 1.25 1.25V4.5" />
      <path d="M4 4.5l.6 8.11A1.5 1.5 0 0 0 6.1 14h3.8a1.5 1.5 0 0 0 1.5-1.39L12 4.5" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps): ReactElement {
  return (
    <svg {...SVG} aria-hidden="true" className={className}>
      <path d="m3.5 8.5 3 3 6-6.5" />
    </svg>
  );
}
