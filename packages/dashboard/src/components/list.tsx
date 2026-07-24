import type { FeedbackRecord } from "@siteping/core";
import type { ReactElement } from "react";
import { useEffect, useId, useRef, useState } from "react";
import type { InboxState } from "../types.js";
import { useInboxUi } from "./context.js";
import { Row } from "./row.js";

/** How long removed rows linger for their `.spd-row-leaving` exit animation (CSS runs 160ms). */
const LEAVE_MS = 200;

/** A removed row remembered with its former index so the ghost renders in place. */
interface Ghost {
  record: FeedbackRecord;
  index: number;
}

interface ListProps {
  state: InboxState;
}

/**
 * The feedback listbox. Focus stays on the listbox element itself —
 * `aria-activedescendant` points at the focused row, which the root's
 * keyboard handler moves with j/k. Clicking a row opens it and returns
 * focus to the listbox so keyboard triage continues seamlessly.
 */
export function List({ state }: ListProps): ReactElement {
  const { t } = useInboxUi();
  const baseId = useId();
  const listRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const rowDomId = (id: string): string => `${baseId}${id}`;

  // Keep the keyboard-focused row visible while navigating.
  useEffect(() => {
    if (!state.focusedId) return;
    rowRefs.current.get(state.focusedId)?.scrollIntoView({ block: "nearest" });
  }, [state.focusedId]);

  // Status-leave animation: when a status change (or delete) removes one or
  // two rows while the rest of the list is untouched, keep ghosts in place
  // briefly so CSS can fade them out. Filter/page swaps replace the list
  // wholesale and are deliberately excluded — no ghost storm.
  const prevItemsRef = useRef<FeedbackRecord[]>(state.items);
  const [leaving, setLeaving] = useState<Ghost[]>([]);
  useEffect(() => {
    const prev = prevItemsRef.current;
    prevItemsRef.current = state.items;
    const currentIds = new Set(state.items.map((item) => item.id));
    const removed = prev.filter((item) => !currentIds.has(item.id));
    const pureRemoval =
      removed.length > 0 && removed.length <= 2 && prev.length - removed.length === state.items.length;
    if (!pureRemoval) {
      setLeaving((current) => (current.length > 0 ? [] : current));
      return;
    }
    setLeaving(removed.map((record) => ({ record, index: prev.findIndex((item) => item.id === record.id) })));
    const timer = setTimeout(() => setLeaving([]), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [state.items]);

  const rendered: Array<{ record: FeedbackRecord; ghost: boolean }> = state.items.map((record) => ({
    record,
    ghost: false,
  }));
  const liveIds = new Set(state.items.map((item) => item.id));
  for (const ghost of leaving) {
    // A record can re-enter the list while its ghost lingers (e → u within
    // 200ms) — skip the ghost, or the same key/DOM id would render twice.
    if (liveIds.has(ghost.record.id)) continue;
    rendered.splice(Math.min(Math.max(ghost.index, 0), rendered.length), 0, { record: ghost.record, ghost: true });
  }

  return (
    <div
      ref={listRef}
      className="spd-list"
      role="listbox"
      tabIndex={0}
      aria-label={t("inbox.listLabel")}
      aria-activedescendant={state.focusedId ? rowDomId(state.focusedId) : undefined}
    >
      {rendered.map(({ record, ghost }) => (
        <Row
          key={record.id}
          record={record}
          domId={rowDomId(record.id)}
          focused={!ghost && state.focusedId === record.id}
          leaving={ghost}
          onSelect={() => {
            state.focus(record.id);
            state.openFeedback(record.id);
            listRef.current?.focus();
          }}
          refCallback={(el) => {
            if (el) rowRefs.current.set(record.id, el);
            else rowRefs.current.delete(record.id);
          }}
        />
      ))}
    </div>
  );
}
