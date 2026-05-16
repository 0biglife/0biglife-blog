"use client";

import { Box, Heading } from "@chakra-ui/react";
import TableOfContents from "@/components/template/TableOfContents";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { Lang } from "@/i18n/dictionary";
import type { WorkLocaleContent, WorkLocaleText } from "@/lib/types";

/**
 * work 상세 페이지의 언어 의존 부분.
 *
 * 페이지(서버 컴포넌트)는 ko/en/ja 세 언어의 데이터를 모두 빌드에 실어
 * 넘기고, 이 클라이언트 컴포넌트가 `useLanguage()` 로 현재 언어를 골라
 * 렌더한다. 페이지 자체는 정적(SSG)이며 언어 전환은 클라이언트에서 일어난다.
 */

export function WorkTitle({ i18n }: { i18n: Record<Lang, WorkLocaleText> }) {
  const { lang } = useLanguage();
  return (
    <Heading as="h1" fontSize="3xl">
      {i18n[lang].title}
    </Heading>
  );
}

export function WorkWriteup({
  localized,
}: {
  localized: Record<Lang, WorkLocaleContent>;
}) {
  const { lang } = useLanguage();
  const { content, toc } = localized[lang];
  return (
    <Box display="flex" flexDirection="row" mt={12}>
      <Box className="prose lg:prose-lg" flex="1" minW="0">
        {content}
      </Box>
      {toc && toc.length > 0 && <TableOfContents toc={toc} />}
    </Box>
  );
}
