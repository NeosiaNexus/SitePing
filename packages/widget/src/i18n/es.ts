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

  // FAB menu
  "fab.aria": "Siteping — Menú de comentarios",
  "fab.messages": "Mensajes",
  "fab.annotate": "Anotar",
  "fab.annotations": "Anotaciones",

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

  // FAB badge
  "fab.badge": "{count} comentarios sin resolver",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Comentario enviado correctamente",
  "feedback.error.message": "No se pudo enviar el comentario",
  "feedback.deleted.confirmation": "Comentario eliminado",

  // Badge
  "badge.count": "{count} comentarios sin resolver",
};
