// 번호 별자리 — 로또 6/45의 1,216회차 당첨 데이터 위에서 직접 별을 이어
// 내 조합을 그리고, 24년치 당첨 기록과 비교하는 인터랙티브 데이터 아트.
// data.js 가 LOTTO_DRAWS 를 먼저 정의한다. 외부 의존성 없는 vanilla canvas.

const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");

const COUNT = 45;
const DRAWS = LOTTO_DRAWS.length;
const TOTAL_COMBOS = 8145060; // C(45, 6)

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

const expFreq = (DRAWS * 6) / 45;
const expCo = (DRAWS * 30) / 1980;

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

// 회차별 통계 — 합·홀짝·고저·연속수.
const drawStats = LOTTO_DRAWS.map((d) => {
  const nums = d.slice().sort((a, b) => a - b);
  let sum = 0;
  let odd = 0;
  let low = 0;
  let consec = 0;
  for (const n of nums) {
    sum += n;
    if (n % 2 === 1) odd++;
    if (n <= 22) low++;
  }
  for (let i = 0; i < 5; i++) if (nums[i + 1] === nums[i] + 1) consec++;
  return { nums, sum, odd, low, consec };
});
let sumMin = Infinity;
let sumMax = -Infinity;
for (const d of drawStats) {
  if (d.sum < sumMin) sumMin = d.sum;
  if (d.sum > sumMax) sumMax = d.sum;
}

// 각 번호의 가장 잘 어울리는 동반 번호.
const bestPartner = new Array(COUNT + 1).fill(0);
for (let a = 1; a <= COUNT; a++) {
  let bestC = -1;
  for (let b = 1; b <= COUNT; b++) {
    if (b !== a && co[a][b] > bestC) {
      bestC = co[a][b];
      bestPartner[a] = b;
    }
  }
}

// --- 팔레트 ----------------------------------------------------------------
// 번호 아홉 개씩 다섯 밴드 — 청록→파랑→남보라→보라→자홍의 응집된 한 줄기.
const BAND_HUE = [186, 214, 250, 288, 322];
const GOLD = 45; // 내가 고른 별·조합선의 금빛 강조

function bandOf(num) {
  return Math.min(4, Math.floor((num - 1) / 9));
}

// --- 별자리 노드 -----------------------------------------------------------
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
    radius: 8 + t * 11,
    dim: 1, // 현재 밝기 (목표값으로 부드럽게 수렴)
    twk: Math.random() * Math.PI * 2, // 반짝임 위상
  });
}

const restEdges = [];
for (let a = 1; a <= COUNT; a++) {
  for (let b = a + 1; b <= COUNT; b++) {
    restEdges.push({ a: a - 1, b: b - 1, dev: co[a][b] - expCo });
  }
}
restEdges.sort((p, q) => Math.abs(q.dev) - Math.abs(p.dev));
const REST = restEdges.slice(0, 150);

const dust = [];
for (let i = 0; i < 110; i++) {
  dust.push({
    x: Math.random(),
    y: Math.random(),
    s: Math.random(),
    twk: Math.random() * Math.PI * 2,
  });
}

// --- 상태 ------------------------------------------------------------------
let W = 0;
let H = 0;
let cx = 0;
let cy = 0;
let ring = 0;
let seeded = false;
let rot = 0;
let hover = -1;
const selected = []; // 선택한 노드 인덱스 (최대 6)
const pointer = { x: 0, y: 0, inside: false };

// 인트로 — 별이 중심에서 피어나며 안내문이 떠올랐다 사라진다.
const startTime = performance.now();
let titleShown = true;
let titleA = 0;
let revealA = 0; // 여섯 개 완성 시 메시지 리빌

// 잔잔한 회차 재생 (아무 선택도 없을 때).
let ambientIdx = -1;
let ambientStart = -99999;
let nextAmbient = 3400;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = canvas.clientWidth;
  H = canvas.clientHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx = W / 2;
  cy = H / 2;
  ring = Math.min(W, H) * 0.33;
  if (!seeded) {
    // 중심 가까이에 모았다가 — 힘 시뮬레이션이 바깥 고리로 피워낸다.
    for (const nd of nodes) {
      nd.x = cx + Math.cos(nd.anchorAngle) * ring * 0.12;
      nd.y = cy + Math.sin(nd.anchorAngle) * ring * 0.12;
    }
    seeded = true;
  }
}

