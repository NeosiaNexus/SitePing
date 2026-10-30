/**
 * Outgoing webhook notifications.
 *
 * Plug a Slack, Discord, or generic HTTP endpoint into `createSitepingHandler`
 * to receive a payload once a write succeeds: a feedback created (the
 * default), its status changed, a feedback or a project's feedback deleted,
 * a reply posted — each webhook picks its `events`, and every delivery names
 * its event in the `X-Siteping-Event` header. Webhooks are dispatched as
 * fire-and-forget (`void Promise.all(...)`) so a slow or down receiver never
 * blocks the client response — the write is already in the DB by the time we
 * dial out.
 *
 * - **Type-specific formatting**: Slack uses `{ text, blocks }`, Discord uses
 *   `{ content, embeds }`, generic posts the record as JSON (minus `clientId`).
 * - **Untrusted input**: `message` and `authorName` come from anonymous
 *   visitors. Slack text is escaped, Discord markdown is escaped and its
 *   mention parsing disabled, so a public feedback form can never be turned
 *   into a channel-wide ping or a disguised link.
 * - **Timeout**: 5s by default (overridable per webhook).
 * - **Error handling**: `config.onError(err, feedbackId, delivery)` is invoked
 *   when present; otherwise we log a one-liner to `console.warn` so the issue
 *   is surfaced without crashing the request.
 */

import type {
  CommentRecord,
  CommentResponse,
  FeedbackRecord,
  FeedbackStatus,
  FeedbackType,
  Prettify,
  Serialized,
} from "@siteping/core";
import type { SitepingCreatedComment, SitepingDeletionTarget } from "./options.js";

/** Supported webhook integrations — drives the JSON body shape. */
export type WebhookType = "slack" | "discord" | "generic";

/**
 * What a delivery reports — sent as its `X-Siteping-Event` header, and what a
 * webhook's `events` subscribes to:
 *
 * - `feedback.created` — a feedback was stored (never for a replayed `clientId`).
 * - `feedback.status_changed` — a PATCH set a feedback's status, even the one it had.
 * - `feedback.deleted` — one feedback, or every feedback of a project, was deleted.
 * - `comment.created` — a reply was stored (never for a replayed `clientId`).
 */
export type WebhookEvent = keyof GenericWebhookEventMap;

/** Every {@link WebhookEvent}, in the order above — e.g. to validate an `X-Siteping-Event` header. */
export const WEBHOOK_EVENTS = [
  "feedback.created",
  "feedback.status_changed",
  "feedback.deleted",
  "comment.created",
] as const satisfies ReadonlyArray<WebhookEvent>;

/** Compile lock: `WEBHOOK_EVENTS` lists every key of {@link GenericWebhookEventMap}. */
const _everyEventListed: Exclude<WebhookEvent, (typeof WEBHOOK_EVENTS)[number]> extends never ? true : never = true;
void _everyEventListed;

/** What a webhook receives when it sets no `events`: the creation alone, as before events existed. */
const DEFAULT_EVENTS: ReadonlyArray<WebhookEvent> = ["feedback.created"];

/** Header naming a delivery's event — set on every request. */
const EVENT_HEADER = "X-Siteping-Event";

/** What `onError` learns about the failed delivery, beyond the feedback id. */
export interface WebhookDeliveryInfo {
  event: WebhookEvent;
  projectName: string;
}

/**
 * Outgoing webhook configuration.
 *
 * - `url` — required, the HTTPS endpoint to POST to.
 * - `type` — payload format. Defaults to `"generic"` (raw JSON).
 * - `headers` — extra headers merged on top of `Content-Type: application/json`.
 *   Useful for signed-payload schemes (`X-Signature`, bearer tokens, …).
 * - `timeoutMs` — abort the fetch after this many ms: a positive integer of
 *   at most 2,147,483,647, the longest delay a timer holds. Defaults to 5000.
 * - `events` — the {@link WebhookEvent}s this webhook receives: a non-empty
 *   list, defaulting to `["feedback.created"]`, so a webhook set up before
 *   events existed gets exactly the deliveries it always did.
 * - `onError` — invoked with the underlying error, the id of the feedback the
 *   delivery is about (`""` for a project-wide deletion) and the delivery's
 *   event and project, when the dispatch fails (network error, non-2xx,
 *   timeout). The webhook is fire-and-forget, so this is your only chance to
 *   observe failures. An async one is awaited: the delivery `waitUntil` holds
 *   covers it, and its rejection is reported like a throw, never left
 *   unhandled.
 */
