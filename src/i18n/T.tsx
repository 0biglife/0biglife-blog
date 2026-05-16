"use client";

import { useLanguage } from "./LanguageProvider";
import type { TranslationKey } from "./dictionary";

/**
 * 서버 컴포넌트에서 번역 문자열을 렌더하기 위한 클라이언트 헬퍼.
 * 서버 컴포넌트는 useLanguage 훅을 직접 호출할 수 없으므로
 * `<T k="code.heading" />` 형태로 감싸 사용한다.
 */
export function T({ k }: { k: TranslationKey }) {
  const { t } = useLanguage();
  return <>{t(k)}</>;
}
