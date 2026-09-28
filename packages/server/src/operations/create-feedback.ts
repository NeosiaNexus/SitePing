import {
  type FeedbackCreateInput,
  type FeedbackPayload,
  type FeedbackRecord,
  flattenAnnotation,
  isStoreDuplicate,
  type SitepingStore,
} from "@siteping/core";
import { ERROR_MESSAGES, MAX_ANNOTATIONS_PER_FEEDBACK } from "../constants.js";
import type { Pipeline } from "../pipeline.js";
import { feedbackCreateSchema } from "../validation.js";
import { dispatchWebhooks, type WebhookConfig } from "../webhooks.js";

interface CreateFeedbackDependencies {
  store: SitepingStore;
  pipeline: Pipeline;
  webhooks: ReadonlyArray<WebhookConfig>;
}

/** Outcome of one create: `inserted` is false for a replay. */
interface CreateOutcome {
  feedback: FeedbackRecord;
  inserted: boolean;
}

/** Store input from the validated payload — the store never sees wire-only shapes. */
function toCreateInput(data: FeedbackPayload): FeedbackCreateInput {
  return {
    projectName: data.projectName,
    type: data.type,
    message: data.message,
    status: "open",
    url: data.url,
    urlPattern: data.urlPattern ?? null,
    viewport: data.viewport,
    userAgent: data.userAgent,
    authorName: data.authorName,
    authorEmail: data.authorEmail,
    clientId: data.clientId,
    annotations: data.annotations.map(flattenAnnotation),
    screenshotDataUrl: data.screenshotDataUrl ?? null,
    screenshotRegion: data.screenshotRegion ?? null,
    diagnostics: data.diagnostics ?? null,
  };
}

/** `POST` — create a feedback, idempotent on `clientId`. */
export function createFeedbackOperation({ store, pipeline, webhooks }: CreateFeedbackDependencies) {
  /**
   * Creates in flight, keyed by clientId. The widget aborts an attempt after
   * 10 s and resends the same payload, so a retry can reach the server while
   * the first attempt is still being processed. With a store that returns the
   * existing record on a duplicate clientId without implementing
   * `createFeedbackIfAbsent`, both requests would pass the replay check and
   * both "create" — notifying the webhooks twice. A request whose clientId is
   * in flight shares that outcome instead, and never runs a second insert or
   * upload. Scoped to this handler instance: across processes, the store
   * decides — `createFeedbackIfAbsent`, or its unique constraint (the
   * duplicate path below).
   */
  const inflightCreates = new Map<string, Promise<CreateOutcome>>();

  /** Replay check + insert for one validated input. */
  async function createOrReplay(input: FeedbackCreateInput): Promise<CreateOutcome> {
    // The store reports its own inserts: it arbitrates replays and races on
    // the clientId atomically, across handler instances and processes too.
    if (store.createFeedbackIfAbsent) {
      const { feedback, created } = await store.createFeedbackIfAbsent(input);
      return { feedback, inserted: created };
    }

    // Otherwise, replay detection up front: stores that return the existing
    // record on a duplicate clientId are indistinguishable from a fresh
    // insert afterwards, and a replayed submission must not notify the
    // webhooks a second time.
    const replayed = await store.findByClientId(input.clientId);
    if (replayed) return { feedback: replayed, inserted: false };

    return { feedback: await store.createFeedback(input), inserted: true };
  }

  return async (request: Request): Promise<Response> => {
    const entry = await pipeline.enter(request, "POST");
    if (!entry.ok) return entry.response;
    const scope = entry.value;

    const payload = await pipeline.readBody(scope, feedbackCreateSchema);
    if (!payload.ok) return payload.response;

    // Defense-in-depth: enforce annotation limit at handler level in addition to schema validation
    if (payload.value.annotations.length > MAX_ANNOTATIONS_PER_FEEDBACK) {
      return pipeline.error(scope, 400, ERROR_MESSAGES.tooManyAnnotations);
    }
    const input = toCreateInput(payload.value);

    /**
     * Respond to a create that resolved to `feedback`. A clientId is unique
     * across the whole store, so a replay that resolves to another
     * project's record is a boundary violation, not a dedup: refuse it
     * rather than hand that record (email included) to a request scoped to
     * a different project. Email stays intact otherwise: the requester
     * supplied it (fresh insert) or proved ownership by presenting the
     * clientId (replay).
     */
    const created = (feedback: FeedbackRecord): Response =>
      feedback.projectName === input.projectName
        ? pipeline.json(scope, pipeline.present(scope, feedback, true), { status: 201 })
        : pipeline.error(scope, 409, ERROR_MESSAGES.clientIdUsedByAnotherProject);

    // Join an in-flight create of this clientId, or start one. The lookup
    // and the registration run in one synchronous turn, so two overlapping
    // requests can never both miss.
    let pending = inflightCreates.get(input.clientId);
    const owner = pending === undefined;
    if (!pending) {
      pending = createOrReplay(input);
      inflightCreates.set(input.clientId, pending);
    }

    try {
      const { feedback, inserted } = await pending;

      // Fire-and-forget: drop the promise so the widget isn't held back
      // on slow Slack/Discord/generic receivers. `dispatchWebhooks` traps
      // its own errors and reports them through `WebhookConfig.onError`.
      // Only the request that ran the insert notifies — never a replay, and
      // never a request that joined another one's in-flight create.
      if (owner && inserted && webhooks.length > 0 && feedback.projectName === input.projectName) {
        void dispatchWebhooks(webhooks, feedback);
      }

      return created(feedback);
    } catch (error) {
      // Unique-constraint race: the same clientId landed between the replay
      // check above and the insert. The presenter still owns the record.
      // A failing lookup falls through to the JSON 500 below — this catch
      // must not throw, or the request loses its response and CORS headers.
      if (isStoreDuplicate(error)) {
        let existing: FeedbackRecord | null = null;
        try {
          existing = await store.findByClientId(input.clientId);
        } catch (lookupError) {
          pipeline.logger.error("[siteping] Failed to look up the duplicate clientId", { error: lookupError });
        }
        if (existing) return created(existing);
      }
      return pipeline.fail(scope, "[siteping] Failed to create feedback", error);
    } finally {
      if (owner) inflightCreates.delete(input.clientId);
    }
  };
}
