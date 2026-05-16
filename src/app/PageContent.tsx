"use client";

import dynamic from "next/dynamic";
import {
  BLOG_LEFT_TOP_CATEGORY,
  BLOG_RIGHT_TOP_CATEGORY,
} from "@/lib/constant";
import { Title } from "@/components";
import { Box, Container } from "@chakra-ui/react";
import { DevLog, Post } from "@/lib/types";
import { useEffect, useState } from "react";

// Next.js 15 부터는 `ssr: false` 사용 불가능으로 클라이언트 컴포넌트 따로 분리
const SliderContainer = dynamic(
  () => import("@/components/template/SliderContainer")
);
const LogContainer = dynamic(
  () => import("@/components/template/LogContainer")
);
const FilteredPostList = dynamic(
  () => import("@/components/template/FilteredPostList")
);

interface PostContentProps {
  posts: Post[];
  featuredPosts: Post[];
  devLogs: DevLog[];
}

export default function PostContent({
  posts,
  featuredPosts,
  devLogs,
}: PostContentProps) {
  const [views, setViews] = useState({ today: "0", total: "0" });

  useEffect(() => {
    fetchViews();
  }, []);

  const fetchViews = async () => {
    try {
      const res = await fetch("/api/analytics");
      const { todayViews, totalViews } = await res.json();
      setViews({ today: todayViews, total: totalViews });
    } catch (error) {
      console.error("Failed to fetch ga:", error);
    }
  };

  return (
    <Container maxWidth="900px" userSelect={"none"} px={{ base: 0, sm: 5 }}>
      <Box
        display="flex"
        flexDirection={{ base: "column", sm: "row" }}
        justifyContent="space-between"
        width="100%"
        gap={6}
      >
        <Box
          display="flex"
          width={{ base: "100%", sm: "75%" }}
          minWidth={{ base: "100%", sm: "360px" }}
          flexDirection="column"
          flexGrow={1}
          minHeight="300px"
          p={1}
        >
          <Title label={BLOG_LEFT_TOP_CATEGORY} />
          <SliderContainer posts={featuredPosts} />
        </Box>
        <Box
          display={{ base: "none", sm: "flex" }}
          width="1.4px"
          marginTop="52px"
          bg="linear-gradient(to bottom, rgba(150, 150, 150, 0.2), transparent, rgba(150, 150, 150, 0.2))"
          opacity={0.9}
        />
        <Box
          display={{ base: "none", sm: "flex" }}
          width={{ base: "100%", sm: "25%" }}
          flexDirection="column"
          flexGrow={1}
          minHeight="300px"
          p={1}
        >
          <Title label={BLOG_RIGHT_TOP_CATEGORY} />
          <LogContainer
            logs={devLogs}
            todayViews={views.today}
            totalViews={views.total}
          />
        </Box>
      </Box>
      <FilteredPostList posts={posts} />
    </Container>
  );
}
