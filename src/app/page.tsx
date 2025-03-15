import { getAllDevLogs, getAllPosts } from "@/lib/posts";
import { Box, Container } from "@chakra-ui/react";
import {
  SliderContainer,
  LogContainer,
  Title,
  FilteredPostList,
} from "@/components";
// import { Post } from "@/lib/types";

const TOP_LEFT_TITLE = "Recently Featured";
const TOP_RIGHT_TITLE = "Dev Logs";

export default async function HomePage() {
  const posts = await getAllPosts();
  const devLogs = await getAllDevLogs();
  const featuredPosts = posts.slice(0, 5);

  // const frontendPosts = posts.filter((post: Post) =>
  //   post.tags.some((tag) => tag.toLowerCase() === "frontend")
  // );
  // const backendPosts = posts.filter((post: Post) =>
  //   post.tags.some((tag) => tag.toLowerCase() === "backend")
  // );
  // const kubernetesPosts = posts.filter((post: Post) =>
  //   post.tags.some((tag) => tag.toLowerCase() === "kubernetes")
  // );
  // const categorizedPosts = {
  //   frontend: frontendPosts,
  //   backend: backendPosts,
  //   kubernetes: kubernetesPosts,
  // };

  return (
    <Container maxWidth="900px" userSelect={"none"}>
      {/* TODO : Styling 가독성 고민 */}
      <Box
        display="flex"
        flexDirection={{ base: "column", sm: "row" }}
        justifyContent="space-between"
        width="100%"
      >
        <Box
          display="flex"
          width={{ base: "100%", sm: "70%" }}
          flexDirection="column"
          flexGrow={1}
          minHeight="300px"
        >
          <Title label={TOP_LEFT_TITLE} />
          <SliderContainer posts={featuredPosts} />
        </Box>
        <Box
          width="1.4px"
          marginTop="52px"
          bg="linear-gradient(to bottom, rgba(150, 150, 150, 0.2), transparent, rgba(150, 150, 150, 0.2))"
          opacity={0.9}
          ml="20px"
          mr="20px"
        />
        <Box
          width={{ base: "100%", sm: "30%" }}
          flexDirection="column"
          flexGrow={1}
          minHeight="300px"
        >
          <Title label={TOP_RIGHT_TITLE} />
          <LogContainer
            logs={devLogs}
            todayVisitorCount={12}
            totalVisitorCount={82}
          />
        </Box>
      </Box>
      <FilteredPostList posts={posts} />
    </Container>
  );
}
