/**
 * Discussion thread of the feedback detail view: the replies, oldest first,
 * and a composer when the backend takes them. Imported by the panel only, so
 * it ships in the lazily loaded panel chunk (its CSS lives in `DETAIL_CSS`).
 */

import { COMMENT_BODY_MAX_LENGTH, type CommentResponse, type FeedbackResponse, newClientId } from "@siteping/core";
import { el, formatRelativeDate, isMacPlatform, setText } from "./dom-utils.js";
import type { TFunction } from "./i18n/index.js";
import { isCoarsePointer } from "./viewport.js";

/**
 * A feedback's composer, kept by the panel across renders of its thread: a
 * list reload or a panel action's `refresh()` draws the detail view again,
 * and the draft, a reply in flight and its clientId must outlive that.
 */
export interface ThreadDraft {
  text: string;
  /**
   * The text last sent and its clientId, kept across its resends: the server
   * answers a resend of a reply that did land with the stored one instead of
   * adding it twice. An edited draft is another reply — under the first
   * one's id, that landed first text would come back in its place.
   */
  sent?: { body: string; clientId: string } | undefined;
  sending?: boolean | undefined;
  /** The render on screen, which a reply that lands goes to — whichever render sent it. */
  view?: { add(comment: CommentResponse): void; input: HTMLTextAreaElement; error: HTMLElement } | undefined;
}

export interface ThreadOptions {
  t: TFunction;
  locale: string;
  /** Whether the backend takes replies — the list response's `capabilities.comments`. */
  canPost: boolean;
  /** This feedback's composer state. */
  draft: ThreadDraft;
  /** Post a reply; `null` when the visitor dismissed the identity prompt. Rejects when it failed. */
  post: (body: string, clientId: string) => Promise<CommentResponse | null>;
}

/** The thread under the message — `null` when there is nothing to read and no way to reply. */
export function buildThread(
  feedback: FeedbackResponse,
  { t, locale, canPost, draft, post }: ThreadOptions,
): HTMLElement | null {
  // A server that predates threads sends no `comments` at all.
  const comments = feedback.comments ?? [];
  if (!canPost && comments.length === 0) return null;

  const root = el("div");
  // Polite: a reply that lands is read out, not just drawn.
  const list = el("div", { "aria-live": "polite" });
  const shown = new Set<string>();
  const add = (comment: CommentResponse): void => {
    // A reload may have brought the reply in before its own answer did.
    if (shown.has(comment.id)) return;
    shown.add(comment.id);
    const item = el("div", { class: "sp-detail-message sp-comment", "data-role": comment.authorRole });
    const head = el("div", { class: "sp-comment-head" });
    const author = el("span");
    setText(author, comment.authorName);
    head.appendChild(author);
    if (comment.authorRole === "team") {
      const badge = el("span", { class: "sp-badge" });
      setText(badge, t("comments.team"));
      head.appendChild(badge);
    }
    const time = el("time", { datetime: comment.createdAt });
    setText(time, formatRelativeDate(comment.createdAt, locale));
    head.appendChild(time);
    const body = el("div");
    setText(body, comment.body);
    item.append(head, body);
    list.appendChild(item);
  };
  for (const comment of comments) add(comment);
  root.appendChild(list);
  if (!canPost) return root;

  const input = document.createElement("textarea");
  input.className = "sp-input sp-thread-input";
  input.rows = 3;
  input.maxLength = COMMENT_BODY_MAX_LENGTH;
  input.placeholder = t("comments.placeholder");
  input.setAttribute("aria-label", input.placeholder);
  input.value = draft.text;
  input.readOnly = draft.sending === true;
  input.addEventListener("input", () => {
    draft.text = input.value;
  });

  const foot = el("div", { class: "sp-thread-foot" });
  // Left empty on touch screens, like the feedback form's hint: no hardware
  // keyboard to press the shortcut with. The span keeps Send on the right.
  const hint = el("span");
  if (!isCoarsePointer()) setText(hint, t(isMacPlatform() ? "popup.submitHintMac" : "popup.submitHintOther"));
  const send = document.createElement("button");
  send.type = "button";
  send.className = "sp-btn-primary";
  setText(send, t("popup.submit"));
  foot.append(hint, send);
  // Filled on failure: an alert is announced when its text changes.
  const error = el("div", { class: "sp-thread-error", role: "alert" });
  root.append(input, foot, error);
  const rendered = { add, input, error };
  draft.view = rendered;

  const submit = async (): Promise<void> => {
    draft.text = input.value;
    const body = draft.text.trim();
    if (draft.sending || !body) return;
    if (draft.sent?.body !== body) draft.sent = { body, clientId: newClientId() };
    const { clientId } = draft.sent;
    draft.sending = true;
    setText(error, "");
    // Read-only, and Send left enabled: a disabled control drops the keyboard
    // focus, and the identity prompt could not hand it back on close.
    input.readOnly = true;
    let failed = false;
    let comment: CommentResponse | null = null;
    try {
      comment = await post(body, clientId);
    } catch {
      failed = true;
    }
    draft.sending = false;
    // The thread may have been drawn again meanwhile: settle the one on screen.
    const view = draft.view ?? rendered;
    view.input.readOnly = false;
    // On failure the text stays in the field for another try.
    setText(view.error, failed ? t("comments.error") : "");
    if (comment) {
      view.add(comment);
      view.input.value = draft.text = "";
      draft.sent = undefined;
    }
  };
  send.addEventListener("click", () => void submit());
  // Same shortcut as the feedback popup — Enter alone starts a new line.
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  });
  return root;
}
