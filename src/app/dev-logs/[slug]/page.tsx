import "server-only";
import { notFound } from "next/navigation";
import { Box, Heading, HStack, Text } from "@chakra-ui/react";
import { getAllDevLogs, getDevLogBySlug } from "@/lib/posts";
import { MDXRemote } from "next-mdx-remote/rsc";
import { MarkdownRenderer } from "@/components";

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const devLogs = await getAllDevLogs();
  return devLogs.map((log) => ({ slug: log.slug }));
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
          <HStack mb={1} mt={4}>
            <Text fontSize="smaller" color="gray.500">
              {devLog.date}
            </Text>
          </HStack>
          <Box className="prose lg:prose-lg" flex="1">
            <MDXRemote source={devLog.content} components={MarkdownRenderer} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
