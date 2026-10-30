import type { SitepingConfig, SitepingInstance } from "@siteping/core";
import { launch } from "./launcher.js";

export type {
  AnchorData,
  AnnotationPayload,
  AnnotationResponse,
  BuiltinLocale,
  CommentResponse,
  DiagnosticsCaptureOptions,
  DiagnosticsSnapshot,
  FeedbackPayload,
  FeedbackPermissions,
  FeedbackResponse,
  FeedbackStatus,
  FeedbackType,
  PageScope,
  RectData,
  ScreenshotRegion,
  SitepingConfig,
  SitepingDeepLinkOptions,
  SitepingHeadersOption,
  SitepingHttpConfig,
  SitepingInstance,
  SitepingLocale,
  SitepingPanelAction,
  SitepingPanelActionContext,
  SitepingPanelActionFeedback,
  SitepingPanelButtonAction,
  SitepingPanelLinkAction,
  SitepingPosition,
  SitepingPublicEventListener,
  SitepingPublicEvents,
  SitepingSkipReason,
  SitepingStore,
  SitepingStoreConfig,
  SitepingUnsubscribe,
} from "@siteping/core";
export type { TFunction, TranslationKey, Translations } from "./i18n/index.js";
export { loadLocale, registerLocale } from "./i18n/index.js";
export type { Identity } from "./identity.js";

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
