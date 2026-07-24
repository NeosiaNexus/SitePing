import type { ConsoleDiagnosticEntry, DiagnosticsSnapshot, NetworkDiagnosticEntry } from "@siteping/core";
import type { CSSProperties, ReactElement, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useMemo, useState } from "react";
import { tWithParams } from "../i18n/index.js";
import { useInboxUi } from "./context.js";

/** Entries shown before "Show all" expands the list. */
const VISIBLE_COUNT = 6;

/** Inline override that defeats the CSS 2-line clamp when a console message is expanded. */
const EXPANDED_STYLE: CSSProperties = {
  display: "block",
  overflow: "visible",
  maxHeight: "none",
  WebkitLineClamp: "unset",
};

type MergedEntry =
  | { kind: "console"; key: string; timestamp: string; console: ConsoleDiagnosticEntry }
  | { kind: "network"; key: string; timestamp: string; network: NetworkDiagnosticEntry };

interface DiagnosticsProps {
  diagnostics: DiagnosticsSnapshot;
}

/** Console + failed-network snapshot, merged chronologically — the "replay the context" section of the drawer. */
export function Diagnostics({ diagnostics }: DiagnosticsProps): ReactElement {
  const { t, locale } = useInboxUi();
  const [showAll, setShowAll] = useState(false);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const merged = useMemo<MergedEntry[]>(() => {
    // Keys are stable per source-array position — unaffected by the sort below.
    const entries: MergedEntry[] = [
      ...diagnostics.console.map((entry, position) => ({
        kind: "console" as const,
        key: `console-${position}`,
        timestamp: entry.timestamp,
        console: entry,
      })),
      ...diagnostics.network.map((entry, position) => ({
        kind: "network" as const,
        key: `network-${position}`,
        timestamp: entry.timestamp,
        network: entry,
      })),
    ];
    return entries.sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  }, [diagnostics]);

  const visible = showAll ? merged : merged.slice(0, VISIBLE_COUNT);

  const formatTime = (iso: string): string => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleTimeString(locale, { hour12: false });
  };

  const toggleExpanded = (key: string): void => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const expandKeyDown = (event: ReactKeyboardEvent<HTMLSpanElement>, key: string): void => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    event.stopPropagation();
    toggleExpanded(key);
  };

  return (
    <section className="spd-diagnostics">
      <div className="spd-meta-label">
        {t("drawer.diagnostics")} · {merged.length}
      </div>
      <div className="spd-diag-list">
        {visible.map((item) =>
          item.kind === "console" ? (
            <div key={item.key} className="spd-diag-entry" data-level={item.console.level}>
              <span className="spd-diag-time">{formatTime(item.timestamp)}</span>
              <span className="spd-diag-level">{item.console.level}</span>
              {/* biome-ignore lint/a11y/useSemanticElements: a native button would block the entry's inherited mono styling; role+tabIndex+keydown provide the same semantics */}
              <span
                className="spd-diag-msg"
                role="button"
                tabIndex={0}
                style={expanded.has(item.key) ? EXPANDED_STYLE : undefined}
                onClick={() => toggleExpanded(item.key)}
                onKeyDown={(event) => expandKeyDown(event, item.key)}
              >
                {item.console.message}
              </span>
            </div>
          ) : (
            <div
              key={item.key}
              className="spd-diag-entry"
              data-level={item.network.status >= 400 || item.network.status === 0 ? "error" : "info"}
            >
              <span className="spd-diag-time">{formatTime(item.timestamp)}</span>
              <span className="spd-diag-method">{item.network.method}</span>
              <span
                className="spd-diag-status"
                data-failed={item.network.status >= 400 || item.network.status === 0 || undefined}
              >
                {item.network.status}
              </span>
              <span className="spd-diag-url" title={item.network.url}>
                {item.network.url}
              </span>
              <span className="spd-diag-dur">{Math.round(item.network.durationMs)}ms</span>
            </div>
          ),
        )}
      </div>
      {!showAll && merged.length > VISIBLE_COUNT ? (
        <button type="button" className="spd-btn-ghost" onClick={() => setShowAll(true)}>
          {tWithParams(t, "drawer.showAllDiagnostics", { count: merged.length })}
        </button>
      ) : null}
    </section>
  );
}
