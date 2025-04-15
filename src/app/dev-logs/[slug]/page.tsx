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
