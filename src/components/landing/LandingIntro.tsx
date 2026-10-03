import Link from "next/link";

import { T } from "@/i18n/T";
import { getAllPosts } from "@/lib/posts";

import styles from "./LandingIntro.module.css";

/**
 * 토폴로지 아래의 랜딩 본문.
 *
 * 여기가 생기기 전까지 홈의 크롤링 가능한 텍스트는 헤더·푸터를 합쳐 80자였다.
 * 본문이 전부 /pulse 임베드 iframe 안에 있어서 부모 문서에는 아무것도 남지
 * 않았고, h1 도 없었다. 사이트에서 가장 중요한 URL 이 검색에는 빈 페이지였다.
 *
 * 그래서 숨김 텍스트가 아니라 실제로 읽을 값이 있는 섹션을 둔다. 방문자에게는
 * 위 그림이 무엇인지와 다음에 갈 곳을 알려주고, 크롤러에게는 홈에서 글·도구로
 * 내려가는 내부 링크를 만들어 준다. 서버 컴포넌트라 초기 HTML 에 그대로 실린다.
 */
export default function LandingIntro() {
  // 시리즈는 frontmatter 에서 파생한다 — 글이 늘면 홈도 같이 는다.
  const series = getAllPosts()
    .filter((p) => p.category === "자율주행")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <p className={styles.eyebrow}>
          <T k="landing.eyebrow" />
        </p>
        <h1 className={styles.h1}>
          <T k="landing.h1" />
        </h1>
        <p className={styles.lead}>
          <T k="landing.lead" />
        </p>
        <p className={styles.topoNote}>
          <T k="landing.topoNote" />
        </p>

        <h2 className={styles.blockTitle}>
          <T k="landing.cardsTitle" />
        </h2>
        <div className={styles.cards}>
          <Link href="/autonomy" className={styles.card}>
            <span className={styles.cardKicker}>AUTONOMY</span>
            <p className={styles.cardTitle}>
              <T k="landing.autonomyTitle" />
            </p>
            <p className={styles.cardDesc}>
              <T k="landing.autonomyDesc" />
            </p>
          </Link>
          <Link href="/lab" className={styles.card}>
            <span className={styles.cardKicker}>LAB</span>
            <p className={styles.cardTitle}>
              <T k="landing.labTitle" />
            </p>
            <p className={styles.cardDesc}>
              <T k="landing.labDesc" />
            </p>
          </Link>
          <Link href="/log" className={styles.card}>
            <span className={styles.cardKicker}>LOG</span>
            <p className={styles.cardTitle}>
              <T k="landing.logTitle" />
            </p>
            <p className={styles.cardDesc}>
              <T k="landing.logDesc" />
            </p>
          </Link>
        </div>

        {series.length > 0 && (
          <>
            <h2 className={styles.blockTitle}>
              <T k="landing.seriesTitle" />
            </h2>
            <ol className={styles.series}>
              {series.map((post, i) => (
                <li key={post.slug} className={styles.seriesItem}>
                  <Link href={`/posts/${post.slug}`} className={styles.seriesLink}>
                    <span className={styles.seriesNo}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{post.title}</span>
                  </Link>
                </li>
              ))}
            </ol>
            <Link href="/log" className={styles.seriesMore}>
              <T k="landing.seriesMore" /> →
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
