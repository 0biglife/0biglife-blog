import dynamic from "next/dynamic";

// 구 프론트엔드 자기소개서 — 현재 자율주행 데이터 엔지니어 포지셔닝과 맞지 않아
// 네비게이션에서 제외된 고아 페이지. 검색 색인에서 빼 브랜드 일관성을 유지한다.
export const metadata = {
  title: "Introduction",
  robots: { index: false, follow: false },
};

const IntroductionClient = dynamic(() => import("./content"));

export default function IntroductionPage() {
  return <IntroductionClient />;
}
