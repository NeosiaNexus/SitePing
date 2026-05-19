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

  // Page scope segmented control — keep panel results focused on the current
  // page or expand to the same template / all pages
  "scope.label": string;
  "scope.thisPage": string;
  "scope.thisType": string;
  "scope.all": string;

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
  "marker.count": string;

  // FAB badge
  "fab.badge": string;

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": string;
  "feedback.error.message": string;
  "feedback.deleted.confirmation": string;

  // Badge
  "badge.count": string;

  // Bulk actions toolbar
  "bulk.selectAll": string;
  "bulk.selected": string;
  "bulk.resolve": string;
  "bulk.delete": string;
  "bulk.deselect": string;

  // Sort and group controls
  "sort.newest": string;
  "sort.oldest": string;
  "sort.byType": string;
  "sort.openFirst": string;
  "sort.label": string;
  "group.byPage": string;
  "group.feedbacks": string;

  // Stats bar
  "stats.open": string;
  "stats.resolved": string;
  "stats.bugs": string;
  "stats.progress": string;

  // Detail view
  "detail.back": string;
  "detail.title": string;
  "detail.status": string;
  "detail.message": string;
  "detail.screenshot": string;
  "detail.screenshotAlt": string;
  "detail.metadata": string;
  "detail.annotation": string;
  "detail.page": string;
  "detail.author": string;
  "detail.date": string;
  "detail.viewport": string;
  "detail.browser": string;
  "detail.resolvedAt": string;
  "detail.goToAnnotation": string;
  "detail.element": string;
  "detail.selector": string;
  "detail.position": string;
  "detail.resolve": string;
  "detail.reopen": string;
  "detail.delete": string;
  "detail.diagnostics": string;
  "detail.diagnostics.console": string;
  "detail.diagnostics.network": string;
  "detail.diagnostics.expand": string;
  "detail.diagnostics.collapse": string;
  "detail.diagnostics.noEntries": string;

  // Keyboard shortcuts overlay
  "shortcuts.title": string;
  "shortcuts.navigate": string;
  "shortcuts.resolve": string;
  "shortcuts.delete": string;
  "shortcuts.search": string;
  "shortcuts.select": string;
  "shortcuts.help": string;
  "shortcuts.close": string;
  "shortcuts.hint": string;

  // Export controls
  "export.label": string;
  "export.csv": string;
  "export.json": string;
}

/** Every valid key of `Translations` as a string-literal union. */
export type TranslationKey = keyof Translations;

/** A translate function that returns the string for a given key. */
export type TFunction = (key: TranslationKey) => string;
