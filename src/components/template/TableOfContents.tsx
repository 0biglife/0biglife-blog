"use client";

import { TABLE_OF_CONTENTS_TITLE } from "@/lib/constant";
import { TOCItem } from "@/lib/types";
import { Box, Link, VStack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";

export default function TableOfContents({ toc }: { toc: TOCItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      const headings = toc
        .map((item) => document.getElementById(item.id))
        .filter(Boolean) as HTMLElement[];

      const scrollY = window.scrollY + 100;

      for (let i = headings.length - 1; i >= 0; i--) {
        const heading = headings[i];
        if (heading.offsetTop <= scrollY) {
          setActiveId(heading.id);
          break;
        }
      }

      if (
        window.innerHeight + window.scrollY >=
        document.body.offsetHeight - 50
      ) {
        const lastHeading = headings[headings.length - 1];
        if (lastHeading) {
          setActiveId(lastHeading.id);
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [toc]);

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
          {toc.map((heading, index) => {
            const isActive = heading.id === activeId;

            return (
              <Link
                href={`#${heading.id}`}
                aria-label={`index for ${heading.text}`}
                key={heading.id || `${heading.text}-${index}`}
                onClick={(e) => {
                  e.preventDefault();
                  handleScrollTo(heading.id);
                }}
                fontSize="13px"
                fontWeight="medium"
                pl={heading.level === 3 ? 4 : 0}
                color={isActive ? "blue.500" : "gray.600"}
                _dark={{
                  color: isActive ? "blue.400" : "white",
                  opacity: isActive ? 1 : 0.8,
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
            );
          })}
        </VStack>
      </Box>
    </Box>
  );
}
