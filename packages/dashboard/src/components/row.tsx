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
  focused: boolean;
  /** Ghost row kept briefly in the DOM while its status-leave animation runs. */
  leaving: boolean;
  onSelect: () => void;
  refCallback: (el: HTMLDivElement | null) => void;
}

/** One feedback line in the listbox — density-aware, ellipsized, keyboard-driven from the root. */
export function Row({ record, domId, focused, leaving, onSelect, refCallback }: RowProps): ReactElement {
  const { t, locale } = useInboxUi();
  const StatusIcon = STATUS_ICONS[record.status];
  const className = `spd-row${focused ? " spd-row-focused" : ""}${leaving ? " spd-row-leaving" : ""}`;

  return (
    <div
      id={domId}
      ref={refCallback}
      role="option"
      tabIndex={-1}
      aria-selected={focused}
      aria-hidden={leaving || undefined}
      data-status={record.status}
      className={className}
      onClick={leaving ? undefined : onSelect}
    >
      <span className="spd-row-status" role="img" aria-label={getStatusLabel(record.status, t)}>
        <StatusIcon />
      </span>
      <span className="spd-row-type" title={getTypeLabel(record.type, t)}>
        <i className="spd-type-square" data-type={record.type} aria-hidden="true" />
        <span className="spd-type-label">{getTypeLabel(record.type, t)}</span>
      </span>
      <span className="spd-row-message">{record.message}</span>
      <span className="spd-row-path">{pathFromUrl(record.url)}</span>
      <span className="spd-row-author">{record.authorName}</span>
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
