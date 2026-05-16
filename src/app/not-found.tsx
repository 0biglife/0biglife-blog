"use client";

import { BLOG_EMAIL } from "@/lib/constant";
import { Box, Button, Heading, Link, Text, VStack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageProvider";

export default function NotFoundPage() {
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="calc(100vh - 100px)"
      textAlign="center"
      p={6}
    >
      <Heading as="h1" size="2xl" _dark={{ color: "white" }}>
        {t("notFound.code")}
      </Heading>
      <Text fontSize="1rem" mt={4} _dark={{ color: "white" }}>
        {t("notFound.message")}
      </Text>
      <Text fontSize="0.9rem" mt={2} _dark={{ color: "white" }}>
        {t("notFound.helpBefore")}
        <Link
          aria-label="gmail"
          href="mailto:0biglife@gmail.com"
          color="blue.500"
          fontWeight="bold"
          ml={1}
          mr={1}
        >
          {BLOG_EMAIL}
        </Link>
        {t("notFound.helpAfter")}
      </Text>
      <VStack spacing={4} mt={6}>
        <Button
          colorScheme="gray"
          fontSize="14px"
          onClick={() => router.push("/")}
        >
          {t("notFound.home")}
        </Button>
      </VStack>
    </Box>
  );
}
