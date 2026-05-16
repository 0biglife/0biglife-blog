// 번호 별자리 — 로또 6/45의 1,216회차 당첨 데이터를 별자리로 그린다.
// 각 번호는 별, 함께 뽑힌 횟수는 두 별을 잇는 빛, 출현 빈도는 별의 크기.
// data.js 가 LOTTO_DRAWS 를 먼저 정의한다. 외부 의존성 없는 vanilla canvas.

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

const COUNT = 45;

// --- 데이터 집계 -----------------------------------------------------------
const freq = new Array(COUNT + 1).fill(0);
const co = [];
for (let i = 0; i <= COUNT; i++) co.push(new Array(COUNT + 1).fill(0));

for (const draw of LOTTO_DRAWS) {
  for (let i = 0; i < 6; i++) {
    freq[draw[i]]++;
    for (let j = i + 1; j < 6; j++) {
      co[draw[i]][draw[j]]++;
      co[draw[j]][draw[i]]++;
    }
  }
}

const DRAWS = LOTTO_DRAWS.length;
const expFreq = (DRAWS * 6) / 45;     // 번호당 기대 출현 횟수
const expCo = (DRAWS * 30) / 1980;    // 쌍당 기대 동반 출현 횟수

let minFreq = Infinity;
let maxFreq = -Infinity;
for (let n = 1; n <= COUNT; n++) {
  if (freq[n] < minFreq) minFreq = freq[n];
  if (freq[n] > maxFreq) maxFreq = freq[n];
}
let maxCo = 1;
for (let a = 1; a <= COUNT; a++) {
  for (let b = a + 1; b <= COUNT; b++) {
    if (co[a][b] > maxCo) maxCo = co[a][b];
  }
}
const coSpan = Math.max(1, maxCo - expCo);

// 다섯 밴드 색상 — 번호 아홉 개씩 묶어 색을 준다.
const BAND_HUE = [350, 32, 152, 196, 270];
function bandOf(num) {
  return Math.min(4, Math.floor((num - 1) / 9));
}

// --- 노드 ------------------------------------------------------------------
const nodes = [];
for (let n = 1; n <= COUNT; n++) {
  const t = (freq[n] - minFreq) / Math.max(1, maxFreq - minFreq);
  nodes.push({
    num: n,
    band: bandOf(n),
    anchorAngle: ((n - 1) / COUNT) * Math.PI * 2 - Math.PI / 2,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 7 + t * 11,
  });
}

// 안정 상태에서 그릴 엣지 — 기대값 대비 편차가 큰 150쌍만 추린다.
const restEdges = [];
for (let a = 1; a <= COUNT; a++) {
  for (let b = a + 1; b <= COUNT; b++) {
    restEdges.push({ a: a - 1, b: b - 1, dev: co[a][b] - expCo });
  }
}
restEdges.sort((p, q) => Math.abs(q.dev) - Math.abs(p.dev));
const REST = restEdges.slice(0, 150);

// 정적인 별먼지 배경.
const dust = [];
for (let i = 0; i < 90; i++) {
  dust.push({ x: Math.random(), y: Math.random(), s: Math.random() });
}

// --- 레이아웃 --------------------------------------------------------------
let W = 0;
let H = 0;
let cx = 0;
let cy = 0;
let ring = 0;
let seeded = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = W / 2;
  cy = H / 2;
  ring = Math.min(W, H) * 0.34;
  if (!seeded) {
    for (const nd of nodes) {
      nd.x = cx + Math.cos(nd.anchorAngle) * ring;
      nd.y = cy + Math.sin(nd.anchorAngle) * ring;
    }
    seeded = true;
  }
}

// --- 힘 시뮬레이션 ---------------------------------------------------------
let rot = 0;
let hover = -1;

function step() {
  rot += 0.0007; // 별자리 전체가 아주 천천히 돈다

  for (const nd of nodes) {
    // 1) 제자리(앵커)로 당기는 스프링 — 전체를 안정적으로 잡아준다.
    const ax = cx + Math.cos(nd.anchorAngle + rot) * ring;
    const ay = cy + Math.sin(nd.anchorAngle + rot) * ring;
    let fx = (ax - nd.x) * 0.014;
    let fy = (ay - nd.y) * 0.014;

    for (const other of nodes) {
      if (other === nd) continue;
      let dx = nd.x - other.x;
      let dy = nd.y - other.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 4) d2 = 4;
      const d = Math.sqrt(d2);

      // 2) 모든 별이 서로 밀어낸다 — 겹침 방지.
      const rep = 700 / d2;
      fx += (dx / d) * rep;
      fy += (dy / d) * rep;

      // 3) 자주 함께 뽑힌 번호끼리는 약하게 끌어당긴다.
      const w = co[nd.num][other.num] / maxCo;
      const attr = (d - 75) * 0.0008 * w;
      fx -= (dx / d) * attr;
      fy -= (dy / d) * attr;
    }

    nd.vx = (nd.vx + fx) * 0.84;
    nd.vy = (nd.vy + fy) * 0.84;
  }
  for (const nd of nodes) {
    nd.x += nd.vx;
    nd.y += nd.vy;
  }
}

