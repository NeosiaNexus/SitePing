import { defineI18nUI } from "fumadocs-ui/i18n";
import { i18n } from "./i18n";

export const { provider } = defineI18nUI(i18n, {
  en: { displayName: "English" },
  fr: {
    displayName: "Français",
    "Search(search dialog)": "Rechercher",
    "Search(search trigger)": "Rechercher",
    "No results found(search dialog)": "Aucun résultat",
    "Open Search(search trigger)(aria-label)": "Ouvrir la recherche",
    "Close Search(search dialog)(aria-label)": "Fermer la recherche",
    "On this page(table of contents)": "Sur cette page",
    "Table of Contents(inline table of contents)": "Sommaire",
    "No Headings(table of contents)": "Aucun titre",
    "Next Page(pagination)": "Page suivante",
    "Previous Page(pagination)": "Page précédente",
    // No "Last updated on" entry: driving it needs `lastModifiedTime: "git"`,
    // which reads `git log` per file. CI checkouts (and the Docker build, which
    // excludes `.git`) are shallow, so every page would claim the same date —
    // a wrong date is worse than no date. Add the key back if we ever build
    // from a full clone.
    "Edit on GitHub(edit page)": "Modifier sur GitHub",
    "Back to Home(404 page)": "Retour à l'accueil",
    "Page Not Found(404 page)": "Page introuvable",
    "The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 page)":
      "La page que vous cherchez a peut-être été supprimée, renommée ou est temporairement indisponible.",
    "Choose a language(language switcher)": "Choisir une langue",
    "Choose a language(language switcher)(aria-label)": "Choisir une langue",
    "Copy Text(code block)(aria-label)": "Copier",
    "Copied Text(code block)(aria-label)": "Copié",
    "Copy Anchor Link(heading anchor)(aria-label)": "Copier le lien d'ancre",
    "Copy Markdown(page actions)": "Copier le Markdown",
    "View as Markdown(page actions)": "Voir en Markdown",
    "Open(page actions)": "Ouvrir",
    "Light(theme switcher)(aria-label)": "Clair",
    "Dark(theme switcher)(aria-label)": "Sombre",
    "System(theme switcher)(aria-label)": "Système",
    "Toggle Theme(theme switcher)(aria-label)": "Changer de thème",
    "Open Sidebar(sidebar)(aria-label)": "Ouvrir la barre latérale",
    "Close Sidebar(sidebar)(aria-label)": "Fermer la barre latérale",
    "Collapse Sidebar(sidebar)(aria-label)": "Replier la barre latérale",
    "Show Sidebar(sidebar)": "Afficher la barre latérale",
    "Hide Sidebar(sidebar)": "Masquer la barre latérale",
    "Toggle Menu(mobile menu)(aria-label)": "Ouvrir le menu",
  },
});
