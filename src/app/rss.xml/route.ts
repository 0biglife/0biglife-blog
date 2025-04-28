import { Feed } from "feed";
import { getAllPosts } from "@/lib/posts";

export async function GET() {
  const posts = await getAllPosts();
  const siteUrl = "https://0biglife.com";
  const feed = new Feed({
    title: "0biglife 기술 블로그",
    description: "기억을 기록을 이기지 못한다.",
    id: siteUrl,
    link: siteUrl,
    language: "ko",
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `© ${new Date().getFullYear()} 0biglife`,
  });

  posts.forEach((post) => {
    feed.addItem({
      title: post.title,
      id: `${siteUrl}/posts/${post.slug}`,
      link: `${siteUrl}/posts/${post.slug}`,
      description: post.description,
      date: new Date(post.date),
    });
  });

  return new Response(feed.rss2(), {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
