import {
  type AnnotationRecord,
  type AnnotationResponse,
  type FeedbackPayload,
  type FeedbackRecord,
  type FeedbackResponse,
  flattenAnnotation,
  type SitepingStore,
} from "@siteping/core";
import type { GetFeedbacksOptions, WidgetClient } from "./api-client.js";

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

  async sendFeedback(payload: FeedbackPayload): Promise<FeedbackResponse> {
    const record = await this.store.createFeedback({
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
    });

    return toResponse(record);
  }

  async getFeedbacks(
    projectName: string,
    options?: GetFeedbacksOptions,
  ): Promise<{ feedbacks: FeedbackResponse[]; total: number }> {
    const { feedbacks, total } = await this.store.getFeedbacks({
      projectName,
      page: options?.page,
      limit: options?.limit,
      type: options?.type,
      status: options?.status,
      search: options?.search,
      url: options?.url,
      urlPattern: options?.urlPattern,
    });

    return { feedbacks: feedbacks.map(toResponse), total };
  }

  async resolveFeedback(id: string, resolved: boolean): Promise<FeedbackResponse> {
    const record = await this.store.updateFeedback(id, {
      status: resolved ? "resolved" : "open",
      resolvedAt: resolved ? new Date() : null,
    });
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
