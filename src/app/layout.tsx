import { Chakra, ScrollToTopButton } from "@/components";
import "../styles/globals.css";

const GOOGLE_ANALYTICS_ID = process.env.GA_ID;

const SITE_DESCRIPTION =
  "직접 만든 인터랙티브 웹 작업물을 데모로 살펴보고, 코드를 열람하거나 내려받을 수 있는 0biglife의 작업물 갤러리입니다.";

export const metadata = {
  title: {
    default: "0biglife — 인터랙티브 작업물", // 페이지 제목
    template: "%s | 0biglife", // 하위 페이지 제목 패턴
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: "/favicon.png", // 기본 아이콘
  },
  metadataBase: new URL("https://0biglife.com"),
  keywords: [
    "0biglife",
    "김민석",
    "인터랙티브 웹",
    "웹 디자인",
    "프론트엔드",
    "작업물 갤러리",
  ],
  authors: [{ name: "0biglife", url: "https://0biglife.com" }],
  creator: "0biglife",
  openGraph: {
    title: "0biglife — 인터랙티브 작업물",
    description: SITE_DESCRIPTION,
    url: "https://0biglife.com",
    siteName: "0biglife",
    images: [
      {
        url: "/favicon.png",
        width: 1200,
        height: 630,
        alt: "0biglife 인터랙티브 작업물 갤러리",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "0biglife — 인터랙티브 작업물",
    description: SITE_DESCRIPTION,
  },
  alternates: {
    canonical: "https://0biglife.com", // Canonical URL, 원본 페이지 인식하여 SEO 점수 향상
  },
  // manifest: "/site.webmanifest", // PWA 지원 시 필요
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta
          name="naver-site-verification"
          content="c7182802fcb6e7c655876d4d3a412fa6915b7cd2"
          // -> content 공개되어도 무방
        />
        <link
          rel="alternate"
          type="application/rss+xml"
          href="/rss.xml"
          title="0biglife RSS Feed"
        />
        <style>
          {`
            html, body {
              min-height: 100vh;
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
            }
          `}
        </style>
        {GOOGLE_ANALYTICS_ID && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GOOGLE_ANALYTICS_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      <body suppressHydrationWarning>
        <Chakra>
          {children}
          <ScrollToTopButton />
        </Chakra>
      </body>
    </html>
  );
}
