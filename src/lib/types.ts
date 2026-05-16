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

export type DevLog = {
  slug: string;
  title: string;
  date: string;
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
