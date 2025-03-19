"use client";
import { useEffect, useRef, useState } from "react";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { MarkdownRenderer } from "@/components";
import { TableOfContents } from "@/components";
import Image from "next/image";

type Props = {
  title: string;
  date: string;
  thumbnail: string;
  category: string;
  subcategory: string;
  content: MDXRemoteSerializeResult;
};

export default function PostContent({
  title,
  date,
  thumbnail,
  category,
  subcategory,
  content,
}: Props) {
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

  return (
    <Box
      display="flex"
      width="full"
      py={10}
      px={0}
      flexDirection="row"
      justifyContent="center"
    >
      <Box
        flex={{ base: "1", lg: "3" }}
        minW="200px"
        maxW="700px"
        flexDirection="column"
      >
        <Heading as="h1" fontSize="3xl">
          {title}
        </Heading>
        <HStack mb={1} mt={4}>
          <Text fontSize="smaller">
            {category}/{subcategory}
          </Text>
          <Text fontSize="smaller" color="gray.500">
            · {date}
          </Text>
        </HStack>
        <Box
          display="flex"
          position="relative"
          width="100%"
          flexGrow={1}
          minHeight="200px"
          maxHeight="400px"
          aspectRatio="4/3"
          borderRadius="10px"
          overflow="hidden"
          boxShadow="lg"
          mt={6}
          mb={12}
        >
          <Image
            src={thumbnail}
            alt={title}
            fill
            priority
            style={{ objectFit: "cover" }}
          />
        </Box>
        <Box className="prose lg:prose-lg" flex="1">
          <MDXRemote {...content} components={MarkdownRenderer} />
        </Box>
      </Box>
      <TableOfContents toc={toc} />
    </Box>
  );
}
