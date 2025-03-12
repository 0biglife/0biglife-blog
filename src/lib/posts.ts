import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const postsDirectory = path.join(process.cwd(), "src/content");

export async function getAllPosts() {
  const files = fs.readdirSync(postsDirectory);
  return files.map((fileName) => {
    const slug = fileName.replace(".mdx", "");
    const filePath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(filePath, "utf-8");
    const { data } = matter(fileContents);

    return { slug, title: data.title };
  });
}

export async function getPostBySlug(slug: string) {
  const filePath = path.join(postsDirectory, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const fileContents = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(fileContents);
  const processedContent = await remark().use(html).process(content);

  return { title: data.title, content: processedContent.toString() };
}
