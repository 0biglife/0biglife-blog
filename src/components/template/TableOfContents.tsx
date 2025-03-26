"use client";

import { TABLE_OF_CONTENTS_TITLE } from "@/lib/constant";
import { TOCItem } from "@/lib/types";
import { Box, Link, VStack, Text } from "@chakra-ui/react";

export default function TableOfContents({ toc }: { toc: TOCItem[] }) {
  if (!toc || toc.length === 0) return null;

  const handleScrollTo = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 80,
        behavior: "smooth",
      });
    }
  };

  return (
    <Box
      minW="200px"
      display={{ base: "none", lg: "flex" }}
      flexDirection="column"
      ml={20}
    >
      <Box pos="fixed">
        <Text
          fontSize={22}
          fontWeight="semibold"
          mb={3}
          fontStyle="italic"
          userSelect="none"
        >
          {TABLE_OF_CONTENTS_TITLE}
        </Text>
        <VStack align="start" spacing={2}>
          {toc.map((heading, index) => (
            <Link
              href={`#${heading.id}`}
              aria-label={`index for ${heading.text}`}
              key={heading.id || `${heading.text}-${index}`}
              // key={heading.id}
              onClick={(e) => {
                e.preventDefault();
                handleScrollTo(heading.id);
              }}
              fontSize="13px"
              fontWeight="medium"
              pl={heading.level === 3 ? 4 : 0}
              color="gray.600"
              _dark={{
                color: "white",
                opacity: 0.8,
              }}
              _hover={{
                color: "blue.400",
                _dark: {
                  color: "blue.400",
                },
              }}
              cursor="pointer"
              noOfLines={1}
            >
              {heading.text}
            </Link>
          ))}
        </VStack>
      </Box>
    </Box>
  );
}
