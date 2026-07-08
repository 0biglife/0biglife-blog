// 비텍스트 상수만 유지. UI 표시 문자열은 i18n 사전(src/i18n/dictionary.ts)으로 이관됨.

// Blog MetaData
export const BLOG_EMAIL = "0biglife@gmail.com";
export const BLOG_URL = "https://0biglife.com";

// Profile (Log 페이지 프로필 카드)
export const PROFILE = {
  name: "MINSEOK (Daniel) KIM",
  title: "Autonomous-Driving Data Engineer",
  avatar: "/assets/profile.webp",
  links: {
    linkedin: "https://www.linkedin.com/in/0biglife/",
    github: "https://github.com/0biglife",
    email: "0biglife@gmail.com",
  },
} as const;
