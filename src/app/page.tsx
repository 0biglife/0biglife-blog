import { getAllPosts } from "@/lib/posts";
import Image from "next/image";
import { Box, Container, Heading, Text, Stack, Link } from "@chakra-ui/react";

export default async function HomePage() {
  const posts = getAllPosts();
  const featuredPost = posts[0];

  return (
    <Container maxW="container.lg" py={8}>
      <Heading
        as="h1"
        size="xl"
        textAlign="center"
        fontWeight="bold"
        mb={6}
        fontStyle={{ base: "italic" }}
      >
        New Featured.
      </Heading>
      {featuredPost && (
        <Box
          as={Link}
          href={`/blog/${featuredPost.slug}`}
          display="block"
          borderRadius="lg"
          overflow="hidden"
          boxShadow="md"
          transition="transform 0.2s ease-in-out"
          _hover={{ transform: "scale(1.02)" }}
          mb={10}
        >
          <Image
            src={featuredPost.thumbnail}
            alt={featuredPost.title}
            width={800}
            height={400}
            // unoptimized
            blurDataURL={featuredPost.thumbnail} // blur-up 효과 적용
            style={{ objectFit: "cover", width: "100%", height: "auto" }}
            priority
          />
          <Box p={4}>
            <Heading as="h2" size="lg" mb={2}>
              {featuredPost.title}
            </Heading>
            <Text fontSize="md" color="gray.600">
              {featuredPost.description}
            </Text>
          </Box>
        </Box>
      )}

      <Stack spacing={6}>
        {posts.map((post) => (
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
    </Container>
  );
}
