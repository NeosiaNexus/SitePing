import type { Translations } from "./types.js";

export const fr: Translations = {
  // Inbox chrome
  "inbox.regionLabel": "Boîte de réception des feedbacks",
  "inbox.listLabel": "Liste des feedbacks",
  "inbox.statusFilter": "Filtrer par statut",
  "inbox.searchPlaceholder": "Rechercher dans les messages…",
  "inbox.searchAria": "Rechercher des feedbacks",
  "inbox.clearSearch": "Effacer la recherche",
  "inbox.resultsCount": "{count} feedbacks",
  "inbox.typeFilter": "Filtrer par type",
  "inbox.typeAll": "Tous les types",
  "inbox.project": "Projet",
  "inbox.refresh": "Actualiser",
  "inbox.loadMore": "Charger plus ({count})",

  // Empty / error states
  "inbox.emptyTitle": "Aucun feedback pour l'instant",
  "inbox.emptySub": "Les retours envoyés depuis le widget arrivent ici.",
  "inbox.emptyFilteredTitle": "Rien ici",
  "inbox.emptyFilteredSub": "Aucun feedback ne correspond à ce filtre.",
  "inbox.viewAll": "Tout afficher",
  "inbox.inboxZeroTitle": "Tout est trié",
  "inbox.inboxZeroSub": "Tous les feedbacks ouverts ont été traités.",
  "inbox.loadError": "Impossible de charger les feedbacks",
  "inbox.retry": "Réessayer",

  // Actions & toasts
  "inbox.cancel": "Annuler",
  "inbox.undo": "Annuler",
  "inbox.actionFailed": "Une erreur est survenue. Modification annulée.",
  "inbox.copied": "Copié",
  "inbox.markedAs": "Marqué comme {status}",
  "inbox.deleted": "Feedback supprimé",

  // Status labels
  "status.all": "Tous",
  "status.open": "Ouvert",
  "status.in_progress": "En cours",
  "status.resolved": "Résolu",
  "status.wont_fix": "Sans suite",

  // Feedback type labels
  "type.question": "Question",
  "type.change": "Changement",
  "type.bug": "Bug",
  "type.other": "Autre",

  // Drawer
  "drawer.title": "Détail du feedback",
  "drawer.close": "Fermer le détail",
  "drawer.openOnPage": "Ouvrir sur la page",
  "drawer.status": "Statut",
  "drawer.author": "Auteur",
  "drawer.page": "Page",
  "drawer.viewport": "Viewport",
  "drawer.submitted": "Envoyé",
  "drawer.browser": "Navigateur",
  "drawer.anchor": "Ancre",
  "drawer.diagnostics": "Diagnostics",
  "drawer.showAllDiagnostics": "Tout afficher ({count})",
  "drawer.hideAnnotation": "Masquer l'annotation",
  "drawer.showAnnotation": "Afficher l'annotation",
  "drawer.screenshotAlt": "Capture de la zone annotée",
  "drawer.zoomScreenshot": "Zoomer la capture",
  "drawer.noScreenshot": "Pas de capture pour ce feedback",
  "drawer.delete": "Supprimer le feedback",
  "drawer.deleteConfirm": "Supprimer définitivement ? Action irréversible.",
  "drawer.deleteYes": "Supprimer",

  // Footer hint bar
  "hints.navigate": "naviguer",
  "hints.open": "ouvrir",
  "hints.resolve": "résoudre",
  "hints.inProgress": "en cours",
  "hints.wontFix": "sans suite",
  "hints.help": "raccourcis",

  // Keyboard shortcuts overlay
  "shortcuts.title": "Raccourcis clavier",
  "shortcuts.close": "Fermer",

  // Relative time
  "time.now": "à l'instant",
  "time.minutes": "{n} min",
  "time.hours": "{n} h",
  "time.days": "{n} j",
  "time.weeks": "{n} sem",
  "time.month": "{n} mois",
  "time.months": "{n} mois",
  "time.year": "{n} an",
  "time.years": "{n} ans",
};
