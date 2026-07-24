/** All translatable string keys used by the dashboard inbox. */
export interface Translations {
  // Inbox chrome
  "inbox.regionLabel": string;
  "inbox.listLabel": string;
  "inbox.statusFilter": string;
  "inbox.searchPlaceholder": string;
  "inbox.searchAria": string;
  "inbox.clearSearch": string;
  /** Screen-reader announcement of the visible result count. */
  "inbox.resultsCount": string;
  "inbox.typeFilter": string;
  "inbox.typeAll": string;
  "inbox.project": string;
  "inbox.refresh": string;
  "inbox.loadMore": string;

  // Empty / error states
  "inbox.emptyTitle": string;
  "inbox.emptySub": string;
  "inbox.emptyFilteredTitle": string;
  "inbox.emptyFilteredSub": string;
  "inbox.viewAll": string;
  "inbox.inboxZeroTitle": string;
  "inbox.inboxZeroSub": string;
  "inbox.loadError": string;
  "inbox.retry": string;

  // Actions & toasts
  "inbox.cancel": string;
  "inbox.undo": string;
  "inbox.actionFailed": string;
  "inbox.copied": string;
  "inbox.markedAs": string;
  "inbox.deleted": string;

  // Status labels
  "status.all": string;
  "status.open": string;
  "status.in_progress": string;
  "status.resolved": string;
  "status.wont_fix": string;

  // Feedback type labels
  "type.question": string;
  "type.change": string;
  "type.bug": string;
  "type.other": string;

  // Drawer
  "drawer.title": string;
  "drawer.close": string;
  "drawer.openOnPage": string;
  "drawer.status": string;
  "drawer.author": string;
  "drawer.page": string;
  "drawer.viewport": string;
  "drawer.submitted": string;
  "drawer.browser": string;
  "drawer.anchor": string;
  "drawer.diagnostics": string;
  "drawer.showAllDiagnostics": string;
  "drawer.hideAnnotation": string;
  "drawer.showAnnotation": string;
  "drawer.screenshotAlt": string;
  "drawer.zoomScreenshot": string;
  "drawer.noScreenshot": string;
  "drawer.delete": string;
  "drawer.deleteConfirm": string;
  "drawer.deleteYes": string;

  // Footer hint bar
  "hints.navigate": string;
  "hints.open": string;
  "hints.resolve": string;
  "hints.inProgress": string;
  "hints.wontFix": string;
  "hints.help": string;

  // Keyboard shortcuts overlay
  "shortcuts.title": string;
  "shortcuts.close": string;

  // Relative time
  "time.now": string;
  "time.minutes": string;
  "time.hours": string;
  "time.days": string;
  "time.weeks": string;
  "time.month": string;
  "time.months": string;
  "time.year": string;
  "time.years": string;
}

/** Every valid key of `Translations` as a string-literal union. */
export type TranslationKey = keyof Translations;

/** A translate function that returns the string for a given key. */
export type TFunction = (key: TranslationKey) => string;
