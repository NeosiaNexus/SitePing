import type { Translations } from "./types.js";

export const fr: Translations = {
  // Panel
  "panel.title": "Feedbacks",
  "panel.ariaLabel": "Panneau de feedback Siteping",
  "panel.feedbackList": "Liste des feedbacks",
  "panel.loading": "Chargement des feedbacks",
  "panel.close": "Fermer le panneau",
  "panel.deleteAll": "Tout supprimer",
  "panel.deleteAllConfirmTitle": "Tout supprimer",
  "panel.deleteAllConfirmMessage": "Supprimer tous les feedbacks de ce projet ? Cette action est irr\u00e9versible.",
  "panel.search": "Rechercher...",
  "panel.searchAria": "Rechercher dans les feedbacks",
  "panel.filterAll": "Tous",
  "panel.loadError": "Erreur de chargement",
  "panel.retry": "R\u00e9essayer",
  "panel.empty": "Aucun feedback pour le moment",
  "panel.showMore": "Voir plus",
  "panel.showLess": "Voir moins",
  "panel.resolve": "R\u00e9soudre",
  "panel.reopen": "Rouvrir",
  "panel.delete": "Supprimer",
  "panel.cancel": "Annuler",
  "panel.confirmDelete": "Supprimer",
  "panel.loadMore": "Voir plus ({remaining} restants)",

  // Status filter labels
  "panel.statusAll": "Tous",
  "panel.statusOpen": "Ouvert",
  "panel.statusResolved": "Résolu",

  // Feedback type labels
  "type.label": "Type",
  "type.question": "Question",
  "type.change": "Changement",
  "type.bug": "Bug",
  "type.other": "Autre",

  // Status segmented control label
  "status.label": "Statut",

  // FAB menu
  "fab.aria": "Siteping \u2014 Menu feedback",
  "fab.messages": "Messages",
  "fab.annotate": "Annoter",
  "fab.annotations": "Annotations",

  // Annotator
  "annotator.instruction": "Tracez un rectangle sur la zone \u00e0 commenter",
  "annotator.cancel": "Annuler",

  // Popup
  "popup.ariaLabel": "Formulaire de feedback",
  "popup.placeholder": "D\u00e9crivez votre retour...",
  "popup.textareaAria": "Message de feedback",
  "popup.submitHintMac": "\u2318+Entr\u00e9e pour envoyer",
  "popup.submitHintOther": "Ctrl+Entr\u00e9e pour envoyer",
  "popup.cancel": "Annuler",
  "popup.submit": "Envoyer",

  // Identity modal
  "identity.title": "Identifiez-vous",
  "identity.nameLabel": "Nom",
  "identity.namePlaceholder": "Votre nom",
  "identity.emailLabel": "Email",
  "identity.emailPlaceholder": "votre@email.com",
  "identity.cancel": "Annuler",
  "identity.submit": "Continuer",

  // Markers
  "marker.approximate": "Position approximative (confiance : {confidence}%)",
  "marker.aria": "Feedback n°{number} : {type} — {message}",

  // FAB badge
  "fab.badge": "{count} feedbacks non résolus",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Feedback envoyé avec succès",
  "feedback.error.message": "Échec de l'envoi du feedback",
  "feedback.deleted.confirmation": "Feedback supprimé",

  // Badge
  "badge.count": "{count} feedbacks non résolus",
};
