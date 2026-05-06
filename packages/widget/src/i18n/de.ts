import type { Translations } from "./types.js";

export const de: Translations = {
  // Panel
  "panel.title": "Feedbacks",
  "panel.ariaLabel": "Siteping-Feedback-Panel",
  "panel.feedbackList": "Feedbackliste",
  "panel.loading": "Feedbacks werden geladen",
  "panel.close": "Panel schließen",
  "panel.deleteAll": "Alle löschen",
  "panel.deleteAllConfirmTitle": "Alle löschen",
  "panel.deleteAllConfirmMessage":
    "Alle Feedbacks für dieses Projekt löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
  "panel.search": "Suchen...",
  "panel.searchAria": "Feedbacks suchen",
  "panel.filterAll": "Alle",
  "panel.loadError": "Laden fehlgeschlagen",
  "panel.retry": "Erneut versuchen",
  "panel.empty": "Noch kein Feedback",
  "panel.showMore": "Mehr anzeigen",
  "panel.showLess": "Weniger anzeigen",
  "panel.resolve": "Erledigen",
  "panel.reopen": "Wieder öffnen",
  "panel.delete": "Löschen",
  "panel.cancel": "Abbrechen",
  "panel.confirmDelete": "Löschen",
  "panel.loadMore": "Mehr laden ({remaining} verbleibend)",

  // Status filter labels
  "panel.statusAll": "Alle",
  "panel.statusOpen": "Offen",
  "panel.statusResolved": "Erledigt",

  // Feedback type labels
  "type.label": "Typ",
  "type.question": "Frage",
  "type.change": "Änderung",
  "type.bug": "Fehler",
  "type.other": "Sonstiges",

  // Status segmented control label
  "status.label": "Status",

  // FAB menu
  "fab.aria": "Siteping — Feedback-Menü",
  "fab.messages": "Nachrichten",
  "fab.annotate": "Kommentieren",
  "fab.annotations": "Anmerkungen",

  // Annotator
  "annotator.instruction": "Zeichne ein Rechteck um den Bereich, den du kommentieren möchtest",
  "annotator.cancel": "Abbrechen",

  // Popup
  "popup.ariaLabel": "Feedbackformular",
  "popup.placeholder": "Beschreibe dein Feedback...",
  "popup.textareaAria": "Feedbacknachricht",
  "popup.submitHintMac": "⌘+Enter zum Senden",
  "popup.submitHintOther": "Strg+Enter zum Senden",
  "popup.cancel": "Abbrechen",
  "popup.submit": "Senden",

  // Identity modal
  "identity.title": "Identifiziere dich",
  "identity.nameLabel": "Name",
  "identity.namePlaceholder": "Dein Name",
  "identity.emailLabel": "E-Mail",
  "identity.emailPlaceholder": "deine@email.de",
  "identity.cancel": "Abbrechen",
  "identity.submit": "Fortfahren",

  // Markers
  "marker.approximate": "Ungefähre Position (Konfidenz: {confidence}%)",
  "marker.aria": "Feedback #{number}: {type} — {message}",

  // FAB badge
  "fab.badge": "{count} unerledigte Feedbacks",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Feedback erfolgreich gesendet",
  "feedback.error.message": "Feedback konnte nicht gesendet werden",
  "feedback.deleted.confirmation": "Feedback gelöscht",

  // Badge
  "badge.count": "{count} unerledigte Feedbacks",
};
