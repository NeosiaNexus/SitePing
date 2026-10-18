import type { Translations } from "./types.js";

export const ko: Translations = {
  // Panel
  "panel.title": "피드백",
  "panel.ariaLabel": "Siteping 피드백 패널",
  "panel.feedbackList": "피드백 목록",
  "panel.loading": "피드백을 불러오는 중",
  "panel.close": "패널 닫기",
  "panel.deleteAll": "모두 삭제",
  "panel.deleteAllConfirmTitle": "모두 삭제",
  "panel.deleteAllConfirmMessage": "이 프로젝트의 피드백을 모두 삭제할까요? 이 작업은 되돌릴 수 없습니다.",
  "panel.search": "검색...",
  "panel.searchAria": "피드백 검색",
  "panel.filterAll": "전체",
  "panel.loadError": "불러오지 못했습니다",
  "panel.retry": "다시 시도",
  "panel.empty": "아직 피드백이 없습니다",
  "panel.showMore": "더 보기",
  "panel.showLess": "접기",
  "panel.resolve": "해결",
  "panel.reopen": "다시 열기",
  "panel.delete": "삭제",
  "panel.cancel": "취소",
  "panel.confirmDelete": "삭제",
  "panel.loadMore": "더 불러오기 ({remaining}건 남음)",

  // Status filter labels
  "panel.statusAll": "전체",
  "panel.statusOpen": "열림",
  "panel.statusResolved": "해결됨",
  "panel.statusInProgress": "진행 중",
  "panel.statusWontFix": "처리 안 함",

  // Feedback type labels
  "type.label": "유형",
  "type.question": "질문",
  "type.change": "수정 요청",
  "type.bug": "버그",
  "type.other": "기타",

  // Status segmented control label
  "status.label": "상태",

  // Page scope segmented control
  "scope.label": "범위",
  "scope.thisPage": "이 페이지",
  "scope.thisType": "같은 유형의 페이지",
  "scope.all": "모든 페이지",

  // "Mine" toggle
  "panel.filterMine": "내 피드백",
  "panel.filterMineHint": "이 브라우저에서 보낸 피드백만 봅니다",

  // FAB menu
  "fab.aria": "Siteping — 피드백 메뉴",
  "fab.messages": "사이드바 보기",
  "fab.annotate": "새 주석 만들기",
  "fab.annotations": "마커 보이기 또는 숨기기",

  // Annotator
  "annotator.instruction":
    "댓글을 남길 영역에 사각형을 그리세요. Enter 키를 누르면 마지막으로 포커스한 요소에 댓글을 남깁니다",
  "annotator.instantInstruction": "클릭한 위치에 댓글을 남깁니다",
  "annotator.touchInstruction": "요소를 탭하거나 드래그해서 영역을 선택하세요",
  "annotator.cancel": "취소",

  // Popup
  "popup.ariaLabel": "피드백 작성",
  "popup.placeholder": "피드백 내용을 입력하세요...",
  "popup.textareaAria": "피드백 내용",
  "popup.submitHintMac": "⌘+Enter로 보내기",
  "popup.submitHintOther": "Ctrl+Enter로 보내기",
  "popup.cancel": "취소",
  "popup.submit": "보내기",

  // Identity modal
  "identity.title": "작성자 정보",
  "identity.nameLabel": "이름",
  "identity.namePlaceholder": "이름",
  "identity.emailLabel": "이메일",
  "identity.emailPlaceholder": "you@example.com",
  "identity.cancel": "취소",
  "identity.submit": "계속",

  // Markers
  "marker.approximate": "대략적인 위치 (신뢰도: {confidence}%)",
  "marker.aria": "피드백 #{number}: {type} — {message}",
  "marker.count": "피드백 마커 {count}개 표시 중",

  // FAB badge
  "fab.badge": "해결되지 않은 피드백 {count}건",

  // Accessibility — screen reader announcements
  "feedback.sent.confirmation": "피드백을 보냈습니다",
  "feedback.error.message": "피드백을 보내지 못했습니다",
  "feedback.deleted.confirmation": "피드백을 삭제했습니다",

  // Badge
  "badge.count": "해결되지 않은 피드백 {count}건",

  // Bulk actions toolbar
  "bulk.selectAll": "모두 선택",
  "bulk.selected": "{count}건 선택됨",
  "bulk.resolve": "해결",
  "bulk.delete": "삭제",
  "bulk.deselect": "선택 해제",

  // Sort and group controls
  "sort.newest": "최신순",
  "sort.oldest": "오래된순",
  "sort.byType": "유형별",
  "sort.openFirst": "열린 항목 먼저",
  "sort.label": "정렬",
  "group.byPage": "페이지별",
  "group.feedbacks": "피드백 {count}건",

  // Stats bar
  "stats.open": "열림",
  "stats.resolved": "해결됨",
  "stats.bugs": "버그",
  "stats.progress": "{percent}% 해결",

  // Detail view
  "detail.back": "뒤로",
  "detail.title": "피드백 #{number}",
  "detail.status": "상태",
  "detail.message": "내용",
  "detail.screenshot": "스크린샷",
  "detail.screenshotAlt": "주석을 단 영역의 스크린샷",
  "detail.metadata": "상세 정보",
  "detail.annotation": "주석",
  "detail.page": "페이지",
  "detail.author": "작성자",
  "detail.date": "작성일",
  "detail.viewport": "뷰포트",
  "detail.browser": "브라우저",
  "detail.resolvedAt": "해결일",
  "detail.closedAt": "종료일",
  "detail.goToAnnotation": "주석 위치로 이동",
  "detail.element": "요소",
  "detail.selector": "선택자",
  "detail.position": "위치",
  "detail.resolve": "해결",
  "detail.reopen": "다시 열기",
  "detail.delete": "삭제",
  "detail.diagnostics": "진단 정보",
  "detail.diagnostics.console": "콘솔",
  "detail.diagnostics.network": "실패한 네트워크 요청",
  "detail.diagnostics.expand": "진단 정보 보기",
  "detail.diagnostics.collapse": "진단 정보 숨기기",
  "detail.diagnostics.noEntries": "기록이 없습니다",

  // Discussion thread (detail view)
  "comments.title": "답글",
  "comments.placeholder": "팀에 답글 남기기...",
  "comments.error": "보내지 못했습니다. 다시 시도하세요.",
  "comments.full": "이 스레드에는 더 이상 답글을 달 수 없습니다.",
  "comments.team": "팀",

  // Keyboard shortcuts overlay
  "shortcuts.title": "키보드 단축키",
  "shortcuts.navigate": "피드백 간 이동",
  "shortcuts.resolve": "해결 / 다시 열기",
  "shortcuts.delete": "삭제",
  "shortcuts.search": "검색창으로 이동",
  "shortcuts.select": "선택 전환",
  "shortcuts.help": "단축키 보기",
  "shortcuts.close": "닫기",
  "shortcuts.hint": "키보드 단축키",

  // Export controls
  "export.label": "내보내기",
  "export.csv": "CSV 내보내기",
  "export.json": "JSON 내보내기",
};
