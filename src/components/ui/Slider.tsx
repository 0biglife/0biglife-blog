"use client";
import { useState, useEffect } from "react";
import { Box, Heading, Text } from "@chakra-ui/react";
import Image from "next/image";
import { Post } from "@/lib/types";

const FeaturedSlider = ({ posts }: { posts: Post[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % posts.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [posts.length]);

  return (
    <Box display="flex" justifyContent="start">
      <Box
        position="relative"
        width="100%"
        aspectRatio="4/3"
        borderRadius="10px"
        overflow="hidden"
        boxShadow="lg"
        cursor="pointer"
        transition="box-shadow 0.3s ease-in-out"
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
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Heading as="h3" size="sm" color="white" ml="4px" mr="4px">
              {posts[currentIndex].title}
            </Heading>
            <Text
              fontSize="xs"
              color="gray.200"
              ml="4px"
              mr="4px"
              opacity={0.7}
            >
              Updated: {posts[currentIndex].date}
            </Text>
          </Box>
          <Text fontSize="xs" color="gray.200" ml="4px" mr="4px">
            {posts[currentIndex].description}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default FeaturedSlider;
