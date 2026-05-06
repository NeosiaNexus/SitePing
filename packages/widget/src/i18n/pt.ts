import type { Translations } from "./types.js";

/** Brazilian Portuguese translations (pt-BR). */
export const pt: Translations = {
  // Panel
  "panel.title": "Feedbacks",
  "panel.ariaLabel": "Painel de feedback do Siteping",
  "panel.feedbackList": "Lista de feedbacks",
  "panel.loading": "Carregando feedbacks",
  "panel.close": "Fechar painel",
  "panel.deleteAll": "Excluir tudo",
  "panel.deleteAllConfirmTitle": "Excluir tudo",
  "panel.deleteAllConfirmMessage": "Excluir todos os feedbacks deste projeto? Esta ação não pode ser desfeita.",
  "panel.search": "Pesquisar...",
  "panel.searchAria": "Pesquisar feedbacks",
  "panel.filterAll": "Todos",
  "panel.loadError": "Falha ao carregar",
  "panel.retry": "Tentar novamente",
  "panel.empty": "Nenhum feedback ainda",
  "panel.showMore": "Mostrar mais",
  "panel.showLess": "Mostrar menos",
  "panel.resolve": "Resolver",
  "panel.reopen": "Reabrir",
  "panel.delete": "Excluir",
  "panel.cancel": "Cancelar",
  "panel.confirmDelete": "Excluir",
  "panel.loadMore": "Carregar mais ({remaining} restantes)",

  // Status filter labels
  "panel.statusAll": "Todos",
  "panel.statusOpen": "Abertos",
  "panel.statusResolved": "Resolvidos",

  // Feedback type labels
  "type.label": "Tipo",
  "type.question": "Pergunta",
  "type.change": "Alteração",
  "type.bug": "Bug",
  "type.other": "Outro",

  // Status segmented control label
  "status.label": "Status",

  // FAB menu
  "fab.aria": "Siteping — Menu de feedback",
  "fab.messages": "Mensagens",
  "fab.annotate": "Anotar",
  "fab.annotations": "Anotações",

  // Annotator
  "annotator.instruction": "Desenhe um retângulo na área que deseja comentar",
  "annotator.cancel": "Cancelar",

  // Popup
  "popup.ariaLabel": "Formulário de feedback",
  "popup.placeholder": "Descreva seu feedback...",
  "popup.textareaAria": "Mensagem de feedback",
  "popup.submitHintMac": "⌘+Enter para enviar",
  "popup.submitHintOther": "Ctrl+Enter para enviar",
  "popup.cancel": "Cancelar",
  "popup.submit": "Enviar",

  // Identity modal
  "identity.title": "Identifique-se",
  "identity.nameLabel": "Nome",
  "identity.namePlaceholder": "Seu nome",
  "identity.emailLabel": "E-mail",
  "identity.emailPlaceholder": "seu@email.com",
  "identity.cancel": "Cancelar",
  "identity.submit": "Continuar",

  // Markers
  "marker.approximate": "Posição aproximada (confiança: {confidence}%)",
  "marker.aria": "Feedback #{number}: {type} — {message}",

  // FAB badge
  "fab.badge": "{count} feedbacks não resolvidos",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Feedback enviado com sucesso",
  "feedback.error.message": "Falha ao enviar feedback",
  "feedback.deleted.confirmation": "Feedback excluído",

  // Badge
  "badge.count": "{count} feedbacks não resolvidos",
};
