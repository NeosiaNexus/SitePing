import type { Translations } from "./types.js";

export const ja: Translations = {
  // Panel
  "panel.title": "フィードバック",
  "panel.ariaLabel": "Siteping フィードバックパネル",
  "panel.feedbackList": "フィードバック一覧",
  "panel.loading": "フィードバックを読み込み中",
  "panel.close": "パネルを閉じる",
  "panel.deleteAll": "全削除",
  "panel.deleteAllConfirmTitle": "すべて削除",
  "panel.deleteAllConfirmMessage": "このプロジェクトのフィードバックをすべて削除しますか？この操作は取り消せません。",
  "panel.search": "検索...",
  "panel.searchAria": "フィードバックを検索",
  "panel.filterAll": "すべて",
  "panel.loadError": "読み込みに失敗しました",
  "panel.retry": "再試行",
  "panel.empty": "フィードバックはまだありません",
  "panel.showMore": "もっと見る",
  "panel.showLess": "折りたたむ",
  "panel.resolve": "解決",
  "panel.reopen": "再オープン",
  "panel.delete": "削除",
  "panel.cancel": "キャンセル",
  "panel.confirmDelete": "削除",
  "panel.loadMore": "さらに読み込む（残り {remaining} 件）",

  // Status filter labels
  "panel.statusAll": "すべて",
  "panel.statusOpen": "未対応",
  "panel.statusResolved": "解決済み",
  "panel.statusInProgress": "対応中",
  "panel.statusWontFix": "対応しない",

  // Feedback type labels
  "type.label": "種類",
  "type.question": "質問",
  "type.change": "変更依頼",
  "type.bug": "不具合",
  "type.other": "その他",

  // Status segmented control label
  "status.label": "ステータス",

  // Page scope segmented control
  "scope.label": "範囲",
  "scope.thisPage": "このページ",
  "scope.thisType": "このページ種別",
  "scope.all": "すべてのページ",

  // FAB menu
  "fab.aria": "Siteping — フィードバックメニュー",
  "fab.messages": "サイドバーを表示",
  "fab.annotate": "新しい注釈を作成",
  "fab.annotations": "マーカーの表示を切り替え",

  // Annotator
  "annotator.instruction":
    "コメントしたい範囲を四角で囲んでください — または Enter キーで最後にフォーカスした要素にコメントできます",
  "annotator.instantInstruction": "クリックした箇所にコメント",
  "annotator.cancel": "キャンセル",

  // Popup
  "popup.ariaLabel": "フィードバックフォーム",
  "popup.placeholder": "フィードバックを入力してください...",
  "popup.textareaAria": "フィードバック本文",
  "popup.submitHintMac": "⌘+Enter で送信",
  "popup.submitHintOther": "Ctrl+Enter で送信",
  "popup.cancel": "キャンセル",
  "popup.submit": "送信",

  // Identity modal
  "identity.title": "お名前とメールアドレスを入力",
  "identity.nameLabel": "名前",
  "identity.namePlaceholder": "お名前",
  "identity.emailLabel": "メールアドレス",
  "identity.emailPlaceholder": "your@email.com",
  "identity.cancel": "キャンセル",
  "identity.submit": "続ける",

  // Markers
  "marker.approximate": "おおよその位置（確度: {confidence}%）",
  "marker.aria": "フィードバック #{number}: {type} — {message}",
  "marker.count": "{count} 件のフィードバックマーカーを表示中",

  // FAB badge
  "fab.badge": "未解決のフィードバック {count} 件",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "フィードバックを送信しました",
  "feedback.error.message": "フィードバックの送信に失敗しました",
  "feedback.deleted.confirmation": "フィードバックを削除しました",

  // Badge
  "badge.count": "未解決のフィードバック {count} 件",

  // Bulk actions toolbar
  "bulk.selectAll": "すべて選択",
  "bulk.selected": "{count} 件選択中",
  "bulk.resolve": "解決",
  "bulk.delete": "削除",
  "bulk.deselect": "選択を解除",

  // Sort and group controls
  "sort.newest": "新しい順",
  "sort.oldest": "古い順",
  "sort.byType": "種類別",
  "sort.openFirst": "未対応を先頭に",
  "sort.label": "並び替え",
  "group.byPage": "ページ別",
  "group.feedbacks": "フィードバック {count} 件",

  // Stats bar
  "stats.open": "未対応",
  "stats.resolved": "解決済み",
  "stats.bugs": "不具合",
  "stats.progress": "{percent}% 解決済み",

  // Detail view
  "detail.back": "戻る",
  "detail.title": "フィードバック #{number}",
  "detail.status": "ステータス",
  "detail.message": "メッセージ",
  "detail.screenshot": "スクリーンショット",
  "detail.screenshotAlt": "注釈が付いた範囲のスクリーンショット",
  "detail.metadata": "詳細",
  "detail.annotation": "注釈",
  "detail.page": "ページ",
  "detail.author": "投稿者",
  "detail.date": "作成日時",
  "detail.viewport": "ビューポート",
  "detail.browser": "ブラウザ",
  "detail.resolvedAt": "解決日時",
  "detail.closedAt": "クローズ日時",
  "detail.goToAnnotation": "注釈へ移動",
  "detail.element": "要素",
  "detail.selector": "セレクター",
  "detail.position": "位置",
  "detail.resolve": "解決",
  "detail.reopen": "再オープン",
  "detail.delete": "削除",
  "detail.diagnostics": "診断情報",
  "detail.diagnostics.console": "コンソール",
  "detail.diagnostics.network": "失敗した通信",
  "detail.diagnostics.expand": "診断情報を表示",
  "detail.diagnostics.collapse": "診断情報を隠す",
  "detail.diagnostics.noEntries": "項目はありません",

  // Keyboard shortcuts overlay
  "shortcuts.title": "キーボードショートカット",
  "shortcuts.navigate": "フィードバックを移動",
  "shortcuts.resolve": "解決 / 再オープン",
  "shortcuts.delete": "削除",
  "shortcuts.search": "検索にフォーカス",
  "shortcuts.select": "選択を切り替え",
  "shortcuts.help": "ショートカットを表示",
  "shortcuts.close": "閉じる",
  "shortcuts.hint": "キーボードショートカット",

  // Export controls
  "export.label": "出力",
  "export.csv": "CSV で出力",
  "export.json": "JSON で出力",
};
