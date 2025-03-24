/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: "https://0biglife.com", // 사이트 주소
  generateRobotsTxt: true, // robots.txt 자동 생성
  // generateIndexSitemap: true,
  sitemapSize: 5000,
  outDir: "out", // 정적 빌드 시 sitemap.xml이 `out/`에 저장되도록 설정
};
