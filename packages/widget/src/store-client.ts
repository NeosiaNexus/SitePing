import {
  type AnnotationRecord,
  type AnnotationResponse,
  type FeedbackPayload,
  type FeedbackRecord,
  type FeedbackResponse,
  type FeedbackResponseList,
  flattenAnnotation,
  isStoreDuplicate,
  SitepingError,
  type SitepingStore,
  toFeedbackUpdate,
} from "@siteping/core";
import { type GetFeedbacksOptions, type WidgetClient, withTimeout } from "./api-client.js";

/**
 * How long a send waits on `store.createFeedback`. First-party stores settle
 * at once, but a custom store may be network-backed, and the popup holds the
 * user until the send settles.
 */
const STORE_WRITE_TIMEOUT_MS = 30_000;

/**
 * `WidgetClient` implementation that delegates directly to a `SitepingStore`.
 *
 * Used in client-side mode — the widget calls the store in-process instead of
 * making HTTP requests. Handles the same conversions the HTTP handler normally
 * performs: flattening annotations and serializing dates.
 */
export class StoreClient implements WidgetClient {
  constructor(
    private readonly store: SitepingStore,
    private readonly projectName: string,
  ) {}

  /**
   * `SitepingStore` takes no AbortSignal, so a write that outlives the bound
   * is abandoned, not cancelled: it may still land after the popup restored.
   * Writes are not serialized (a chain would never unblock after one that
   * never settles); a resend from the same popup carries the same clientId,
   * so the store keeps a single record whichever duplicate contract it
   * follows (see `write`).
   */
  async sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    const record = await withTimeout(
      this.write(payload),
      STORE_WRITE_TIMEOUT_MS,
      () =>
        new SitepingError(
          `Failed to send feedback: the store did not answer within ${STORE_WRITE_TIMEOUT_MS / 1000} s`,
          "TIMEOUT",
          true,
        ),
    );

    return toResponse(record);
  }

  /**
   * `createFeedback`, resolving a duplicate clientId like the HTTP handler: a
   * store may throw `StoreDuplicateError` instead of returning the existing
   * record, and the popup's earlier attempt (one that timed out, then landed)
   * is then the feedback being resent.
   */
  private async write(payload: FeedbackPayload): Promise<FeedbackRecord> {
    try {
      return await this.store.createFeedback({
        projectName: payload.projectName,
        type: payload.type,
        message: payload.message,
        status: "open",
        url: payload.url,
        urlPattern: payload.urlPattern ?? null,
        viewport: payload.viewport,
        userAgent: payload.userAgent,
        authorName: payload.authorName,
        authorEmail: payload.authorEmail,
        clientId: payload.clientId,
        annotations: payload.annotations.map(flattenAnnotation),
        screenshotDataUrl: payload.screenshotDataUrl ?? null,
        screenshotRegion: payload.screenshotRegion ?? null,
        diagnostics: payload.diagnostics ?? null,
      });
    } catch (error) {
      if (!isStoreDuplicate(error)) throw error;
      const existing = await this.store.findByClientId(payload.clientId);
      if (!existing || existing.projectName !== payload.projectName) throw error;
      return existing;
    }
  }

  async getFeedbacks(projectName: string, options?: GetFeedbacksOptions): Promise<FeedbackResponseList> {
    const { feedbacks, total } = await this.store.getFeedbacks({
      projectName,
      page: options?.page,
      limit: options?.limit,
      type: options?.type,
      status: options?.status,
      statuses: options?.statuses,
      search: options?.search,
      url: options?.url,
      urlPattern: options?.urlPattern,
    });

    return { feedbacks: feedbacks.map(toResponse), total };
  }

  async resolveFeedback(id: string, resolved: boolean): Promise<FeedbackResponse> {
    const record = await this.store.updateFeedback(id, toFeedbackUpdate(resolved ? "resolved" : "open"));
    return toResponse(record);
  }

  async deleteFeedback(id: string): Promise<void> {
    await this.store.deleteFeedback(id);
  }

  async deleteAllFeedbacks(projectName: string): Promise<void> {
    await this.store.deleteAllFeedbacks(projectName);
  }
}

// ---------------------------------------------------------------------------
// FeedbackRecord (Date) → FeedbackResponse (string) serialization
// ---------------------------------------------------------------------------

function toResponse(record: FeedbackRecord): FeedbackResponse {
  return {
    id: record.id,
    projectName: record.projectName,
    type: record.type,
    message: record.message,
    status: record.status,
    url: record.url,
    urlPattern: record.urlPattern ?? null,
    viewport: record.viewport,
    userAgent: record.userAgent,
    authorName: record.authorName,
    authorEmail: record.authorEmail,
    resolvedAt: record.resolvedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    annotations: record.annotations.map(toAnnotationResponse),
    screenshotUrl: record.screenshotUrl ?? null,
    screenshotRegion: record.screenshotRegion ?? null,
    diagnostics: record.diagnostics ?? null,
  };
}

function toAnnotationResponse(ann: AnnotationRecord): AnnotationResponse {
  return {
    id: ann.id,
    feedbackId: ann.feedbackId,
    cssSelector: ann.cssSelector,
    xpath: ann.xpath,
    textSnippet: ann.textSnippet,
    elementTag: ann.elementTag,
    elementId: ann.elementId,
    textPrefix: ann.textPrefix,
    textSuffix: ann.textSuffix,
    fingerprint: ann.fingerprint,
    neighborText: ann.neighborText,
    anchorKey: ann.anchorKey ?? null,
    xPct: ann.xPct,
    yPct: ann.yPct,
    wPct: ann.wPct,
    hPct: ann.hPct,
    scrollX: ann.scrollX,
    scrollY: ann.scrollY,
    viewportW: ann.viewportW,
    viewportH: ann.viewportH,
    devicePixelRatio: ann.devicePixelRatio,
    createdAt: ann.createdAt.toISOString(),
  };
}
