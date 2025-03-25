import { google } from "googleapis";

const GOOGLE_API_URL = "https://www.googleapis.com/auth/analytics.readonly";
const METRIC_VIEW_NAME = "screenPageViews";
const BLOG_START_DATE = "2025-03-20";

const GA_PROPERTY_ID = process.env.GA_PROPERTY_ID || "";
const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n");
const clientEmail = process.env.GA_CLIENT_EMAIL;

export async function getBlogAnalytics() {
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [GOOGLE_API_URL],
  });

  const analyticsData = google.analyticsdata({ version: "v1beta", auth });

  const today = new Date().toISOString().split("T")[0];

  const todayRes = await analyticsData.properties.runReport({
    property: GA_PROPERTY_ID,
    requestBody: {
      dateRanges: [{ startDate: today, endDate: today }],
      metrics: [{ name: METRIC_VIEW_NAME }],
    },
  });

  const totalRes = await analyticsData.properties.runReport({
    property: GA_PROPERTY_ID,
    requestBody: {
      dateRanges: [{ startDate: BLOG_START_DATE, endDate: today }],
      metrics: [{ name: METRIC_VIEW_NAME }],
    },
  });

  return {
    todayViews: todayRes.data.rows?.[0]?.metricValues?.[0]?.value || "0",
    totalViews: totalRes.data.rows?.[0]?.metricValues?.[0]?.value || "0",
  };
}
