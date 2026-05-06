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

  // FAB menu
  "fab.aria": "Siteping — Menu feedback",
  "fab.messages": "Messaggi",
  "fab.annotate": "Annota",
  "fab.annotations": "Annotazioni",

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

  // FAB badge
  "fab.badge": "{count} feedback non risolti",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Feedback inviato con successo",
  "feedback.error.message": "Invio del feedback non riuscito",
  "feedback.deleted.confirmation": "Feedback eliminato",

  // Badge
  "badge.count": "{count} feedback non risolti",
};
