import { google, analyticsdata_v1beta } from "googleapis";

let cachedData: { todayViews: string; totalViews: string } | null = null;
let lastFetched = 0;

const GOOGLE_API_URL = "https://www.googleapis.com/auth/analytics.readonly";
const METRIC_VIEW_NAME = "screenPageViews";
const BLOG_START_DATE = "2025-03-29";

// 키가 따옴표째 저장돼 있으면 PEM 파싱이 깨져 인증이 조용히 실패한다(조회수 0으로 표시됨).
function readPrivateKey() {
  return process.env.GA_PRIVATE_KEY?.replace(/^"|"$/g, "")
    .split(String.raw`\n`)
    .join("\n");
}

function getClient(): analyticsdata_v1beta.Analyticsdata {
  const auth = new google.auth.JWT({
    email: process.env.GA_CLIENT_EMAIL,
    key: readPrivateKey(),
    scopes: [GOOGLE_API_URL],
  });

  return google.analyticsdata({ version: "v1beta", auth });
}

export async function getBlogAnalytics() {
  const now = Date.now();
  const CACHE_DURATION = 1000 * 60 * 10; // 5분 캐시

  if (cachedData && now - lastFetched < CACHE_DURATION) {
    return cachedData;
  }

  const propertyId = process.env.GA_PROPERTY_ID || "";
  const analyticsData = getClient();

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

/* ------------------------------------------------------------------ */
/* 실시간(최근 30분) 방문자                                             */
/* ------------------------------------------------------------------ */

export interface RealtimeBreakdownRow {
  label: string;
  users: number;
}

export interface RealtimeAnalytics {
  /** 최근 30분 내 활성 사용자. GA가 중복 제거한 값이라 아래 분포의 합과 다를 수 있다. */
  activeUsers: number;
  /** 지금 보고 있는 페이지 상위 N개 */
  pages: RealtimeBreakdownRow[];
  /** 접속 국가 상위 N개 */
  countries: RealtimeBreakdownRow[];
  /** 조회 시각(ISO). 클라이언트가 캐시된 응답인지 판단하는 용도 */
  fetchedAt: string;
}

const EMPTY_REALTIME: RealtimeAnalytics = {
  activeUsers: 0,
  pages: [],
  countries: [],
  fetchedAt: new Date(0).toISOString(),
};

// GA4 실시간 API 쿼터는 속성당 시간당 1,260건이다. 서버에서 15초 캐시를 두면
// 방문자가 몇 명이든 호출은 2건/15초(=480건/시간)로 고정된다.
const REALTIME_CACHE_MS = 15 * 1000;
const BREAKDOWN_LIMIT = 5;

let cachedRealtime: RealtimeAnalytics | null = null;
let realtimeFetchedAt = 0;
// 동시 요청이 몰려도 GA 호출은 한 번만 나가도록 진행 중인 프라미스를 공유한다.
let inFlight: Promise<RealtimeAnalytics> | null = null;

function toRows(
  res: analyticsdata_v1beta.Schema$RunRealtimeReportResponse
): RealtimeBreakdownRow[] {
  return (res.rows ?? []).flatMap((row) => {
    const label = row.dimensionValues?.[0]?.value?.trim();
    const users = Number(row.metricValues?.[0]?.value ?? 0);
    if (!label || !Number.isFinite(users) || users <= 0) return [];
    return [{ label, users }];
  });
}

async function fetchRealtime(): Promise<RealtimeAnalytics> {
  const propertyId = process.env.GA_PROPERTY_ID;
  if (!propertyId || !process.env.GA_CLIENT_EMAIL || !process.env.GA_PRIVATE_KEY) {
    // 로컬처럼 자격증명이 없는 환경에서는 조용히 0을 돌려준다(UI가 알아서 숨김).
    return { ...EMPTY_REALTIME, fetchedAt: new Date().toISOString() };
  }

  const analyticsData = getClient();

  const [pageRes, countryRes] = await Promise.all([
    // unifiedScreenName = 페이지 제목. 실시간 API에는 pagePath 차원이 없다.
    analyticsData.properties.runRealtimeReport({
      property: propertyId,
      requestBody: {
        dimensions: [{ name: "unifiedScreenName" }],
        metrics: [{ name: "activeUsers" }],
        metricAggregations: ["TOTAL"],
        limit: String(BREAKDOWN_LIMIT),
      },
    }),
    analyticsData.properties.runRealtimeReport({
      property: propertyId,
      requestBody: {
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        limit: String(BREAKDOWN_LIMIT),
      },
    }),
  ]);

  // 페이지별 합계는 한 사람이 두 페이지를 봤을 때 중복되므로 GA가 준 TOTAL을 쓴다.
  const total = Number(pageRes.data.totals?.[0]?.metricValues?.[0]?.value ?? 0);

  return {
    activeUsers: Number.isFinite(total) && total > 0 ? total : 0,
    pages: toRows(pageRes.data),
    countries: toRows(countryRes.data),
    fetchedAt: new Date().toISOString(),
  };
}

export async function getRealtimeAnalytics(): Promise<RealtimeAnalytics> {
  const now = Date.now();

  if (cachedRealtime && now - realtimeFetchedAt < REALTIME_CACHE_MS) {
    return cachedRealtime;
  }
  if (inFlight) return inFlight;

  inFlight = fetchRealtime()
    .then((result) => {
      cachedRealtime = result;
      realtimeFetchedAt = Date.now();
      return result;
    })
    .catch((e) => {
      console.error("GA realtime fetch error:", e);
      // 실패했을 때 직전 값이 있으면 그대로 보여주고, 없으면 0으로 떨어뜨린다.
      return cachedRealtime ?? EMPTY_REALTIME;
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
