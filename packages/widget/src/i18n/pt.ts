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

  // Page scope segmented control
  "scope.label": "Escopo",
  "scope.thisPage": "Esta página",
  "scope.thisType": "Este tipo",
  "scope.all": "Todas as páginas",

  // FAB menu
  "fab.aria": "Siteping — Menu de feedback",
  "fab.messages": "Exibir barra lateral",
  "fab.annotate": "Criar nova anotação",
  "fab.annotations": "Exibir ou ocultar marcadores",

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
  "marker.count": "{count} marcadores de feedback exibidos",

  // FAB badge
  "fab.badge": "{count} feedbacks não resolvidos",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Feedback enviado com sucesso",
  "feedback.error.message": "Falha ao enviar feedback",
  "feedback.deleted.confirmation": "Feedback excluído",

  // Badge
  "badge.count": "{count} feedbacks não resolvidos",

  // Bulk actions toolbar
  "bulk.selectAll": "Selecionar tudo",
  "bulk.selected": "{count} selecionados",
  "bulk.resolve": "Resolver",
  "bulk.delete": "Excluir",
  "bulk.deselect": "Desmarcar",

  // Sort and group controls
  "sort.newest": "Mais recentes",
  "sort.oldest": "Mais antigos",
  "sort.byType": "Por tipo",
  "sort.openFirst": "Abertos primeiro",
  "sort.label": "Ordenar",
  "group.byPage": "Por página",
  "group.feedbacks": "{count} feedbacks",

  // Stats bar
  "stats.open": "Abertos",
  "stats.resolved": "Resolvidos",
  "stats.bugs": "Bugs",
  "stats.progress": "{percent}% resolvidos",

  // Detail view
  "detail.back": "Voltar",
  "detail.title": "Feedback #{number}",
  "detail.status": "Status",
  "detail.message": "Mensagem",
  "detail.screenshot": "Captura",
  "detail.screenshotAlt": "Captura da área anotada",
  "detail.metadata": "Detalhes",
  "detail.annotation": "Anotação",
  "detail.page": "Página",
  "detail.author": "Autor",
  "detail.date": "Criado",
  "detail.viewport": "Viewport",
  "detail.browser": "Navegador",
  "detail.resolvedAt": "Resolvido em",
  "detail.goToAnnotation": "Ir para anotação",
  "detail.element": "Elemento",
  "detail.selector": "Seletor",
  "detail.position": "Posição",
  "detail.resolve": "Resolver",
  "detail.reopen": "Reabrir",
  "detail.delete": "Excluir",
  "detail.diagnostics": "Diagnóstico",
  "detail.diagnostics.console": "Console",
  "detail.diagnostics.network": "Rede com falha",
  "detail.diagnostics.expand": "Mostrar diagnóstico",
  "detail.diagnostics.collapse": "Ocultar diagnóstico",
  "detail.diagnostics.noEntries": "Sem entradas",

  // Keyboard shortcuts overlay
  "shortcuts.title": "Atalhos de teclado",
  "shortcuts.navigate": "Navegar feedbacks",
  "shortcuts.resolve": "Resolver / Reabrir",
  "shortcuts.delete": "Excluir",
  "shortcuts.search": "Buscar",
  "shortcuts.select": "Alternar seleção",
  "shortcuts.help": "Mostrar atalhos",
  "shortcuts.close": "Fechar",
  "shortcuts.hint": "Atalhos de teclado",

  // Export controls
  "export.label": "Exportar",
  "export.csv": "Exportar CSV",
  "export.json": "Exportar JSON",
};
