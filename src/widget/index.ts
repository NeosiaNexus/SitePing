import type { SitepingConfig, SitepingInstance } from "../types.js";
import { launch } from "./launcher.js";

export type { SitepingConfig, SitepingInstance } from "../types.js";
export type { FeedbackType, FeedbackStatus, FeedbackPayload, FeedbackResponse } from "../types.js";
export type { AnnotationPayload, AnchorData, RectData } from "../types.js";

/**
 * Initialize the Siteping feedback widget.
 *
 * @example
 * ```ts
 * import { initSiteping } from '@neosianexus/siteping'
 *
 * const { destroy } = initSiteping({
 *   endpoint: '/api/siteping',
 *   projectName: 'my-project',
 * })
 * ```
 */
export function initSiteping(config: SitepingConfig): SitepingInstance {
  return launch(config);
}
