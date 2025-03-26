import { getAllDevLogs, getAllPosts } from "@/lib/posts";
import PostContent from "./PageContent";
// import { getBlogAnalytics } from "@/lib/analytics";

export default async function HomePage() {
  const posts = await getAllPosts();
  const devLogs = await getAllDevLogs();
  const featuredPosts = posts.slice(0, 3);

  // const analytics = await getBlogAnalytics();

  return (
    <PostContent
      posts={posts}
      featuredPosts={featuredPosts}
      devLogs={devLogs}
      // views={{ today: analytics.todayViews, total: analytics.totalViews }}
    />
  );
}
