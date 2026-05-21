import type { Translations } from "./types.js";

export const ru: Translations = {
  // Panel
  "panel.title": "Обратная связь",
  "panel.ariaLabel": "Панель обратной связи Siteping",
  "panel.feedbackList": "Список отзывов",
  "panel.loading": "Загрузка отзывов",
  "panel.close": "Закрыть панель",
  "panel.deleteAll": "Удалить всё",
  "panel.deleteAllConfirmTitle": "Удалить всё",
  "panel.deleteAllConfirmMessage": "Удалить все отзывы этого проекта? Это действие необратимо.",
  "panel.search": "Поиск...",
  "panel.searchAria": "Поиск по отзывам",
  "panel.filterAll": "Все",
  "panel.loadError": "Ошибка загрузки",
  "panel.retry": "Повторить",
  "panel.empty": "Пока нет отзывов",
  "panel.showMore": "Показать больше",
  "panel.showLess": "Показать меньше",
  "panel.resolve": "Решено",
  "panel.reopen": "Открыть заново",
  "panel.delete": "Удалить",
  "panel.cancel": "Отмена",
  "panel.confirmDelete": "Удалить",
  "panel.loadMore": "Показать ещё ({remaining} осталось)",

  // Status filter labels
  "panel.statusAll": "Все",
  "panel.statusOpen": "Открытые",
  "panel.statusResolved": "Решённые",

  // Feedback type labels
  "type.label": "Тип",
  "type.question": "Вопрос",
  "type.change": "Улучшение",
  "type.bug": "Баг",
  "type.other": "Другое",

  // Status segmented control label
  "status.label": "Статус",

  // Page scope segmented control
  "scope.label": "Область",
  "scope.thisPage": "Эта страница",
  "scope.thisType": "Этот тип",
  "scope.all": "Все страницы",

  // FAB menu
  "fab.aria": "Siteping — Меню обратной связи",
  "fab.messages": "Показать панель",
  "fab.annotate": "Создать аннотацию",
  "fab.annotations": "Показать или скрыть метки",

  // Annotator
  "annotator.instruction": "Выделите область для комментария",
  "annotator.cancel": "Отмена",

  // Popup
  "popup.ariaLabel": "Форма обратной связи",
  "popup.placeholder": "Опишите проблему или предложение...",
  "popup.textareaAria": "Сообщение",
  "popup.submitHintMac": "⌘+Enter — отправить",
  "popup.submitHintOther": "Ctrl+Enter — отправить",
  "popup.cancel": "Отмена",
  "popup.submit": "Отправить",

  // Identity modal
  "identity.title": "Представьтесь",
  "identity.nameLabel": "Имя",
  "identity.namePlaceholder": "Ваше имя",
  "identity.emailLabel": "Email",
  "identity.emailPlaceholder": "ваш@email.com",
  "identity.cancel": "Отмена",
  "identity.submit": "Продолжить",

  // Markers
  "marker.approximate": "Приблизительная позиция (точность: {confidence}%)",
  "marker.aria": "Отзыв #{number}: {type} — {message}",
  "marker.count": "Отображено маркеров отзывов: {count}",

  // FAB badge
  "fab.badge": "Нерешённых отзывов: {count}",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Отзыв успешно отправлен",
  "feedback.error.message": "Не удалось отправить отзыв",
  "feedback.deleted.confirmation": "Отзыв удалён",

  // Badge
  "badge.count": "Нерешённых отзывов: {count}",

  // Bulk actions toolbar
  "bulk.selectAll": "Выбрать все",
  "bulk.selected": "Выбрано: {count}",
  "bulk.resolve": "Решить",
  "bulk.delete": "Удалить",
  "bulk.deselect": "Снять выбор",

  // Sort and group controls
  "sort.newest": "Сначала новые",
  "sort.oldest": "Сначала старые",
  "sort.byType": "По типу",
  "sort.openFirst": "Сначала открытые",
  "sort.label": "Сортировка",
  "group.byPage": "По странице",
  "group.feedbacks": "Отзывов: {count}",

  // Stats bar
  "stats.open": "Открытые",
  "stats.resolved": "Решённые",
  "stats.bugs": "Баги",
  "stats.progress": "Решено: {percent}%",

  // Detail view
  "detail.back": "Назад",
  "detail.title": "Отзыв #{number}",
  "detail.status": "Статус",
  "detail.message": "Сообщение",
  "detail.screenshot": "Скриншот",
  "detail.screenshotAlt": "Скриншот выделенной области",
  "detail.metadata": "Детали",
  "detail.annotation": "Аннотация",
  "detail.page": "Страница",
  "detail.author": "Автор",
  "detail.date": "Создан",
  "detail.viewport": "Viewport",
  "detail.browser": "Браузер",
  "detail.resolvedAt": "Решён",
  "detail.goToAnnotation": "Перейти к аннотации",
  "detail.element": "Элемент",
  "detail.selector": "Селектор",
  "detail.position": "Позиция",
  "detail.resolve": "Решить",
  "detail.reopen": "Открыть заново",
  "detail.delete": "Удалить",
  "detail.diagnostics": "Диагностика",
  "detail.diagnostics.console": "Консоль",
  "detail.diagnostics.network": "Сетевые ошибки",
  "detail.diagnostics.expand": "Показать диагностику",
  "detail.diagnostics.collapse": "Скрыть диагностику",
  "detail.diagnostics.noEntries": "Нет записей",

  // Keyboard shortcuts overlay
  "shortcuts.title": "Горячие клавиши",
  "shortcuts.navigate": "Навигация по отзывам",
  "shortcuts.resolve": "Решить / Переоткрыть",
  "shortcuts.delete": "Удалить",
  "shortcuts.search": "Поиск",
  "shortcuts.select": "Переключить выбор",
  "shortcuts.help": "Показать клавиши",
  "shortcuts.close": "Закрыть",
  "shortcuts.hint": "Горячие клавиши",

  // Export controls
  "export.label": "Экспорт",
  "export.csv": "Экспорт в CSV",
  "export.json": "Экспорт в JSON",
};
