import { COMMENT_BODY_MAX_LENGTH, type FeedbackRecord, newClientId } from "@siteping/core";
import type { ReactElement, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { formatAbsolute, formatRelativeTime, toDateTimeAttr } from "../format.js";
import { tWithParams } from "../i18n/index.js";
import { useInboxUi } from "./context.js";
import { TrashIcon } from "./icons.js";

interface ThreadProps {
  record: FeedbackRecord;
  /** Replies can be posted — see `InboxState.canComment`. */
  canComment: boolean;
  /** Replies can be deleted — see `InboxState.canDeleteComment`. */
  canDelete: boolean;
  onAdd: (body: string, clientId: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
}

/**
 * The opened feedback's discussion thread: the client's replies from the
 * widget and the team's from here, oldest first, then a composer. Nothing is
 * optimistic — a reply shows once the source has stored it. Left out when
 * there is nothing to read and no way to reply.
 */
export function Thread({ record, canComment, canDelete, onAdd, onDelete }: ThreadProps): ReactElement | null {
  const { t, locale } = useInboxUi();
  const titleId = useId();
  const [draft, setDraft] = useState("");
  /** What is in flight — its button shows it (`aria-busy`). */
  const [busy, setBusy] = useState<"send" | "delete" | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const sectionRef = useRef<HTMLElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // Stable, so it focuses the confirm button once, when the question appears.
  const focusOnMount = useCallback((button: HTMLButtonElement | null) => button?.focus(), []);
  // One id per reply, kept across its resends: a resend of a reply that did
  // land gets the stored one back instead of adding it twice. An edited draft
  // is another reply, with an id of its own.
  const sentRef = useRef<{ body: string; clientId: string } | null>(null);
  const comments = record.comments ?? [];
  /** The replies drawn last render — what a reply coming in or going is told apart from. */
  const shownRef = useRef<Set<string> | null>(null);
  // Announced in a status of its own: the list holds the delete controls,
  // whose question would be read out as news.
  useEffect(() => {
    const shown = shownRef.current;
    shownRef.current = new Set(comments.map((c) => c.id));
    if (!shown) return;
    const added = comments.filter((c) => !shown.has(c.id)).at(-1);
    if (added) setAnnouncement(tWithParams(t, "comments.added", { name: added.authorName }));
    else if (shown.size > shownRef.current.size) setAnnouncement(t("comments.deleted"));
  });
  if (!canComment && comments.length === 0) return null;

  const run = async (kind: "send" | "delete", action: () => Promise<void>): Promise<boolean> => {
    setBusy(kind);
    setFailed(false);
    try {
      await action();
      return true;
    } catch {
      // Already reported through `onError`; the thread says it inline.
      setFailed(true);
      return false;
    } finally {
      setBusy(null);
    }
  };

  // Controls stay enabled while busy (a disabled button drops the keyboard
  // focus): the handlers ignore what comes in meanwhile.
  const send = async (): Promise<void> => {
    const body = draft.trim();
    if (busy || !body) return;
    if (sentRef.current?.body !== body) sentRef.current = { body, clientId: newClientId() };
    const { clientId } = sentRef.current;
    if (!(await run("send", () => onAdd(body, clientId)))) return;
    setDraft("");
    sentRef.current = null;
    inputRef.current?.focus();
  };

  const remove = async (commentId: string): Promise<void> => {
    const index = comments.findIndex((c) => c.id === commentId);
    const neighbor = comments[index + 1] ?? comments[index - 1];
    const section = sectionRef.current;
    // The focused confirm leaves with its reply: focus goes to the next
    // reply's delete (else the previous one's), else the composer, else — the
    // thread gone with its last reply — the drawer; never <body>, where the
    // inbox's shortcuts stop. Found now: the thread may unmount meanwhile.
    const next =
      (neighbor && section?.querySelector<HTMLElement>(`[data-comment-delete="${CSS.escape(neighbor.id)}"]`)) ||
      inputRef.current ||
      section?.parentElement?.closest<HTMLElement>("[tabindex]");
    if (busy || !(await run("delete", () => onDelete(commentId)))) return;
    setConfirming(null);
    next?.focus();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>): void => {
    // Enter alone starts a new line.
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <section ref={sectionRef} className="spd-thread" aria-labelledby={titleId}>
      <h3 id={titleId} className="spd-meta-label">
        {t("comments.title")}
      </h3>
      <ol className="spd-thread-list">
        {comments.map((comment) => (
          <li key={comment.id} className="spd-comment" data-role={comment.authorRole}>
            <div className="spd-comment-head">
              <span className="spd-comment-author">{comment.authorName}</span>
              {comment.authorRole === "team" ? <span className="spd-comment-team">{t("comments.team")}</span> : null}
              <time dateTime={toDateTimeAttr(comment.createdAt)} title={formatAbsolute(comment.createdAt, locale)}>
                {formatRelativeTime(comment.createdAt, t)}
              </time>
              {canDelete ? (
                <button
                  type="button"
                  className="spd-icon-btn"
                  data-comment-delete={comment.id}
                  aria-label={t("comments.delete")}
                  aria-expanded={confirming === comment.id}
                  onClick={() => setConfirming(confirming === comment.id ? null : comment.id)}
                >
                  <TrashIcon />
                </button>
              ) : null}
            </div>
            {confirming === comment.id ? (
              <div className="spd-confirm">
                <span id={`${titleId}q`}>{t("comments.deleteConfirm")}</span>
                {/* Focus follows the question it answers. */}
                <button
                  ref={focusOnMount}
                  type="button"
                  className="spd-btn-danger"
                  aria-describedby={`${titleId}q`}
                  aria-busy={busy === "delete"}
                  onClick={() => void remove(comment.id)}
                >
                  {t("drawer.deleteYes")}
                </button>
                <button
                  type="button"
                  className="spd-btn-ghost"
                  onClick={(event) => {
                    setConfirming(null);
                    event.currentTarget
                      .closest("li")
                      ?.querySelector<HTMLButtonElement>("[data-comment-delete]")
                      ?.focus();
                  }}
                >
                  {t("inbox.cancel")}
                </button>
              </div>
            ) : null}
            <p className="spd-message">{comment.body}</p>
          </li>
        ))}
      </ol>
      {canComment ? (
        <div className="spd-thread-composer">
          <textarea
            ref={inputRef}
            className="spd-thread-input"
            rows={3}
            value={draft}
            maxLength={COMMENT_BODY_MAX_LENGTH}
            placeholder={t("comments.placeholder")}
            aria-label={t("comments.placeholder")}
            aria-keyshortcuts="Control+Enter Meta+Enter"
            readOnly={busy !== null}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="spd-btn-primary"
            aria-busy={busy === "send"}
            aria-disabled={busy !== null}
            onClick={() => void send()}
          >
            {t("comments.send")}
          </button>
        </div>
      ) : null}
      <p className="spd-sr-only" role="status">
        {announcement}
      </p>
      <p className="spd-thread-error" role="alert">
        {failed ? t("comments.failed") : ""}
      </p>
    </section>
  );
}
