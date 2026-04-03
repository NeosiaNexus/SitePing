/** All translatable string keys used by the widget. */
export interface Translations {
  // Panel
  "panel.title": string;
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

  // Feedback type labels (UI display only)
  "type.question": string;
  "type.change": string;
  "type.bug": string;
  "type.other": string;

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
}

/** A translate function that returns the string for a given key. */
export type TFunction = (key: keyof Translations) => string;
