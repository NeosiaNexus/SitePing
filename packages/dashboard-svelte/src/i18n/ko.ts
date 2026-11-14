import type { Translations } from "./types.js";

export const ko: Translations = {
  // Inbox chrome
  "inbox.regionLabel": "피드백 수신함",
  "inbox.listLabel": "피드백 목록",
  "inbox.statusFilter": "상태로 필터링",
  "inbox.searchPlaceholder": "메시지 검색…",
  "inbox.searchAria": "피드백 검색",
  "inbox.clearSearch": "검색어 지우기",
  "inbox.resultsCount": "피드백 {count}건",
  "inbox.typeFilter": "유형으로 필터링",
  "inbox.typeAll": "모든 유형",
  "inbox.project": "프로젝트",
  "inbox.refresh": "새로고침",
  "inbox.loadMore": "더 불러오기 ({count})",

  // Empty / error states
  "inbox.emptyTitle": "아직 피드백이 없습니다",
  "inbox.emptySub": "위젯에서 보낸 피드백이 여기에 표시됩니다.",
  "inbox.emptyFilteredTitle": "항목 없음",
  "inbox.emptyFilteredSub": "이 필터에 맞는 피드백이 없습니다.",
  "inbox.viewAll": "모두 보기",
  "inbox.inboxZeroTitle": "모두 처리됨",
  "inbox.inboxZeroSub": "열린 피드백을 모두 처리했습니다.",
  "inbox.loadError": "피드백을 불러오지 못했습니다",
  "inbox.retry": "다시 시도",

  // Actions & toasts
  "inbox.cancel": "취소",
  "inbox.undo": "실행 취소",
  "inbox.actionFailed": "문제가 발생했습니다. 변경 사항을 되돌렸습니다.",
  "inbox.copied": "복사했습니다",
  "inbox.markedAs": "상태를 변경했습니다: {status}",
  "inbox.deleted": "피드백을 삭제했습니다",

  // Status labels
  "status.all": "전체",
  "status.open": "열림",
  "status.in_progress": "진행 중",
  "status.resolved": "해결됨",
  "status.wont_fix": "처리 안 함",

  // Feedback type labels
  "type.question": "질문",
  "type.change": "수정 요청",
  "type.bug": "버그",
  "type.other": "기타",

  // Drawer
  "drawer.title": "피드백 상세",
  "drawer.close": "상세 닫기",
  "drawer.openOnPage": "페이지에서 열기",
  "drawer.status": "상태",
  "drawer.author": "작성자",
  "drawer.page": "페이지",
  "drawer.viewport": "뷰포트",
  "drawer.submitted": "제출일",
  "drawer.browser": "브라우저",
  "drawer.anchor": "앵커",
  "drawer.diagnostics": "진단 정보",
  "drawer.showAllDiagnostics": "모두 보기 ({count})",
  "drawer.hideAnnotation": "주석 숨기기",
  "drawer.showAnnotation": "주석 보기",
  "drawer.screenshotAlt": "주석을 단 영역의 스크린샷",
  "drawer.zoomScreenshot": "스크린샷 확대",
  "drawer.noScreenshot": "이 피드백에는 스크린샷이 없습니다",
  "drawer.delete": "피드백 삭제",
  "drawer.deleteConfirm": "영구적으로 삭제할까요? 이 작업은 되돌릴 수 없습니다.",
  "drawer.deleteYes": "삭제",

  // Discussion thread
  "comments.title": "답글",
  "comments.team": "팀",
  "comments.placeholder": "클라이언트에게 답글 남기기…",
  "comments.send": "보내기",
  "comments.delete": "답글 삭제",
  "comments.failed": "문제가 발생했습니다. 다시 시도하세요.",

  // Footer hint bar
  "hints.navigate": "이동",
  "hints.open": "열기",
  "hints.resolve": "해결",
  "hints.inProgress": "진행 중",
  "hints.wontFix": "처리 안 함",
  "hints.help": "단축키",

  // Keyboard shortcuts overlay
  "shortcuts.title": "키보드 단축키",
  "shortcuts.close": "닫기",

  // Relative time
  "time.now": "방금",
  "time.minutes": "{n}분",
  "time.hours": "{n}시간",
  "time.days": "{n}일",
  "time.weeks": "{n}주",
  "time.month": "{n}개월",
  "time.months": "{n}개월",
  "time.year": "{n}년",
  "time.years": "{n}년",
};
