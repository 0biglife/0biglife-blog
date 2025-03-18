import "server-only";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Box } from "@chakra-ui/react";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
import PostContent from "./PostContent";

type Props = {
  params: { slug?: string };
};

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!params?.slug) return notFound();
  const post = await getPostBySlug(params.slug);
  if (!post) return notFound();

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      images: [{ url: post.thumbnail, alt: post.title }],
      type: "article",
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [post.thumbnail],
    },
  };
}

export default async function PostDetailPage({ params }: Props) {
  if (!params?.slug) return notFound();
  const post = await getPostBySlug(params.slug);
  if (!post) return notFound();

  return (
    <Box maxW="4xl" minW="300px" mx="auto" py={10} px={6}>
      <PostContent
        title={post.title}
        date={post.date}
        thumbnail={post.thumbnail}
        category={post.category}
        subcategory={post.subcategory}
        content={post.content}
      />
    </Box>
  );
}
