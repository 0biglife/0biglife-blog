import { getAllDevLogs, getAllPosts } from "@/lib/posts";
import PostContent from "./PageContent";

export default async function HomePage() {
  const posts = await getAllPosts();
  const devLogs = await getAllDevLogs();
  const featuredPosts = posts.slice(0, 3);

  return (
    <PostContent
      posts={posts}
      featuredPosts={featuredPosts}
      devLogs={devLogs}
    />
  );
}
