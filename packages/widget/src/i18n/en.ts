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

  // FAB menu
  "fab.aria": "Siteping \u2014 Feedback menu",
  "fab.messages": "Messages",
  "fab.annotate": "Annotate",
  "fab.annotations": "Annotations",

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

  // FAB badge
  "fab.badge": "{count} unresolved feedbacks",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Feedback sent successfully",
  "feedback.error.message": "Failed to send feedback",
  "feedback.deleted.confirmation": "Feedback deleted",

  // Badge
  "badge.count": "{count} unresolved feedbacks",
};
