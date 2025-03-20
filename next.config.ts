import bundleAnalyzer from "@next/bundle-analyzer";

/** @type {import('next').NextConfig} */
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = withBundleAnalyzer({
  pageExtensions: ["ts", "tsx", "mdx"],
  reactStrictMode: true,
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
    removeConsole: true, // 콘솔 로그 제거(번들 크기 감소용)
  },
  output: "export", // 정적 사이트(SSG) 최적화
  // npm run build -> out/posts/{html} 검토
  // + Next.js 15부터는 next export 없이 outpput: "export" 로 전부 대체

  // 301 리다이렉트 적용
  // async redirects() {
  //   return [
  //     {
  //       source: "/post/:slug",
  //       destination: "/posts/:slug",
  //       permanent: true,
  //     },
  //   ];
  // },

  // async headers() {
  //   return [
  //     {
  //       source: "/(.*)",
  //       headers: [
  //         {
  //           key: "Cache-Control",
  //           value: "public, max-age=86400, stale-while-revalidate=3600",
  //         },
  //       ],
  //     },
  //   ];
  // },

  // compress: true, // gzip 압축 활성화 -> JS 실행 최적화
});

export default nextConfig;
