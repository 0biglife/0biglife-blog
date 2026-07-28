import type { Metadata } from "next";

// page.tsx 가 "use client" 라 metadata 를 직접 export 할 수 없다. 그래서 이 라우트만
// 감싸는 레이아웃에서 붙인다. (없으면 사이트 기본 제목을 그대로 물려받아
// /log·/dev-logs 와 검색결과에서 구분이 안 된다)
export const metadata: Metadata = {
  title: "Autonomy — 실시간 LiDAR 퍼셉션 씬",
  description:
    "브라우저에서 도는 실시간 LiDAR 포인트클라우드 퍼셉션 데모. 센서 로그가 어떤 모습으로 들어오고 어떻게 읽히는지 손으로 만든 씬으로 보여줍니다.",
  alternates: { canonical: "https://www.0biglife.com/autonomy" },
  openGraph: {
    title: "Autonomy — 실시간 LiDAR 퍼셉션 씬",
    description:
      "브라우저에서 도는 실시간 LiDAR 포인트클라우드 퍼셉션 데모.",
    url: "https://www.0biglife.com/autonomy",
    type: "website",
  },
};

export default function AutonomyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
