/**
 * Outgoing webhook notifications for newly-created feedbacks.
 *
 * Plug a Slack, Discord, or generic HTTP endpoint into `createSitepingHandler`
 * to receive a payload whenever a feedback is successfully persisted. Webhooks
 * are dispatched as fire-and-forget (`void Promise.all(...)`) so a slow or
 * down receiver never blocks the client response — the feedback is already in
 * the DB by the time we dial out.
 *
 * - **Type-specific formatting**: Slack uses `{ text, blocks }`, Discord uses
 *   `{ content, embeds }`, generic posts the record as JSON (minus `clientId`).
 * - **Untrusted input**: `message` and `authorName` come from anonymous
 *   visitors. Slack text is escaped and Discord mention parsing is disabled,
 *   so a public feedback form can never be turned into a channel-wide ping.
 * - **Timeout**: 5s by default (overridable per webhook).
 * - **Error handling**: `config.onError(err, feedback.id)` is invoked when
 *   present; otherwise we log a one-liner to `console.warn` so the issue is
 *   surfaced without crashing the request.
 */

import type { FeedbackRecord, FeedbackType } from "@siteping/core";

/** Supported webhook integrations — drives the JSON body shape. */
export type WebhookType = "slack" | "discord" | "generic";

/**
 * Outgoing webhook configuration.
 *
 * - `url` — required, the HTTPS endpoint to POST to.
 * - `type` — payload format. Defaults to `"generic"` (raw JSON).
 * - `headers` — extra headers merged on top of `Content-Type: application/json`.
 *   Useful for signed-payload schemes (`X-Signature`, bearer tokens, …).
 * - `timeoutMs` — abort the fetch after this many ms. Defaults to 5000.
 * - `onError` — invoked with the underlying error and the feedback id when
 *   the dispatch fails (network error, non-2xx, timeout). The webhook is
 *   fire-and-forget, so this is your only chance to observe failures.
 */
export interface WebhookConfig {
  url: string;
  type?: WebhookType;
  headers?: Record<string, string>;
  timeoutMs?: number;
  onError?: (err: Error, feedbackId: string) => void;
}

const DEFAULT_TIMEOUT_MS = 5000;

/** Decimal RGB colour table used by Discord embeds — keyed by feedback type. */
const DISCORD_COLORS: Readonly<Record<FeedbackType, number>> = {
  bug: 0xef4444,
  question: 0x3b82f6,
  change: 0xf59e0b,
  other: 0x6b7280,
};

const DEFAULT_DISCORD_COLOR = 0x6b7280;

// ---------------------------------------------------------------------------
// Payload shapes — narrow types let TypeScript catch malformed bodies at
// compile time rather than only at the receiving end.
// ---------------------------------------------------------------------------

/** Block Kit envelope used by Slack incoming webhooks. */
export interface SlackWebhookPayload {
  text: string;
  blocks: ReadonlyArray<SlackHeaderBlock | SlackSectionBlock | SlackContextBlock>;
}

interface SlackHeaderBlock {
  type: "header";
  text: { type: "plain_text"; text: string; emoji: true };
}

interface SlackSectionBlock {
  type: "section";
  text: { type: "mrkdwn"; text: string };
}

interface SlackContextBlock {
  type: "context";
  elements: ReadonlyArray<{ type: "mrkdwn"; text: string }>;
}

/** Embed envelope used by Discord incoming webhooks. */
export interface DiscordWebhookPayload {
  content: string;
  embeds: ReadonlyArray<{
    title: string;
    description: string;
    color: number;
    fields: ReadonlyArray<{ name: string; value: string; inline: boolean }>;
    timestamp: string;
  }>;
  /**
   * Mention parsing is switched off: `content` carries end-user text, so an
   * author called `@everyone` must render as text, never as a notification.
   */
  allowed_mentions: { parse: ReadonlyArray<"roles" | "users" | "everyone"> };
}

/**
 * Generic webhook body — the stored record as JSON. `clientId` is stripped like
 * on every other output: it is the browser-local dedup secret and the POST
 * replay path hands the full record to whoever presents it.
 */
export type GenericWebhookPayload = Omit<FeedbackRecord, "clientId">;

/** Mapping from webhook type to its concrete body shape. */
export interface WebhookPayloadMap {
  slack: SlackWebhookPayload;
  discord: DiscordWebhookPayload;
  generic: GenericWebhookPayload;
}

/** Truncate a message for chat-platform previews (Slack/Discord look bad with walls of text). */
function truncate(text: string, max = 300): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/** Block Kit caps `header` text at 150 characters — longer payloads are rejected outright. */
const SLACK_HEADER_MAX = 150;

/**
 * Escape the three characters Slack parses as control characters in message
 * text (`&`, `<`, `>`) — the exact escaping Slack's formatting rules require
 * for user-provided content. Feedback text is typed by anonymous visitors:
 * unescaped, `<!channel>` notifies the whole channel and
 * `<https://evil.example|Reset your password>` renders as a disguised link.
 */
function escapeSlackText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Slack message: text fallback + Block Kit blocks for rich rendering. Every
 * `mrkdwn` field is escaped; the `plain_text` header is rendered verbatim by
 * Slack (no markup parsing), so it keeps the raw author name.
 */
