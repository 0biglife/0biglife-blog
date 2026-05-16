"use client";

import { BLOG_EMAIL } from "@/lib/constant";
import { Box, Button, Heading, Link, Text, VStack } from "@chakra-ui/react";
import { useLanguage } from "@/i18n/LanguageProvider";

// global-error는 루트 레이아웃을 대체하므로 <html>/<body>를 직접 렌더해야 한다 (Next.js 요구사항).
// LanguageProvider 바깥에서 렌더되므로 useLanguage는 기본 언어(ko)로 안전 폴백된다.
export default function GlobalError() {
  const { t } = useLanguage();

  return (
    <html lang="ko">
      <body>
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
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
            {/* 크래시 상태에서도 확실히 동작하도록 router 대신 순수 앵커 사용 */}
            <Button as="a" href="/" colorScheme="gray" fontSize="14px">
              {t("notFound.home")}
            </Button>
          </VStack>
        </Box>
      </body>
    </html>
  );
}
