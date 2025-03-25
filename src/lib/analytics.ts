import { google } from "googleapis";

const GOOGLE_API_URL = "https://www.googleapis.com/auth/analytics.readonly";
const METRIC_VIEW_NAME = "screenPageViews";
const BLOG_START_DATE = "2025-03-20";

const propertyId = process.env.GA_PROPERTY_ID || "";
const privateKey = process.env.GA_PRIVATE_KEY?.replace(/\\n/g, "\n");
const clientEmail = process.env.GA_CLIENT_EMAIL;

console.log("GA_PROPERTY_ID : ", propertyId);
console.log("GA_PRIVATE_KEY : ", privateKey);
console.log("GA_CLIENT_EMAIL : ", clientEmail);

export async function getBlogAnalytics() {
  console.log("GA_ENV", {
    propertyId,
    clientEmail,
    hasKey: !!privateKey,
  });
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: [GOOGLE_API_URL],
  });

  const analyticsData = google.analyticsdata({ version: "v1beta", auth });

  const today = new Date().toISOString().split("T")[0];

  const todayRes = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate: today, endDate: today }],
      metrics: [{ name: METRIC_VIEW_NAME }],
    },
  });
  console.log("[GA] Today result:", JSON.stringify(todayRes.data, null, 2));

  const totalRes = await analyticsData.properties.runReport({
    property: propertyId,
    requestBody: {
      dateRanges: [{ startDate: BLOG_START_DATE, endDate: today }],
      metrics: [{ name: METRIC_VIEW_NAME }],
    },
  });
  console.log("[GA] Total result:", JSON.stringify(totalRes.data, null, 2));

  console.log("[lib/ga] : ", todayRes, totalRes);
  return {
    todayViews: todayRes.data.rows?.[0]?.metricValues?.[0]?.value || "0",
    totalViews: totalRes.data.rows?.[0]?.metricValues?.[0]?.value || "0",
  };
}
