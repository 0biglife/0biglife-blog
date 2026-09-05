/**
 * 자율주행 시리즈 썸네일 생성기.
 *
 *   node scripts/make-thumbnails.mjs              # 전부
 *   node scripts/make-thumbnails.mjs av-mcap ...  # 특정 글만
 *
 * 시리즈 썸네일은 규칙이 정해져 있다 — 배경 #05070d 에 액센트 라디얼
 * 글로우, 좌상단 `AUTONOMY · NN`, 가운데 미니멀 라인 다이어그램, 좌하단
 * 모노 대문자 제목. 매번 손으로 그리면 톤이 어긋나므로 코드로 굳혔다.
 *
 * 새 글을 추가할 때는 THUMBS 에 항목 하나만 넣으면 된다. 액센트 색은
 * 앞뒤 글과 겹치지 않게 고른다.
 *
 * 브라우저가 필요한 이유: 제목에 쓰는 JetBrains Mono 는 웹폰트라
 * librsvg(sharp) 로는 렌더되지 않는다. 그래서 헤드리스 크롬에 웹폰트를
 * 실어 그린 뒤 sharp 로 webp 로 굽는다. 브라우저를 내려받지 않도록
 * playwright-core 를 쓰고, 시스템에 이미 있는 크롬을 찾아 쓴다.
 */

import { chromium } from "playwright-core";
import sharp from "sharp";
import fs from "fs";
import os from "os";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");
const W = 800;
const H = 600;

/* ── 다이어그램 조각 ───────────────────────────────────────── */

const ARROW = `<marker id="ah" markerWidth="9" markerHeight="9" refX="7" refY="3.2" orient="auto">
  <path d="M0,0 L7,3.2 L0,6.4 z" fill="currentColor"/></marker>`;

const svg = (inner) =>
  `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" fill="none"
        xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0">${inner}</svg>`;

/** 배럴 왜곡된 격자 — 중앙에서 멀수록 바깥으로 부푼다 */
function distortedGrid(cx, cy, size, n, k, op) {
  const h = size / 2;
  const step = size / (n - 1);
  let d = "";
  for (let i = 0; i < n; i++) {
    const t = -h + i * step;
    const bow = (1 - Math.abs(t) / h) * k + (Math.abs(t) / h) * k * 0.35;
    const off = t === 0 ? 0 : Math.sign(t) * bow;
    d += `<path d="M ${cx - h} ${cy + t} Q ${cx} ${cy + t + off} ${cx + h} ${cy + t}" stroke="currentColor" stroke-width="1.6" opacity="${op}"/>`;
    d += `<path d="M ${cx + t} ${cy - h} Q ${cx + t + off} ${cy} ${cx + t} ${cy + h}" stroke="currentColor" stroke-width="1.6" opacity="${op}"/>`;
  }
  return d;
}

function plainGrid(cx, cy, size, n, op) {
  const h = size / 2;
  const step = size / (n - 1);
  let d = "";
  for (let i = 0; i < n; i++) {
    const t = -h + i * step;
    d += `<line x1="${cx - h}" y1="${cy + t}" x2="${cx + h}" y2="${cy + t}" stroke="currentColor" stroke-width="1.4" opacity="${op}"/>`;
    d += `<line x1="${cx + t}" y1="${cy - h}" x2="${cx + t}" y2="${cy + h}" stroke="currentColor" stroke-width="1.4" opacity="${op}"/>`;
  }
  return d;
}

