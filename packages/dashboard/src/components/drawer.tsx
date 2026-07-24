import type { FeedbackRecord, FeedbackStatus } from "@siteping/core";
import type { ReactElement, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { buildDeepLink, formatAbsolute, formatRelativeTime, resolveRecordUrl, shortId } from "../format.js";
import { getTypeLabel } from "../i18n/index.js";
import { useInboxUi } from "./context.js";
import { Diagnostics } from "./diagnostics.js";
import { EvidenceCard } from "./evidence-card.js";
import { CloseIcon, ExternalIcon, TrashIcon } from "./icons.js";
import { StatusMenu } from "./status-menu.js";

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface DrawerProps {
  record: FeedbackRecord;
  /** True below the 960cq container breakpoint — drawer overlays the list with a backdrop and traps focus. */
  overlay: boolean;
  deepLinkParam: string;
  onClose: () => void;
  onChangeStatus: (id: string, status: FeedbackStatus) => void;
  onDelete: (id: string) => void;
}

/**
 * Detail dialog for the opened feedback. Mounted with `key={record.id}` by the
 * root, so per-record UI state (delete confirm, evidence zoom) resets on every
 * open. Focus lands on the close button when it opens and returns to the
 * previously focused element (the listbox) when it closes.
 */
export function Drawer({
  record,
  overlay,
  deepLinkParam,
  onClose,
  onChangeStatus,
  onDelete,
}: DrawerProps): ReactElement {
  const { t, locale } = useInboxUi();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Focus management. Overlay mode is a modal dialog: focus moves to the
  // drawer container (NOT the close button — keydown Enter on a focused
  // button natively activates it, which would turn the advertised
  // "Enter jumps to the page" into "Enter closes the drawer") and returns to
  // the opener on unmount. Side-by-side mode is a complementary panel: focus
  // stays in the listbox so j/k/Enter keep working uninterrupted.
  useEffect(() => {
    if (!overlay) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    return () => {
      const active = document.activeElement;
      const leftInside = active === null || active === document.body || panelRef.current?.contains(active) === true;
      if (leftInside && previous?.isConnected) previous.focus();
    };
  }, [overlay]);

  // Focus trap — only in overlay mode; side-by-side keeps the natural tab order.
  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>): void => {
    if (!overlay || event.key !== "Tab") return;
    const root = panelRef.current;
    if (!root) return;
    const focusables = root.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (!first || !last) return;
    // Focus can rest on the container itself (it takes focus on open); Shift+Tab
    // from there must wrap to the last focusable, not escape behind the backdrop.
    if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const diagnostics = record.diagnostics;
  const hasDiagnostics = diagnostics !== null && diagnostics.console.length + diagnostics.network.length > 0;
  // Null for non-http(s) record URLs — the link/CTA render as plain text / not at all.
  const pageUrl = resolveRecordUrl(record.url);
  const deepLink = buildDeepLink(record, deepLinkParam);

  return (
    <>
      {overlay ? (
        // biome-ignore lint/a11y/noStaticElementInteractions: standard dialog backdrop — Esc is the keyboard path
        <div className="spd-drawer-backdrop" role="presentation" onClick={onClose} />
      ) : null}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the panel is a dialog/region widget; the keydown handler drives the focus trap */}
      {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-modal is only emitted in overlay mode, where the role is dialog */}
      <div
        ref={panelRef}
        className="spd-drawer"
        // Overlay is a modal dialog; side-by-side is a non-modal complementary panel.
        role={overlay ? "dialog" : "region"}
        aria-modal={overlay || undefined}
        aria-label={`${t("drawer.title")} — ${getTypeLabel(record.type, t)} #${shortId(record.id)}`}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <h2 className="spd-sr-only">{t("drawer.title")}</h2>
        <div className="spd-drawer-head">
          <div className="spd-drawer-titles">
            <span className="spd-drawer-type">
              <i className="spd-type-square" data-type={record.type} aria-hidden="true" />
              {getTypeLabel(record.type, t)}
            </span>
            <span className="spd-drawer-id" title={record.id}>
              #{shortId(record.id)}
            </span>
          </div>
          <StatusMenu status={record.status} onSelect={(status) => onChangeStatus(record.id, status)} />
          <button
            ref={closeRef}
            type="button"
            className="spd-icon-btn spd-drawer-close"
            aria-label={t("drawer.close")}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
        <div className="spd-drawer-scroll">
          <EvidenceCard record={record} />
          <p className="spd-message">{record.message}</p>
          <dl className="spd-meta-grid">
            <dt className="spd-meta-label">{t("drawer.author")}</dt>
            <dd className="spd-meta-value">
              {/* Empty email = redacted by the adapter (unauthenticated request) — skip the <> shell. */}
              {record.authorEmail ? (
                <>
                  {record.authorName} <span data-mono>&lt;{record.authorEmail}&gt;</span>
                </>
              ) : (
                record.authorName
              )}
            </dd>
            <dt className="spd-meta-label">{t("drawer.page")}</dt>
            <dd className="spd-meta-value" data-mono>
              {pageUrl ? (
                <a href={pageUrl} target="_blank" rel="noreferrer">
                  {record.url}
                </a>
              ) : (
                record.url
              )}
            </dd>
            <dt className="spd-meta-label">{t("drawer.viewport")}</dt>
            <dd className="spd-meta-value" data-mono>
              {record.viewport}
            </dd>
            <dt className="spd-meta-label">{t("drawer.submitted")}</dt>
            <dd className="spd-meta-value">
              <time dateTime={record.createdAt.toISOString()}>{formatAbsolute(record.createdAt, locale)}</time>
              {" · "}
              {formatRelativeTime(record.createdAt, t)}
            </dd>
            <dt className="spd-meta-label">{t("drawer.browser")}</dt>
            <dd className="spd-meta-value spd-clamp-2" title={record.userAgent}>
              {record.userAgent}
            </dd>
          </dl>
          {hasDiagnostics && diagnostics ? <Diagnostics diagnostics={diagnostics} /> : null}
          <div className="spd-danger-zone">
            {confirming ? (
              <div className="spd-confirm">
                <span>{t("drawer.deleteConfirm")}</span>
                <button type="button" className="spd-btn-danger" onClick={() => onDelete(record.id)}>
                  {t("drawer.deleteYes")}
                </button>
                <button type="button" className="spd-btn-ghost" onClick={() => setConfirming(false)}>
                  {t("inbox.cancel")}
                </button>
              </div>
            ) : (
              <button type="button" className="spd-btn-danger-ghost" onClick={() => setConfirming(true)}>
                <TrashIcon />
                {t("drawer.delete")}
              </button>
            )}
          </div>
        </div>
        {deepLink ? (
          <div className="spd-drawer-foot">
            <a className="spd-btn-primary" href={deepLink} target="_blank" rel="noreferrer">
              {t("drawer.openOnPage")}
              <ExternalIcon />
            </a>
            <kbd className="spd-kbd">⏎</kbd>
          </div>
        ) : null}
      </div>
    </>
  );
}
