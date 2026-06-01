import type { Translations } from "./types.js";

/** Italian translations (it-IT). */
export const it: Translations = {
  // Panel
  "panel.title": "Feedback",
  "panel.ariaLabel": "Pannello feedback di Siteping",
  "panel.feedbackList": "Elenco feedback",
  "panel.loading": "Caricamento feedback",
  "panel.close": "Chiudi pannello",
  "panel.deleteAll": "Elimina tutto",
  "panel.deleteAllConfirmTitle": "Elimina tutto",
  "panel.deleteAllConfirmMessage":
    "Eliminare tutti i feedback per questo progetto? Questa azione non può essere annullata.",
  "panel.search": "Cerca...",
  "panel.searchAria": "Cerca feedback",
  "panel.filterAll": "Tutti",
  "panel.loadError": "Caricamento non riuscito",
  "panel.retry": "Riprova",
  "panel.empty": "Nessun feedback ancora",
  "panel.showMore": "Mostra di più",
  "panel.showLess": "Mostra meno",
  "panel.resolve": "Risolvi",
  "panel.reopen": "Riapri",
  "panel.delete": "Elimina",
  "panel.cancel": "Annulla",
  "panel.confirmDelete": "Elimina",
  "panel.loadMore": "Carica altro ({remaining} rimanenti)",

  // Status filter labels
  "panel.statusAll": "Tutti",
  "panel.statusOpen": "Aperti",
  "panel.statusResolved": "Risolti",

  // Feedback type labels
  "type.label": "Tipo",
  "type.question": "Domanda",
  "type.change": "Modifica",
  "type.bug": "Bug",
  "type.other": "Altro",

  // Status segmented control label
  "status.label": "Stato",

  // Page scope segmented control
  "scope.label": "Ambito",
  "scope.thisPage": "Questa pagina",
  "scope.thisType": "Questo tipo",
  "scope.all": "Tutte le pagine",

  // FAB menu
  "fab.aria": "Siteping — Menu feedback",
  "fab.messages": "Mostra barra laterale",
  "fab.annotate": "Crea nuova annotazione",
  "fab.annotations": "Mostra o nascondi i marcatori",

  // Annotator
  "annotator.instruction": "Disegna un rettangolo sull'area da commentare",
  "annotator.cancel": "Annulla",

  // Popup
  "popup.ariaLabel": "Modulo feedback",
  "popup.placeholder": "Descrivi il tuo feedback...",
  "popup.textareaAria": "Messaggio di feedback",
  "popup.submitHintMac": "⌘+Invio per inviare",
  "popup.submitHintOther": "Ctrl+Invio per inviare",
  "popup.cancel": "Annulla",
  "popup.submit": "Invia",

  // Identity modal
  "identity.title": "Identificati",
  "identity.nameLabel": "Nome",
  "identity.namePlaceholder": "Il tuo nome",
  "identity.emailLabel": "Email",
  "identity.emailPlaceholder": "tua@email.com",
  "identity.cancel": "Annulla",
  "identity.submit": "Continua",

  // Markers
  "marker.approximate": "Posizione approssimativa (confidenza: {confidence}%)",
  "marker.aria": "Feedback #{number}: {type} — {message}",
  "marker.count": "{count} marcatori di feedback visualizzati",

  // FAB badge
  "fab.badge": "{count} feedback non risolti",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Feedback inviato con successo",
  "feedback.error.message": "Invio del feedback non riuscito",
  "feedback.deleted.confirmation": "Feedback eliminato",

  // Badge
  "badge.count": "{count} feedback non risolti",

  // Bulk actions toolbar
  "bulk.selectAll": "Seleziona tutto",
  "bulk.selected": "{count} selezionati",
  "bulk.resolve": "Risolvi",
  "bulk.delete": "Elimina",
  "bulk.deselect": "Deseleziona",

  // Sort and group controls
  "sort.newest": "Più recenti",
  "sort.oldest": "Più vecchi",
  "sort.byType": "Per tipo",
  "sort.openFirst": "Aperti prima",
  "sort.label": "Ordina",
  "group.byPage": "Per pagina",
  "group.feedbacks": "{count} feedback",

  // Stats bar
  "stats.open": "Aperti",
  "stats.resolved": "Risolti",
  "stats.bugs": "Bug",
  "stats.progress": "{percent}% risolti",

  // Detail view
  "detail.back": "Indietro",
  "detail.title": "Feedback #{number}",
  "detail.status": "Stato",
  "detail.message": "Messaggio",
  "detail.screenshot": "Schermata",
  "detail.screenshotAlt": "Schermata dell'area annotata",
  "detail.metadata": "Dettagli",
  "detail.annotation": "Annotazione",
  "detail.page": "Pagina",
  "detail.author": "Autore",
  "detail.date": "Creato",
  "detail.viewport": "Viewport",
  "detail.browser": "Browser",
  "detail.resolvedAt": "Risolto il",
  "detail.goToAnnotation": "Vai all'annotazione",
  "detail.element": "Elemento",
  "detail.selector": "Selettore",
  "detail.position": "Posizione",
  "detail.resolve": "Risolvi",
  "detail.reopen": "Riapri",
  "detail.delete": "Elimina",
  "detail.diagnostics": "Diagnostica",
  "detail.diagnostics.console": "Console",
  "detail.diagnostics.network": "Rete fallita",
  "detail.diagnostics.expand": "Mostra diagnostica",
  "detail.diagnostics.collapse": "Nascondi diagnostica",
  "detail.diagnostics.noEntries": "Nessuna voce",

  // Keyboard shortcuts overlay
  "shortcuts.title": "Scorciatoie da tastiera",
  "shortcuts.navigate": "Naviga i feedback",
  "shortcuts.resolve": "Risolvi / Riapri",
  "shortcuts.delete": "Elimina",
  "shortcuts.search": "Cerca",
  "shortcuts.select": "Attiva selezione",
  "shortcuts.help": "Mostra scorciatoie",
  "shortcuts.close": "Chiudi",
  "shortcuts.hint": "Scorciatoie da tastiera",

  // Export controls
  "export.label": "Esporta",
  "export.csv": "Esporta CSV",
  "export.json": "Esporta JSON",
};
