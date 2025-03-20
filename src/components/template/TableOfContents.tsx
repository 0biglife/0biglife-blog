"use client";

import { Box, Link, VStack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

export default function TableOfContents() {
  const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>(
    []
  );
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (observerRef.current) return;

    observerRef.current = new MutationObserver(() => {
      const headings = Array.from(document.querySelectorAll("h2")).map(
        (heading) => ({
          id: heading.id,
          text: heading.textContent || "",
          level: heading.tagName === "H2" ? 2 : 3,
        })
      );

      setToc((prevToc) => {
        if (JSON.stringify(prevToc) !== JSON.stringify(headings))
          return headings;
        return prevToc;
      });
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, []);

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
          Index
        </Text>
        <VStack align="start" spacing={2}>
          {toc.map((heading) => (
            <Link
              arial-label={`index for ${heading.text}`}
              key={heading.id}
              onClick={() => handleScrollTo(heading.id)}
              fontSize="13px"
              fontWeight="medium"
              pl={heading.level === 3 ? 4 : 0}
              color="gray.500"
              _dark={{
                color: "white",
              }}
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
