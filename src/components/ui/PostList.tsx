"use client";
import { Post } from "@/lib/types";
import { Box, Heading, Text, Stack, Link } from "@chakra-ui/react";

const PostList = ({ posts }: { posts: Post[] }) => {
  if (!posts || posts.length === 0) {
    return (
      <Text fontSize="md" color="gray.500">
        게시글이 없습니다.
      </Text>
    );
  }

  return (
    <Stack spacing={6}>
      {posts.map((post: Post) => (
        <Box
          as={Link}
          key={post.slug}
          href={`/blog/${post.slug}`}
          p={4}
          borderWidth="1px"
          borderRadius="lg"
          _hover={{ bg: "gray.50" }}
        >
          <Heading as="h3" size="md">
            {post.title}
          </Heading>
          <Text fontSize="sm" color="gray.500">
            {post.date}
          </Text>
          <Text mt={2}>{post.description}</Text>
        </Box>
      ))}
    </Stack>
  );
};

export default PostList;
