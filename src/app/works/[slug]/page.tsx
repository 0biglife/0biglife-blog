import "server-only";
import { notFound } from "next/navigation";
import { Box, Heading, HStack, Text, Wrap, WrapItem, Tag } from "@chakra-ui/react";
import { getAllWorkSlugs, getWorkBySlug } from "@/lib/works";
import {
  DemoFrame,
  CodePanel,
  WorkActions,
  WorkTitle,
  WorkWriteup,
} from "@/components/works";
import { T } from "@/i18n/T";

type Params = Promise<{ slug: string }>;

// 정적 사이트 생성(SSG)을 위한 모든 경로(slug) 미리 받아오기
export async function generateStaticParams() {
  const slugs = getAllWorkSlugs();
  if (!slugs || slugs.length === 0) {
    console.warn("No works found. Check your content/works directory.");
    return [];
  }
  return slugs.map((slug) => ({ slug }));
}

// SEO 최적화를 위한 메타 데이터 설정
export async function generateMetadata({ params }: { params: Params }) {
  const { slug } = await params;
  if (!slug) return notFound();

  const decodedSlug = decodeURIComponent(slug ?? "");
  const work = await getWorkBySlug(decodedSlug);
  if (!work) {
    console.error(`[generateMetadata] Work not found for slug: ${slug}`);
    return notFound();
  }

  const url = `https://0biglife.com/works/${work.slug}`;

  return {
    title: work.title,
    description: work.summary,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: work.title,
      description: work.summary,
      images: [{ url: work.cover, alt: work.title }],
      type: "article",
      url: url,
      publishedTime: work.date,
    },
    twitter: {
      card: "summary_large_image",
      title: work.title,
      description: work.summary,
      images: [work.cover],
    },
  };
}

export default async function WorkDetailPage({ params }: { params: Params }) {
  const resolvedParams = await params;
  const { slug } = resolvedParams;

  if (!slug) return notFound();

  const decodedSlug = decodeURIComponent(slug ?? "");
  const work = await getWorkBySlug(decodedSlug);
  if (!work) return notFound();

  const shareUrl = `https://0biglife.com/works/${work.slug}`;

  return (
    <Box display="flex" justifyContent="center" width="full" py={10} px={4}>
      <Box width="100%" maxW="920px" minW="280px">
        {/* Header — 제목은 언어별로 전환 */}
        <WorkTitle i18n={work.i18n} />
        <HStack mt={3} spacing={2}>
          <Text fontSize="smaller">{work.type}</Text>
        </HStack>
        {work.tags.length > 0 && (
          <Wrap mt={3} spacing={2}>
            {work.tags.map((tag) => (
              <WrapItem key={tag}>
                <Tag size="sm">{tag}</Tag>
              </WrapItem>
            ))}
          </Wrap>
        )}

        {/* Live Preview */}
        <Box mt={8}>
          <DemoFrame
            src={work.demoPath}
            aspectRatio={work.aspectRatio}
            title={work.title}
          />
        </Box>

        {/* Actions: download / share / github */}
        <Box mt={6}>
          <WorkActions
            zipPath={work.zipPath}
            github={work.github}
            shareUrl={shareUrl}
            title={work.title}
          />
        </Box>

        {/* Code */}
        <Box mt={12}>
          <Heading as="h2" fontSize="2xl" mb={4}>
            <T k="code.heading" />
          </Heading>
          <CodePanel files={work.files} />
        </Box>

        {/* MDX write-up + TOC — 본문·목차 모두 언어별로 전환 */}
        <WorkWriteup localized={work.localized} />
      </Box>
    </Box>
  );
}
