import bundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = withBundleAnalyzer({
  pageExtensions: ["ts", "tsx", "mdx"],
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  compress: true, // gzip 압축 활성화 -> JS 실행 최적화
  transpilePackages: ["next-mdx-remote"],
  experimental: {
    mdxRs: true,
    turbo: undefined,
    serverActions: {
      // 기존 true -> Next.js 15에선 옵션으로 변경
      bodySizeLimit: "1mb", // 요청 크기 제한
      allowedOrigins: ["*"], // CORS 설정 (필요에 따라 변경 가능)
    },
    optimizePackageImports: ["@chakra-ui/react"],
  },
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
  },
  compiler: {
    styledComponents: true,
    // removeConsole: true, // 콘솔 로그 제거(번들 크기 감소용)
  },
  // output: "standalone", // 정적 사이트(SSG) 최적화 -> standalone으로 변경(GA)
  output: "export", // 정적 사이트(SSG) 최적화 -> standalone으로 변경(GA)
  // yarn build -> out/posts/{html} 검토
  // + Next.js 15부터는 next export 없이 outpput: "export" 로 전부 대체

  // 기존 검색 엔진에 남아있는 이전 블로그 게시글은 모두 deleted Page로 리다이렉트
  // async redirects() {
  //   return [
  //     {
  //       source: "/post/:slug",
  //       destination: "/",
  //       permanent: true,
  //     },
  //   ];
  // },

  // 정적 리소스(HTML, JS, 이미지 등)의 캐시 정책을 브라우저와 CDN에게 알려주는 역할
  // 수정 여부 추후 고민 : 일단, 30일 캐시 + 1일 재검증 여유
  // async headers() {
  //   return [
  //     {
  //       source: "/(.*)",
  //       headers: [
  //         {
  //           key: "Cache-Control",
  //           value: "public, max-age=2592000, stale-while-revalidate=86400",
  //         },
  //       ],
  //     },
  //   ];
  // },
  // -> output: export SSG 방식에서는 headers() 설정이 적용되지않음..
  // -> 왜 ? next export 방식은 정적 HTML + 정적 파일만 생성하기 때문에, 커스텀 서버 없이는 헤더 설정을 적용할 수 업음..
});

export default nextConfig;
