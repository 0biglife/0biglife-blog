import Link from "next/link";
import { getPostSeries } from "@/lib/series";
import type { PostSummary } from "@/lib/types";
import styles from "./Series.module.css";

export default function PostSeriesNav({ posts, slug, placement = "intro" }: {
  posts: PostSummary[];
  slug: string;
  placement?: "intro" | "footer";
}) {
  const context = getPostSeries(posts, slug);
  if (!context) return null;
  const { series, chapters, index, previous, next } = context;
  if (placement === "footer") {
    return (
      <nav className={styles.continue} aria-label="시리즈 이전 글과 다음 글">
        <Link className={styles.backLink} href={`/series/${series.slug}`}>{series.title} · 전체 목차</Link>
        <div className={styles.nextGrid}>
          {previous ? <Link href={`/posts/${previous.slug}`} className={styles.nextLink}>
            <span className={styles.smallLabel}>← 이전 글</span>
            <span>{previous.title.replace(/^\[자율주행\]\s*/, "")}</span>
          </Link> : <Link href="/series" className={styles.nextLink}>
            <span className={styles.smallLabel}>여기서 시작합니다</span><span>다른 시리즈 둘러보기</span>
          </Link>}
          {next ? <Link href={`/posts/${next.slug}`} className={styles.nextLink}>
            <span className={styles.smallLabel}>다음 글 →</span>
            <span>{next.title.replace(/^\[자율주행\]\s*/, "")}</span>
          </Link> : <Link href="/posts/av-data-flywheel" className={styles.nextLink}>
            <span className={styles.smallLabel}>시리즈를 모두 읽었습니다</span><span>Data Flywheel 전체 흐름으로 연결하기 →</span>
          </Link>}
        </div>
      </nav>
    );
  }
  return (
    <nav className={styles.postNav} aria-label="이 글의 시리즈">
      <div className={styles.postNavHeading}>
        <Link href={`/series/${series.slug}`}>{series.title} <span aria-hidden="true">↗</span></Link>
        <span className={styles.position}>{index + 1} / {chapters.length}</span>
      </div>
      <details className={styles.contents}>
        <summary>이 시리즈의 읽는 순서</summary>
        <ol className={styles.compactChapters}>
          {chapters.map((chapter, i) => <li key={chapter.slug}>
            <Link href={`/posts/${chapter.slug}`} aria-current={chapter.slug === slug ? "page" : undefined}>
              <span className={styles.chapterNumber}>{String(i + 1).padStart(2, "0")}</span>
              <span>{chapter.title.replace(/^\[자율주행\]\s*/, "")}</span>
            </Link>
          </li>)}
        </ol>
      </details>
    </nav>
  );
}
