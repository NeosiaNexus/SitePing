/** All translatable string keys used by the widget. */
export interface Translations {
  // Panel
  "panel.title": string;
  "panel.ariaLabel": string;
  "panel.feedbackList": string;
  "panel.loading": string;
  "panel.close": string;
  "panel.deleteAll": string;
  "panel.deleteAllConfirmTitle": string;
  "panel.deleteAllConfirmMessage": string;
  "panel.search": string;
  "panel.searchAria": string;
  "panel.filterAll": string;
  "panel.loadError": string;
  "panel.retry": string;
  "panel.empty": string;
  "panel.showMore": string;
  "panel.showLess": string;
  "panel.resolve": string;
  "panel.reopen": string;
  "panel.delete": string;
  "panel.cancel": string;
  "panel.confirmDelete": string;
  "panel.loadMore": string;

  // Status filter labels
  "panel.statusAll": string;
  "panel.statusOpen": string;
  "panel.statusResolved": string;

  // Feedback type labels (UI display only)
  "type.label": string;
  "type.question": string;
  "type.change": string;
  "type.bug": string;
  "type.other": string;

  // Status segmented control label
  "status.label": string;

  // FAB menu
  "fab.aria": string;
  "fab.messages": string;
  "fab.annotate": string;
  "fab.annotations": string;

  // Annotator
  "annotator.instruction": string;
  "annotator.cancel": string;

  // Popup (annotation form)
  "popup.placeholder": string;
  "popup.textareaAria": string;
  "popup.submitHintMac": string;
  "popup.submitHintOther": string;
  "popup.ariaLabel": string;
  "popup.cancel": string;
  "popup.submit": string;

  // Identity modal
  "identity.title": string;
  "identity.nameLabel": string;
  "identity.namePlaceholder": string;
  "identity.emailLabel": string;
  "identity.emailPlaceholder": string;
  "identity.cancel": string;
  "identity.submit": string;

  // Markers
  "marker.approximate": string;
  "marker.aria": string;

  // FAB badge
  "fab.badge": string;

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": string;
  "feedback.error.message": string;
  "feedback.deleted.confirmation": string;

  // Badge
  "badge.count": string;
}

/** A translate function that returns the string for a given key. */
export type TFunction = (key: keyof Translations) => string;
