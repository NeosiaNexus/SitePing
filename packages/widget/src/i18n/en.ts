import type { Translations } from "./types.js";

export const en: Translations = {
  // Panel
  "panel.title": "Feedbacks",
  "panel.ariaLabel": "Siteping feedback panel",
  "panel.feedbackList": "Feedback list",
  "panel.loading": "Loading feedbacks",
  "panel.close": "Close panel",
  "panel.deleteAll": "Delete all",
  "panel.deleteAllConfirmTitle": "Delete all",
  "panel.deleteAllConfirmMessage": "Delete all feedbacks for this project? This action cannot be undone.",
  "panel.search": "Search...",
  "panel.searchAria": "Search feedbacks",
  "panel.filterAll": "All",
  "panel.loadError": "Failed to load",
  "panel.retry": "Retry",
  "panel.empty": "No feedback yet",
  "panel.showMore": "Show more",
  "panel.showLess": "Show less",
  "panel.resolve": "Resolve",
  "panel.reopen": "Reopen",
  "panel.delete": "Delete",
  "panel.cancel": "Cancel",
  "panel.confirmDelete": "Delete",
  "panel.loadMore": "Load more ({remaining} remaining)",

  // Status filter labels
  "panel.statusAll": "All",
  "panel.statusOpen": "Open",
  "panel.statusResolved": "Resolved",

  // Feedback type labels
  "type.label": "Type",
  "type.question": "Question",
  "type.change": "Change",
  "type.bug": "Bug",
  "type.other": "Other",

  // Status segmented control label
  "status.label": "Status",

  // Page scope segmented control
  "scope.label": "Scope",
  "scope.thisPage": "This page",
  "scope.thisType": "This type",
  "scope.all": "All pages",

  // FAB menu
  "fab.aria": "Siteping \u2014 Feedback menu",
  "fab.messages": "Show sidebar",
  "fab.annotate": "Create new annotation",
  "fab.annotations": "Show or hide markers",

  // Annotator
  "annotator.instruction": "Draw a rectangle on the area to comment",
  "annotator.cancel": "Cancel",

  // Popup
  "popup.ariaLabel": "Feedback form",
  "popup.placeholder": "Describe your feedback...",
  "popup.textareaAria": "Feedback message",
  "popup.submitHintMac": "\u2318+Enter to send",
  "popup.submitHintOther": "Ctrl+Enter to send",
  "popup.cancel": "Cancel",
  "popup.submit": "Send",

  // Identity modal
  "identity.title": "Identify yourself",
  "identity.nameLabel": "Name",
  "identity.namePlaceholder": "Your name",
  "identity.emailLabel": "Email",
  "identity.emailPlaceholder": "your@email.com",
  "identity.cancel": "Cancel",
  "identity.submit": "Continue",

  // Markers
  "marker.approximate": "Approximate position (confidence: {confidence}%)",
  "marker.aria": "Feedback #{number}: {type} — {message}",
  "marker.count": "{count} feedback markers displayed",

  // FAB badge
  "fab.badge": "{count} unresolved feedbacks",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Feedback sent successfully",
  "feedback.error.message": "Failed to send feedback",
  "feedback.deleted.confirmation": "Feedback deleted",

  // Badge
  "badge.count": "{count} unresolved feedbacks",

  // Bulk actions toolbar
  "bulk.selectAll": "Select all",
  "bulk.selected": "{count} selected",
  "bulk.resolve": "Resolve",
  "bulk.delete": "Delete",
  "bulk.deselect": "Deselect",

  // Sort and group controls
  "sort.newest": "Newest first",
  "sort.oldest": "Oldest first",
  "sort.byType": "By type",
  "sort.openFirst": "Open first",
  "sort.label": "Sort",
  "group.byPage": "By page",
  "group.feedbacks": "{count} feedbacks",

  // Stats bar
  "stats.open": "Open",
  "stats.resolved": "Resolved",
  "stats.bugs": "Bugs",
  "stats.progress": "{percent}% resolved",

  // Detail view
  "detail.back": "Back",
  "detail.title": "Feedback #{number}",
  "detail.status": "Status",
  "detail.message": "Message",
  "detail.screenshot": "Screenshot",
  "detail.screenshotAlt": "Screenshot of the annotated area",
  "detail.metadata": "Details",
  "detail.annotation": "Annotation",
  "detail.page": "Page",
  "detail.author": "Author",
  "detail.date": "Created",
  "detail.viewport": "Viewport",
  "detail.browser": "Browser",
  "detail.resolvedAt": "Resolved at",
  "detail.goToAnnotation": "Go to annotation",
  "detail.element": "Element",
  "detail.selector": "Selector",
  "detail.position": "Position",
  "detail.resolve": "Resolve",
  "detail.reopen": "Reopen",
  "detail.delete": "Delete",
  "detail.diagnostics": "Diagnostics",
  "detail.diagnostics.console": "Console",
  "detail.diagnostics.network": "Failed network",
  "detail.diagnostics.expand": "Show diagnostics",
  "detail.diagnostics.collapse": "Hide diagnostics",
  "detail.diagnostics.noEntries": "No entries",

  // Keyboard shortcuts overlay
  "shortcuts.title": "Keyboard shortcuts",
  "shortcuts.navigate": "Navigate feedbacks",
  "shortcuts.resolve": "Resolve / Reopen",
  "shortcuts.delete": "Delete",
  "shortcuts.search": "Focus search",
  "shortcuts.select": "Toggle selection",
  "shortcuts.help": "Show shortcuts",
  "shortcuts.close": "Close",
  "shortcuts.hint": "Keyboard shortcuts",

  // Export controls
  "export.label": "Export",
  "export.csv": "Export CSV",
  "export.json": "Export JSON",
};
