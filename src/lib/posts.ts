/**
 * @issue
 *
 * 1. acorn 에러(`Could not parse expression with acorn`)
 *  - acorn(JavaScript 파서)이 MDX 내부에 잘못된 js 표현식 감지했을 때 발생하는 오류
 *  - JSX에서는 <i> 태그가 self-closing 태그(닫힘 태그 없는 태그) 와 혼동될 가능성이 있으므로 제거 필요.(즉, MDX 내부에서 JSX로 변환될 때 <i> 태그가 올바르게 닫히지 않으면 파싱 오류가 발생할 수 있음)
 *
 */

import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { DevLog, Post } from "./types";
import { compileMDX } from "next-mdx-remote/rsc";
import { MarkdownRenderer } from "@/components";
import { errorLog } from "./utils";

const categoryObj = {
  // 서버에서 정렬(SSR) + 클라이언트측 불필요한 카테고리 연산 제거 + 순서 정의
  Frontend: 1,
  Backend: 2,
  // DevOps: 3,
  // AI: 4,
};

const contentPostDir = path.join(process.cwd(), "content/posts");
const contentLogDir = path.join(process.cwd(), "content/dev-logs");
const publicDir = path.join(process.cwd(), "public/assets/posts");

// 썸네일 경로
const getThumbnail = (folderName: string): string => {
  const folderPath = path.join(publicDir, folderName);
  if (!fs.existsSync(folderPath)) return "/assets/default-thumbnail.webp";

  const files = fs.readdirSync(folderPath);

  const webpFile = files.find((file) =>
    /^thumbnail-optimized\.webp$/.test(file)
  );

  if (webpFile) return `/assets/posts/${folderName}/${webpFile}`;

  const originalWebpFile = files.find((file) => /^thumbnail\.webp$/.test(file));
  if (originalWebpFile)
    return `/assets/posts/${folderName}/${originalWebpFile}`;

  const optimizedFile = files.find((file) =>
    /^thumbnail-optimized\.(png|jpg|jpeg)$/.test(file)
  );
  if (optimizedFile) return `/assets/posts/${folderName}/${optimizedFile}`;

  const fallbackFile = files.find((file) =>
    /^thumbnail\.(png|jpg|jpeg)$/.test(file)
  );
  return fallbackFile
    ? `/assets/posts/${folderName}/${fallbackFile}`
    : "/assets/default-thumbnail.webp";
};

// mdx 내부 이미지에 경로 주입
const transformImagePaths = (content: string, slug: string): string => {
  return content.replace(
    /!\[(.*?)\]\((?!https?:\/\/)(.*?)\.(jpg|jpeg|png)\)/g,
    (match, alt, srcBase) => {
      return `![${alt}](/assets/posts/${slug}/${srcBase}-optimized.webp)`;
    }
  );
};

export const getAllPosts = (): Post[] => {
  const folders = fs.readdirSync(contentPostDir);

  const posts = folders
    .map((folder) => {
      const filePath = path.join(contentPostDir, folder, "index.mdx");
      if (!fs.existsSync(filePath)) return null;

      const fileContents = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(fileContents);

      return {
        slug: folder,
        title: data.title,
        date: data.date,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory,
        thumbnail: getThumbnail(folder),
        tags: data.tags,
      };
    })
    .filter((post): post is Post => post !== null);

  posts.sort((a, b) => {
    const categoryOrderA =
      categoryObj[a.category as keyof typeof categoryObj] || 999;
    const categoryOrderB =
      categoryObj[b.category as keyof typeof categoryObj] || 999;

    return (
      categoryOrderA - categoryOrderB ||
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  });

  return posts;
};

export const getPostBySlug = async (slug: string): Promise<Post | null> => {
  if (!slug) {
    errorLog("[getPostBySlug] Slug is undefined or empty");
    return null;
  }

  const filePath = path.join(contentPostDir, slug, "index.mdx");

  if (!fs.existsSync(filePath)) {
    errorLog("[getPostBySlug] File does not exist:", filePath);
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContents);

  if (!data.title || !data.date) {
    errorLog("[getPostBySlug] Missing required fields in frontmatter:", slug);
    return null;
  }

  const transformedContent = transformImagePaths(content, slug);

  const mdxSource = await compileMDX({
    source: transformedContent,
    components: MarkdownRenderer,
  });

  return {
    slug,
    title: data.title,
    date: data.date,
    description: data.description,
    category: data.category || null,
    subcategory: data.subcategory || null,
    thumbnail: getThumbnail(slug),
    tags: data.tags,
    content: mdxSource.content,
  };
};

export const getAllDevLogs = (): DevLog[] => {
  const folders = fs.readdirSync(contentLogDir);

  return folders
    .map((folder) => {
      const filePath = path.join(contentLogDir, folder, "index.mdx");
      if (!fs.existsSync(filePath)) return null;

      const fileContents = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(fileContents);
      const slug = folder;

      return {
        slug,
        title: data.title,
        date: data.date,
      };
    })
    .filter((post): post is Post => post !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getDevLogBySlug = async (slug: string): Promise<DevLog | null> => {
  const filePath = path.join(contentLogDir, slug, "index.mdx");

  if (!fs.existsSync(filePath)) return null;

  const fileContents = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContents);

  const mdxSource = await compileMDX({
    source: content,
    components: MarkdownRenderer,
  });

  return {
    slug,
    title: data.title,
    date: data.date,
    content: mdxSource.content,
  };
};