export interface WebhookConfig {
  url: string;
  type?: WebhookType;
  headers?: Record<string, string>;
  timeoutMs?: number;
  events?: ReadonlyArray<WebhookEvent>;
  onError?: (err: Error, feedbackId: string, delivery: WebhookDeliveryInfo) => void | Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 5000;

/** Longest delay a timer holds: Node and browsers fire a longer one at once, which would abort every delivery. */
const TIMER_MAX_DELAY_MS = 2_147_483_647;

/** Why `timeoutMs` cannot bound a delivery, or `null` when it can (or is unset). */
function timeoutProblem(timeoutMs: number | undefined): string | null {
  if (
    timeoutMs === undefined ||
    (Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= TIMER_MAX_DELAY_MS)
  ) {
    return null;
  }
  return `timeoutMs must be a positive integer of at most ${TIMER_MAX_DELAY_MS}, got ${timeoutMs}`;
}

/** Why `events` cannot route deliveries, or `null` when it can (or is unset). */
function eventsProblem(events: ReadonlyArray<WebhookEvent> | undefined): string | null {
  if (events === undefined) return null;
  if (!Array.isArray(events) || events.length === 0) return "events must list at least one event";
  const unknown = events.find((event) => !(WEBHOOK_EVENTS as ReadonlyArray<string>).includes(event));
  if (unknown !== undefined)
    return `unknown event ${JSON.stringify(unknown)} in events (one of ${WEBHOOK_EVENTS.join(", ")})`;
  return null;
}

/**
 * Refuse a webhook whose `timeoutMs` no timer holds, or whose `events` would
 * route nothing (empty) or name no event (a typo), when the handler is
 * created rather than on every delivery.
 *
 * @throws Error naming the webhook by its origin: its path may be a credential.
 */
export function checkWebhookConfigs(configs: readonly WebhookConfig[]): void {
  for (const config of configs) {
    const problem = timeoutProblem(config.timeoutMs) ?? eventsProblem(config.events);
    if (problem) {
      throw new Error(`[siteping] createSitepingHandler: webhook to ${webhookOrigin(config.url)}: ${problem}.`);
    }
  }
}

/** Whether `config` receives `event`'s deliveries. */
export function subscribesTo(config: WebhookConfig, event: WebhookEvent): boolean {
  return (config.events ?? DEFAULT_EVENTS).includes(event);
}

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
 * Generic webhook body — the stored record as the receiver parses it: dates
 * are ISO strings, and `clientId` is stripped like on every other output, on
 * the record and on each comment of its thread. It is the browser-local
 * dedup secret, and the POST replay path hands the full record to whoever
 * presents it.
 */
export type GenericWebhookPayload = Prettify<
  Serialized<Omit<FeedbackRecord, "clientId" | "comments">> & { comments?: CommentResponse[] | undefined }
>;

/** What `buildGenericPayload` returns — {@link GenericWebhookPayload} before `JSON.stringify`. */
type GenericWebhookBody = Omit<FeedbackRecord, "clientId" | "comments"> & {
  comments?: Omit<CommentRecord, "clientId">[] | undefined;
};

/**
 * Generic body of `feedback.deleted` — what was deleted, as the `onDeleting`
 * and `onDeleted` hooks receive it: `{ kind: "single", id, projectName }` for
 * one feedback, `{ kind: "project", projectName }` for a `deleteAll`, which
 * fires even when the project held nothing (stores report no count).
 */
export type GenericWebhookDeletionPayload = SitepingDeletionTarget;

/**
 * Generic body of `comment.created` — the stored comment as the receiver
 * parses it (`createdAt` an ISO string, `clientId` stripped), plus the
 * project its feedback belongs to. The author's email is unredacted, like
 * the feedback's in {@link GenericWebhookPayload}.
 */
export type GenericWebhookCommentPayload = Prettify<Serialized<Omit<SitepingCreatedComment, "clientId">>>;

/**
 * The generic body of each {@link WebhookEvent} — what a `"generic"` receiver
 * parses, read from its `X-Siteping-Event` header. `feedback.created` and
 * `feedback.status_changed` both carry the feedback as stored after the write.
 */
export interface GenericWebhookEventMap {
  "feedback.created": GenericWebhookPayload;
  "feedback.status_changed": GenericWebhookPayload;
  "feedback.deleted": GenericWebhookDeletionPayload;
  "comment.created": GenericWebhookCommentPayload;
}

/** One notification: its event and the record it is about. */
export type WebhookDelivery =
  | { event: "feedback.created" | "feedback.status_changed"; feedback: FeedbackRecord }
  | { event: "feedback.deleted"; target: SitepingDeletionTarget }
  | { event: "comment.created"; comment: SitepingCreatedComment };

/** The feedback id and project a delivery is about — `""` for a project-wide deletion. */
export function deliverySubject(delivery: WebhookDelivery): { feedbackId: string; projectName: string } {
  switch (delivery.event) {
    case "feedback.deleted":
      return delivery.target.kind === "single"
        ? { feedbackId: delivery.target.id, projectName: delivery.target.projectName }
        : { feedbackId: "", projectName: delivery.target.projectName };
    case "comment.created":
      return { feedbackId: delivery.comment.feedbackId, projectName: delivery.comment.projectName };
    default:
      return { feedbackId: delivery.feedback.id, projectName: delivery.feedback.projectName };
  }
}

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

/**
 * Join escaped `units` (one per source character) and truncate so the ESCAPED
 * result fits `max`. Truncation drops whole units, so an escape sequence
 * (`&amp;`, `\[`, `%28`) is never cut in half — and escaping can grow a value
 * several-fold, so sizing the raw text alone would not guarantee fit.
 */
function fitEscaped(units: readonly string[], max: number): string {
  const escaped = units.join("");
  if (escaped.length <= max) return escaped;
  let out = "";
  for (const unit of units) {
    if (out.length + unit.length > max - 1) break;
    out += unit;
  }
  return `${out}…`;
}

/** Block Kit caps `header` text at 150 characters — longer payloads are rejected outright. */
const SLACK_HEADER_MAX = 150;

/** Block Kit caps each `mrkdwn` text object at 3000 characters — also a whole-message rejection. */
const SLACK_TEXT_MAX = 3000;

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

/** Untrusted text escaped for a Slack `mrkdwn` field, sized to `max` (see `fitEscaped`). */
const slackField = (value: string, max: number): string => fitEscaped(Array.from(value, escapeSlackText), max);

/** Two halves + "*From:*  ()" stay under the text-object limit. */
const SLACK_FROM_HALF = Math.floor((SLACK_TEXT_MAX - 11) / 2);

/** `*Project:* …`, sized to the text-object limit. */
const slackProject = (projectName: string): string => `*Project:* ${slackField(projectName, SLACK_TEXT_MAX - 11)}`;

/** `*URL:* …`, sized to the text-object limit. */
const slackUrl = (url: string): string => `*URL:* ${slackField(url, SLACK_TEXT_MAX - 7)}`;

/**
 * Slack message: text fallback + Block Kit blocks for rich rendering. The
 * `plain_text` header is rendered verbatim by Slack (no markup parsing), so it
 * keeps raw values; `preview` and every `context` field must come escaped.
 */
function slackMessage(headline: string, preview: string, context: readonly string[]): SlackWebhookPayload {
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
        elements: context.map((text) => ({ type: "mrkdwn", text })),
      },
    ],
  };
}