/** 재현 가능한 의사난수 — 실행마다 점 배치가 바뀌면 안 된다 */
function seeded(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

/* ── 썸네일 정의 ───────────────────────────────────────────── */

export const THUMBS = [
  {
    slug: "av-foundation-models",
    no: "12",
    title: "VLA / VQA",
    accent: "#b794f6",
    art: svg(`<defs>${ARROW}</defs>
      <rect x="258" y="238" width="104" height="80" rx="4" stroke="currentColor" stroke-width="2"/>
      <path d="M258 296 L296 274 L322 292 L362 264" stroke="currentColor" stroke-width="1.6" opacity="0.55"/>
      <circle cx="336" cy="258" r="7" stroke="currentColor" stroke-width="1.6" opacity="0.55"/>
      <line x1="396" y1="252" x2="470" y2="252" stroke="currentColor" stroke-width="3" opacity="0.45" stroke-linecap="round"/>
      <line x1="396" y1="272" x2="500" y2="272" stroke="currentColor" stroke-width="3" opacity="0.45" stroke-linecap="round"/>
      <line x1="396" y1="292" x2="452" y2="292" stroke="currentColor" stroke-width="3" opacity="0.45" stroke-linecap="round"/>
      <path d="M400 348 C 452 348 486 322 528 268" stroke="currentColor" stroke-width="2.4" marker-end="url(#ah)"/>
      <circle cx="400" cy="348" r="4" fill="currentColor"/>`),
  },
  {
    slug: "av-data-platform",
    no: "13",
    title: "DATA PLATFORM",
    accent: "#818cf8",
    art: svg(`
      ${[0, 1, 2, 3, 4]
        .map((i) => {
          const x = 320 + i * 40;
          return `<circle cx="${x}" cy="190" r="3.5" fill="currentColor" opacity="0.85"/>
                  <line x1="${x}" y1="196" x2="${x}" y2="222" stroke="currentColor" stroke-width="1.4" opacity="0.4"/>`;
        })
        .join("")}
      <rect x="270" y="228" width="260" height="40" rx="5" fill="currentColor" opacity="0.80"/>
      <rect x="290" y="282" width="220" height="40" rx="5" fill="currentColor" opacity="0.45"/>
      <rect x="310" y="336" width="180" height="40" rx="5" fill="currentColor" opacity="0.22"/>`),
  },
  {
    slug: "av-camera-image",
    no: "14",
    title: "CAMERA IMAGE",
    accent: "#f472b6",
    art: svg(`<defs>${ARROW}</defs>
      ${distortedGrid(310, 282, 150, 5, 26, 0.95)}
      <line x1="410" y1="282" x2="468" y2="282" stroke="currentColor" stroke-width="2" opacity="0.7" marker-end="url(#ah)"/>
      ${plainGrid(560, 282, 150, 5, 0.42)}`),
  },
  {
    slug: "av-perception-tasks",
    no: "15",
    title: "PERCEPTION",
    accent: "#22d3ee",
    art: svg(`
      <rect x="288" y="332" width="224" height="14" rx="7" fill="currentColor" opacity="0.85"/>
      ${[310, 355, 400, 445, 490]
        .map((x) => `<line x1="${x}" y1="332" x2="${x}" y2="266" stroke="currentColor" stroke-width="1.5" opacity="0.42"/>`)
        .join("")}
      <rect x="297" y="234" width="26" height="26" rx="2" stroke="currentColor" stroke-width="2"/>
      <g opacity="0.9">
        <rect x="342" y="234" width="12" height="12" fill="currentColor"/><rect x="356" y="234" width="12" height="12" opacity="0.3" fill="currentColor"/>
        <rect x="342" y="248" width="12" height="12" opacity="0.3" fill="currentColor"/><rect x="356" y="248" width="12" height="12" fill="currentColor"/>
      </g>
      <path d="M387 260 Q 400 232 413 260" stroke="currentColor" stroke-width="2.2" fill="none"/>
      <circle cx="445" cy="247" r="12" stroke="currentColor" stroke-width="2"/><circle cx="445" cy="247" r="4" fill="currentColor"/>
      <path d="M478 234 L478 260 L502 260 L502 234" stroke="currentColor" stroke-width="2" fill="none"/>`),
  },
  {
    slug: "av-annotation-data",
    no: "16",
    title: "ANNOTATION",
    accent: "#fbbf24",
    art: svg(`
      ${(() => {
        const r = seeded(7);
        return Array.from({ length: 34 }, () => {
          const x = 262 + r() * 276;
          const y = 196 + r() * 172;
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.2" fill="currentColor" opacity="${(0.28 + r() * 0.5).toFixed(2)}"/>`;
        }).join("");
      })()}
      <rect x="330" y="216" width="164" height="126" stroke="currentColor" stroke-width="1.8" stroke-dasharray="6 5" opacity="0.9"/>
      ${[[330, 216], [494, 216], [330, 342], [494, 342]]
        .map(([x, y]) => `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="currentColor"/>`)
        .join("")}
      <line x1="330" y1="204" x2="380" y2="204" stroke="currentColor" stroke-width="2.4" opacity="0.75"/>`),
  },
  {
    slug: "av-mcap",
    no: "17",
    title: "MCAP",
    accent: "#a3e635",
    art: svg(`<defs>${ARROW}</defs>
      <rect x="322" y="172" width="184" height="224" rx="5" stroke="currentColor" stroke-width="2"/>
      <line x1="322" y1="206" x2="506" y2="206" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>
      <line x1="322" y1="344" x2="506" y2="344" stroke="currentColor" stroke-width="1.4" opacity="0.5"/>
      <rect x="336" y="216" width="156" height="32" rx="3" fill="currentColor" opacity="0.30"/>
      <rect x="336" y="256" width="156" height="32" rx="3" fill="currentColor" opacity="0.30"/>
      <rect x="336" y="296" width="156" height="32" rx="3" fill="currentColor" opacity="0.30"/>
      <rect x="336" y="356" width="156" height="28" rx="3" fill="currentColor" opacity="0.9"/>
      <path d="M312 370 C 268 370 268 272 322 272" stroke="currentColor" stroke-width="2.2" fill="none" marker-end="url(#ah)"/>`),
  },
  {
    slug: "av-webgl",
    no: "18",
    title: "WEBGL2",
    accent: "#cbd5e1",
    art: svg(`
      ${(() => {
        const r = seeded(23);
        return Array.from({ length: 62 }, () => {
          const x = 252 + r() * 296;
          const y = 172 + r() * 158;
          return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(1.7 + r() * 1.4).toFixed(1)}" fill="currentColor" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
        }).join("");
      })()}
      ${[[300, 306], [350, 292], [400, 286], [450, 292], [500, 306]]
        .map(([x, y]) => `<line x1="400" y1="368" x2="${x}" y2="${y}" stroke="currentColor" stroke-width="1.2" opacity="0.28"/>`)
        .join("")}
      <rect x="280" y="368" width="240" height="13" rx="6.5" fill="currentColor" opacity="0.9"/>`),
  },
];

/* ── 렌더 ──────────────────────────────────────────────────── */

const html = (it) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=block" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${W}px;height:${H}px;background:#05070d;position:relative;overflow:hidden;
       font-family:'JetBrains Mono',monospace;color:${it.accent}}
  .glow{position:absolute;inset:0;
        background:radial-gradient(ellipse 430px 280px at 400px 285px, ${it.accent}22 0%, transparent 68%)}
  .label{position:absolute;left:40px;top:52px;font-size:14px;font-weight:400;
         letter-spacing:.34em;color:#6b7280}
  .title{position:absolute;left:40px;bottom:44px;font-size:46px;font-weight:700;
         letter-spacing:.01em;line-height:1;color:${it.accent}}
  svg{color:${it.accent}}
</style></head><body>
  <div class="glow"></div>
  ${it.art}
  <div class="label">AUTONOMY · ${it.no}</div>
  <div class="title">${it.title}</div>
</body></html>`;

