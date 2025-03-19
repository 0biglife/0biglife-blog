/**
 * @issue
 *
 * 1. Next.js 15에서 slug 비동기 처리
 * - params 객체는 비동기적 로드 -> slug 사용시 예외처리 필요
 * - 즉, 서버 컴포넌트에서 params.slug를 await 없이 직접 사용할 경우 `params should be awaited before using its properties` 발생
 * - 공식 문서 : https://nextjs.org/docs/app/building-your-application/upgrading/version-15#async-request-apis-breaking-change
 *
 * 2. 클라이언트 컴포넌트가 mdx 데이터 사용하면 useState 관련 오류 발생
 * - serialize() 실행 위치를 서버에서 반환하도록 변경(즉, getPostBySlug에서 처리)
 *
 * 3. MDXRemote props type 통일
 * - 서버/클라이언트 컴포넌트 엄격한 구분 필요
 * - 직렬화된 JSON이 아니라 MDXRemoteSerializeResult 타입을 받아야함
 *
 */

import "server-only";
import { notFound } from "next/navigation";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { getAllPosts, getPostBySlug } from "@/lib/posts";
// import PostContent from "./PostContent";
import { MDXRemote } from "next-mdx-remote/rsc";
import Image from "next/image";
import { MarkdownRenderer } from "@/components";

type Params = Promise<{ slug: string }>;

// 정적 사이트 생성(SSG)을 위한 모든 경로(slug) 미리 받아오기
export async function generateStaticParams() {
  const posts = await getAllPosts();
  if (!posts || posts.length === 0) {
    console.error("⚠️ No posts found! Check your content directory.");
    return [];
  }
  return posts.map((post) => ({ slug: post.slug }));
}

// SEO 최적화를 위한 메타 데이터 설정 : OG 아직 고민 단계
export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;

  if (!slug) return notFound();

  const decodedSlug = decodeURIComponent(slug ?? "");

  const post = await getPostBySlug(decodedSlug);
  if (!post) {
    console.error(`🔴 [generateMetadata] Post not found for slug: ${slug}`);
    return notFound();
  }

  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      images: [{ url: post.thumbnail, alt: post.title }],
      type: "article",
      publishedTime: post.date,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [post.thumbnail],
    },
  };
}

export default async function PostDetailPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  if (!slug) return notFound();

  // slug === undefined일 경우 런타임 오류 발생 가능 -> "" 추가
  const decodedSlug = decodeURIComponent(slug ?? "");
  const post = await getPostBySlug(decodedSlug);
  if (!post) return notFound();

  return (
    <Box minW="300px">
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
            {post.title}
          </Heading>
          <HStack mb={1} mt={4}>
            <Text fontSize="smaller">
              {post.category}/{post.subcategory}
            </Text>
            <Text fontSize="smaller" color="gray.500">
              · {post.date}
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
              src={post.thumbnail}
              alt={post.title}
              fill
              priority
              style={{ objectFit: "cover" }}
            />
          </Box>
          <Box className="prose lg:prose-lg" flex="1">
            <MDXRemote
              source={post.content.compiledSource}
              components={MarkdownRenderer}
            />
          </Box>
        </Box>
        {/* <TableOfContents toc={toc} /> */}
      </Box>
    </Box>
  );
}

/**
 * 
---

_test 테스트_

```javascript
const response = await testAPI({ body: "test" });
try {
  // test
} catch (e) {
  console.error("error occurred: ", e);
  setIsLoading(false);
}
// test finished
```

`ㅅㄷㄴㅅ` 아아아

## 이미지 테스트

일반 이미지:
![설명](1.png)

GIF 이미지:
![GIF 설명](https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif)

---

## 리스트 테스트

### 순서 없는 리스트

- 첫 번째 아이템
- 두 번째 아이템
- 세 번째 아이템

### 순서 있는 리스트

1. 첫 번째 항목
2. 두 번째 항목
3. 세 번째 항목

---

## 블록 인용 테스트

> 이 부분은 **블록 인용**입니다.  
> "Next.js는 훌륭한 프레임워크입니다." - 개발자 누구나

---

## 코드 블록 테스트

```tsx
import React from "react";

export default function TestComponent() {
  return <div>Hello, MDX + Chakra UI!</div>;
}
```

 */
