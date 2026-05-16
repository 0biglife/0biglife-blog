import { getAllDevLogs, getAllPosts } from "@/lib/posts";
import PageContent from "../PageContent";

export default function LogPage() {
  const posts = getAllPosts();
  const devLogs = getAllDevLogs();
  const featuredPosts = posts.slice(0, 3);

  return (
    <PageContent posts={posts} featuredPosts={featuredPosts} devLogs={devLogs} />
  );
}
