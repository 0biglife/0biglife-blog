import { NextResponse } from "next/server";
import { getBlogAnalytics } from "@/lib/analytics";

// build error : Edge Runtime이 아닌 Node.js 런타임에서 실행돼서, http, https 등 Node 모듈 사용 가능
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // runtime

export async function GET() {
  try {
    const result = await getBlogAnalytics();
    return NextResponse.json(result);
  } catch (e) {
    console.error("GA fetch error:", e);
    return NextResponse.json({ todayViews: "0", totalViews: "0" });
  }
}