// --- 헬퍼 ------------------------------------------------------------------
function clampN(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function ease(t) {
  return 1 - Math.pow(1 - t, 3);
}

function nodeAt(mx, my) {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < COUNT; i++) {
    const dx = nodes[i].x - mx;
    const dy = nodes[i].y - my;
    const d = dx * dx + dy * dy;
    const reach = nodes[i].radius * 2.0;
    if (d < reach * reach && d < bestD) {
      bestD = d;
      best = i;
    }
  }
  return best;
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function signature(nums) {
  const s = nums.slice().sort((a, b) => a - b);
  let sum = 0;
  let odd = 0;
  let low = 0;
  let consec = 0;
  for (const n of s) {
    sum += n;
    if (n % 2 === 1) odd++;
    if (n <= 22) low++;
  }
  for (let i = 0; i < s.length - 1; i++) if (s[i + 1] === s[i] + 1) consec++;
  return { s, sum, odd, low, consec };
}

// --- 힘 시뮬레이션 ---------------------------------------------------------
function step() {
  rot += 0.0004;
  for (const nd of nodes) {
    const ax = cx + Math.cos(nd.anchorAngle + rot) * ring;
    const ay = cy + Math.sin(nd.anchorAngle + rot) * ring;
    let fx = (ax - nd.x) * 0.016;
    let fy = (ay - nd.y) * 0.016;
    for (const other of nodes) {
      if (other === nd) continue;
      const dx = nd.x - other.x;
      const dy = nd.y - other.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 4) d2 = 4;
      const d = Math.sqrt(d2);
      const rep = 700 / d2;
      fx += (dx / d) * rep;
      fy += (dy / d) * rep;
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

// --- 패널 ------------------------------------------------------------------
function numberChip(num, x, y, r) {
  const hue = BAND_HUE[bandOf(num)];
  ctx.fillStyle = `hsl(${hue}, 70%, 64%)`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0a0b14";
  ctx.font = `bold ${Math.round(r * 1.05)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(num), x, y + 0.5);
}

function statRow(label, value, x, y, w) {
  ctx.font = "11px monospace";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.textAlign = "left";
  ctx.fillText(label, x, y);
  ctx.fillStyle = "#eef0ff";
  ctx.textAlign = "right";
  ctx.fillText(value, x + w, y);
}

function drawPanel(now) {
  const px = 22;
  const py = 22;
  const pw = 256;
  const pad = 16;
  const ambientOn =
    now - ambientStart < 5000 && ambientIdx >= 0 && selected.length === 0;

  if (selected.length > 0) {
    const nums = selected.map((i) => nodes[i].num);
    const sig = signature(nums);
    const full = nums.length === 6;
    const ph = full ? 274 : 200;
    roundRect(px, py, pw, ph, 13);
    ctx.fillStyle = "rgba(12,14,28,0.9)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    let y = py + pad + 6;
    ctx.fillStyle = "#eef0ff";
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(`내 조합   ${nums.length} / 6`, px + pad, y);

    y += 26;
    sig.s.forEach((n, i) => {
      numberChip(n, px + pad + 13 + i * 37, y, 13);
    });

    y += 30;
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    ctx.moveTo(px + pad, y);
    ctx.lineTo(px + pw - pad, y);
    ctx.stroke();

    y += 22;
    const rw = pw - pad * 2;
    statRow("합계", String(sig.sum), px + pad, y, rw);
    y += 20;
    statRow("홀 : 짝", `${sig.odd} : ${sig.s.length - sig.odd}`, px + pad, y, rw);
    y += 20;
    statRow(
      "낮음 : 높음",
      `${sig.low} : ${sig.s.length - sig.low}`,
      px + pad,
      y,
      rw
    );
    y += 20;
    statRow("연속수", `${sig.consec}쌍`, px + pad, y, rw);

    if (full) {
      let below = 0;
      for (const d of drawStats) if (d.sum <= sig.sum) below++;
      const pct = Math.round((below / DRAWS) * 100);
      y += 24;
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.beginPath();
      ctx.moveTo(px + pad, y);
      ctx.lineTo(px + pw - pad, y);
      ctx.stroke();

      y += 16;
      const gx = px + pad;
      const gw = rw;
      ctx.fillStyle = "rgba(255,255,255,0.1)";
      ctx.fillRect(gx, y, gw, 4);
      const mk = gx + clampN((sig.sum - sumMin) / (sumMax - sumMin), 0, 1) * gw;
      ctx.fillStyle = `hsl(${GOLD}, 95%, 72%)`;
      ctx.fillRect(mk - 1.5, y - 3, 3, 10);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText(`합계 분포상 ${pct}%`, gx, y + 18);

      let sameShape = 0;
      let exact = 0;
      const key = sig.s.join(",");
      for (const d of drawStats) {
        if (d.odd === sig.odd && d.low === sig.low) sameShape++;
        if (d.nums.join(",") === key) exact++;
      }
      y += 36;
      statRow("똑같은 조합 당첨", `${exact}회`, px + pad, y, rw);
      y += 20;
      statRow(
        "같은 형태(홀짝·고저)",
        `${sameShape}회 · ${((sameShape / DRAWS) * 100).toFixed(1)}%`,
        px + pad,
        y,
        rw
      );
    } else {
      y += 24;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.font = "10px monospace";
      ctx.textAlign = "left";
      ctx.fillText("빈 공간 클릭 → 초기화", px + pad, y);
    }
    return;
  }

  if (ambientOn) {
    const d = drawStats[ambientIdx];
    const ph = 132;
    roundRect(px, py, pw, ph, 13);
    ctx.fillStyle = "rgba(12,14,28,0.88)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.stroke();

    let y = py + pad + 6;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${ambientIdx + 1} 회차 · 지난 당첨`, px + pad, y);

    y += 28;
    d.nums.forEach((n, i) => {
      numberChip(n, px + pad + 13 + i * 37, y, 13);
    });

    y += 32;
    ctx.fillStyle = "#eef0ff";
    ctx.font = "11px monospace";
    ctx.fillText(
      `합 ${d.sum}  ·  홀 ${d.odd}:${6 - d.odd}  ·  연속 ${d.consec}쌍`,
      px + pad,
      y
    );
  }
}

// --- 메인 루프 -------------------------------------------------------------
function draw(now) {
  step();

  const elapsed = now - startTime;
  const introGate = clampN(elapsed / 1300, 0, 1); // 별 피어남
  if (titleShown && elapsed > 6500) titleShown = false;
  titleA += ((titleShown ? introGate : 0) - titleA) * 0.08;
  revealA += ((selected.length === 6 ? 1 : 0) - revealA) * 0.1;

  if (pointer.inside) hover = nodeAt(pointer.x, pointer.y);
  else hover = -1;

  const ambientOn =
    now - ambientStart < 5000 && ambientIdx >= 0 && selected.length === 0;
  if (selected.length === 0 && hover < 0 && elapsed > 3000) {
    if (now > nextAmbient) {
      ambientIdx = Math.floor(Math.random() * DRAWS);
      ambientStart = now;
      nextAmbient = now + 6800;
    }
  }

  // 배경 — 중심이 살짝 밝은 깊은 남색.
  const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.7);
  bg.addColorStop(0, "#0c0e1f");
  bg.addColorStop(1, "#06070f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 별먼지 — 잔잔히 반짝인다.
  for (const d of dust) {
    const tw = 0.55 + 0.45 * Math.sin(now * 0.0013 + d.twk);
    ctx.globalAlpha = (0.07 + d.s * 0.2) * tw * introGate;
    ctx.fillStyle = "#aab2d5";
    const sz = d.s < 0.5 ? 1 : 1.6;
    ctx.fillRect(d.x * W, d.y * H, sz, sz);
  }
  ctx.globalAlpha = 1;

  const hovered = hover >= 0 ? nodes[hover] : null;
  const selSet = new Set(selected);
  const ambientSet = new Set();
  if (ambientOn) {
    for (const n of drawStats[ambientIdx].nums) ambientSet.add(n);
  }

  // --- 엣지 ---
  ctx.globalCompositeOperation = "lighter";
  if (hovered) {
    for (let k = 0; k < COUNT; k++) {
      if (k === hover) continue;
      const dev = co[hovered.num][nodes[k].num] - expCo;
      const mag = Math.min(1, Math.abs(dev) / coSpan);
      const hue = dev >= 0 ? 30 : 205;
      ctx.strokeStyle = `hsla(${hue}, 95%, 68%, ${(0.12 + mag * 0.7) * introGate})`;
      ctx.lineWidth = 0.6 + mag * 2.4;
      ctx.beginPath();
      ctx.moveTo(hovered.x, hovered.y);
      ctx.lineTo(nodes[k].x, nodes[k].y);
      ctx.stroke();
    }
  } else {
    for (const e of REST) {
      const mag = Math.min(1, Math.abs(e.dev) / coSpan);
      const hue = e.dev >= 0 ? 30 : 205;
      ctx.strokeStyle = `hsla(${hue}, 90%, 64%, ${(0.04 + mag * 0.12) * introGate})`;
      ctx.lineWidth = 0.5 + mag;
      ctx.beginPath();
      ctx.moveTo(nodes[e.a].x, nodes[e.a].y);
      ctx.lineTo(nodes[e.b].x, nodes[e.b].y);
      ctx.stroke();
    }
  }

  // --- 잔잔한 회차의 당첨 별자리 ---
  if (ambientOn) {
    const pulse = Math.sin(((now - ambientStart) / 5000) * Math.PI);
    const lit = nodes.filter((nd) => ambientSet.has(nd.num));
    lit.sort((a, b) => a.num - b.num);
    ctx.strokeStyle = `hsla(48, 95%, 74%, ${0.45 * pulse})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    lit.forEach((nd, i) => {
      if (i === 0) ctx.moveTo(nd.x, nd.y);
      else ctx.lineTo(nd.x, nd.y);
    });
    ctx.stroke();
  }

  // --- 내 조합의 별자리 (금빛) ---
  if (selected.length > 1) {
    const chain = selected
      .map((i) => nodes[i])
      .slice()
      .sort((a, b) => a.num - b.num);
    const full = selected.length === 6;
    const glowPulse = full ? 0.75 + 0.25 * Math.sin(now * 0.004) : 1;
    ctx.strokeStyle = `hsla(${GOLD}, 95%, 76%, ${(full ? 0.95 : 0.7) * glowPulse})`;
    ctx.lineWidth = full ? 2.6 : 2;
    ctx.beginPath();
    chain.forEach((nd, i) => {
      if (i === 0) ctx.moveTo(nd.x, nd.y);
      else ctx.lineTo(nd.x, nd.y);
    });
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  // --- 별(노드) ---
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < COUNT; i++) {
    const nd = nodes[i];
    const hue = BAND_HUE[nd.band];
    const isSel = selSet.has(i);
    const isAmbient = ambientSet.has(nd.num);

    // 목표 밝기 — 부드럽게 수렴.
    let target = 1;
    if (hovered) target = i === hover ? 1 : 0.26;
    else if (selected.length > 0) target = isSel ? 1 : 0.4;
    nd.dim += (target - nd.dim) * 0.16;
    let dim = nd.dim * introGate;

    let r = nd.radius;
    if (isAmbient) {
      const pulse = Math.sin(((now - ambientStart) / 5000) * Math.PI);
      r *= 1 + 0.35 * pulse;
      dim = Math.max(dim, (0.55 + 0.45 * pulse) * introGate);
    }
    const twinkle = 0.86 + 0.14 * Math.sin(now * 0.002 + nd.twk);

    const glow = ctx.createRadialGradient(nd.x, nd.y, 0, nd.x, nd.y, r * 2.6);
    glow.addColorStop(0, `hsla(${hue}, 85%, 76%, ${0.92 * dim})`);
    glow.addColorStop(0.42, `hsla(${hue}, 82%, 62%, ${0.45 * dim})`);
    glow.addColorStop(1, `hsla(${hue}, 82%, 58%, 0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(nd.x, nd.y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();

    // 코어 — 거의 흰빛, 살짝 색온도.
    ctx.fillStyle = `hsla(${hue}, 90%, ${i === hover ? 96 : 88}%, ${dim * twinkle})`;
    ctx.beginPath();
    ctx.arc(nd.x, nd.y, nd.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 내가 고른 별엔 금빛 고리.
    if (isSel) {
      ctx.strokeStyle = `hsla(${GOLD}, 96%, 80%, ${0.95 * introGate})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, nd.radius * 0.95, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = `rgba(255, 255, 255, ${0.92 * dim})`;
    ctx.font = `${Math.round(nd.radius * 0.8)}px monospace`;
    ctx.fillText(String(nd.num), nd.x, nd.y);
  }

  // --- 호버 툴팁 ---
  if (hovered) {
    const dev = Math.round(freq[hovered.num] - expFreq);
    const sign = dev >= 0 ? "+" : "−";
    const line =
      `${hovered.num}번 · ${freq[hovered.num]}회 (기대 대비 ${sign}${Math.abs(dev)}) · ` +
      `best ${bestPartner[hovered.num]}`;
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    const tw = ctx.measureText(line).width;
    let tx = pointer.x + 16;
    let ty = pointer.y - 18;
    if (tx + tw + 14 > W) tx = pointer.x - 16 - tw - 14;
    if (ty < 16) ty = pointer.y + 26;
    ctx.fillStyle = "rgba(10,12,24,0.94)";
    ctx.fillRect(tx, ty - 12, tw + 14, 24);
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.strokeRect(tx, ty - 12, tw + 14, 24);
    ctx.fillStyle = "#eef0ff";
    ctx.fillText(line, tx + 7, ty);
  }

  drawPanel(now);

  // --- 인트로 안내문 ---
  if (titleA > 0.01) {
    ctx.globalAlpha = titleA;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#eef0ff";
    ctx.font = "15px monospace";
    ctx.fillText("별을 이어, 당신의 조합을 그려보세요", cx, cy);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px monospace";
    ctx.fillText("로또 6/45 · 1,216회차 실제 당첨 데이터", cx, cy + 24);
    ctx.globalAlpha = 1;
  }

  // --- 여섯 개 완성 시 메시지 리빌 ---
  if (revealA > 0.01 && selected.length === 6) {
    const sig = signature(selected.map((i) => nodes[i].num));
    const key = sig.s.join(",");
    let exact = 0;
    for (const d of drawStats) if (d.nums.join(",") === key) exact++;

    const head =
      exact > 0
        ? `이 여섯, 실제로 ${exact}번 당첨된 조합입니다`
        : "이 여섯이 함께 나온 적 — 24년간 0회";
    const sub = `${TOTAL_COMBOS.toLocaleString()}가지 중 하나. 어떤 조합도 두 번 나오지 않았다.`;

    const by = H - 52;
    ctx.globalAlpha = revealA;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = `hsla(${GOLD}, 96%, 82%, 1)`;
    ctx.font = "16px monospace";
    ctx.fillText(head, cx, by);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = "11px monospace";
    ctx.fillText(sub, cx, by + 22);
    ctx.globalAlpha = 1;
  }

  requestAnimationFrame(draw);
}

// --- 입력 ------------------------------------------------------------------
function trackPointer(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = clientX - rect.left;
  pointer.y = clientY - rect.top;
  pointer.inside = true;
  if (nodeAt(pointer.x, pointer.y) >= 0) titleShown = false;
}

function onClick(clientX, clientY) {
  titleShown = false;
  const rect = canvas.getBoundingClientRect();
  const mx = clientX - rect.left;
  const my = clientY - rect.top;
  const hit = nodeAt(mx, my);
  if (hit < 0) {
    selected.length = 0; // 빈 공간 → 초기화
    return;
  }
  const at = selected.indexOf(hit);
  if (at >= 0) {
    selected.splice(at, 1); // 이미 선택됨 → 해제
  } else if (selected.length < 6) {
    selected.push(hit);
  }
}

canvas.addEventListener("mousemove", (e) => trackPointer(e.clientX, e.clientY));
canvas.addEventListener("mouseleave", () => (pointer.inside = false));
canvas.addEventListener("click", (e) => onClick(e.clientX, e.clientY));
canvas.addEventListener(
  "touchmove",
  (e) => trackPointer(e.touches[0].clientX, e.touches[0].clientY),
  { passive: true }
);
canvas.addEventListener("touchend", (e) => {
  if (e.changedTouches && e.changedTouches[0]) {
    const t = e.changedTouches[0];
    onClick(t.clientX, t.clientY);
  }
  pointer.inside = false;
});

window.addEventListener("resize", resize);
resize();
requestAnimationFrame(draw);
