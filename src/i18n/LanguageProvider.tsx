"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  DEFAULT_LANG,
  dictionary,
  type Lang,
  type TranslationKey,
} from "./dictionary";

const STORAGE_KEY = "0biglife-lang";

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined
);

function isLang(value: unknown): value is Lang {
  return value === "ko" || value === "en" || value === "ja";
}

// 최초 방문 언어 결정: localStorage → navigator.language → 기본값.
// 브라우저에서만 호출 (useEffect 내부). SSR에서는 호출되지 않음.
function detectInitialLang(): Lang {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // localStorage 접근 불가(프라이빗 모드 등) — 무시하고 다음 단계로
  }
  const navLang = window.navigator.language?.slice(0, 2);
  if (isLang(navLang)) return navLang;
  return DEFAULT_LANG;
}

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // SSR/첫 클라이언트 렌더가 일치하도록 항상 기본값으로 시작 (hydration 미스매치 방지).
  // 실제 언어는 mount 후 useEffect에서 반영.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    setLangState(detectInitialLang());
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 저장 실패는 무시 (세션 내 전환은 계속 동작)
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const value = dictionary[lang]?.[key];
      if (value === undefined) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`[i18n] missing key "${key}" for lang "${lang}"`);
        }
        return key;
      }
      return value;
    },
    [lang]
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  // global-error.tsx는 루트 레이아웃을 대체하므로 Provider 바깥에서 렌더된다.
  // 이 경우 throw 대신 기본 언어로 안전하게 폴백.
  if (ctx === undefined) {
    return {
      lang: DEFAULT_LANG,
      setLang: () => {},
      t: (key: TranslationKey) => dictionary[DEFAULT_LANG][key] ?? key,
    };
  }
  return ctx;
}
