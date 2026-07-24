import type { ReactElement, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useRef } from "react";
import { getStatusLabel } from "../i18n/index.js";
import type { InboxState, InboxStatusFilter } from "../types.js";
import { STATUS_ICONS, useInboxUi } from "./context.js";

const TABS: readonly InboxStatusFilter[] = ["all", "open", "in_progress", "resolved", "wont_fix"];

interface StatusTabsProps {
  status: InboxStatusFilter;
  counts: InboxState["counts"];
  onChange: (status: InboxStatusFilter) => void;
}

/**
 * Status filter tablist. Roving tabindex with ArrowLeft/ArrowRight/Home/End
 * (selection follows focus); the root additionally binds 1–5 as absolute
 * shortcuts. Counts render "—" until the background count queries land.
 */
export function StatusTabs({ status, counts, onChange }: StatusTabsProps): ReactElement {
  const { t } = useInboxUi();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    const current = TABS.indexOf(status);
    let next: number | null = null;
    if (event.key === "ArrowRight") next = Math.min(current + 1, TABS.length - 1);
    else if (event.key === "ArrowLeft") next = Math.max(current - 1, 0);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    if (next === null || next === current) return;
    event.preventDefault();
    event.stopPropagation();
    const tab = TABS[next];
    if (!tab) return;
    onChange(tab);
    refs.current[next]?.focus();
  };

  return (
    <div className="spd-tabs" role="tablist" aria-label={t("inbox.statusFilter")} onKeyDown={handleKeyDown}>
      {TABS.map((tab, index) => {
        const selected = tab === status;
        const count = counts[tab];
        const Glyph = tab === "all" ? null : STATUS_ICONS[tab];
        return (
          <button
            key={tab}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            className="spd-tab"
            data-status={tab}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab)}
          >
            {Glyph ? (
              <span className="spd-tab-glyph">
                <Glyph />
              </span>
            ) : null}
            <span className="spd-tab-label">{getStatusLabel(tab, t)}</span>
            <span className="spd-tab-count">{count ?? "—"}</span>
          </button>
        );
      })}
    </div>
  );
}
