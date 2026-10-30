import type { SitepingConfig, SitepingInstance } from "@siteping/core";
import { launch } from "./launcher.js";

export type {
  AnchorData,
  AnnotationPayload,
  AnnotationResponse,
  BuiltinLocale,
  CommentPermissions,
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
  SitepingClientError,
  SitepingConfig,
  SitepingDeepLinkOptions,
  SitepingErrorCode,
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
  SitepingPosition,
  SitepingPublicEventListener,
  SitepingPublicEvents,
  SitepingSkipReason,
  SitepingStore,
  SitepingStoreConfig,
  SitepingTheme,
  SitepingUnsubscribe,
} from "@siteping/core";
// The guard and the union it narrows to, not the classes: an error matched
// by `instanceof` against one package's copy of a class fails against
// another's (and a type-only class export would read as a value in the
// bundled .d.ts, where `instanceof` would type-check, then throw).
export { isSitepingError } from "@siteping/core";
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
