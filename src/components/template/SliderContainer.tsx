"use client";
import { useState, useEffect } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import Image from "next/image";
import { Post } from "@/lib/types";

const SliderContainer = ({ posts }: { posts: Post[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % posts.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [posts.length]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      width="100%"
      flexGrow={1}
      maxWidth="800px"
    >
      <Box
        display="flex"
        position="relative"
        width="100%"
        flexGrow={1}
        minHeight="200px"
        maxHeight="400px"
        aspectRatio="4/3"
        borderRadius="10px"
        overflow="hidden"
        boxShadow="lg"
        cursor="pointer"
        transition="box-shadow 0.2s ease-in-out"
        _hover={{ boxShadow: "xl", ".overlay": { opacity: 1 } }}
      >
        <Image
          src={posts[currentIndex].thumbnail}
          alt={posts[currentIndex].title}
          fill
          style={{
            objectFit: "cover",
          }}
        />
        <Box
          className="overlay"
          position="absolute"
          bottom="0"
          left="0"
          width="100%"
          height="100%"
          bgGradient="linear(to-b, rgba(0,0,0,0) 50%, rgba(0,0,0,0.8) 100%)"
          opacity="0"
          transition="opacity 0.3s ease-in-out"
          display="flex"
          flexDirection="column"
          justifyContent="flex-end"
          p={3}
          gap="4px"
        >
          <Text fontSize="xs" color="gray.200" ml="4px" mr="4px">
            {posts[currentIndex].description}
          </Text>
        </Box>
      </Box>
      <Box
        pt={3}
        pl={2}
        pr={2}
        mt={1}
        width="100%"
        gap="12px"
        display="flex"
        flexDirection={{ base: "column", sm: "row" }}
        justifyContent="space-between"
        alignContent="center"
      >
        <Heading as="h3" size="md" fontWeight="semibold">
          {posts[currentIndex].title}
        </Heading>
        <Text fontSize="xs" color="gray.400">
          Updated: {posts[currentIndex].date}
        </Text>
      </Box>
    </Box>
  );
};

export default SliderContainer;
