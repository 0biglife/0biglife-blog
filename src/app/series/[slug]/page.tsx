import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts } from "@/lib/posts";
import { SERIES, getSeries, getSeriesPosts } from "@/lib/series";
import styles from "@/components/series/Series.module.css";

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() { return SERIES.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const series = getSeries((await params).slug);
  if (!series) notFound();
  const url = `https://www.0biglife.com/series/${series.slug}`;
  return { title: `${series.title} — 자율주행 시리즈`, description: series.description,
    alternates: { canonical: url }, openGraph: { title: series.title, description: series.description, url, images: ["/og.png"] } };
}
export default async function SeriesDetailPage({ params }: Props) {
  const series = getSeries((await params).slug);
  if (!series) notFound();
  const chapters = getSeriesPosts(getAllPosts(), series.slug);
  return <section className={styles.page}>
    <nav className={styles.breadcrumbs} aria-label="현재 위치"><Link href="/log">Log</Link><span>/</span><Link href="/series">자율주행 시리즈</Link><span>/</span><span aria-current="page">{series.title}</span></nav>
    <p className={styles.eyebrow}>{series.label} / {chapters.length} ARTICLES</p>
    <h1 className={styles.title}>{series.title}</h1>
    <p className={styles.lead}>{series.description}</p>
    <dl className={styles.readingInfo}>
      <div><dt>이런 분께</dt><dd>{series.audience}</dd></div>
      <div><dt>읽기 전에</dt><dd>{series.prerequisite}</dd></div>
    </dl>
    <div className={styles.sectionHeading}><h2>읽는 순서</h2><span className={styles.smallLabel}>발행일과 별도로 구성한 학습 순서입니다.</span></div>
    <ol className={styles.chapterList}>
      {chapters.map((post, i) => <li key={post.slug}>
        <Link href={`/posts/${post.slug}`} className={styles.chapterLink}>
          <span className={styles.chapterNumber}>{String(i + 1).padStart(2, "0")}</span>
          <div><h3>{post.title.replace(/^\[자율주행\]\s*/, "")}</h3><p>{post.description}</p><time dateTime={post.date}>{post.date} 발행{post.updated ? ` · ${post.updated} 수정` : ""}</time></div>
          <span aria-hidden="true">↗</span>
        </Link>
      </li>)}
    </ol>
    <div className={styles.continue}><Link href="/series" className={styles.backLink}>← 다른 시리즈 둘러보기</Link></div>
  </section>;
}
