import { getAllPosts } from "@/lib/posts";
import { PostItem } from "@/components";

export default async function BlogPage() {
  const posts = await getAllPosts();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">📖 블로그 목록</h1>
      <div className="space-y-4">
        {posts.map((post) => (
          <PostItem key={post.slug} post={post} />
        ))}
      </div>
    </div>
  );
}
