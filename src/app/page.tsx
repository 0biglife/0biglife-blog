import { getAllDevLogs, getAllPosts } from "@/lib/posts";
import PostContent from "./PageContent";

export default async function HomePage() {
  console.log("🚀 [HomePage] 서버 실행됨");

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
