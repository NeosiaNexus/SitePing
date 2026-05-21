import type { Translations } from "./types.js";

export const es: Translations = {
  // Panel
  "panel.title": "Comentarios",
  "panel.ariaLabel": "Panel de comentarios de Siteping",
  "panel.feedbackList": "Lista de comentarios",
  "panel.loading": "Cargando comentarios",
  "panel.close": "Cerrar panel",
  "panel.deleteAll": "Eliminar todo",
  "panel.deleteAllConfirmTitle": "Eliminar todo",
  "panel.deleteAllConfirmMessage":
    "¿Eliminar todos los comentarios de este proyecto? Esta acción no se puede deshacer.",
  "panel.search": "Buscar...",
  "panel.searchAria": "Buscar comentarios",
  "panel.filterAll": "Todos",
  "panel.loadError": "No se pudo cargar",
  "panel.retry": "Reintentar",
  "panel.empty": "Aún no hay comentarios",
  "panel.showMore": "Mostrar más",
  "panel.showLess": "Mostrar menos",
  "panel.resolve": "Resolver",
  "panel.reopen": "Reabrir",
  "panel.delete": "Eliminar",
  "panel.cancel": "Cancelar",
  "panel.confirmDelete": "Eliminar",
  "panel.loadMore": "Cargar más ({remaining} restantes)",

  // Status filter labels
  "panel.statusAll": "Todos",
  "panel.statusOpen": "Abiertos",
  "panel.statusResolved": "Resueltos",

  // Feedback type labels
  "type.label": "Tipo",
  "type.question": "Pregunta",
  "type.change": "Cambio",
  "type.bug": "Error",
  "type.other": "Otro",

  // Status segmented control label
  "status.label": "Estado",

  // Page scope segmented control
  "scope.label": "Ámbito",
  "scope.thisPage": "Esta página",
  "scope.thisType": "Este tipo",
  "scope.all": "Todas las páginas",

  // FAB menu
  "fab.aria": "Siteping — Menú de comentarios",
  "fab.messages": "Mostrar barra lateral",
  "fab.annotate": "Crear nueva anotación",
  "fab.annotations": "Mostrar u ocultar marcadores",

  // Annotator
  "annotator.instruction": "Dibuja un rectángulo sobre el área que quieres comentar",
  "annotator.cancel": "Cancelar",

  // Popup
  "popup.ariaLabel": "Formulario de comentarios",
  "popup.placeholder": "Describe tu comentario...",
  "popup.textareaAria": "Mensaje de comentario",
  "popup.submitHintMac": "⌘+Enter para enviar",
  "popup.submitHintOther": "Ctrl+Enter para enviar",
  "popup.cancel": "Cancelar",
  "popup.submit": "Enviar",

  // Identity modal
  "identity.title": "Identifícate",
  "identity.nameLabel": "Nombre",
  "identity.namePlaceholder": "Tu nombre",
  "identity.emailLabel": "Correo electrónico",
  "identity.emailPlaceholder": "tu@email.com",
  "identity.cancel": "Cancelar",
  "identity.submit": "Continuar",

  // Markers
  "marker.approximate": "Posición aproximada (confianza: {confidence}%)",
  "marker.aria": "Comentario #{number}: {type} — {message}",
  "marker.count": "{count} marcadores de feedback mostrados",

  // FAB badge
  "fab.badge": "{count} comentarios sin resolver",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Comentario enviado correctamente",
  "feedback.error.message": "No se pudo enviar el comentario",
  "feedback.deleted.confirmation": "Comentario eliminado",

  // Badge
  "badge.count": "{count} comentarios sin resolver",

  // Bulk actions toolbar
  "bulk.selectAll": "Seleccionar todo",
  "bulk.selected": "{count} seleccionados",
  "bulk.resolve": "Resolver",
  "bulk.delete": "Eliminar",
  "bulk.deselect": "Deseleccionar",

  // Sort and group controls
  "sort.newest": "Más recientes",
  "sort.oldest": "Más antiguos",
  "sort.byType": "Por tipo",
  "sort.openFirst": "Abiertos primero",
  "sort.label": "Ordenar",
  "group.byPage": "Por página",
  "group.feedbacks": "{count} comentarios",

  // Stats bar
  "stats.open": "Abiertos",
  "stats.resolved": "Resueltos",
  "stats.bugs": "Errores",
  "stats.progress": "{percent}% resueltos",

  // Detail view
  "detail.back": "Atrás",
  "detail.title": "Comentario #{number}",
  "detail.status": "Estado",
  "detail.message": "Mensaje",
  "detail.screenshot": "Captura",
  "detail.screenshotAlt": "Captura del área anotada",
  "detail.metadata": "Detalles",
  "detail.annotation": "Anotación",
  "detail.page": "Página",
  "detail.author": "Autor",
  "detail.date": "Creado",
  "detail.viewport": "Viewport",
  "detail.browser": "Navegador",
  "detail.resolvedAt": "Resuelto el",
  "detail.goToAnnotation": "Ir a la anotación",
  "detail.element": "Elemento",
  "detail.selector": "Selector",
  "detail.position": "Posición",
  "detail.resolve": "Resolver",
  "detail.reopen": "Reabrir",
  "detail.delete": "Eliminar",
  "detail.diagnostics": "Diagnóstico",
  "detail.diagnostics.console": "Consola",
  "detail.diagnostics.network": "Red fallida",
  "detail.diagnostics.expand": "Mostrar diagnóstico",
  "detail.diagnostics.collapse": "Ocultar diagnóstico",
  "detail.diagnostics.noEntries": "Sin entradas",

  // Keyboard shortcuts overlay
  "shortcuts.title": "Atajos de teclado",
  "shortcuts.navigate": "Navegar comentarios",
  "shortcuts.resolve": "Resolver / Reabrir",
  "shortcuts.delete": "Eliminar",
  "shortcuts.search": "Buscar",
  "shortcuts.select": "Alternar selección",
  "shortcuts.help": "Mostrar atajos",
  "shortcuts.close": "Cerrar",
  "shortcuts.hint": "Atajos de teclado",

  // Export controls
  "export.label": "Exportar",
  "export.csv": "Exportar CSV",
  "export.json": "Exportar JSON",
};
