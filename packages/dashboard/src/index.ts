// Re-export commonly needed core types so consumers don't have to depend on @siteping/core directly.
export type {
  CommentCreateInput,
  CommentRecord,
  FeedbackPermissions,
  FeedbackRecord,
  FeedbackStatus,
  FeedbackType,
  SitepingAuthError,
  SitepingCapabilities,
  SitepingClientError,
  SitepingError,
  SitepingErrorCode,
  SitepingNetworkError,
  SitepingStore,
  SitepingValidationError,
} from "@siteping/core";
export { FEEDBACK_STATUSES, FEEDBACK_TYPES, isClosedStatus, isSitepingError } from "@siteping/core";
export { SitepingInbox } from "./components/inbox.js";
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
