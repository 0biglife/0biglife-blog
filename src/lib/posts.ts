import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { DevLog, Post } from "./types";

const contentPostDir = path.join(process.cwd(), "content/posts");
const contentLogDir = path.join(process.cwd(), "content/dev-logs");
const publicDir = path.join(process.cwd(), "public/assets/blog");

const getThumbnail = (folderName: string): string => {
  const folderPath = path.join(publicDir, folderName);
  if (!fs.existsSync(folderPath)) return "/default-thumbnail.png"; // 기본 썸네일

  const files = fs.readdirSync(folderPath);
  const thumbnailFile = files.find((file) => /^thumbnail\./.test(file));

  return thumbnailFile
    ? `/assets/blog/${folderName}/${thumbnailFile}`
    : "/default-thumbnail.png";
};

export const getAllPosts = (): Post[] => {
  const folders = fs.readdirSync(contentPostDir);

  return folders
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
        thumbnail: getThumbnail(folder),
        tags: data.tags,
      };
    })
    .filter((post): post is Post => post !== null)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getPostBySlug = (slug: string) => {
  const filePath = path.join(contentPostDir, slug, "index.mdx");

  if (!fs.existsSync(filePath)) return null;

  const fileContents = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title,
    date: data.date,
    description: data.description,
    thumbnail: `/assets/blog/${slug}/thumbnail.png`,
    tags: data.tags,
    content,
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
