import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Work, WorkFile, WorkMeta, WorkType } from "./types";
import { compileMDX } from "next-mdx-remote/rsc";
import { MarkdownRenderer } from "@/components";
import { extractTOC } from "./posts";
import { errorLog } from "./utils";
import remarkGfm from "remark-gfm";

const contentWorksDir = path.join(process.cwd(), "content/works");
const publicWorksDir = path.join(process.cwd(), "public/works");

// 폴더가 유효한 work 인지 검사 (index.mdx + demo/ 둘 다 존재)
const isValidWork = (folder: string): boolean => {
  const indexPath = path.join(contentWorksDir, folder, "index.mdx");
  const demoPath = path.join(contentWorksDir, folder, "demo");
  return (
    fs.existsSync(indexPath) &&
    fs.existsSync(demoPath) &&
    fs.statSync(demoPath).isDirectory()
  );
};

// 커버 이미지 경로
const getCover = (slug: string): string => {
  const coverPath = path.join(contentWorksDir, slug, "cover.png");
  if (fs.existsSync(coverPath)) return `/works/${slug}/cover.png`;
  return "/assets/default-thumbnail.webp";
};

// frontmatter data + slug → WorkMeta (getAllWorks, getWorkBySlug 공용)
const buildWorkMeta = (
  data: Record<string, unknown>,
  slug: string
): WorkMeta => {
  const github =
    typeof data.github === "string" && data.github.trim() !== ""
      ? data.github
      : undefined;

  return {
    slug,
    title: data.title as string,
    date: data.date as string,
    summary: (data.summary as string) ?? "",
    type: (data.type as WorkType) ?? "vanilla",
    tags: (data.tags as string[]) ?? [],
    aspectRatio: (data.aspectRatio as string) ?? "16/9",
    autoplay: (data.autoplay as boolean) ?? false,
    ...(github ? { github } : {}),
    cover: getCover(slug),
  };
};

export const getAllWorks = (): WorkMeta[] => {
  const folders = fs.readdirSync(contentWorksDir);

  const works = folders
    .map((folder) => {
      if (!isValidWork(folder)) return null;

      const filePath = path.join(contentWorksDir, folder, "index.mdx");
      const fileContents = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(fileContents);

      return buildWorkMeta(data, folder);
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

  const filePath = path.join(contentWorksDir, slug, "index.mdx");

  if (!fs.existsSync(filePath)) {
    errorLog("[getWorkBySlug] File does not exist:", filePath);
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContents);

  const mdxSource = await compileMDX({
    source: content,
    components: MarkdownRenderer,
    options: {
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
  });

  const toc = extractTOC(content);

  // manifest.json (prebuild 산출물). dev 모드에서 없을 수 있으므로 throw 금지.
  let files: WorkFile[] = [];
  const manifestPath = path.join(publicWorksDir, slug, "manifest.json");
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      files = manifest.files ?? [];
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
    ...buildWorkMeta(data, slug),
    content: mdxSource.content,
    files,
    zipPath: `/works/${slug}/${slug}.zip`,
    demoPath: `/works/${slug}/demo/index.html`,
    toc,
  };
};

export const getAllWorkSlugs = (): string[] => {
  return getAllWorks().map((work) => work.slug);
};
