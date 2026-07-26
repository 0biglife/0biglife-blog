import { google } from "googleapis";

let cachedData: { todayViews: string; totalViews: string } | null = null;
let lastFetched = 0;

const GOOGLE_API_URL = "https://www.googleapis.com/auth/analytics.readonly";
const METRIC_VIEW_NAME = "screenPageViews";
const BLOG_START_DATE = "2025-03-29";

export async function getBlogAnalytics() {
  const now = Date.now();
  const CACHE_DURATION = 1000 * 60 * 10; // 5분 캐시

  if (cachedData && now - lastFetched < CACHE_DURATION) {
    return cachedData;
  }

  const propertyId = process.env.GA_PROPERTY_ID || "";
  // 키가 따옴표째 저장돼 있으면 PEM 파싱이 깨져 인증이 조용히 실패한다(조회수 0으로 표시됨).
  const privateKey = process.env.GA_PRIVATE_KEY?.replace(/^"|"$/g, "")
    .split(String.raw`\n`)
    .join("\n");

  const clientEmail = process.env.GA_CLIENT_EMAIL;

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [GOOGLE_API_URL],
  });

  const analyticsData = google.analyticsdata({ version: "v1beta", auth });

  // GA의 "today"는 속성 타임존(Asia/Seoul) 기준 — UTC 날짜를 직접 만들면 하루가 밀린다.
  const todayRes = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate: "today", endDate: "today" }],
      metrics: [{ name: METRIC_VIEW_NAME }],
    },
  });

  const totalRes = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate: BLOG_START_DATE, endDate: "today" }],
      metrics: [{ name: METRIC_VIEW_NAME }],
    },
  });

  const result = {
    todayViews: todayRes.data.rows?.[0]?.metricValues?.[0]?.value || "0",
    totalViews: totalRes.data.rows?.[0]?.metricValues?.[0]?.value || "0",
  };

  cachedData = result;
  lastFetched = now;

  return result;
}
