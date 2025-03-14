import { getAllPosts, getPostBySlug } from "@/lib/posts";

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

// 블로그 포스트별 SEO 메타데이터 설정
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);

  return {
    title: post?.title,
    description: post?.description,
    openGraph: {
      title: post?.title,
      description: post?.description,
      url: `https://0biglife.com/blog/${params.slug}`,
      images: [
        { url: post?.thumbnail, width: 1200, height: 630, alt: post?.title },
      ],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  console.log("params:", params);
  // const post = await getPostBySlug(params.slug);
  // if (!post) return <div>❌ 게시글을 찾을 수 없습니다.</div>;

  // return <PostContent post={post} />;
  return null;
}
