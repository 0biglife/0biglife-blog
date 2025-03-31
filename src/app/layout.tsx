import { Chakra, ScrollToTopButton } from "@/components";
import "../styles/globals.css";

const GOOGLE_ANALYTICS_ID = process.env.GA_ID;

export const metadata = {
  title: "0biglife", // 페이지 제목
  description: "프론트엔드 엔지니어 김민석입니다.",
  icons: {
    icon: "/favicon.png", // 기본 아이콘
  },
  metadataBase: new URL("https://0biglife.com"),
  keywords: ["0biglife", "김민석", "React", "웹 개발", "기술 블로그"],
  authors: [{ name: "0biglife", url: "https://0biglife.com" }],
  creator: "0biglife",
  openGraph: {
    title: "0biglife 기술 블로그",
    description: "프론트엔드 엔지니어 김민석입니다.",
    url: "https://0biglife.com",
    siteName: "0biglife blog",
    images: [
      {
        url: "/favicon.png",
        width: 1200,
        height: 630,
        alt: "0biglife 블로그 대표 이미지",
      },
    ],
    locale: "ko_KR",
    type: "website",
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
