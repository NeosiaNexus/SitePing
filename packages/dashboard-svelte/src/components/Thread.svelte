<!--
  The opened feedback's discussion thread: the client's replies from the
  widget and the team's from here, oldest first, then a composer. Nothing is
  optimistic — a reply shows once the source has stored it. Left out when
  there is nothing to read and no way to reply.
-->
<script lang="ts">
  import { COMMENT_BODY_MAX_LENGTH, type CommentRecord, type FeedbackRecord, newClientId } from "@siteping/core";
  import { formatAbsolute, formatRelativeTime, toDateTimeAttr } from "../format.js";
  import { useInboxUi } from "./context.js";
  import Icon from "./Icon.svelte";

  /**
   * How long a reply or a reply delete may go unanswered before the thread
   * stops waiting and says it failed — whatever the source, which may set no
   * bound of its own. A late answer still lands: a stored reply shows, and a
   * resend of the same text reuses its clientId.
   */
  const WAIT_MS = 30_000;

  let {
    record,
    canComment,
    canDelete,
    onadd,
    ondelete,
  }: {
    record: FeedbackRecord;
    /** Replies can be posted — see `InboxState.canComment`. */
    canComment: boolean;
    /** Whether this reply can be deleted — see `InboxState.commentPermissionsOf`. */
    canDelete: (comment: CommentRecord) => boolean;
    onadd: (body: string, clientId: string) => Promise<void>;
    ondelete: (commentId: string) => Promise<void>;
  } = $props();

  const ui = useInboxUi();
  const titleId = $props.id();
  let draft = $state("");
  /** A reply or a delete in flight — the thread's buttons show it (`aria-busy`). */
  let busy = $state(false);
  let failed = $state(false);
  let confirming = $state<string | null>(null);
  let input: HTMLTextAreaElement | null = $state(null);
  // One id per reply, kept across its resends: a resend of a reply that did
  // land gets the stored one back instead of adding it twice. An edited draft
  // is another reply, with an id of its own.
  let sent: { body: string; clientId: string } | null = null;
  const comments = $derived(record.comments ?? []);

  async function run(action: () => Promise<void>): Promise<boolean> {
    busy = true;
    failed = false;
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
      failed = true;
      return false;
    } finally {
      clearTimeout(timer);
      busy = false;
    }
  }

  // Controls stay enabled while busy (a disabled button drops the keyboard
  // focus): the handlers ignore what comes in meanwhile.
  async function send(): Promise<void> {
    const body = draft.trim();
    if (busy || !body) return;
    if (sent?.body !== body) sent = { body, clientId: newClientId() };
    const { clientId } = sent;
    if (!(await run(() => onadd(body, clientId)))) return;
    draft = "";
    sent = null;
    input?.focus();
  }

  async function remove(commentId: string, confirm: HTMLElement): Promise<void> {
    // The focused confirm leaves with its reply: focus goes to the composer,
    // else the drawer; never <body>, where the inbox's shortcuts stop. Found
    // now: the thread may unmount with its last reply.
    const next = input || confirm.closest<HTMLElement>("[tabindex]");
    if (busy || !(await run(() => ondelete(commentId)))) return;
    confirming = null;
    next?.focus();
  }

  function handleKeyDown(event: KeyboardEvent): void {
    // Enter alone starts a new line.
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void send();
    }
  }

  /** Focus follows the question it answers — once, when it appears. */
  const focusOnMount = (button: HTMLButtonElement) => button.focus();
</script>

{#if canComment || comments.length > 0}
  <section class="spd-thread" aria-labelledby={titleId}>
    <h3 id={titleId} class="spd-meta-label">{ui.t("comments.title")}</h3>
    <ol class="spd-thread-list">
      {#each comments as comment (comment.id)}
        <li class="spd-comment" data-role={comment.authorRole}>
          <div class="spd-comment-head">
            <span class="spd-comment-author">{comment.authorName}</span>
            {#if comment.authorRole === "team"}
              <span class="spd-comment-team">{ui.t("comments.team")}</span>
            {/if}
            <time datetime={toDateTimeAttr(comment.createdAt)} title={formatAbsolute(comment.createdAt, ui.locale)}>
              {formatRelativeTime(comment.createdAt, ui.t)}
            </time>
            {#if canDelete(comment)}
              <button
                type="button"
                class="spd-icon-btn"
                data-comment-delete={comment.id}
                aria-label={ui.t("comments.delete")}
                aria-expanded={confirming === comment.id}
                onclick={() => (confirming = confirming === comment.id ? null : comment.id)}
              >
                <Icon name="trash" />
              </button>
            {/if}
          </div>
          {#if confirming === comment.id}
            <div class="spd-confirm">
              <span id={`${titleId}q`}>{ui.t("drawer.deleteConfirm")}</span>
              <button
                {@attach focusOnMount}
                type="button"
                class="spd-btn-danger"
                aria-describedby={`${titleId}q`}
                aria-busy={busy}
                onclick={(event) => void remove(comment.id, event.currentTarget)}
              >
                {ui.t("drawer.deleteYes")}
              </button>
              <button
                type="button"
                class="spd-btn-ghost"
                onclick={(event) => {
                  confirming = null;
                  event.currentTarget
                    .closest("li")
                    ?.querySelector<HTMLButtonElement>("[data-comment-delete]")
                    ?.focus();
                }}
              >
                {ui.t("inbox.cancel")}
              </button>
            </div>
          {/if}
          <p class="spd-message">{comment.body}</p>
        </li>
      {/each}
    </ol>
    {#if canComment}
      <div class="spd-thread-composer">
        <textarea
          bind:this={input}
          bind:value={draft}
          class="spd-thread-input"
          rows={3}
          maxlength={COMMENT_BODY_MAX_LENGTH}
          placeholder={ui.t("comments.placeholder")}
          aria-label={ui.t("comments.placeholder")}
          aria-keyshortcuts="Control+Enter Meta+Enter"
          readonly={busy}
          onkeydown={handleKeyDown}
        ></textarea>
        <button
          type="button"
          class="spd-btn-primary"
          aria-busy={busy}
          aria-disabled={busy}
          onclick={() => void send()}
        >
          {ui.t("comments.send")}
        </button>
      </div>
    {/if}
    <!-- The count, in a status of its own, is read out when a reply comes in
         or goes (the drawer mounts one thread per feedback). The list is not
         live: it holds the delete question, which would be read out as news. -->
    <p class="spd-sr-only" role="status">{`${ui.t("comments.title")} (${comments.length})`}</p>
    <p class="spd-thread-error" role="alert">{failed ? ui.t("comments.failed") : ""}</p>
  </section>
{/if}
