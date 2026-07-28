// make-og-tools.mjs — 도구 페이지용 og 이미지를 SVG 에서 굽는다.
//
//   node scripts/make-og-tools.mjs
//
// /tools/coordinate-frames 는 openGraph 를 자체 정의하면서 images 를 빼먹어, Next 가
// 부모의 og:image 를 상속하지 않는 규칙 때문에 이 라우트만 소셜 미리보기가 비어 있었다.
// 영어권 공유(HN·Reddit·LinkedIn)를 노리는 페이지라 썸네일 없는 맨 링크는 손해가 크다.
//
// 라벨은 전부 ASCII — CJK 글리프는 렌더 환경에 따라 두부(□)로 나올 수 있어 피한다.
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "public", "assets", "og-coordinate-frames.png");

const BG = "#01030a";
const LIME = "#c9ff4d";
const CYAN = "#5ad1ff";
const INK = "#e8eef5";
const MUTE = "#7d8ea1";

// 축 3개를 작은 모티프로. 두 모티프가 실제로 다른 방향을 가리켜야 "FLU → RDF"라는
// 캡션이 의미를 갖는다 — 같은 원점, 다른 축 배정이 이 도구의 존재 이유 그 자체다.
//   arms: [[dx, dy, color, label], ...]  (dx·dy 는 s 배수)
const axes = (cx, cy, s, arms) => `
  <g stroke-width="3" stroke-linecap="round" opacity="0.95">
    ${arms
      .map(
        ([dx, dy, color, label]) => `
    <line x1="${cx}" y1="${cy}" x2="${cx + s * dx}" y2="${cy + s * dy}" stroke="${color}"/>
    <text x="${cx + s * dx * 1.16}" y="${cy + s * dy * 1.16 + 5}" text-anchor="middle"
          font-family="ui-monospace, Menlo, monospace" font-size="14" fill="${color}"
          opacity="0.85">${label}</text>`
      )
      .join("")}
    <circle cx="${cx}" cy="${cy}" r="4.5" fill="${INK}"/>
  </g>`;

// FLU: x 앞 · y 왼쪽 · z 위      /      RDF: x 오른쪽 · y 아래 · z 앞
const FLU = [
  [1, -0.34, LIME, "x"],
  [-0.82, -0.5, CYAN, "y"],
  [0, -1, INK, "z"],
];
const RDF = [
  [1, 0.34, CYAN, "x"],
  [0, 1, LIME, "y"],
  [-0.82, -0.5, INK, "z"],
];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="glow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${LIME}" stop-opacity="0.14"/>
      <stop offset="0.55" stop-color="${CYAN}" stop-opacity="0.05"/>
      <stop offset="1" stop-color="${BG}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 L0 0 0 40" fill="none" stroke="#5a7896" stroke-opacity="0.075" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="${BG}"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <text x="72" y="112" font-family="ui-monospace, Menlo, monospace" font-size="19"
        letter-spacing="5" fill="${LIME}" opacity="0.9">0BIGLIFE / TOOLS</text>

  <text x="72" y="228" font-family="Helvetica, Arial, sans-serif" font-size="72"
        font-weight="700" fill="${INK}">Coordinate frame</text>
  <text x="72" y="308" font-family="Helvetica, Arial, sans-serif" font-size="72"
        font-weight="700" fill="${LIME}">converter</text>

  <text x="72" y="378" font-family="Helvetica, Arial, sans-serif" font-size="27" fill="${MUTE}">
    KITTI &#183; nuScenes &#183; Waymo &#183; ROS REP-103
  </text>

  <line x1="72" y1="432" x2="640" y2="432" stroke="${LIME}" stroke-opacity="0.28" stroke-width="1"/>

  <text x="72" y="482" font-family="ui-monospace, Menlo, monospace" font-size="23" fill="${CYAN}">
    rotation_y = -yaw - pi/2
  </text>
  <text x="72" y="530" font-family="Helvetica, Arial, sans-serif" font-size="21" fill="${MUTE}">
    Axis maps, quaternions and copyable Python. Runs in the browser.
  </text>

  ${axes(858, 262, 88, FLU)}
  ${axes(1092, 262, 88, RDF)}
  <text x="858" y="408" text-anchor="middle" font-family="ui-monospace, Menlo, monospace"
        font-size="15" letter-spacing="3" fill="${MUTE}" opacity="0.85">FLU</text>
  <text x="1092" y="408" text-anchor="middle" font-family="ui-monospace, Menlo, monospace"
        font-size="15" letter-spacing="3" fill="${MUTE}" opacity="0.85">RDF</text>
  <text x="975" y="408" text-anchor="middle" font-family="ui-monospace, Menlo, monospace"
        font-size="15" fill="${LIME}" opacity="0.8">&#8594;</text>
</svg>`;

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT);
console.log("wrote", OUT);
