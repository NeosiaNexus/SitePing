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
  SitepingAuthError,
  SitepingClientError,
  SitepingConfig,
  SitepingError,
  SitepingErrorCode,
  SitepingHeadersOption,
  SitepingHttpConfig,
  SitepingInstance,
  SitepingLocale,
  SitepingNetworkError,
  SitepingPanelAction,
  SitepingPanelActionContext,
  SitepingPanelActionFeedback,
  SitepingPanelButtonAction,
  SitepingPanelLinkAction,
  SitepingPublicEvents,
  SitepingStore,
  SitepingStoreConfig,
  SitepingValidationError,
} from "@siteping/core";
// The guard, not the classes: an error matched by `instanceof` against one
// package's copy of a class fails against another's.
export { isSitepingError } from "@siteping/core";
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
