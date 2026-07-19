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
};
