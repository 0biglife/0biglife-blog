const withMDX = require("@next/mdx")();

const nextConfig = withMDX({
  pageExtensions: ["ts", "tsx", "mdx"], // MDX 파일을 페이지로 사용 가능하도록 설정
  reactStrictMode: true, // React Strict Mode 활성화
  experimental: {
    appDir: true, // App Router (Next.js 14) 활성화
    optimizePackageImports: ["@chakra-ui/react"],
  },
  images: {
    // domains: ["sample.com"], // 외부 이미지 도메인 추가 (aws..)
  },
  compiler: {
    styledComponents: true, // Chakra UI 최적화를 위해 Styled Components 활성화 (선택 사항)
  },
});

export default nextConfig;
