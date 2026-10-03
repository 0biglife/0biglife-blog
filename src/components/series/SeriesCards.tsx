import Link from "next/link";
import type { PostSummary } from "@/lib/types";
import { SERIES, getSeriesPosts } from "@/lib/series";
import styles from "./Series.module.css";

export default function SeriesCards({ posts, tone }: { posts: PostSummary[]; tone?: "dark" }) {
  return (
    <div className={`${styles.cards} ${tone === "dark" ? styles.dark : ""}`}>
      {SERIES.map((series, i) => {
        const chapters = getSeriesPosts(posts, series.slug);
        if (!chapters.length) return null;
        return (
          <Link key={series.slug} href={`/series/${series.slug}`} className={styles.card}>
            <span className={styles.cardMeta}>
              <span>{String(i + 1).padStart(2, "0")} / {series.label}</span>
              <span>{chapters.length}편</span>
            </span>
            <h3 className={styles.cardTitle}>{series.title}</h3>
            <p className={styles.cardDescription}>{series.description}</p>
            <span className={styles.cardCta}>목차와 읽는 순서 <span aria-hidden="true">↗</span></span>
          </Link>
        );
      })}
    </div>
  );
}
