"use client";
import { useState, useEffect } from "react";
import { Box, Heading, Link, Text } from "@chakra-ui/react";
import Image from "next/image";
import { Post } from "@/lib/types";
import { THUMNAIL_DATE_TEXT } from "@/lib/constant";

const SliderContainer = ({ posts }: { posts: Post[] }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // const currentIndex = 0;
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
      cursor="pointer"
      as={Link}
      aria-label={`read more about ${posts[currentIndex].title}`}
      key={posts[currentIndex].slug}
      href={`/posts/${posts[currentIndex].slug}`}
    >
      <Box
        display="flex"
        position="relative"
        width="100%"
        flexGrow={1}
        minWidth="300px"
        minHeight="200px"
        maxHeight="400px"
        aspectRatio="4/3"
        borderRadius="10px"
        overflow="hidden"
        boxShadow="lg"
        transition="box-shadow 0.2s ease-in-out"
        _hover={{ boxShadow: "xl", ".overlay": { opacity: 1 } }}
      >
        <Image
          src={posts[currentIndex].thumbnail}
          alt={posts[currentIndex].title}
          width={800}
          height={600} // 4:3 비율
          sizes="(max-width: 800px) 100vw, 800px"
          style={{
            width: "100%",
            height: "auto",
            objectFit: "cover",
            borderRadius: "10px",
          }}
          // priority
        />

        <Box
          className="overlay"
          position="absolute"
          bottom="0"
          left="0"
          width="100%"
          height="100%"
          bgGradient="linear(to-b, rgba(0,0,0,0) 10%, rgba(0,0,0,0.8) 100%)"
          opacity="0"
          transition="opacity 0.3s ease-in-out"
          display="flex"
          flexDirection="column"
          justifyContent="flex-end"
          p={3}
          gap="4px"
        >
          <Text
            fontSize="xs"
            color="gray.200"
            fontWeight="regular"
            ml="4px"
            mr="4px"
            alignSelf="flex-end"
          >
            {THUMNAIL_DATE_TEXT} {posts[currentIndex].date}
          </Text>
          <Text fontSize="xs" color="gray.200" ml="4px" mr="4px" noOfLines={2}>
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
        <Heading
          as="h1"
          size="md"
          fontWeight="semibold"
          _groupHover={{ textDecoration: "underline" }}
        >
          {posts[currentIndex].title}
        </Heading>
      </Box>
    </Box>
  );
};

export default SliderContainer;
