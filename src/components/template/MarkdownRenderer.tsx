import {
  Heading,
  Text,
  Image,
  Box,
  ListItem,
  OrderedList,
  UnorderedList,
  Link,
  Divider,
} from "@chakra-ui/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark as DarkCodeStyle } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyButton } from "@/components";

export const MarkdownRenderer = {
  // 이미지
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <Image
      src={props.src as string}
      width="800px"
      height="400px"
      borderRadius="lg"
      objectFit="cover"
      mx="auto"
      my={4}
      alt={props.alt || "image"}
    />
  ),

  // 제목 : id for TableOfContents
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    // const id = props.children?.toString().replace(/\s+/g, "-").toLowerCase();
    return (
      <Heading
        as="h1"
        fontSize="3xl"
        fontWeight="bold"
        my={6}
        // id={id}
        {...props}
      />
    );
  },

  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = props.children?.toString().replace(/\s+/g, "-").toLowerCase();
    return (
      <Heading
        as="h2"
        fontSize="2xl"
        fontWeight="bold"
        my={5}
        id={id}
        {...props}
      />
    );
  },
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => {
    const id = props.children?.toString().replace(/\s+/g, "-").toLowerCase();
    return (
      <Heading
        as="h3"
        fontSize="xl"
        fontWeight="semibold"
        my={4}
        id={id}
        {...props}
      />
    );
  },

  // 본문
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <Text fontSize="md" lineHeight="1.7" my={3} {...props} />
  ),

  // 인라인 코드
  inlineCode: ({ children }: { children?: React.ReactNode }) => (
    <Text
      as="code"
      px={2}
      py={1}
      borderRadius="4px"
      bg="gray.200"
      color="black"
      userSelect="none"
      _dark={{ bg: "darkgray.200", opacity: 0.6, color: "black" }}
      fontSize="sm"
      fontFamily="monospace"
    >
      {children}
    </Text>
  ),

  code: ({
    className,
    children,
  }: {
    className?: string;
    children?: React.ReactNode;
  }) => {
    const match = /language-(\w+)/.exec(className || "");
    if (!match) {
      return MarkdownRenderer.inlineCode({ children });
    }

    return (
      <Box
        position="relative"
        as="pre"
        userSelect="none"
        _dark={{ bg: "gray.800", opacity: 1 }}
        overflowX="auto"
      >
        <CopyButton content={String(children).trim()} />
        <SyntaxHighlighter
          showLineNumbers
          language={match ? match[1] : "tsx"}
          style={DarkCodeStyle}
          customStyle={{
            fontSize: "14px",
            margin: "20px 0px",
            borderRadius: "6px",
            backgroundColor: "black",
            opacity: 0.9,
          }}
          wrapLongLines
        >
          {String(children).trim()}
        </SyntaxHighlighter>
      </Box>
    );
  },

  // 구분선
  hr: () => <Divider my={6} />,

  // 리스트
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <UnorderedList spacing={2} ml={5} {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <OrderedList spacing={2} ml={5} {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <ListItem fontSize="md" {...props} />
  ),

  // 블록 인용
  blockquote: function Blockquote(
    props: React.HTMLAttributes<HTMLQuoteElement>
  ) {
    return (
      <Box
        as="blockquote"
        borderLeft="4px solid"
        borderColor="gray.300"
        pl={4}
        py={2}
        my={4}
        fontStyle="italic"
        bg="gray.50"
        _dark={{ bg: "gray.700", color: "gray.300" }}
        {...props}
      />
    );
  },

  // 링크
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <Link
      color="blue.500"
      textDecoration="underline"
      _hover={{ color: "blue.700" }}
      {...props}
    />
  ),
};