/** `*From:* name (email)` — an empty email (a dashboard user's reply) drops its parentheses. */
function slackFrom(authorName: string, authorEmail: string): string {
  const email = authorEmail ? ` (${slackField(authorEmail, SLACK_FROM_HALF)})` : "";
  return `*From:* ${slackField(authorName, SLACK_FROM_HALF)}${email}`;
}

/** How a status change reads in a chat headline. */
const STATUS_VERBS: Readonly<Record<FeedbackStatus, string>> = {
  open: "reopened",
  in_progress: "marked in progress",
  resolved: "resolved",
  wont_fix: "marked won't fix",
};

/** Slack message for `feedback.created`. */
function buildSlackPayload(feedback: FeedbackRecord): SlackWebhookPayload {
  return slackMessage(
    `New ${feedback.type} feedback from ${feedback.authorName}`,
    escapeSlackText(truncate(feedback.message)),
    [
      slackProject(feedback.projectName),
      `*Type:* ${feedback.type}`,
      slackUrl(feedback.url),
      `*From:* ${slackField(feedback.authorName, SLACK_FROM_HALF)} (${slackField(feedback.authorEmail, SLACK_FROM_HALF)})`,
    ],
  );
}

/** Slack message for `feedback.status_changed`. */
function buildSlackStatusPayload(feedback: FeedbackRecord): SlackWebhookPayload {
  return slackMessage(
    `Feedback ${STATUS_VERBS[feedback.status]}: ${feedback.type} from ${feedback.authorName}`,
    escapeSlackText(truncate(feedback.message)),
    [
      slackProject(feedback.projectName),
      `*Status:* ${feedback.status}`,
      slackUrl(feedback.url),
      slackFrom(feedback.authorName, feedback.authorEmail),
    ],
  );
}

