"use client";

import { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Tag,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { PostList } from "@/components";
import { Post } from "@/lib/types";

const categories = {
  Frontend: ["React", "Next.js", "CORS"],
  Backend: ["Nest.js", "MongoDB"],
  Kubernetes: ["Pod"],
};

export default function FilteredPostList({ posts }: { posts: Post[] }) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleTagClick = (tag: string) => {
    setSelectedTags((prevTags) =>
      prevTags.includes(tag)
        ? prevTags.filter((t) => t !== tag)
        : [...prevTags, tag]
    );
  };

  //   const handleCategoryClick = (category: string) => {
  //     const categoryTags = categories[category as keyof typeof categories];

  //     if (selectedCategories.includes(category)) {
  //       setSelectedCategories((prev) => prev.filter((c) => c !== category));
  //       setSelectedTags((prev) =>
  //         prev.filter((tag) => !categoryTags.includes(tag))
  //       );
  //     } else {
  //       setSelectedCategories((prev) => [...prev, category]);
  //       setSelectedTags((prev) => [...new Set([...prev, ...categoryTags])]);
  //     }
  //   };

  const isCategorySelected = (category: string) => {
    const categoryTags = categories[category as keyof typeof categories];
    return categoryTags.every((tag) => selectedTags.includes(tag));
  };

  Object.keys(categories).forEach((category) => {
    if (
      isCategorySelected(category) &&
      !selectedCategories.includes(category)
    ) {
      setSelectedCategories((prev) => [...prev, category]);
    } else if (
      !isCategorySelected(category) &&
      selectedCategories.includes(category)
    ) {
      setSelectedCategories((prev) => prev.filter((c) => c !== category));
    }
  });

  const filteredPosts = selectedTags.length
    ? posts.filter((post) =>
        post.tags.some((tag) => selectedTags.includes(tag))
      )
    : posts;

  const categoryTextColor = useColorModeValue("black", "white");
  const tagBgColor = useColorModeValue("gray.100", "gray.700"); // 태그 기본 배경
  const tagHoverBgColor = useColorModeValue("gray.200", "gray.600"); // 태그 호버 배경
  const tagSelectedBgColor = useColorModeValue("black", "white"); // 선택된 태그 배경
  const tagTextColor = useColorModeValue("gray.800", "gray.300"); // 태그 텍스트 색상
  const tagSelectedTextColor = useColorModeValue("white", "black"); // 선택된 태그 텍스트 색상
  //   const selectedTextColor = useColorModeValue("black", "white");
  //   const hoverTextColor = useColorModeValue(
  //     "rgba(0, 0, 0, 0.6)",
  //     "rgba(255, 255, 255, 0.6)"
  //   );

  return (
    <Box
      display="flex"
      flexDirection={{ base: "column", sm: "row" }}
      justifyContent="space-between"
      mt={10}
      gap={6}
      width="100%"
    >
      <Box width={{ base: "100%", sm: "30%" }} order={{ base: -1, sm: 1 }}>
        <VStack align="start" spacing={4} width="100%">
          {Object.entries(categories).map(([category, tags]) => {
            // const isSelected = selectedCategories.includes(category);

            return (
              <Box key={category} width="100%">
                <Text
                  display="inline-block"
                  fontSize="14px"
                  fontWeight={"normal"}
                  color={categoryTextColor}
                  fontStyle="italic"
                  opacity={0.8}
                  //   fontWeight={isSelected ? "bold" : "normal"}
                  //   opacity={isSelected ? 1 : 0.4}
                  //   color={isSelected ? selectedTextColor : unSelectedTextColor}
                  //   transition="color 0.3s ease-in-out, opacity 0.3s ease-in-out, font-weight 0.3s ease-in-out"
                  //   cursor="pointer"
                  //   onClick={() => handleCategoryClick(category)}
                  //   _hover={{
                  //     color: hoverTextColor,
                  //     opacity: 1,
                  //     fontWeight: "bold",
                  //   }}
                >
                  {category}
                </Text>

                <HStack wrap="wrap" mt={2} minWidth="140px">
                  {tags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <Tag
                        key={tag}
                        variant={isSelected ? "solid" : "subtle"}
                        colorScheme={isSelected ? "blackAlpha" : "gray"}
                        cursor="pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagClick(tag);
                        }}
                        transition="all 0.2s ease-in-out"
                        sx={{
                          bg: isSelected ? tagSelectedBgColor : tagBgColor,
                          color: isSelected
                            ? tagSelectedTextColor
                            : tagTextColor,
                          _hover: {
                            bg: tagHoverBgColor,
                            transform: "scale(1.02)",
                            // boxShadow: "md",
                          },
                        }}
                      >
                        {tag}
                      </Tag>
                    );
                  })}
                </HStack>

                {/* {index < Object.entries(categories).length - 1 && (
                  <Divider mt={3} />
                )} */}
              </Box>
            );
          })}
        </VStack>
      </Box>

      <Box
        width="1.4px"
        bg="linear-gradient(to bottom, rgba(150, 150, 150, 0.2), rgba(150, 150, 150, 0.2), transparent)"
        opacity={0.9}
        display={{ base: "none", sm: "blobk" }}
      />

      <Box width={{ base: "100%", sm: "70%" }}>
        <PostList posts={filteredPosts} />
      </Box>
    </Box>
  );
}
