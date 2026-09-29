/**
 * Discussion thread of the feedback detail view: the replies, oldest first,
 * and a composer when the backend takes them. Imported by the panel only, so
 * it ships in the lazily loaded panel chunk (its CSS lives in `DETAIL_CSS`).
 */

import { COMMENT_BODY_MAX_LENGTH, type CommentResponse, type FeedbackResponse, newClientId } from "@siteping/core";
import { el, formatRelativeDate, isMacPlatform, setText } from "./dom-utils.js";
import type { TFunction } from "./i18n/index.js";
import { isCoarsePointer } from "./viewport.js";

export interface ThreadOptions {
  t: TFunction;
  locale: string;
  /** Whether the backend takes replies — the list response's `capabilities.comments`. */
  canPost: boolean;
  /** Post a reply; `null` when the visitor dismissed the identity prompt. Rejects when it failed. */
  post: (body: string, clientId: string) => Promise<CommentResponse | null>;
}

/** The thread under the message — `null` when there is nothing to read and no way to reply. */
export function buildThread(
  feedback: FeedbackResponse,
  { t, locale, canPost, post }: ThreadOptions,
): HTMLElement | null {
  // A server that predates threads sends no `comments` at all.
  const comments = feedback.comments ?? [];
  if (!canPost && comments.length === 0) return null;

  const root = el("div");
  // Polite: a reply that lands is read out, not just drawn.
  const list = el("div", { "aria-live": "polite" });
  const add = (comment: CommentResponse): void => {
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

  // One id per reply, kept across its resends: the server answers a resend of
  // a reply that did land with the stored one instead of adding it twice.
  let clientId = newClientId();
  let sending = false;
  const submit = async (): Promise<void> => {
    const body = input.value.trim();
    if (sending || !body) return;
    sending = true;
    setText(error, "");
    // Read-only, and Send left enabled: a disabled control drops the keyboard
    // focus, and the identity prompt could not hand it back on close.
    input.readOnly = true;
    try {
      const comment = await post(body, clientId);
      if (comment) {
        add(comment);
        input.value = "";
        clientId = newClientId();
      }
    } catch {
      // The text stays in the field for another try.
      setText(error, t("comments.error"));
    } finally {
      sending = false;
      input.readOnly = false;
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
