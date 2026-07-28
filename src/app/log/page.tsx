import type { Metadata } from "next";
import { getAllDevLogs, getAllPosts } from "@/lib/posts";
import PageContent from "../PageContent";

// 블로그 인덱스인데 자기 제목이 없어 사이트 기본 제목("0biglife — 자율주행 · 데이터
// 엔지니어링")을 그대로 물려받고 있었다. 검색결과에서 개별 글과 구분이 안 된다.
export const metadata: Metadata = {
  title: "Log — 자율주행 · 데이터 엔지니어링 기록",
  description:
    "자율주행 인지·데이터 파이프라인을 다루는 글 모음. 좌표계와 캘리브레이션, 3D 객체 검출, 점유 격자, 궤적 예측, 로그 포맷(MCAP)과 시각화까지 시리즈로 정리합니다.",
  alternates: { canonical: "https://www.0biglife.com/log" },
  openGraph: {
    title: "Log — 자율주행 · 데이터 엔지니어링 기록",
    description:
      "자율주행 인지·데이터 파이프라인 시리즈. 좌표계·캘리브레이션·3D 검출·점유 격자·궤적 예측·MCAP·시각화.",
    url: "https://www.0biglife.com/log",
    type: "website",
  },
};

export default function LogPage() {
  const posts = getAllPosts();
  const devLogs = getAllDevLogs();
  const featuredPosts = posts.slice(0, 3);

  return (
    <PageContent posts={posts} featuredPosts={featuredPosts} devLogs={devLogs} />
  );
}
