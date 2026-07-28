import "server-only";
import { notFound } from "next/navigation";
import { Box, Heading, Text } from "@chakra-ui/react";
import { getAllDevLogs, getDevLogBySlug } from "@/lib/posts";
// import { TableOfContents } from "@/components";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const devLogs = await getAllDevLogs();
  return devLogs.map((log) => ({ slug: log.slug }));
}

// 여기는 원래 전 글 일괄 noindex 였다. dev-log 가 메모장이던 시절의 설정인데, 그 뒤
// 본문 8천자짜리 글도 같은 폴더에 쌓이면서 검색에서 통째로 막혀 있었다. 게다가
// 사이트맵에는 그대로 실려 "색인해달라 / 하지 마라"가 동시에 나가는 상태였다.
// → frontmatter `indexable: true` 인 글만 색인하고, 나머지는 noindex + 사이트맵 제외.
//   (사이트맵 쪽 기준은 next-sitemap.config.js 가 같은 frontmatter 를 읽는다)
export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  const devLog = await getDevLogBySlug(decodeURIComponent(slug ?? ""));
  if (!devLog) return { robots: { index: false, follow: false } };

  const description =
    devLog.description ?? `${devLog.title} — 0biglife 개발 로그 (${devLog.date})`;

  if (!devLog.indexable) {
    return { title: devLog.title, description, robots: { index: false, follow: false } };
  }

  const url = `https://www.0biglife.com/dev-logs/${devLog.slug}`;
  return {
    title: devLog.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: devLog.title,
      description,
      url,
      type: "article",
      publishedTime: devLog.date,
    },
    twitter: { card: "summary_large_image", title: devLog.title, description },
  };
}

export default async function DevLogDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  if (!slug) return notFound();

  const decodedSlug = decodeURIComponent(slug ?? "");
  const devLog = await getDevLogBySlug(decodedSlug);
  if (!devLog) return notFound();

  return (
    <Box maxW="4xl" minW="300px" mx="auto" py={10} px={6}>
      <Box display="flex" width="full" flexDirection="row">
        <Box flex={{ base: "1", lg: "3" }} width="full" flexDirection="column">
          <Heading as="h1" fontSize="3xl">
            {devLog.title}
          </Heading>
          <Text mt={2} mb={2} fontSize="smaller">
            {devLog.date}
          </Text>
          <Box className="prose lg:prose-lg" flex="1">
            {devLog.content}
          </Box>
        </Box>
        {/* <TableOfContents toc={devLog.toc ?? []} /> */}
      </Box>
    </Box>
  );
}
