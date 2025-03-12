import "server-only";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { Post } from "./types";

const contentDir = path.join(process.cwd(), "content");

export const getAllPosts = (): Post[] => {
  const folders = fs.readdirSync(contentDir);

  return folders
    .map((folder) => {
      const filePath = path.join(contentDir, folder, "index.mdx");
      const fileContents = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(fileContents);

      return {
        slug: folder,
        title: data.title,
        date: data.date,
        description: data.description,
        thumbnail: `/api/image/${folder}/${data.thumbnail}`,
        tags: data.tags,
      };
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
