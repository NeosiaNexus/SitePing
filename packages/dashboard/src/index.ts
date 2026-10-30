// Re-export commonly needed core types so consumers don't have to depend on @siteping/core directly.
export type {
  BuiltinLocale,
  CommentCreateInput,
  CommentRecord,
  DiagnosticsSnapshot,
  FeedbackPermissions,
  FeedbackQuery,
  FeedbackRecord,
  FeedbackStatus,
  FeedbackType,
  ScreenshotRegion,
  SitepingCapabilities,
  SitepingLocale,
  SitepingStore,
} from "@siteping/core";
export { FEEDBACK_STATUSES, FEEDBACK_TYPES, isClosedStatus } from "@siteping/core";
export { SitepingInbox } from "./components/inbox.js";
export type { TranslationKey, Translations } from "./i18n/index.js";
export { registerLocale } from "./i18n/index.js";
export { createEndpointSource, createStoreSource } from "./source.js";
export type { InboxTheme, ResolvedTheme } from "./theme.js";
export type {
  EndpointSourceOptions,
  InboxCustomSourceOptions,
  InboxEndpointOptions,
  InboxPage,
  InboxRecord,
  InboxSharedOptions,
  InboxSource,
  InboxState,
  InboxStatusFilter,
  InboxStoreOptions,
  InboxTypeFilter,
  SitepingInboxPresentationProps,
  SitepingInboxProps,
  UseSitepingInboxOptions,
} from "./types.js";
export { useSitepingInbox } from "./use-inbox.js";
