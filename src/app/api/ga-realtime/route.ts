// import { NextResponse } from "next/server";

// const GA_VIEW_ID = "GA_PROPERTY_ID";
// const API_KEY = "GOOGLE_API_KEY";

// export async function GET() {
//   const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA_VIEW_ID}:runRealtimeReport?key=${API_KEY}`;

//   const body = {
//     dimensions: [{ name: "country" }],
//     metrics: [{ name: "activeUsers" }],
//   };

//   try {
//     const res = await fetch(url, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify(body),
//     });

//     const data = await res.json();
//     const activeUsers = data.rows?.[0]?.metricValues?.[0]?.value || 0;

//     return NextResponse.json({ activeUsers });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json(
//       { error: "Failed to fetch GA data" },
//       { status: 500 }
//     );
//   }
// }

export const revalidate = 60; // 60초마다 재생성

export async function GET() {
  return new Response(JSON.stringify({ message: "Hello from API!" }), {
    headers: { "Content-Type": "application/json" },
  });
}
