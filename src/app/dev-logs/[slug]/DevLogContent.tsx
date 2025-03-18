"use client";

import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { MarkdownRenderer } from "@/components";
// import { TableOfContents } from "@/components";

type Props = {
  title: string;
  date: string;
  content: MDXRemoteSerializeResult;
};

export default function DevLogContent(props: Props) {
  const { title, date, content } = props;
  // const [toc, setToc] = useState<{ id: string; text: string; level: number }[]>(
  //   []
  // );

  // useEffect(() => {
  //   const observer = new MutationObserver(() => {
  //     const headings = Array.from(document.querySelectorAll("h2")).map(
  //       (heading) => ({
  //         id: heading.id,
  //         text: heading.textContent || "",
  //         level: heading.tagName === "H2" ? 2 : 3,
  //       })
  //     );
  //     setToc(headings);
  //   });

  //   observer.observe(document.body, { childList: true, subtree: true });

  //   return () => observer.disconnect();
  // }, []);

  return (
    <Box display="flex" width="full" flexDirection="row">
      <Box flex={{ base: "1", lg: "3" }} width="full" flexDirection="column">
        <Heading as="h1" fontSize="3xl">
          {title}
        </Heading>
        <HStack mb={1} mt={4}>
          <Text fontSize="smaller" color="gray.500">
            {date}
          </Text>
        </HStack>
        <Box className="prose lg:prose-lg" flex="1">
          <MDXRemote {...content} components={MarkdownRenderer} />
        </Box>
      </Box>
    </Box>
  );
}
