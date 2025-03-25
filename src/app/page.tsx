import { getAllDevLogs, getAllPosts } from "@/lib/posts";
import PostContent from "./PageContent";
import { getBlogAnalytics } from "@/lib/analytics";

export default async function HomePage() {
  const posts = await getAllPosts();
  const devLogs = await getAllDevLogs();
  const featuredPosts = posts.slice(0, 3);
  const { todayViews, totalViews } = await getBlogAnalytics();

  // console.log("~ GA : ", process.env.GA_ID);
  // console.log("~ GA : ", process.env.GA_CLIENT_EMAIL);
  // console.log("~ GA : ", process.env.GA_PRIVATE_KEY);
  // console.log("~ GA : ", process.env.GA_PROPERTY_ID);

  // console.log("---------------------");
  // console.log("today / total : ", todayViews, totalViews);

  return (
    <PostContent
      posts={posts}
      featuredPosts={featuredPosts}
      devLogs={devLogs}
      todayViews={todayViews}
      totalViews={totalViews}
    />
  );
}
