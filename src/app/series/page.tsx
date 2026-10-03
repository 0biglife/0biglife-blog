import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";
import { SERIES } from "@/lib/series";
import SeriesCards from "@/components/series/SeriesCards";
import styles from "@/components/series/Series.module.css";

export const metadata: Metadata = {
  title: "자율주행 시리즈 — 센서에서 Data Flywheel까지",
  description: "센서와 좌표계, 인지와 예측, 주행 검증, 데이터 플랫폼, 어노테이션, 시각화. 자율주행 데이터 개발자를 위한 여섯 가지 읽기 경로.",
  alternates: { canonical: "https://www.0biglife.com/series" },
  openGraph: { title: "자율주행 시리즈 — 센서에서 Data Flywheel까지", description: "여섯 가지 주제로 나눠 읽는 자율주행 데이터 엔지니어링.", url: "https://www.0biglife.com/series", images: ["/og.png"] },
};

export default function SeriesPage() {
  const posts = getAllPosts();
  const count = posts.filter(post => SERIES.some(series => series.slug === post.series)).length;
  return <section className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="현재 위치"><Link href="/">홈</Link><span>/</span><Link href="/log">Log</Link><span>/</span><span aria-current="page">시리즈</span></nav>
    <p className={styles.eyebrow}>AUTONOMOUS DRIVING / {SERIES.length} SERIES / {count} ARTICLES</p>
    <h1 className={styles.title}>센서에서 시작해,<br />다음 학습으로 이어지는 데이터.</h1>
    <p className={styles.lead}>자율주행 데이터를 다루는 데 필요한 개념과 구현을 여섯 갈래로 정리했습니다. 처음부터 읽거나, 지금 맡은 문제에 맞는 시리즈부터 시작하세요.</p>
    <aside className={styles.guide}>
      <strong>Data Flywheel의 전체 흐름부터 보고 싶다면</strong>
      <p><Link href="/posts/av-data-flywheel">데이터 플라이휠 설계와 운영</Link>에서 수집·선별·라벨·학습·검증·배포를 한 번에 연결합니다. 각 단계를 더 깊게 읽을 글도 함께 안내합니다.</p>
    </aside>
    <div className={styles.sectionHeading}><h2>주제별 읽기</h2><Link href="/log">전체 글을 최신순으로 보기 →</Link></div>
    <SeriesCards posts={posts} />
  </section>;
}
