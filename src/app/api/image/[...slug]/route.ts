/**
 * @RouteHandlers
 * API Route 방식을 Next.js 14 App Router에서는 더 효율적으로 핸들링 가능
 * 이로 인한 장점
 * 1. Server Component 와의 연동
 * 2. Response Object활용으로 Cache-Control, 이미지 변환 가능
 * 3. /public 의 보안 문제 대비
 *
 * Request, NextResponse를 사용해 기존 API Routes보다 간결한 코드로 서버 응답 생성 + /content 내부 이미지를 응답으로 변환 + 캐싱 설정
 * @cdnMemo
 * - max-age=31536000: 1년 동안 브라우저 캐싱
 * - immutable: 파일이 변경되지 않으면 다시 다운로드하지 않음
 * - s-maxage=31536000: CDN 캐싱 적용
 * - stale-while-revalidate: 백그라운드에서 최신 데이터를 업데이트
 */
import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  context: { params: { slug?: string[] } }
) {
  const { slug } = context.params; // TODO : 배포시 문제 없는지 검토

  if (!slug) {
    return new NextResponse("Missing image path", { status: 400 });
  }

  const imagePath = path.join(process.cwd(), "content", ...slug);
  console.log("📂 Serving image from:", imagePath);

  if (!fs.existsSync(imagePath)) {
    console.error("❌ File not found:", imagePath);
    return new NextResponse("File not found", { status: 404 });
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase();

  let contentType = "image/png";
  if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";
  if (ext === ".webp") contentType = "image/webp";
  if (ext === ".png") contentType = "image/png";

  return new NextResponse(imageBuffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control":
        "public, max-age=31536000, immutable, s-maxage=31536000, stale-while-revalidate",
    },
  });
}
