// i18n 사전 — UI 텍스트 전용 (블로그 글 본문은 원문 유지)
// 키는 네임스페이스 점 표기. ko를 원본으로 두고 en/ja는 동일 키셋을 타입으로 강제.

export type Lang = "ko" | "en" | "ja";

export const DEFAULT_LANG: Lang = "ko";

// 헤더 언어 스위처 메뉴에 노출되는 순서/라벨
export const LANGS: ReadonlyArray<{ code: Lang; label: string }> = [
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "ja", label: "日本語" },
];

const ko = {
  "nav.works": "Works",
  "nav.log": "Log",
  "home.featured": "Recently Featured",
  "home.devLogs": "Dev Logs",
  "posts.category": "Category",
  "posts.all": "전체보기",
  "posts.empty": "게시글이 없습니다.",
  "post.toc": "Index",
  "post.updated": "Updated:",
  "log.lastUpdated": "Last updated on",
  "pagination.prev": "이전 페이지",
  "pagination.next": "다음 페이지",
  "notFound.code": "404",
  "notFound.message": "페이지를 찾을 수 없습니다.",
  "notFound.helpBefore": "혹시 문제가 발생하였다면",
  "notFound.helpAfter": "로 이메일로 요청해주세요.",
  "notFound.home": "홈으로 돌아가기",
  "footer.rights": "© 2025. 0biglife all rights reserved.",
  // works 갤러리 / 상세
  "works.tagAll": "전체",
  "works.subtitle": "브라우저에서 바로 실행되는 인터랙티브 실험들.",
  "works.countSuffix": "개의 작업물", // `${n}${suffix}` 형태로 사용
  "works.noResults": "결과 없음",
  "works.empty": "아직 작업물이 없습니다.",
  "works.emptyTag": "해당 태그의 작업물이 없습니다.",
  "workActions.download": "ZIP 다운로드",
  "workActions.share": "공유",
  "workActions.shareCopied": "링크가 복사되었습니다",
  "workActions.shareFailed": "공유에 실패했습니다",
  "workCard.previewSuffix": " 미리보기", // `${title}${suffix}` 형태로 사용
  "demo.loadFailed": "데모를 불러올 수 없습니다",
  "code.heading": "코드",
  "code.preparing": "코드 준비 중",
} as const;

// ko의 키 집합이 곧 전체 번역 키. en/ja는 이 타입으로 누락/오타가 컴파일 타임에 차단됨.
export type TranslationKey = keyof typeof ko;

const en: Record<TranslationKey, string> = {
  "nav.works": "Works",
  "nav.log": "Log",
  "home.featured": "Recently Featured",
  "home.devLogs": "Dev Logs",
  "posts.category": "Category",
  "posts.all": "All",
  "posts.empty": "No posts yet.",
  "post.toc": "Index",
  "post.updated": "Updated:",
  "log.lastUpdated": "Last updated on",
  "pagination.prev": "Previous page",
  "pagination.next": "Next page",
  "notFound.code": "404",
  "notFound.message": "Page not found.",
  "notFound.helpBefore": "If something went wrong, email",
  "notFound.helpAfter": "and let me know.",
  "notFound.home": "Back to home",
  "footer.rights": "© 2025. 0biglife all rights reserved.",
  "works.tagAll": "All",
  "works.subtitle": "Interactive experiments that run right in the browser.",
  "works.countSuffix": " works",
  "works.noResults": "No results",
  "works.empty": "No works yet.",
  "works.emptyTag": "No works for this tag.",
  "workActions.download": "Download ZIP",
  "workActions.share": "Share",
  "workActions.shareCopied": "Link copied",
  "workActions.shareFailed": "Sharing failed",
  "workCard.previewSuffix": " preview",
  "demo.loadFailed": "Failed to load the demo",
  "code.heading": "Code",
  "code.preparing": "Code coming soon",
};

const ja: Record<TranslationKey, string> = {
  "nav.works": "Works",
  "nav.log": "Log",
  "home.featured": "最近のおすすめ",
  "home.devLogs": "開発ログ",
  "posts.category": "カテゴリー",
  "posts.all": "すべて表示",
  "posts.empty": "投稿がありません。",
  "post.toc": "目次",
  "post.updated": "更新:",
  "log.lastUpdated": "最終更新日",
  "pagination.prev": "前のページ",
  "pagination.next": "次のページ",
  "notFound.code": "404",
  "notFound.message": "ページが見つかりません。",
  "notFound.helpBefore": "問題が発生した場合は",
  "notFound.helpAfter": "までメールでお知らせください。",
  "notFound.home": "ホームに戻る",
  "footer.rights": "© 2025. 0biglife all rights reserved.",
  "works.tagAll": "すべて",
  "works.subtitle": "ブラウザ上でそのまま動くインタラクティブな実験。",
  "works.countSuffix": "件の作品",
  "works.noResults": "結果なし",
  "works.empty": "作品がまだありません。",
  "works.emptyTag": "このタグの作品はありません。",
  "workActions.download": "ZIPをダウンロード",
  "workActions.share": "共有",
  "workActions.shareCopied": "リンクをコピーしました",
  "workActions.shareFailed": "共有に失敗しました",
  "workCard.previewSuffix": " プレビュー",
  "demo.loadFailed": "デモを読み込めませんでした",
  "code.heading": "コード",
  "code.preparing": "コード準備中",
};

export const dictionary: Record<Lang, Record<TranslationKey, string>> = {
  ko,
  en,
  ja,
};
