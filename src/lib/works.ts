import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  Work,
  WorkFile,
  WorkMeta,
  WorkType,
  WorkLocaleText,
  WorkLocaleContent,
} from "./types";
import { compileMDX } from "next-mdx-remote/rsc";
import { MarkdownRenderer } from "@/components";
import { extractTOC } from "./posts";
import { errorLog } from "./utils";
import remarkGfm from "remark-gfm";
import type { Lang } from "@/i18n/dictionary";

const contentWorksDir = path.join(process.cwd(), "content/works");
const publicWorksDir = path.join(process.cwd(), "public/works");

// 지원 언어. ko 는 원본, en/ja 는 번역 파일이 있으면 사용하고 없으면 ko 로 폴백.
const LANGS: Lang[] = ["ko", "en", "ja"];

// 언어별 mdx 파일명: ko = index.mdx, 그 외 = index.<lang>.mdx
const localeFileName = (lang: Lang): string =>
  lang === "ko" ? "index.mdx" : `index.${lang}.mdx`;

type ParsedLocale = { data: Record<string, unknown>; content: string };

// 폴더가 유효한 work 인지 검사 (index.mdx + demo/ 둘 다 존재)
const isValidWork = (slug: string): boolean => {
  const indexPath = path.join(contentWorksDir, slug, "index.mdx");
  const demoPath = path.join(contentWorksDir, slug, "demo");
  return (
    fs.existsSync(indexPath) &&
    fs.existsSync(demoPath) &&
    fs.statSync(demoPath).isDirectory()
  );
};

// 특정 언어의 mdx 파일을 읽어 frontmatter + 본문 반환. 파일이 없으면 null.
const readLocale = (slug: string, lang: Lang): ParsedLocale | null => {
  const filePath = path.join(contentWorksDir, slug, localeFileName(lang));
  if (!fs.existsSync(filePath)) return null;
  const { data, content } = matter(fs.readFileSync(filePath, "utf-8"));
  return { data: data as Record<string, unknown>, content };
};

// 커버 이미지 경로
const getCover = (slug: string): string => {
  const coverPath = path.join(contentWorksDir, slug, "cover.png");
  if (fs.existsSync(coverPath)) return `/works/${slug}/cover.png`;
  return "/assets/default-thumbnail.webp";
};

// ko 를 기본값으로, en/ja 파일이 있으면 제목·요약을 덮어 언어별 텍스트 맵 생성.
// 번역 파일이 없거나 필드가 비어 있으면 ko 값으로 폴백한다.
const buildI18n = (
  slug: string,
  koData: Record<string, unknown>
): Record<Lang, WorkLocaleText> => {
  const koTitle = String(koData.title ?? "");
  const koSummary = String(koData.summary ?? "");
  const result = {} as Record<Lang, WorkLocaleText>;
  for (const lang of LANGS) {
    const d = lang === "ko" ? koData : readLocale(slug, lang)?.data;
    const title =
      typeof d?.title === "string" && d.title.trim() !== "" ? d.title : koTitle;
    const summary =
      typeof d?.summary === "string" && d.summary.trim() !== ""
        ? d.summary
        : koSummary;
    result[lang] = { title, summary };
  }
  return result;
};

// frontmatter(ko) + slug + i18n → WorkMeta
const buildWorkMeta = (
  data: Record<string, unknown>,
  slug: string,
  i18n: Record<Lang, WorkLocaleText>
): WorkMeta => {
  const github =
    typeof data.github === "string" && data.github.trim() !== ""
      ? data.github
      : undefined;

  return {
    slug,
    title: i18n.ko.title,
    date:
      data.date instanceof Date
        ? data.date.toISOString().slice(0, 10)
        : String(data.date ?? ""),
    summary: i18n.ko.summary,
    type: (data.type as WorkType) ?? "vanilla",
    tags: (data.tags as string[]) ?? [],
    aspectRatio: (data.aspectRatio as string) ?? "16/9",
    autoplay: (data.autoplay as boolean) ?? false,
    ...(github ? { github } : {}),
    cover: getCover(slug),
    i18n,
  };
};

export const getAllWorks = (): WorkMeta[] => {
  if (!fs.existsSync(contentWorksDir)) return [];

  const folders = fs.readdirSync(contentWorksDir);

  const works = folders
    .map((folder) => {
      if (!isValidWork(folder)) return null;

      const ko = readLocale(folder, "ko");
      if (!ko || !ko.data.title || !ko.data.date) return null;

      const i18n = buildI18n(folder, ko.data);
      return buildWorkMeta(ko.data, folder, i18n);
    })
    .filter((work): work is WorkMeta => work !== null);

  works.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return works;
};

export const getWorkBySlug = async (slug: string): Promise<Work | null> => {
  if (!slug) {
    errorLog("[getWorkBySlug] Slug is undefined or empty");
    return null;
  }

  const ko = readLocale(slug, "ko");
  if (!ko) {
    errorLog("[getWorkBySlug] index.mdx does not exist:", slug);
    return null;
  }
  if (!ko.data.title || !ko.data.date) {
    errorLog("[getWorkBySlug] Missing required fields in frontmatter:", slug);
    return null;
  }

  const i18n = buildI18n(slug, ko.data);

  // 언어별 본문 컴파일 — 번역 파일이 없으면 ko 본문으로 폴백.
  const localized = {} as Record<Lang, WorkLocaleContent>;
  for (const lang of LANGS) {
    const locale = lang === "ko" ? ko : readLocale(slug, lang) ?? ko;
    const mdxSource = await compileMDX({
      source: locale.content,
      components: MarkdownRenderer,
      options: {
        mdxOptions: {
          remarkPlugins: [remarkGfm],
        },
      },
    });
    localized[lang] = {
      content: mdxSource.content,
      toc: extractTOC(locale.content),
    };
  }

  // manifest.json (prebuild 산출물). dev 모드에서 없을 수 있으므로 throw 금지.
  let files: WorkFile[] = [];
  const manifestPath = path.join(publicWorksDir, slug, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      files = Array.isArray(manifest.files) ? manifest.files : [];
    } catch (error) {
      errorLog("[getWorkBySlug] Failed to parse manifest.json:", error);
    }
  } else {
    errorLog(
      "[getWorkBySlug] manifest.json not found (run prebuild):",
      manifestPath
    );
  }

  return {
    ...buildWorkMeta(ko.data, slug, i18n),
    content: localized.ko.content,
    files,
    zipPath: `/works/${slug}/${slug}.zip`,
    demoPath: `/works/${slug}/demo/index.html`,
    toc: localized.ko.toc,
    localized,
  };
};

export const getAllWorkSlugs = (): string[] => {
  return getAllWorks().map((work) => work.slug);
};
