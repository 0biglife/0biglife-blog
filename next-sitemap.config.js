/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://www.0biglife.com", // 서비스 호스트(apex는 www로 리다이렉트)
  generateRobotsTxt: true, // robots.txt 자동 생성
  // generateIndexSitemap: true,
  sitemapSize: 5000,
  // output:"standalone" (Amplify compute)라 정적 파일은 out/이 아니라 public/에서 서빙된다.
  // outDir을 out으로 두면 진짜 sitemap이 서빙되지 않는 out/에 생성되고, 서빙되는
  // public/sitemap.xml은 빈 껍데기로 남아 색인이 유실된다. → public으로 생성.
  outDir: "public",

  // dev-log 는 frontmatter `indexable: true` 인 글만 색인 대상이다. 그 기준을 여기서도
  // 그대로 읽어, "사이트맵엔 있는데 페이지는 noindex" 같은 모순된 신호를 없앤다.
  // (Search Console 이 '제출된 URL이 noindex로 표시됨' 오류로 잡던 지점)
  // 사이트맵에 넣으면 안 되는 라우트. /topology 는 /(홈)으로 307 리다이렉트하는
  // 중복 제거용 별칭인데 사이트맵에 남아 있어서, Search Console 이 '리다이렉션이
  // 포함된 페이지'로 잡는다. 색인 신호는 실제로 200 을 주는 URL 만 담는다.
  exclude: ["/topology"],

  transform: async (config, url) => {
    if (url === "/topology") return null;

    const m = url.match(/^\/dev-logs\/([^/]+)$/);
    if (m) {
      const fs = require("fs");
      const path = require("path");
      const file = path.join(process.cwd(), "content/dev-logs", m[1], "index.mdx");
      let indexable = false;
      try {
        const head = fs.readFileSync(file, "utf8").split("---")[1] || "";
        indexable = /^\s*indexable:\s*true\s*$/m.test(head);
      } catch {
        indexable = false;
      }
      if (!indexable) return null; // 사이트맵에서 제외
    }
    return {
      loc: url,
      changefreq: config.changefreq,
      priority: config.priority,
      lastmod: config.autoLastmod ? new Date().toISOString() : undefined,
    };
  },
};
