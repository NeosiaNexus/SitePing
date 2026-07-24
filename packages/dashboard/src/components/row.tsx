import type { FeedbackRecord } from "@siteping/core";
import type { ReactElement } from "react";
import { formatAbsolute, formatRelativeTime, pathFromUrl } from "../format.js";
import { getStatusLabel, getTypeLabel } from "../i18n/index.js";
import { STATUS_ICONS, useInboxUi } from "./context.js";
import { CameraIcon } from "./icons.js";

interface RowProps {
  record: FeedbackRecord;
  /** DOM id targeted by the listbox `aria-activedescendant`. */
  domId: string;
  /** Keyboard-focused row — drives the focus ring + `aria-activedescendant`, never selection. */
  focused: boolean;
  /** The opened record — drives `aria-selected` (the real listbox selection). */
  selected: boolean;
  /** Ghost row kept briefly in the DOM while its status-leave animation runs. */
  leaving: boolean;
  onSelect: () => void;
  refCallback: (el: HTMLDivElement | null) => void;
}

/** One feedback line in the listbox — density-aware, ellipsized, keyboard-driven from the root. */
export function Row({ record, domId, focused, selected, leaving, onSelect, refCallback }: RowProps): ReactElement {
  const { t, locale } = useInboxUi();
  const StatusIcon = STATUS_ICONS[record.status];
  const typeLabel = getTypeLabel(record.type, t);
  const path = pathFromUrl(record.url);
  const className = `spd-row${focused ? " spd-row-focused" : ""}${leaving ? " spd-row-leaving" : ""}`;

  const handleClick = (): void => {
    // Dragging to select message text must not open the drawer.
    if (window.getSelection()?.toString()) return;
    onSelect();
  };

  return (
    <div
      id={domId}
      ref={refCallback}
      role="option"
      tabIndex={-1}
      aria-selected={selected}
      aria-hidden={leaving || undefined}
      data-status={record.status}
      className={className}
      onClick={leaving ? undefined : handleClick}
    >
      <span className="spd-row-status" role="img" aria-label={getStatusLabel(record.status, t)}>
        <StatusIcon />
      </span>
      <span className="spd-row-type" title={typeLabel}>
        <i className="spd-type-square" data-type={record.type} aria-hidden="true" />
        {/* Type label is display:none below 720cq; keep it in the a11y tree always. */}
        <span className="spd-sr-only">{typeLabel}</span>
        <span className="spd-type-label" aria-hidden="true">
          {typeLabel}
        </span>
      </span>
      <span className="spd-row-message" title={record.message}>
        {record.message}
      </span>
      <span className="spd-row-path" title={path}>
        {path}
      </span>
      <span className="spd-row-author" title={record.authorName}>
        {record.authorName}
      </span>
      {record.screenshotUrl ? (
        <span className="spd-row-camera" role="img" aria-label={t("drawer.screenshotAlt")}>
          <CameraIcon />
        </span>
      ) : null}
      <time
        className="spd-row-time"
        dateTime={record.createdAt.toISOString()}
        title={formatAbsolute(record.createdAt, locale)}
      >
        {formatRelativeTime(record.createdAt, t)}
      </time>
    </div>
  );
}
