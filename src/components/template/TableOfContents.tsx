"use client";

import { Box, Link, VStack, Text, useColorModeValue } from "@chakra-ui/react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents({ toc }: { toc: Heading[] }) {
  const textColor = useColorModeValue("gray.500", "white");

  if (toc.length === 0) return null;

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
      p={4}
      ml={16}
    >
      <Box pos="fixed">
        <Text
          fontSize={20}
          fontWeight="semibold"
          mb={3}
          fontStyle="italic"
          userSelect="none"
        >
          Index
        </Text>
        <VStack align="start" spacing={2}>
          {toc.map((heading) => (
            <Link
              key={heading.id}
              onClick={() => handleScrollTo(heading.id)}
              fontSize="13px"
              fontWeight="medium"
              pl={heading.level === 3 ? 4 : 0}
              color={textColor}
              _hover={{ color: "blue.400" }}
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
