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

  // Page scope segmented control
  "scope.label": "Bereich",
  "scope.thisPage": "Diese Seite",
  "scope.thisType": "Dieser Typ",
  "scope.all": "Alle Seiten",

  // FAB menu
  "fab.aria": "Siteping — Feedback-Menü",
  "fab.messages": "Seitenleiste anzeigen",
  "fab.annotate": "Neue Anmerkung erstellen",
  "fab.annotations": "Markierungen ein- oder ausblenden",

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
  "marker.count": "{count} Feedback-Markierungen angezeigt",

  // FAB badge
  "fab.badge": "{count} unerledigte Feedbacks",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Feedback erfolgreich gesendet",
  "feedback.error.message": "Feedback konnte nicht gesendet werden",
  "feedback.deleted.confirmation": "Feedback gelöscht",

  // Badge
  "badge.count": "{count} unerledigte Feedbacks",

  // Bulk actions toolbar
  "bulk.selectAll": "Alle auswählen",
  "bulk.selected": "{count} ausgewählt",
  "bulk.resolve": "Erledigen",
  "bulk.delete": "Löschen",
  "bulk.deselect": "Abwählen",

  // Sort and group controls
  "sort.newest": "Neueste zuerst",
  "sort.oldest": "Älteste zuerst",
  "sort.byType": "Nach Typ",
  "sort.openFirst": "Offene zuerst",
  "sort.label": "Sortieren",
  "group.byPage": "Nach Seite",
  "group.feedbacks": "{count} Feedbacks",

  // Stats bar
  "stats.open": "Offen",
  "stats.resolved": "Erledigt",
  "stats.bugs": "Fehler",
  "stats.progress": "{percent}% erledigt",

  // Detail view
  "detail.back": "Zurück",
  "detail.title": "Feedback #{number}",
  "detail.status": "Status",
  "detail.message": "Nachricht",
  "detail.screenshot": "Screenshot",
  "detail.screenshotAlt": "Screenshot des markierten Bereichs",
  "detail.metadata": "Details",
  "detail.annotation": "Anmerkung",
  "detail.page": "Seite",
  "detail.author": "Autor",
  "detail.date": "Erstellt",
  "detail.viewport": "Viewport",
  "detail.browser": "Browser",
  "detail.resolvedAt": "Erledigt am",
  "detail.goToAnnotation": "Zur Anmerkung",
  "detail.element": "Element",
  "detail.selector": "Selektor",
  "detail.position": "Position",
  "detail.resolve": "Erledigen",
  "detail.reopen": "Wieder öffnen",
  "detail.delete": "Löschen",
  "detail.diagnostics": "Diagnose",
  "detail.diagnostics.console": "Konsole",
  "detail.diagnostics.network": "Fehlgeschlagenes Netzwerk",
  "detail.diagnostics.expand": "Diagnose anzeigen",
  "detail.diagnostics.collapse": "Diagnose ausblenden",
  "detail.diagnostics.noEntries": "Keine Einträge",

  // Keyboard shortcuts overlay
  "shortcuts.title": "Tastenkürzel",
  "shortcuts.navigate": "Feedbacks navigieren",
  "shortcuts.resolve": "Erledigen / Wieder öffnen",
  "shortcuts.delete": "Löschen",
  "shortcuts.search": "Suche fokussieren",
  "shortcuts.select": "Auswahl umschalten",
  "shortcuts.help": "Kürzel anzeigen",
  "shortcuts.close": "Schließen",
  "shortcuts.hint": "Tastenkürzel",

  // Export controls
  "export.label": "Exportieren",
  "export.csv": "CSV exportieren",
  "export.json": "JSON exportieren",
};
