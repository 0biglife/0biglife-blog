import { getPostBySlug } from "@/lib/posts";
import { PostContent } from "@/components";

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) return <div>❌ 게시글을 찾을 수 없습니다.</div>;

  return <PostContent post={post} />;
}