/** Slack message for `feedback.deleted`. */
function buildSlackDeletionPayload(target: SitepingDeletionTarget): SlackWebhookPayload {
  if (target.kind === "project") {
    return slackMessage(
      "All feedback deleted",
      `Every feedback of ${slackField(target.projectName, SLACK_TEXT_MAX - 30)} was deleted.`,
      [slackProject(target.projectName)],
    );
  }
  return slackMessage("Feedback deleted", `Feedback ${slackField(target.id, SLACK_TEXT_MAX - 30)} was deleted.`, [
    slackProject(target.projectName),
    `*ID:* ${slackField(target.id, SLACK_TEXT_MAX - 6)}`,
  ]);
}

/** Slack message for `comment.created`. */
function buildSlackCommentPayload(comment: SitepingCreatedComment): SlackWebhookPayload {
  return slackMessage(
    `New ${comment.authorRole} reply from ${comment.authorName}`,
    escapeSlackText(truncate(comment.body)),
    [
      slackProject(comment.projectName),
      `*Feedback:* ${slackField(comment.feedbackId, SLACK_TEXT_MAX - 12)}`,
      slackFrom(comment.authorName, comment.authorEmail),
    ],
  );
}

/**
 * Discord API limits — a payload exceeding any of them is rejected whole
 * (HTTP 400), so the notification is lost rather than truncated.
 */
const DISCORD_CONTENT_MAX = 2000;
const DISCORD_TITLE_MAX = 256;
const DISCORD_FIELD_VALUE_MAX = 1024;

/**
 * Characters Discord's markdown treats as syntax: emphasis, code, spoilers,
 * quotes, headings (and `-#` subtext), masked links (`[text](url)`), and
 * `<…>` mentions / channel links. `\` is escaped too so a visitor's own
 * backslash can't cancel one of ours. `-` is left alone: outside `-#` it only
 * starts a bullet list — cosmetic, and escaping it would litter every
 * hyphenated name and URL.
 */
