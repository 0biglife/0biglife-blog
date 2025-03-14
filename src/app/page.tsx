// "use client";
import { getAllPosts } from "@/lib/posts";
import {
  Box,
  Container,
  Heading,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  VStack,
} from "@chakra-ui/react";
import { FeaturedSlider, PostList } from "@/components";
import { Post } from "@/lib/types";

export default async function HomePage() {
  const posts = await getAllPosts();
  const featuredPosts = posts.slice(0, 5);

  const frontendPosts = posts.filter((post: Post) =>
    post.tags.some((tag) => tag.toLowerCase() === "frontend")
  );
  const backendPosts = posts.filter((post: Post) =>
    post.tags.some((tag) => tag.toLowerCase() === "backend")
  );
  const kubernetesPosts = posts.filter((post: Post) =>
    post.tags.some((tag) => tag.toLowerCase() === "kubernetes")
  );
  const categorizedPosts = {
    frontend: frontendPosts,
    backend: backendPosts,
    kubernetes: kubernetesPosts,
  };

  return (
    <Container maxW="container.lg">
      <Box
        display="flex"
        flexDirection={{ base: "column", sm: "row" }}
        justifyContent="space-between"
        width="100%"
        // gap="20px"
        gap={{ base: 6, md: 0 }}
      >
        <Box
          display="flex"
          width={{ base: "100%", sm: "70%" }}
          maxWidth="600px"
          flexDirection="column"
          justifyContent="space-between"
        >
          <Heading
            as="h1"
            textAlign="left"
            fontWeight="bold"
            mb={6}
            fontSize="22px"
            fontStyle="italic"
          >
            Recently Featured
          </Heading>
          <FeaturedSlider posts={featuredPosts} />
        </Box>
        <Box
          width="1px"
          // mx={10}
          marginTop="52px"
          bg="linear-gradient(to bottom, #ddd, transparent, #ddd)"
          opacity={0.8}
        />
        <Box width={{ base: "100%", sm: "25%" }} flexDirection="column">
          <Heading
            as="h1"
            textAlign="left"
            fontWeight="medium"
            mb={6}
            fontSize="22px"
            fontStyle="italic"
          >
            Dev Logs
          </Heading>
          <Box>
            <Text fontSize="12px">- 03/13: Slider, SSG</Text>
          </Box>
        </Box>
      </Box>
      <Box
        display="flex"
        flexDirection={{ base: "column", md: "row" }}
        mt={10}
        gap={6}
      >
        <Box flex="3">
          <Tabs variant="soft-rounded" colorScheme="blue">
            <TabList>
              {Object.keys(categorizedPosts).map((category) => (
                <Tab key={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Tab>
              ))}
            </TabList>
            <TabPanels>
              {Object.values(categorizedPosts).map((posts, index) => (
                <TabPanel key={index}>
                  <PostList posts={posts} />
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </Box>

        <Box flex="1" p={4} borderWidth="1px" borderRadius="lg">
          <Heading as="h3" size="md" mb={4}>
            🔍 Search
          </Heading>
          <Input placeholder="검색어 입력..." />

          <VStack spacing={4} mt={6} align="stretch">
            <Box p={3} bg="gray.100" borderRadius="md">
              방문자 수: <strong>1,234</strong>
            </Box>
            <Box p={3} bg="gray.100" borderRadius="md">
              총 조회 수: <strong>5,678</strong>
            </Box>
          </VStack>
        </Box>
      </Box>
    </Container>
  );
}
