import { NextResponse } from "next/server";
import { getRealtimeAnalytics } from "@/lib/analytics";

// googleapis가 Node 모듈에 의존하므로 Edge가 아닌 Node 런타임에서 돌린다.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getRealtimeAnalytics();
    return NextResponse.json(result, {
      // 라이브 수치라 CDN이 붙잡고 있으면 안 된다. 캐시는 서버 메모리에서만 한다.
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("GA realtime route error:", e);
    return NextResponse.json(
      { activeUsers: 0, pages: [], countries: [], fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