// --- 렌더링 ----------------------------------------------------------------
function draw() {
  step();

  ctx.fillStyle = "#070812";
  ctx.fillRect(0, 0, W, H);

  for (const d of dust) {
    ctx.globalAlpha = 0.1 + d.s * 0.22;
    ctx.fillStyle = "#aab2d5";
    const sz = d.s < 0.5 ? 1 : 1.6;
    ctx.fillRect(d.x * W, d.y * H, sz, sz);
  }
  ctx.globalAlpha = 1;

  const hovered = hover >= 0 ? nodes[hover] : null;

  // 엣지 — 빛이 겹치도록 가산 합성.
  ctx.globalCompositeOperation = "lighter";
  if (hovered) {
    for (let k = 0; k < COUNT; k++) {
      if (k === hover) continue;
      const dev = co[hovered.num][nodes[k].num] - expCo;
      const mag = Math.min(1, Math.abs(dev) / coSpan);
      const hue = dev >= 0 ? 28 : 205; // 따뜻 = 자주, 차가움 = 드물게
      ctx.strokeStyle = `hsla(${hue}, 95%, 66%, ${0.12 + mag * 0.7})`;
      ctx.lineWidth = 0.6 + mag * 2.4;
      ctx.beginPath();
      ctx.moveTo(hovered.x, hovered.y);
      ctx.lineTo(nodes[k].x, nodes[k].y);
      ctx.stroke();
    }
  } else {
    for (const e of REST) {
      const mag = Math.min(1, Math.abs(e.dev) / coSpan);
      const hue = e.dev >= 0 ? 28 : 205;
      ctx.strokeStyle = `hsla(${hue}, 90%, 62%, ${0.05 + mag * 0.16})`;
      ctx.lineWidth = 0.5 + mag;
      ctx.beginPath();
      ctx.moveTo(nodes[e.a].x, nodes[e.a].y);
      ctx.lineTo(nodes[e.b].x, nodes[e.b].y);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";

  // 별(노드).
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < COUNT; i++) {
    const nd = nodes[i];
    const hue = BAND_HUE[nd.band];
    const dim = hovered ? (i === hover ? 1 : 0.26) : 1;
    const r = nd.radius;

    const glow = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, r * 2.4);
    glow.addColorStop(0, `hsla(${hue}, 90%, 72%, ${0.95 * dim})`);
    glow.addColorStop(0.4, `hsla(${hue}, 88%, 60%, ${0.5 * dim})`);
    glow.addColorStop(1, `hsla(${hue}, 88%, 55%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(nd.x, nd.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `hsla(${hue}, 96%, ${i === hover ? 93 : 80}%, ${dim})`;
    ctx.beginPath();
    ctx.arc(nd.x, nd.y, r * 0.52, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 255, ${0.92 * dim})`;
    ctx.font = `${Math.round(r * 0.84)}px monospace`;
    ctx.fillText(String(nd.num), nd.x, nd.y);
  }

  // 호버 툴팁.
  if (hovered) {
    const dev = Math.round(freq[hovered.num] - expFreq);
    const sign = dev >= 0 ? "+" : "−";
    const label =
      `${hovered.num}번  ·  ${freq[hovered.num]}회 출현  ·  ` +
      `기대 ${Math.round(expFreq)} (${sign}${Math.abs(dev)})`;
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    const tw = ctx.measureText(label).width;
    let tx = hovered.x + 18;
    const ty = hovered.y - 18;
    if (tx + tw + 16 > W) tx = hovered.x - 18 - tw - 16;
    ctx.fillStyle = "rgba(10, 12, 24, 0.92)";
    ctx.fillRect(tx, ty - 13, tw + 16, 26);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
    ctx.strokeRect(tx, ty - 13, tw + 16, 26);
    ctx.fillStyle = "#e8ebff";
    ctx.fillText(label, tx + 8, ty);
  }

  requestAnimationFrame(draw);
}

// --- 포인터 ----------------------------------------------------------------
function onPointerMove(event) {
  const rect = canvas.getBoundingClientRect();
  const point = event.touches ? event.touches[0] : event;
  const mx = point.clientX - rect.left;
  const my = point.clientY - rect.top;
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < COUNT; i++) {
    const dx = nodes[i].x - mx;
    const dy = nodes[i].y - my;
    const d = dx * dx + dy * dy;
    const reach = nodes[i].radius * 1.9;
    if (d < reach * reach && d < bestD) {
      bestD = d;
      best = i;
    }
  }
  hover = best;
}

function onPointerLeave() {
  hover = -1;
}

window.addEventListener("resize", resize);
canvas.addEventListener("mousemove", onPointerMove);
canvas.addEventListener("touchmove", onPointerMove, { passive: true });
canvas.addEventListener("mouseleave", onPointerLeave);
canvas.addEventListener("touchend", onPointerLeave);

resize();
requestAnimationFrame(draw);
