import { ReactNode } from "react";
import type { Lang } from "@/i18n/dictionary";

export type Post = {
  slug: string;
  title: string;
  date: string;
  description: string;
  category: string;
  subcategory: string;
  thumbnail: string;
  tags: string[];
  content: ReactNode;
  toc?: TOCItem[];
};

/**
 * 목록용(본문 없음). getAllDevLogs 는 frontmatter 만 읽으므로 content 가 없는데
 * 여태 `is DevLog` 술어로 눌러 담고 있었다 — 그래서 목록 항목에 content 가
 * 있는 것처럼 보였다. 목록과 상세를 타입으로 갈라둔다.
 */
export type DevLogSummary = {
  slug: string;
  title: string;
  date: string;
  /**
   * 검색 색인 허용 여부. dev-log 는 원래 메모장이라 전부 noindex 였는데, 그 사이
   * 본문 8천자짜리 글도 여기 쌓이면서 검색에서 통째로 막히고 있었다. 글마다
   * frontmatter 로 정한다(기본 false = 메모는 계속 비공개).
   */
  indexable?: boolean;
  description?: string;
};

export type DevLog = DevLogSummary & {
  content: ReactNode;
  toc?: TOCItem[];
};

export type TOCItem = {
  id: string;
  text: string;
  level: number;
};

export type WorkType = "vanilla" | "react" | "webgl";

export type WorkFile = {
  path: string;        // demo/ 기준 상대 경로 (예: "index.html")
  content: string;     // 파일 원문
  lang: string;        // syntax highlighter 언어 (html/css/javascript 등)
};

// work 한 건의 언어별 텍스트 메타 (제목·요약).
export type WorkLocaleText = {
  title: string;
  summary: string;
};

// work 한 건의 언어별 본문 (컴파일된 MDX 설명글 + 목차).
export type WorkLocaleContent = {
  content: ReactNode;
  toc: TOCItem[];
};

export type WorkMeta = {
  slug: string;
  title: string;        // 기본(ko) 제목 — 메타데이터/정렬용
  date: string;
  type: WorkType;
  tags: string[];       // 태그는 번역하지 않음 (필터 일관성 유지)
  summary: string;      // 기본(ko) 요약
  github?: string;
  aspectRatio: string;  // "16/9" 등
  autoplay: boolean;
  cover: string;        // /works/<slug>/cover.png 경로
  i18n: Record<Lang, WorkLocaleText>; // 언어별 제목·요약 (ko/en/ja 모두 존재)
};

export type Work = WorkMeta & {
  content: ReactNode;  // 기본(ko) 컴파일 MDX
  files: WorkFile[];   // 코드 탭용
  zipPath: string;     // /works/<slug>/<slug>.zip
  demoPath: string;    // /works/<slug>/demo/index.html
  toc?: TOCItem[];     // 기본(ko) 목차
  localized: Record<Lang, WorkLocaleContent>; // 언어별 본문 (ko/en/ja 모두 존재)
};
