"use client";

import { useMemo, useState } from "react";
import {
  Box,
  VStack,
  Text,
  Heading,
  HStack,
  useColorModeValue,
  Divider,
  IconButton,
} from "@chakra-ui/react";
import { PostList } from "@/components";
import { Post } from "@/lib/types";
import { TbGridDots, TbList, TbTriangleInvertedFilled } from "react-icons/tb";
import { GoDotFill } from "react-icons/go";
import { motion } from "framer-motion";

export default function FilteredPostList({ posts }: { posts: Post[] }) {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(
    null
  );
  const [categories, setCategories] = useState(() => {
    const categoryMap: Record<
      string,
      { subcategories: Record<string, number>; count: number; isOpen: boolean }
    > = {};

    posts.forEach(({ category, subcategory }) => {
      if (!category || !subcategory) return;

      if (!categoryMap[category]) {
        categoryMap[category] = { subcategories: {}, count: 0, isOpen: false };
      }

      categoryMap[category].count += 1;
      categoryMap[category].subcategories[subcategory] =
        (categoryMap[category].subcategories[subcategory] || 0) + 1;
      categoryMap[category].isOpen = true;
    });

    return categoryMap;
  });

  const toggleViewMode = (mode: "list" | "grid") => {
    setViewMode(mode);
  };

  const toggleCategory = (category: string) => {
    setCategories((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        isOpen: !prev[category].isOpen,
      },
    }));
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
    setSelectedSubcategory(null);
  };

  const handleSubcategoryClick = (subcategory: string) => {
    setSelectedSubcategory((prev) =>
      prev === subcategory ? null : subcategory
    );
  };

  const filteredPosts = useMemo(() => {
    const filtered = posts.filter(
      (post) =>
        (!selectedCategory || post.category === selectedCategory) &&
        (!selectedSubcategory || post.subcategory === selectedSubcategory)
    );

    return Array.from(
      new Map(filtered.map((post) => [post.slug, post])).values()
    );
  }, [posts, selectedCategory, selectedSubcategory]);

  const selectedTextColor = useColorModeValue("black", "white");
  const notSelectedTextColor = useColorModeValue("gray.500", "gray.300");

  return (
    <Box
      display="flex"
      flexDirection={{ base: "column", sm: "row" }}
      justifyContent="space-between"
      mt={10}
      gap={6}
      width="100%"
    >
      <Box width={{ base: "100%", sm: "75%" }}>
        <HStack justifyContent="space-between" mb={2}>
          <HStack>
            <Text
              fontSize="14px"
              ml={2}
              color={selectedTextColor}
              fontWeight="medium"
            >
              {selectedCategory ? selectedCategory : "전체보기"}
              {selectedSubcategory ? ` / ${selectedSubcategory}` : ""}
            </Text>
            <Text fontSize="14px" color="red" ml={0} fontWeight="medium">
              {filteredPosts.length}
            </Text>
          </HStack>

          <HStack display={{ base: "none", sm: "flex" }}>
            <IconButton
              aria-label="view-list"
              icon={<TbList size={20} />}
              onClick={() => toggleViewMode("list")}
              variant={viewMode === "list" ? "solid" : "outline"}
              colorScheme="gray"
              size="sm"
            />
            <IconButton
              aria-label="view-grid"
              icon={<TbGridDots size={20} />}
              onClick={() => toggleViewMode("grid")}
              variant={viewMode === "grid" ? "solid" : "outline"}
              colorScheme="gray"
              size="sm"
            />
          </HStack>
        </HStack>

        <Divider mb={4} />

        <PostList posts={filteredPosts} viewMode={viewMode} />
      </Box>
      <Box
        display={{ base: "none", sm: "flex" }}
        width="1.4px"
        bg="linear-gradient(to bottom, rgba(150, 150, 150, 0.2), rgba(150, 150, 150, 0.1), rgba(150, 150, 150, 0))"
        opacity={0.9}
      />

      <Box
        width={{ base: "100%", sm: "25%" }}
        order={{ base: -1, sm: 1 }}
        flexDirection="column"
        mb={4}
      >
        <Heading
          as="h1"
          textAlign="left"
          fontWeight="regular"
          mb={4}
          fontSize="18px"
          fontStyle="italic"
        >
          Category
        </Heading>
        <VStack align="start" spacing={3} ml={1}>
          {Object.entries(categories).map(
            ([category, { subcategories, count, isOpen }]) => {
              const isCategorySelected =
                !selectedSubcategory && selectedCategory === category;

              return (
                <Box key={category} width="100%">
                  <HStack mb={1}>
                    <motion.div
                      animate={{ rotate: isOpen ? 0 : -90 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      onClick={(event) => {
                        event.stopPropagation();
                        toggleCategory(category);
                      }}
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        marginRight: "-2px",
                      }}
                    >
                      <TbTriangleInvertedFilled size={8} />
                    </motion.div>

                    <Text
                      fontSize="16px"
                      fontWeight={isCategorySelected ? "bold" : "normal"}
                      color={
                        isCategorySelected
                          ? selectedTextColor
                          : notSelectedTextColor
                      }
                      onClick={() => handleCategoryClick(category)}
                      _hover={{
                        fontWeight: "bold",
                        color: selectedTextColor,
                        textDecoration: "underline",
                      }}
                      cursor="pointer"
                    >
                      {category}
                      <Text as="span" fontSize="12px" color="gray.400" ml={1}>
                        ({count})
                      </Text>
                    </Text>
                  </HStack>

                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{
                      height: isOpen ? "auto" : 0,
                      opacity: isOpen ? 1 : 0,
                    }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <VStack align="start" ml={5}>
                      {Object.entries(subcategories).map(
                        ([subcategory, subCount]) => {
                          const isSubcategorySelected =
                            selectedSubcategory === subcategory;

                          return (
                            <Box
                              key={subcategory}
                              fontSize="14px"
                              fontWeight={
                                isSubcategorySelected ? "bold" : "normal"
                              }
                              color={
                                isSubcategorySelected
                                  ? selectedTextColor
                                  : notSelectedTextColor
                              }
                              cursor="pointer"
                              _hover={{
                                fontWeight: "bold",
                                color: selectedTextColor,
                                textDecoration: "underline",
                              }}
                              onClick={() =>
                                handleSubcategoryClick(subcategory)
                              }
                            >
                              <HStack spacing={1} align="center">
                                <GoDotFill size={8} />
                                <Text as="span" ml={1}>
                                  {subcategory}
                                </Text>
                                <Text
                                  as="span"
                                  fontSize="12px"
                                  color="gray.400"
                                >
                                  ({subCount})
                                </Text>
                              </HStack>
                            </Box>
                          );
                        }
                      )}
                    </VStack>
                  </motion.div>
                </Box>
              );
            }
          )}
        </VStack>
      </Box>
    </Box>
  );
}
