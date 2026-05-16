import { ReactNode } from "react";

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

export type WorkMeta = {
  slug: string;
  title: string;
  date: string;
  type: WorkType;
  tags: string[];
  summary: string;
  github?: string;
  aspectRatio: string; // "16/9" 등
  autoplay: boolean;
  cover: string;       // /works/<slug>/cover.png 경로
};

export type Work = WorkMeta & {
  content: ReactNode;  // 컴파일된 MDX 설명글
  files: WorkFile[];   // 코드 탭용
  zipPath: string;     // /works/<slug>/<slug>.zip
  demoPath: string;    // /works/<slug>/demo/index.html
  toc?: TOCItem[];
};
