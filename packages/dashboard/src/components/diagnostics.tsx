import type { ConsoleDiagnosticEntry, DiagnosticsSnapshot, NetworkDiagnosticEntry } from "@siteping/core";
import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { tWithParams } from "../i18n/index.js";
import { useInboxUi } from "./context.js";

/** Entries shown before "Show all" expands the list. */
const VISIBLE_COUNT = 6;

/** A console message is only worth an expander when it can actually overflow the 2-line clamp. */
function isClampable(message: string): boolean {
  return message.length > 90 || message.includes("\n");
}

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

  return (
    <section className="spd-diagnostics">
      <div className="spd-meta-label">
        {t("drawer.diagnostics")} · {merged.length}
      </div>
      <ul className="spd-diag-list">
        {visible.map((item) => {
          if (item.kind === "console") {
            const clampable = isClampable(item.console.message);
            const isExpanded = expanded.has(item.key);
            return (
              <li
                key={item.key}
                className="spd-diag-entry"
                data-level={item.console.level}
                data-expanded={clampable && isExpanded ? "true" : undefined}
              >
                <time className="spd-diag-time" dateTime={item.timestamp}>
                  {formatTime(item.timestamp)}
                </time>
                <span className="spd-diag-level">{item.console.level}</span>
                {clampable ? (
                  <button
                    type="button"
                    className="spd-diag-msg"
                    aria-expanded={isExpanded}
                    onClick={() => toggleExpanded(item.key)}
                  >
                    {item.console.message}
                  </button>
                ) : (
                  <span className="spd-diag-msg" style={{ cursor: "auto" }}>
                    {item.console.message}
                  </span>
                )}
              </li>
            );
          }
          return (
            <li
              key={item.key}
              className="spd-diag-entry"
              data-level={item.network.status >= 400 || item.network.status === 0 ? "error" : "info"}
            >
              <time className="spd-diag-time" dateTime={item.timestamp}>
                {formatTime(item.timestamp)}
              </time>
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
            </li>
          );
        })}
      </ul>
      {!showAll && merged.length > VISIBLE_COUNT ? (
        <button type="button" className="spd-btn-ghost" onClick={() => setShowAll(true)}>
          {tWithParams(t, "drawer.showAllDiagnostics", { count: merged.length })}
        </button>
      ) : null}
    </section>
  );
}
