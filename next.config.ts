const withMDX = require("@next/mdx")();

const nextConfig = withMDX({
  pageExtensions: ["ts", "tsx", "mdx"], // MDX 파일을 페이지로 사용 가능하도록 설정
  reactStrictMode: true, // React Strict Mode 활성화
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
    // serverAssets: ["content"], // 최신 Next.js에서는 지원되지 않을 가능성 있음
  },
  images: {
    // domains: ["sample.com"], // 외부 이미지 도메인 추가 (aws..)
    // remotePatterns: [
    //   {
    //     protocol: "http",
    //     hostname: "localhost",
    //     port: "3000",
    //     pathname: "/api/image/**",
    //   },
    //   {
    //     protocol: "https",
    //     hostname: "0biglife.com",
    //     pathname: "/api/image/**",
    //   },
    // ],
  },
  compiler: {
    styledComponents: true, // Chakra UI 최적화를 위해 Styled Components 활성화 (선택 사항)
  },
});

export default nextConfig;