function buildSlackPayload(feedback: FeedbackRecord): SlackWebhookPayload {
  const preview = escapeSlackText(truncate(feedback.message));
  const author = escapeSlackText(feedback.authorName);
  const headline = `New ${feedback.type} feedback from ${feedback.authorName}`;
  return {
    text: `${escapeSlackText(headline)}: ${preview}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: truncate(headline, SLACK_HEADER_MAX), emoji: true },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: preview },
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `*Project:* ${escapeSlackText(feedback.projectName)}` },
          { type: "mrkdwn", text: `*Type:* ${feedback.type}` },
          { type: "mrkdwn", text: `*URL:* ${escapeSlackText(feedback.url)}` },
          { type: "mrkdwn", text: `*From:* ${author} (${escapeSlackText(feedback.authorEmail)})` },
        ],
      },
    ],
  };
}

/**
 * Discord message: content fallback + embed for rich rendering. Sent with
 * mention parsing disabled — `content` embeds the author name, and Discord
 * would otherwise turn `@everyone` / `@here` into a server-wide ping.
 */
function buildDiscordPayload(feedback: FeedbackRecord): DiscordWebhookPayload {
  const preview = truncate(feedback.message);
  return {
    content: `New **${feedback.type}** feedback from **${feedback.authorName}**`,
    embeds: [
      {
        title: `${feedback.type} — ${feedback.projectName}`,
        description: preview,
        color: DISCORD_COLORS[feedback.type] ?? DEFAULT_DISCORD_COLOR,
        fields: [
          { name: "URL", value: feedback.url, inline: false },
          { name: "Author", value: `${feedback.authorName} (${feedback.authorEmail})`, inline: true },
          { name: "Viewport", value: feedback.viewport, inline: true },
        ],
        timestamp: new Date(feedback.createdAt).toISOString(),
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

/** Generic JSON body — the record minus its `clientId`. */
function buildGenericPayload(feedback: FeedbackRecord): GenericWebhookPayload {
  const { clientId: _clientId, ...payload } = feedback;
  return payload;
}

/**
 * Build the JSON body for a single webhook based on its `type`.
 * Exported for tests; not part of the public API.
 *
 * @internal
 */
export function buildWebhookPayload<T extends WebhookType | undefined>(
  type: T,
  feedback: FeedbackRecord,
): T extends "slack" ? SlackWebhookPayload : T extends "discord" ? DiscordWebhookPayload : GenericWebhookPayload {
  switch (type) {
    case "slack":
      return buildSlackPayload(feedback) as never;
    case "discord":
      return buildDiscordPayload(feedback) as never;
    default:
      return buildGenericPayload(feedback) as never;
  }
}

/**
 * Dispatch a single webhook. Fire-and-forget: never throws, never rejects.
 *
 * - Builds the type-specific payload.
 * - POSTs with an `AbortSignal` timeout.
 * - On any error (network, non-2xx, timeout, exception), invokes
 *   `config.onError(err, feedbackId)` if provided; otherwise logs a one-liner.
 */
export async function dispatchWebhook(config: WebhookConfig, feedback: FeedbackRecord): Promise<void> {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const body = JSON.stringify(buildWebhookPayload(config.type ?? "generic", feedback));

  // Build merged headers — caller-supplied entries override `Content-Type`
  // when they explicitly need a different mime (rare for chat webhooks, but
  // possible for some generic receivers).
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(config.headers ?? {}) };

  // Use AbortSignal.timeout when available (Node 17.3+, all modern browsers).
  // Fall back to a manual controller for environments lacking it.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const err = new Error(`Webhook responded with HTTP ${response.status}`);
      reportError(config, err, feedback.id);
    }
  } catch (rawError) {
    clearTimeout(timer);
    const err = rawError instanceof Error ? rawError : new Error(String(rawError));
    reportError(config, err, feedback.id);
  }
}

function reportError(config: WebhookConfig, err: Error, feedbackId: string): void {
  if (config.onError) {
    try {
      config.onError(err, feedbackId);
    } catch (callbackErr) {
      // Defense-in-depth: a thrown user callback must not bubble back up
      // and crash the request that already succeeded persisting the
      // feedback. Surface the original error too so it isn't silently lost.
      console.warn(
        `[siteping] webhook onError() callback threw for feedback ${feedbackId}: ${String(callbackErr)} (original error: ${err.message})`,
      );
    }
    return;
  }
  console.warn(`[siteping] webhook to ${config.url} failed for feedback ${feedbackId}: ${err.message}`);
}

/**
 * Dispatch every configured webhook in parallel. Awaiting the returned promise
 * lets tests synchronize on completion, but production callers should drop the
 * promise on the floor (`void dispatchWebhooks(...)`) so the HTTP response
 * isn't held back on slow receivers.
 */
export async function dispatchWebhooks(configs: readonly WebhookConfig[], feedback: FeedbackRecord): Promise<void> {
  if (configs.length === 0) return;
  await Promise.all(configs.map((c) => dispatchWebhook(c, feedback)));
}
