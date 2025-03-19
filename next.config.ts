const nextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  reactStrictMode: true,
  experimental: {
    mdxRs: true,
    // mdxRs: true,
    turbo: undefined,
    // turbo: {
    //   rules: {
    //     "*.mdx": [{ loader: "mdx-loader", options: {} }],
    //   },
    // },
    optimizePackageImports: ["@chakra-ui/react"],
  },
  images: {
    unoptimized: true,
  },
  compiler: {
    styledComponents: true,
  },
  output: "export", // 정적 사이트(SSG) 최적화
  // npm run build -> out/posts/{html} 검토
};

export default nextConfig;
