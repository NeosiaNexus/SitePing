import type { SitepingConfig, SitepingInstance } from "@siteping/core";
import { launch } from "./launcher.js";

export type {
  AnchorData,
  AnnotationPayload,
  AnnotationResponse,
  CommentResponse,
  FeedbackPayload,
  FeedbackPermissions,
  FeedbackResponse,
  FeedbackStatus,
  FeedbackType,
  RectData,
  SitepingConfig,
  SitepingHeadersOption,
  SitepingHttpConfig,
  SitepingIdentity,
  SitepingInstance,
  SitepingLocale,
  SitepingPanelAction,
  SitepingPanelActionContext,
  SitepingPanelActionFeedback,
  SitepingPanelButtonAction,
  SitepingPanelLinkAction,
  SitepingPublicEvents,
  SitepingStore,
  SitepingStoreConfig,
} from "@siteping/core";
export type { TranslationKey, Translations } from "./i18n/index.js";
export { loadLocale, registerLocale } from "./i18n/index.js";

/**
 * Initialize the Siteping feedback widget.
 *
 * @example
 * ```ts
 * import { initSiteping } from '@siteping/widget'
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
