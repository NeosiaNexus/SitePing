import type { Translations } from "./types.js";

export const ja: Translations = {
  // Inbox chrome
  "inbox.regionLabel": "フィードバック受信箱",
  "inbox.listLabel": "フィードバック一覧",
  "inbox.statusFilter": "ステータスで絞り込む",
  "inbox.searchPlaceholder": "メッセージを検索…",
  "inbox.searchAria": "フィードバックを検索",
  "inbox.clearSearch": "検索をクリア",
  "inbox.resultsCount": "フィードバック {count} 件",
  "inbox.typeFilter": "種類で絞り込む",
  "inbox.typeAll": "すべての種類",
  "inbox.project": "プロジェクト",
  "inbox.refresh": "再読み込み",
  "inbox.loadMore": "さらに読み込む（{count}）",

  // Empty / error states
  "inbox.emptyTitle": "フィードバックはまだありません",
  "inbox.emptySub": "ウィジェットから送信されたフィードバックがここに届きます。",
  "inbox.emptyFilteredTitle": "該当なし",
  "inbox.emptyFilteredSub": "この条件に一致するフィードバックはありません。",
  "inbox.viewAll": "すべて表示",
  "inbox.inboxZeroTitle": "すべて対応済み",
  "inbox.inboxZeroSub": "未対応のフィードバックはありません。",
  "inbox.loadError": "フィードバックの読み込みに失敗しました",
  "inbox.retry": "再試行",

  // Actions & toasts
  "inbox.cancel": "キャンセル",
  "inbox.undo": "元に戻す",
  "inbox.actionFailed": "問題が発生しました。変更を元に戻しました。",
  "inbox.copied": "コピーしました",
  "inbox.markedAs": "「{status}」に変更しました",
  "inbox.deleted": "フィードバックを削除しました",

  // Status labels
  "status.all": "すべて",
  "status.open": "未対応",
  "status.in_progress": "対応中",
  "status.resolved": "解決済み",
  "status.wont_fix": "対応しない",

  // Feedback type labels
  "type.question": "質問",
  "type.change": "変更依頼",
  "type.bug": "不具合",
  "type.other": "その他",

  // Drawer
  "drawer.title": "フィードバックの詳細",
  "drawer.close": "詳細を閉じる",
  "drawer.openOnPage": "ページで開く",
  "drawer.status": "ステータス",
  "drawer.author": "投稿者",
  "drawer.page": "ページ",
  "drawer.viewport": "ビューポート",
  "drawer.submitted": "送信日時",
  "drawer.browser": "ブラウザ",
  "drawer.anchor": "アンカー",
  "drawer.diagnostics": "診断情報",
  "drawer.showAllDiagnostics": "すべて表示（{count}）",
  "drawer.hideAnnotation": "注釈を隠す",
  "drawer.showAnnotation": "注釈を表示",
  "drawer.screenshotAlt": "注釈が付いた範囲のスクリーンショット",
  "drawer.zoomScreenshot": "スクリーンショットを拡大",
  "drawer.noScreenshot": "このフィードバックにスクリーンショットはありません",
  "drawer.delete": "フィードバックを削除",
  "drawer.deleteConfirm": "完全に削除しますか？この操作は取り消せません。",
  "drawer.deleteYes": "削除",

  // Discussion thread
  "comments.title": "返信",
  "comments.team": "チーム",
  "comments.placeholder": "クライアントに返信…",
  "comments.send": "送信",
  "comments.delete": "返信を削除",
  "comments.failed": "問題が発生しました。もう一度お試しください。",

  // Footer hint bar
  "hints.navigate": "移動",
  "hints.open": "開く",
  "hints.resolve": "解決",
  "hints.inProgress": "対応中",
  "hints.wontFix": "対応しない",
  "hints.help": "ショートカット",

  // Keyboard shortcuts overlay
  "shortcuts.title": "キーボードショートカット",
  "shortcuts.close": "閉じる",

  // Relative time
  "time.now": "たった今",
  "time.minutes": "{n} 分",
  "time.hours": "{n} 時間",
  "time.days": "{n} 日",
  "time.weeks": "{n} 週間",
  "time.month": "{n} か月",
  "time.months": "{n} か月",
  "time.year": "{n} 年",
  "time.years": "{n} 年",
};