const DISCORD_MARKDOWN = /[\\*_~`|>#[\]()<]/g;

/**
 * An http(s) URL, bare or in Discord's `<url>` link form, which Discord
 * autolinks. Backslash escapes inside it would land in the link (browsers
 * read `\` as `/`), so its characters are not escaped: only `[`, `]`, `(`,
 * `)` inside the link are percent-encoded, which keeps the address while
 * making sure no masked link can form (see `discordUrlUnits` for where a
 * bare link ends). `<https://…>` is never a mention. The capture group makes
 * `split` keep the URLs.
 */
const DISCORD_AUTOLINK = /(<https?:\/\/[^\s<>]+>|https?:\/\/[^\s<>]+)/i;

/** Punctuation Discord leaves out of the end of a bare autolink. */
const DISCORD_LINK_TRAILER = `.,:;"')]`;

const escapeMarkdownChar = (char: string) => char.replace(DISCORD_MARKDOWN, "\\$&");
// Global so it stays complete on any input, not only the single code
// points `discordUrlUnits` passes in.
const encodeLinkChar = (char: string) =>
  char.replace(/[[\]()]/g, (bracket) => `%${bracket.charCodeAt(0).toString(16).toUpperCase()}`);
const count = (text: string, char: string) => text.split(char).length - 1;

/**
 * Units for a URL token (see `DISCORD_AUTOLINK`). A bare URL's trailing
 * `.,:;"')]` is the sentence around it — `(see https://…).` — and Discord
 * ends the link before it, so it goes out raw: encoded, it would change the
 * address; escaped, the `\` would. Raw `)` and `]` are harmless because an
 * unescaped `[` is never sent, so no masked link can start. A `)` or `]`
 * closing a bracket opened inside the URL stays in it (`…/Mercury_(planet)`).
 */
function discordUrlUnits(url: string): string[] {
  // Brackets the link opens minus those it closes, counted once and kept up
  // to date as the trailer is dropped: recounting per character is quadratic.
  const open = { ")": count(url, "(") - count(url, ")"), "]": count(url, "[") - count(url, "]") };
  let end = url.length;
  while (end > 0) {
    const last = url.charAt(end - 1);
    if (!DISCORD_LINK_TRAILER.includes(last)) break;
    if (last === ")" || last === "]") {
      if (open[last] >= 0) break;
      open[last] += 1;
    }
    end -= 1;
  }
  return [...Array.from(url.slice(0, end), encodeLinkChar), ...url.slice(end)];
}

/**
 * Escape untrusted text for Discord, sized to `max` (see `fitEscaped`).
 * Feedback text is typed by anonymous visitors: unescaped,
 * `[Reset your password](https://evil.example)` renders as a disguised link —
 * the same threat `escapeSlackText` handles. URLs inside the text stay
 * linkable (see `DISCORD_AUTOLINK`).
 */
function escapeDiscordText(text: string, max: number): string {
  // `split` alternates plain text (even indexes) and URLs (odd indexes).
  const units = text
    .split(DISCORD_AUTOLINK)
    .flatMap((part, index) => (index % 2 === 1 ? discordUrlUnits(part) : Array.from(part, escapeMarkdownChar)));
  return fitEscaped(units, max);
}

/**
 * Discord message: content fallback + embed for rich rendering. Sent with
 * mention parsing disabled — `content` embeds the author name, and Discord
 * would otherwise turn `@everyone` / `@here` into a server-wide ping. Every
 * user-supplied value is markdown-escaped and sized to its slot's limit.
 */
function buildDiscordPayload(feedback: FeedbackRecord): DiscordWebhookPayload {
  const contentLead = `New **${feedback.type}** feedback from **`;
  const titleLead = `${feedback.type} — `;
  // Two halves + " ()" stay under the field-value limit.
  const authorHalf = Math.floor((DISCORD_FIELD_VALUE_MAX - 3) / 2);
  return {
    content: `${contentLead}${escapeDiscordText(feedback.authorName, DISCORD_CONTENT_MAX - contentLead.length - 2)}**`,
    embeds: [
      {
        title: `${titleLead}${escapeDiscordText(feedback.projectName, DISCORD_TITLE_MAX - titleLead.length)}`,
        description: escapeDiscordText(feedback.message, 300),
        color: DISCORD_COLORS[feedback.type] ?? DEFAULT_DISCORD_COLOR,
        fields: [
          { name: "URL", value: escapeDiscordText(feedback.url, DISCORD_FIELD_VALUE_MAX), inline: false },
          {
            name: "Author",
            value: `${escapeDiscordText(feedback.authorName, authorHalf)} (${escapeDiscordText(feedback.authorEmail, authorHalf)})`,
            inline: true,
          },
          { name: "Viewport", value: escapeDiscordText(feedback.viewport, DISCORD_FIELD_VALUE_MAX), inline: true },
        ],
        timestamp: new Date(feedback.createdAt).toISOString(),
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

/** One Discord embed. */
type DiscordEmbed = DiscordWebhookPayload["embeds"][number];

/** Embed colour of a reply, which has no feedback type of its own. */
const COMMENT_DISCORD_COLOR = 0x8b5cf6;

/** A Discord message with mention parsing disabled — every value in it must come escaped. */
function discordMessage(content: string, embed: DiscordEmbed): DiscordWebhookPayload {
  return { content, embeds: [embed], allowed_mentions: { parse: [] } };
}

/** Discord message for `feedback.status_changed`. */
function buildDiscordStatusPayload(feedback: FeedbackRecord): DiscordWebhookPayload {
  const contentLead = `Feedback **${STATUS_VERBS[feedback.status]}**: ${feedback.type} from **`;
  const titleLead = `${feedback.type} — `;
  return discordMessage(
    `${contentLead}${escapeDiscordText(feedback.authorName, DISCORD_CONTENT_MAX - contentLead.length - 2)}**`,
    {
      title: `${titleLead}${escapeDiscordText(feedback.projectName, DISCORD_TITLE_MAX - titleLead.length)}`,
      description: escapeDiscordText(feedback.message, 300),
      color: DISCORD_COLORS[feedback.type] ?? DEFAULT_DISCORD_COLOR,
      fields: [
        { name: "Status", value: feedback.status, inline: true },
        { name: "URL", value: escapeDiscordText(feedback.url, DISCORD_FIELD_VALUE_MAX), inline: false },
      ],
      timestamp: new Date(feedback.updatedAt).toISOString(),
    },
  );
}

/** Discord message for `feedback.deleted`, stamped with the time of the delete. */
function buildDiscordDeletionPayload(target: SitepingDeletionTarget): DiscordWebhookPayload {
  const project = (max: number) => escapeDiscordText(target.projectName, max);
  const contentLead = target.kind === "project" ? "All feedback deleted from **" : "Feedback deleted from **";
  const fields = [{ name: "Project", value: project(DISCORD_FIELD_VALUE_MAX), inline: true }];
  if (target.kind === "single") {
    fields.push({ name: "ID", value: escapeDiscordText(target.id, DISCORD_FIELD_VALUE_MAX), inline: true });
  }
  return discordMessage(`${contentLead}${project(DISCORD_CONTENT_MAX - contentLead.length - 2)}**`, {
    title: target.kind === "project" ? "All feedback deleted" : "Feedback deleted",
    description:
      target.kind === "project"
        ? `Every feedback of ${project(300)} was deleted.`
        : `Feedback ${escapeDiscordText(target.id, 300)} was deleted.`,
    color: DEFAULT_DISCORD_COLOR,
    fields,
    timestamp: new Date().toISOString(),
  });
}

/** Discord message for `comment.created`. */
function buildDiscordCommentPayload(comment: SitepingCreatedComment): DiscordWebhookPayload {
  const contentLead = `New **${comment.authorRole}** reply from **`;
  const titleLead = "Reply — ";
  // Two halves + " ()" stay under the field-value limit; a reply from the
  // dashboard may carry no email at all.
  const authorHalf = Math.floor((DISCORD_FIELD_VALUE_MAX - 3) / 2);
  const author = comment.authorEmail
    ? `${escapeDiscordText(comment.authorName, authorHalf)} (${escapeDiscordText(comment.authorEmail, authorHalf)})`
    : escapeDiscordText(comment.authorName, DISCORD_FIELD_VALUE_MAX);
  return discordMessage(
    `${contentLead}${escapeDiscordText(comment.authorName, DISCORD_CONTENT_MAX - contentLead.length - 2)}**`,
    {
      title: `${titleLead}${escapeDiscordText(comment.projectName, DISCORD_TITLE_MAX - titleLead.length)}`,
      description: escapeDiscordText(comment.body, 300),
      color: COMMENT_DISCORD_COLOR,
      fields: [
        { name: "Feedback", value: escapeDiscordText(comment.feedbackId, DISCORD_FIELD_VALUE_MAX), inline: true },
        { name: "Author", value: author, inline: true },
      ],
      timestamp: new Date(comment.createdAt).toISOString(),
    },
  );
}

/** Generic JSON body — the record minus its `clientId`, and its comments minus theirs. */
function buildGenericPayload(feedback: FeedbackRecord): GenericWebhookBody {
  const { clientId: _clientId, comments, ...payload } = feedback;
  if (!comments) return payload;
  return { ...payload, comments: comments.map(({ clientId: _commentClientId, ...comment }) => comment) };
}

/** Generic JSON body of `comment.created` — the comment minus its `clientId`. */
function buildGenericCommentPayload(comment: SitepingCreatedComment): Omit<SitepingCreatedComment, "clientId"> {
  const { clientId: _clientId, ...payload } = comment;
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
): T extends "slack" ? SlackWebhookPayload : T extends "discord" ? DiscordWebhookPayload : GenericWebhookBody {
  return buildDeliveryPayload(type, { event: "feedback.created", feedback }) as never;
}

/**
 * Build the JSON body of `delivery` for a webhook of `type`.
 * Exported for tests; not part of the public API.
 *
 * @internal
 */
export function buildDeliveryPayload(
  type: WebhookType | undefined,
  delivery: WebhookDelivery,
): SlackWebhookPayload | DiscordWebhookPayload | GenericWebhookBody | object {
  switch (delivery.event) {
    case "feedback.created":
      if (type === "slack") return buildSlackPayload(delivery.feedback);
      if (type === "discord") return buildDiscordPayload(delivery.feedback);
      return buildGenericPayload(delivery.feedback);
    case "feedback.status_changed":
      if (type === "slack") return buildSlackStatusPayload(delivery.feedback);
      if (type === "discord") return buildDiscordStatusPayload(delivery.feedback);
      return buildGenericPayload(delivery.feedback);
    case "feedback.deleted":
      if (type === "slack") return buildSlackDeletionPayload(delivery.target);
      if (type === "discord") return buildDiscordDeletionPayload(delivery.target);
      return { ...delivery.target };
    case "comment.created":
      if (type === "slack") return buildSlackCommentPayload(delivery.comment);
      if (type === "discord") return buildDiscordCommentPayload(delivery.comment);
      return buildGenericCommentPayload(delivery.comment);
  }
}

/**
 * Dispatch a single webhook with `feedback`'s `feedback.created` delivery,
 * whatever its `events` — the handler routes by `events` itself (see
 * {@link dispatchWebhooks}). Fire-and-forget: never throws, never rejects.
 *
 * - Builds the type-specific payload.
 * - POSTs with an `AbortSignal` timeout and an `X-Siteping-Event` header.
 * - On any error (network, non-2xx, timeout, exception), invokes
 *   `config.onError(err, feedbackId, delivery)` if provided; otherwise logs a
 *   one-liner. A `timeoutMs` no timer holds is such an error: nothing is sent.
 */
export async function dispatchWebhook(config: WebhookConfig, feedback: FeedbackRecord): Promise<void> {
  return deliver(config, { event: "feedback.created", feedback });
}

/** POST one delivery to one webhook — see {@link dispatchWebhook}. */
async function deliver(config: WebhookConfig, delivery: WebhookDelivery): Promise<void> {
  const problem = timeoutProblem(config.timeoutMs);
  if (problem) return reportError(config, new RangeError(problem), delivery);
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Payload building stays inside the try: it can throw too (an invalid
  // `createdAt` makes Discord's `toISOString()` throw a RangeError), and the
  // handler drops this promise, so a rejection would go unhandled.
  try {
    const body = JSON.stringify(buildDeliveryPayload(config.type ?? "generic", delivery));

    // Build merged headers — caller-supplied entries override `Content-Type`
    // when they explicitly need a different mime (rare for chat webhooks, but
    // possible for some generic receivers), and the event header the same
    // way. Names are case-insensitive: a `content-type` spread next to our
    // `Content-Type` would make fetch send both values combined, so a default
    // is dropped for any spelling.
    const custom = config.headers ?? {};
    const customNames = new Set(Object.keys(custom).map((name) => name.toLowerCase()));
    const headers = {
      ...(customNames.has("content-type") ? {} : { "Content-Type": "application/json" }),
      ...(customNames.has(EVENT_HEADER.toLowerCase()) ? {} : { [EVENT_HEADER]: delivery.event }),
      ...custom,
    };

    // Use AbortSignal.timeout when available (Node 17.3+, all modern browsers).
    // Fall back to a manual controller for environments lacking it.
    timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(config.url, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const err = new Error(`Webhook responded with HTTP ${response.status}`);
      await reportError(config, err, delivery);
    }
  } catch (rawError) {
    clearTimeout(timer);
    const err = rawError instanceof Error ? rawError : new Error(String(rawError));
    await reportError(config, err, delivery);
  }
}

async function reportError(config: WebhookConfig, err: Error, delivery: WebhookDelivery): Promise<void> {
  const { feedbackId, projectName } = deliverySubject(delivery);
  const subject = feedbackId ? `feedback ${feedbackId}` : `project ${projectName}`;
  if (config.onError) {
    try {
      // Awaited, so an async callback's rejection lands here like a throw.
      await config.onError(err, feedbackId, { event: delivery.event, projectName });
    } catch (callbackErr) {
      // Defense-in-depth: a thrown user callback must not bubble back up
      // and crash the request whose write already succeeded. Surface the
      // original error too so it isn't silently lost.
      warnWithoutUrl(
        config.url,
        `webhook onError() callback threw for ${subject}: ${String(callbackErr)} (original error: ${err.message})`,
      );
    }
    return;
  }
  warnWithoutUrl(config.url, `webhook to ${webhookOrigin(config.url)} failed for ${subject}: ${err.message}`);
}

/**
 * The part of a webhook URL that is safe to log. Slack and Discord embed the
 * credential in the path (`hooks.slack.com/services/T…/B…/<token>`), and any
 * URL may carry userinfo — only the origin identifies the target harmlessly.
 */
function webhookOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "<invalid URL>";
  }
}

/**
 * `console.warn` with every copy of the webhook URL reduced to its origin.
 * Node's fetch copies the URL it was given into some errors ("…a URL that
 * includes credentials: <url>", "Failed to parse URL from <url>"), and an
 * `onError` that rethrows or wraps one carries it into its own error.
 */
function warnWithoutUrl(url: string, message: string): void {
  console.warn(`[siteping] ${url ? message.split(url).join(webhookOrigin(url)) : message}`);
}

/**
 * Dispatch `feedback`'s `feedback.created` delivery to every configured
 * webhook that subscribes to it (every webhook without `events`), in
 * parallel. Awaiting the returned promise lets tests synchronize on
 * completion, but production callers should drop the promise on the floor
 * (`void dispatchWebhooks(...)`) so the HTTP response isn't held back on slow
 * receivers.
 */
export async function dispatchWebhooks(configs: readonly WebhookConfig[], feedback: FeedbackRecord): Promise<void> {
  await dispatchDelivery(configs, { event: "feedback.created", feedback });
}

/** Dispatch `delivery` to every webhook of `configs` that subscribes to its event, in parallel. Never rejects. */
export async function dispatchDelivery(configs: readonly WebhookConfig[], delivery: WebhookDelivery): Promise<void> {
  const subscribed = configs.filter((config) => subscribesTo(config, delivery.event));
  if (subscribed.length === 0) return;
  await Promise.all(subscribed.map((config) => deliver(config, delivery)));
}
