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

  // FAB menu
  "fab.aria": "Siteping — Меню обратной связи",
  "fab.messages": "Сообщения",
  "fab.annotate": "Аннотация",
  "fab.annotations": "Аннотации",

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

  // FAB badge
  "fab.badge": "Нерешённых отзывов: {count}",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "Отзыв успешно отправлен",
  "feedback.error.message": "Не удалось отправить отзыв",
  "feedback.deleted.confirmation": "Отзыв удалён",

  // Badge
  "badge.count": "Нерешённых отзывов: {count}",
};