/**
 * 브라우저 찾기. playwright-core 는 브라우저를 내려받지 않으므로
 * (그래야 CI 의 yarn install 이 무거워지지 않는다) 시스템에 이미 있는 걸 쓴다.
 */
function findBrowser() {
  if (process.env.THUMBNAIL_BROWSER) {
    return { executablePath: process.env.THUMBNAIL_BROWSER };
  }
  const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (fs.existsSync(chrome)) return { executablePath: chrome };

  // playwright 로 설치해 둔 크로미움이 있으면 그걸 쓴다
  const cache = path.join(os.homedir(), "Library/Caches/ms-playwright");
  if (fs.existsSync(cache)) {
    const dir = fs
      .readdirSync(cache)
      .filter((d) => d.startsWith("chromium-"))
      .sort()
      .pop();
    if (dir) {
      for (const rel of [
        "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
      ]) {
        const p = path.join(cache, dir, rel);
        if (fs.existsSync(p)) return { executablePath: p };
      }
    }
  }
  throw new Error(
    "크롬을 찾지 못했습니다. Google Chrome 을 설치하거나 THUMBNAIL_BROWSER 에 실행 파일 경로를 지정하세요."
  );
}

async function main() {
  const only = process.argv.slice(2);
  const targets = only.length ? THUMBS.filter((t) => only.includes(t.slug)) : THUMBS;

  if (!targets.length) {
    console.error(`대상이 없습니다. 사용 가능한 슬러그: ${THUMBS.map((t) => t.slug).join(", ")}`);
    process.exit(1);
  }

  const browser = await chromium.launch(findBrowser());
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();

  for (const it of targets) {
    await page.setContent(html(it), { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    const png = await page.screenshot({ type: "png" });

    const dir = path.join(ROOT, "public/assets/posts", it.slug);
    fs.mkdirSync(dir, { recursive: true });
    const out = path.join(dir, "thumbnail.webp");
    // 2배로 그린 뒤 줄여야 글자가 또렷하다
    await sharp(png).resize(W, H).webp({ quality: 88 }).toFile(out);
    console.log(`${it.slug.padEnd(22)} ${it.title.padEnd(15)} ${(fs.statSync(out).size / 1024).toFixed(1)}KB`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
