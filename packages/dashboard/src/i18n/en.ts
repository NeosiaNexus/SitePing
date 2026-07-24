import type { Translations } from "./types.js";

export const en: Translations = {
  // Inbox chrome
  "inbox.regionLabel": "Feedback inbox",
  "inbox.listLabel": "Feedback list",
  "inbox.statusFilter": "Filter by status",
  "inbox.searchPlaceholder": "Search messages…",
  "inbox.searchAria": "Search feedbacks",
  "inbox.clearSearch": "Clear search",
  "inbox.resultsCount": "{count} feedbacks",
  "inbox.typeFilter": "Filter by type",
  "inbox.typeAll": "All types",
  "inbox.project": "Project",
  "inbox.refresh": "Refresh",
  "inbox.loadMore": "Load more ({count})",

  // Empty / error states
  "inbox.emptyTitle": "No feedback yet",
  "inbox.emptySub": "Feedback sent from the widget lands here.",
  "inbox.emptyFilteredTitle": "Nothing here",
  "inbox.emptyFilteredSub": "No feedback matches this filter.",
  "inbox.viewAll": "View all",
  "inbox.inboxZeroTitle": "All clear",
  "inbox.inboxZeroSub": "Every open feedback has been handled.",
  "inbox.loadError": "Failed to load feedbacks",
  "inbox.retry": "Retry",

  // Actions & toasts
  "inbox.cancel": "Cancel",
  "inbox.undo": "Undo",
  "inbox.actionFailed": "Something went wrong. Change reverted.",
  "inbox.copied": "Copied",
  "inbox.markedAs": "Marked as {status}",
  "inbox.deleted": "Feedback deleted",

  // Status labels
  "status.all": "All",
  "status.open": "Open",
  "status.in_progress": "In progress",
  "status.resolved": "Resolved",
  "status.wont_fix": "Won't fix",

  // Feedback type labels
  "type.question": "Question",
  "type.change": "Change",
  "type.bug": "Bug",
  "type.other": "Other",

  // Drawer
  "drawer.title": "Feedback details",
  "drawer.close": "Close details",
  "drawer.openOnPage": "Open on page",
  "drawer.status": "Status",
  "drawer.author": "Author",
  "drawer.page": "Page",
  "drawer.viewport": "Viewport",
  "drawer.submitted": "Submitted",
  "drawer.browser": "Browser",
  "drawer.anchor": "Anchor",
  "drawer.diagnostics": "Diagnostics",
  "drawer.showAllDiagnostics": "Show all ({count})",
  "drawer.hideAnnotation": "Hide annotation",
  "drawer.showAnnotation": "Show annotation",
  "drawer.screenshotAlt": "Screenshot of the annotated area",
  "drawer.zoomScreenshot": "Zoom screenshot",
  "drawer.noScreenshot": "No screenshot for this feedback",
  "drawer.delete": "Delete feedback",
  "drawer.deleteConfirm": "Delete permanently? This cannot be undone.",
  "drawer.deleteYes": "Delete",

  // Footer hint bar
  "hints.navigate": "navigate",
  "hints.open": "open",
  "hints.resolve": "resolve",
  "hints.inProgress": "in progress",
  "hints.wontFix": "won't fix",
  "hints.help": "shortcuts",

  // Keyboard shortcuts overlay
  "shortcuts.title": "Keyboard shortcuts",
  "shortcuts.close": "Close",

  // Relative time
  "time.now": "now",
  "time.minutes": "{n} min",
  "time.hours": "{n} h",
  "time.days": "{n} d",
  "time.weeks": "{n} w",
  "time.month": "{n} mo",
  "time.months": "{n} mo",
  "time.year": "{n} y",
  "time.years": "{n} y",
};
