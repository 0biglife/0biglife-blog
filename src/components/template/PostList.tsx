"use client";
import { useState } from "react";
import { Post } from "@/lib/types";
import {
  Box,
  Heading,
  Text,
  Stack,
  Link,
  SimpleGrid,
  IconButton,
  HStack,
  Button,
} from "@chakra-ui/react";
import { IoIosArrowBack, IoIosArrowForward } from "react-icons/io";
import Image from "next/image";
import { EMPTY_POST } from "@/lib/constant";

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
    return <Text fontSize="md">{EMPTY_POST}</Text>;

  return (
    <Box ml={1}>
      {viewMode === "list" ? (
        <Stack spacing={6}>
          {currentPosts.map((post: Post) => (
            <Box
              as={Link}
              aria-label={`read more about ${post.title}`}
              key={post.slug}
              href={`/posts/${post.slug}`}
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
                  as="h1"
                  size="24px"
                  mb={1}
                  fontWeight="semibold"
                  _groupHover={{ textDecoration: "underline" }}
                >
                  {post.title}
                </Heading>
                <Text mt={1} fontSize="14px" opacity={0.7} noOfLines={2}>
                  {post.description}
                </Text>
                <HStack mb={1} mt={1}>
                  <Text fontSize="12px">
                    {post.category}/{post.subcategory}
                  </Text>
                  <Text
                    fontSize="12px"
                    color="gray.800"
                    opacity={0.7}
                    _dark={{
                      color: "white",
                    }}
                  >
                    {`- `} {post.date}
                  </Text>
                </HStack>
              </Box>
              <Box
                position="relative"
                flexShrink={0}
                width={{ base: "100%", sm: "160px" }}
                order={{ base: -1, sm: 1 }}
                overflow="hidden"
                borderRadius="md"
                aspectRatio="4 / 3"
              >
                <Image
                  src={post.thumbnail || "/assets/default-thumbnail.png"}
                  alt={post.title}
                  fill
                  sizes="(max-width: 800px) 100vw, 800px"
                  style={{
                    objectFit: "cover",
                  }}
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
              aria-label={`read more about ${post.title}`}
              key={post.slug}
              href={`/posts/${post.slug}`}
              borderRadius="lg"
              _hover={{ textDecoration: "none" }}
            >
              <Image
                src={post.thumbnail || "/assets/default-thumbnail.png"}
                alt={post.title}
                width={160} // 지정된 크기로 최적화
                height={120}
                layout="intrinsic" // 브라우저에서 크기 자동 조정
                sizes="(max-width: 800px) 100vw, 800px"
                style={{
                  objectFit: "cover",
                  aspectRatio: "1/1",
                  borderRadius: "12px",
                }}
              />
              <Heading
                as="h1"
                size="20px"
                mt={2}
                fontWeight="semibold"
                noOfLines={2}
                _groupHover={{ textDecoration: "underline" }}
              >
                {post.title}
              </Heading>
              <Text fontSize="12px">{post.date}</Text>
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
