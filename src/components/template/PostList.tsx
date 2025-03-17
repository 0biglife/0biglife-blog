"use client";
import { useState } from "react";
import { Post } from "@/lib/types";
import {
  Box,
  Heading,
  Text,
  Stack,
  Link,
  Image,
  SimpleGrid,
  IconButton,
  HStack,
  Button,
} from "@chakra-ui/react";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";

const PostList = ({
  posts,
  viewMode,
}: {
  posts: Post[];
  viewMode: "list" | "grid";
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = viewMode === "list" ? 5 : 9;

  const totalPages = Math.ceil(posts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;
  const currentPosts = posts.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleNextPage = () => goToPage(currentPage + 1);
  const handlePrevPage = () => goToPage(currentPage - 1);

  const generatePagination = () => {
    const pageNumbers: (number | string)[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pageNumbers.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage > totalPages - 3) {
        pageNumbers.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages
        );
      } else {
        pageNumbers.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages
        );
      }
    }

    return pageNumbers;
  };

  if (!posts || posts.length === 0)
    return (
      <Text fontSize="md" color="gray.500">
        게시글이 없습니다.
      </Text>
    );

  return (
    <Box ml={1}>
      {viewMode === "list" ? (
        <Stack spacing={6}>
          {currentPosts.map((post: Post) => (
            <Box
              as={Link}
              role="group"
              key={post.slug}
              href={`/blog/${post.slug}`}
              borderRadius="lg"
              display="flex"
              flexDirection={{ base: "column", sm: "row" }}
              _hover={{ textDecoration: "none" }}
              alignItems="center"
              gap={6}
              ml={1}
            >
              <Box flex="1">
                <Heading
                  as="h3"
                  size="24px"
                  mb={1}
                  fontWeight="semibold"
                  _groupHover={{ textDecoration: "underline" }}
                >
                  {post.title}
                </Heading>
                <Text mt={1} fontSize="14px" opacity={0.7}>
                  {post.description}
                </Text>
                <HStack mb={1} mt={1}>
                  <Text fontSize="12px">
                    {post.category}/{post.subcategory}
                  </Text>
                  <Text fontSize="12px" color="gray.500">
                    · {post.date}
                  </Text>
                </HStack>
              </Box>
              <Box
                flexShrink={0}
                width={{ base: "100%", sm: "160px" }}
                height={{ base: "auto", sm: "120px" }}
                order={{ base: -1, sm: 1 }}
                overflow="hidden"
                borderRadius="md"
              >
                <Image
                  src={post.thumbnail || "/default-thumbnail.png"}
                  alt={post.title}
                  objectFit="cover"
                  width="100%"
                  height="auto"
                  style={{ aspectRatio: "4 / 3" }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      ) : (
        <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={6}>
          {currentPosts.map((post: Post) => (
            <Box
              as={Link}
              key={post.slug}
              href={`/blog/${post.slug}`}
              borderRadius="lg"
              role="group"
              _hover={{ textDecoration: "none" }}
            >
              <Image
                src={post.thumbnail || "/default-thumbnail.png"}
                alt={post.title}
                borderRadius="md"
                mb="8px"
                objectFit="cover"
                width="100%"
                height="160px"
              />
              <Heading
                as="h3"
                size="20px"
                fontWeight="semibold"
                _groupHover={{ textDecoration: "underline" }}
              >
                {post.title}
              </Heading>
              <Text fontSize="12px" color="gray.500">
                {post.date}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      )}

      {totalPages > 1 && (
        <HStack justifyContent="center" mt={6} spacing={2}>
          <IconButton
            aria-label="이전 페이지"
            icon={<IoIosArrowBack />}
            onClick={handlePrevPage}
            isDisabled={currentPage === 1}
            colorScheme="gray"
            size="sm"
          />
          {generatePagination().map((page, index) =>
            typeof page === "number" ? (
              <Button
                key={index}
                onClick={() => goToPage(page)}
                variant={currentPage === page ? "solid" : "outline"}
                colorScheme="gray"
                size="sm"
              >
                {page}
              </Button>
            ) : (
              <Text key={index} fontSize="sm" color="gray.500" px={2}>
                {page}
              </Text>
            )
          )}
          <IconButton
            aria-label="다음 페이지"
            icon={<IoIosArrowForward />}
            onClick={handleNextPage}
            isDisabled={currentPage === totalPages}
            colorScheme="gray"
            size="sm"
          />
        </HStack>
      )}
    </Box>
  );
};

export default PostList;
