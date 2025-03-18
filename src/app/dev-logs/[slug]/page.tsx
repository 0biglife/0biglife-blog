import "server-only";
import { notFound } from "next/navigation";
import { Box } from "@chakra-ui/react";
import { getAllDevLogs, getDevLogBySlug } from "@/lib/posts";
import DevLogContent from "./DevLogContent";

type Props = {
  params: { slug?: string };
};

export async function generateStaticParams() {
  const devLogs = await getAllDevLogs();
  return devLogs.map((log) => ({ slug: log.slug }));
}

export default async function DevLogDetailPage({ params }: Props) {
  if (!params?.slug) return notFound();
  const devLog = await getDevLogBySlug(params.slug);
  if (!devLog) return notFound();

  return (
    <Box maxW="4xl" minW="300px" mx="auto" py={10} px={6}>
      <DevLogContent
        title={devLog.title}
        date={devLog.date}
        content={devLog.content}
      />
    </Box>
  );
}
