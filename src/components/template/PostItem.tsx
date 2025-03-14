import Link from "next/link";

export default function PostItem({
  post,
}: {
  post: { title: string; slug: string };
}) {
  return (
    <div className="p-4 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
      <Link href={`/blog/${post.slug}`} className="text-xl font-bold">
        {post.title}
      </Link>
    </div>
  );
}
