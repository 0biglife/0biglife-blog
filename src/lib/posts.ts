import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { DevLog, Post } from "./types";
import { serialize } from "next-mdx-remote/serialize";

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

const getThumbnail = (folderName: string): string => {
  const folderPath = path.join(publicDir, folderName);
  if (!fs.existsSync(folderPath)) return "/assets/default-thumbnail.png"; // 기본 썸네일

  const files = fs.readdirSync(folderPath);
  const thumbnailFile = files.find((file) => /^thumbnail\./.test(file));

  return thumbnailFile
    ? `/assets/posts/${folderName}/${thumbnailFile}`
    : "/assets/default-thumbnail.png";
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
  const filePath = path.join(contentPostDir, slug, "index.mdx");

  if (!fs.existsSync(filePath)) return null;

  const fileContents = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContents);

  // MDX 변환
  const mdxSource = await serialize(content);

  return {
    slug,
    title: data.title,
    date: data.date,
    description: data.description,
    category: data.category || null,
    subcategory: data.subcategory || null,
    thumbnail: getThumbnail(filePath),
    tags: data.tags,
    content: mdxSource,
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
      const slug = "dev-logs/" + folder;

      return {
        slug,
        title: data.title,
        date: data.date,
      };
    })
    .filter((post): post is Post => post !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
