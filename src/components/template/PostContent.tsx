import { Box } from "@chakra-ui/react";

export default function PostContent({
  post,
}: {
  post: { title: string; content: string };
}) {
  return (
    <Box>
      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
      <article
        className="prose dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </Box>
  );
}
