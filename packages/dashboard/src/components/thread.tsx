import { COMMENT_BODY_MAX_LENGTH, type FeedbackRecord, newClientId } from "@siteping/core";
import type { ReactElement, KeyboardEvent as ReactKeyboardEvent } from "react";
import { useCallback, useId, useRef, useState } from "react";
import { formatAbsolute, formatRelativeTime, toDateTimeAttr } from "../format.js";
import { useInboxUi } from "./context.js";
import { TrashIcon } from "./icons.js";

/**
 * How long a reply or a reply delete may go unanswered before the thread
 * stops waiting and says it failed — whatever the source, which may set no
 * bound of its own. A late answer still lands: a stored reply shows, and a
 * resend of the same text reuses its clientId.
 */
const WAIT_MS = 30_000;

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
  /** A reply or a delete in flight — the thread's buttons show it (`aria-busy`). */
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  // Stable, so it focuses the confirm button once, when the question appears.
  const focusOnMount = useCallback((button: HTMLButtonElement | null) => button?.focus(), []);
  // One id per reply, kept across its resends: a resend of a reply that did
  // land gets the stored one back instead of adding it twice. An edited draft
  // is another reply, with an id of its own.
  const sentRef = useRef<{ body: string; clientId: string } | null>(null);
  const comments = record.comments ?? [];
  if (!canComment && comments.length === 0) return null;

  const run = async (action: () => Promise<void>): Promise<boolean> => {
    setBusy(true);
    setFailed(false);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      await Promise.race([
        action(),
        new Promise((_resolve, reject) => {
          timer = setTimeout(reject, WAIT_MS);
        }),
      ]);
      return true;
    } catch {
      // Reported through `onError`, status included, unless the wait ran out;
      // the thread says it inline. No message of its own for a full thread:
      // the inbox replies as the team, whose replies never meet the cap — a
      // 409 means the server did not take this one as the team's.
      setFailed(true);
      return false;
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  };

  // Controls stay enabled while busy (a disabled button drops the keyboard
  // focus): the handlers ignore what comes in meanwhile.
  const send = async (): Promise<void> => {
    const body = draft.trim();
    if (busy || !body) return;
    if (sentRef.current?.body !== body) sentRef.current = { body, clientId: newClientId() };
    const { clientId } = sentRef.current;
    if (!(await run(() => onAdd(body, clientId)))) return;
    setDraft("");
    sentRef.current = null;
    inputRef.current?.focus();
  };

  const remove = async (commentId: string, confirm: HTMLElement): Promise<void> => {
    // The focused confirm leaves with its reply: focus goes to the composer,
    // else the drawer; never <body>, where the inbox's shortcuts stop. Found
    // now: the thread may unmount with its last reply.
    const next = inputRef.current || confirm.closest<HTMLElement>("[tabindex]");
    if (busy || !(await run(() => onDelete(commentId)))) return;
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
    <section className="spd-thread" aria-labelledby={titleId}>
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
                <span id={`${titleId}q`}>{t("drawer.deleteConfirm")}</span>
                {/* Focus follows the question it answers. */}
                <button
                  ref={focusOnMount}
                  type="button"
                  className="spd-btn-danger"
                  aria-describedby={`${titleId}q`}
                  aria-busy={busy}
                  onClick={(event) => void remove(comment.id, event.currentTarget)}
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
            readOnly={busy}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            type="button"
            className="spd-btn-primary"
            aria-busy={busy}
            aria-disabled={busy}
            onClick={() => void send()}
          >
            {t("comments.send")}
          </button>
        </div>
      ) : null}
      {/* The count, in a status of its own, is read out when a reply comes in
          or goes (the drawer mounts one thread per feedback). The list is not
          live: it holds the delete question, which would be read out as news. */}
      <p className="spd-sr-only" role="status">
        {`${t("comments.title")} (${comments.length})`}
      </p>
      <p className="spd-thread-error" role="alert">
        {failed ? t("comments.failed") : ""}
      </p>
    </section>
  );
}
