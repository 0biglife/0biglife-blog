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
    // serverActions 블록을 통째로 뺐다. 이 사이트엔 "use server" 가 하나도 없는데
    // allowedOrigins: ["*"] 가 남아 있었다. 그건 Server Action 의 Origin 검증(CSRF
    // 방어)을 끄는 설정이라, 나중에 폼 하나만 추가하는 순간 바로 취약해지는 지뢰였다.
    // 실제로 쓰게 되면 그때 도메인을 명시해서 다시 넣는다.
    optimizePackageImports: ["@chakra-ui/react"],
  },
  images: {
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    // dangerouslyAllowSVG 제거. unoptimized: true 라 지금은 무력하지만,
    // 이미지 최적화를 켜는 순간 SVG 를 통한 스크립트 실행 경로가 열린다.
  },
  // 응답에서 x-powered-by: Next.js 를 뺀다. 프레임워크·버전 추정 단서를 줄 이유가 없다.
  poweredByHeader: false,
  compiler: {
    styledComponents: true,
    // removeConsole: true, // 콘솔 로그 제거(번들 크기 감소용)
  },
  // ── 보안 헤더 ──────────────────────────────────────────────────
  //
  // customHttp.yml 에도 헤더 설정이 있지만, 확인해 보니 /_next/static/* 같은
  // CDN 경로에만 붙고 /posts/* 같은 HTML 응답에는 Next 자신의 헤더가 이긴다.
  // 보안 헤더는 HTML 에 붙어야 의미가 있으므로 여기(Next)에서 내보낸다.
  // output 이 "standalone"(SSR)이라 headers() 가 정상 동작한다.
  //
  // CSP 의 'unsafe-inline' 은 아쉽지만 지금 구조에선 뺄 수 없다 — Chakra(emotion)가
  // 런타임에 <style> 을 주입하고 Next 도 nonce 없이 인라인 스크립트를 심는다.
  // 실측으로 style 태그 58개 · style 속성 445개 · 인라인 스크립트 17개가 나왔다.
  // nonce 를 도입하려면 미들웨어와 emotion 설정을 함께 바꿔야 해서 별건으로 둔다.
  // 그래도 외부 스크립트 주입·클릭재킹·폼 탈취는 이 상태로도 막힌다.
  //
  // 허용 출처는 추측이 아니라 실제 네트워크 요청을 측정해서 뽑았다.
  //   폰트   cdn.jsdelivr.net(Pretendard) · fonts.gstatic.com
  //   스타일  fonts.googleapis.com · cdn.jsdelivr.net · giscus.app
  //   스크립트 giscus.app · googletagmanager.com
  //   프레임  giscus.app(댓글) · self(/pulse 토폴로지)
  //
  // blob: 과 'wasm-unsafe-eval' 은 추측이 아니라 검증에서 걸려 넣은 것이다.
  // /lab 의 three.js GLTFLoader 가 텍스처를 blob URL 로 만들어 fetch 하고,
  // 디코더가 WebAssembly 를 인스턴스화한다. 'unsafe-eval' 전체를 여는 대신
  // wasm 전용 지시자만 허용한다.
  async headers() {
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://giscus.app https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://giscus.app",
      "font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "img-src 'self' data: blob: https://*.google-analytics.com https://*.googletagmanager.com https://*.google.com https://*.google.co.kr https://*.g.doubleclick.net",
      "connect-src 'self' blob: data: https://*.google-analytics.com https://analytics.google.com https://*.analytics.google.com https://*.googletagmanager.com https://*.g.doubleclick.net https://giscus.app",
      "frame-src 'self' https://giscus.app",
      "worker-src 'self' blob:",
      "manifest-src 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // frame-ancestors 를 못 읽는 구형 브라우저용 폴백.
          // /pulse 를 같은 출처에서 iframe 으로 싣기 때문에 DENY 가 아니라 SAMEORIGIN.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // includeSubDomains 는 뺐다. 다른 서브도메인까지 HTTPS 를 강제해
          // 의도치 않게 죽일 수 있어서, 이 호스트에만 건다.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },

  output: "standalone", // 정적 사이트(SSG) 최적화 -> standalone으로 변경(GA)
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
