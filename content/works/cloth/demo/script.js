"use strict";

/* 천 시뮬레이션 — 2D Canvas 베를레 적분 점-제약 격자
 * 잡아당기면 끌려오고, 한계 이상 늘어난 제약은 찢어진다. */

(function () {
  const canvas = document.getElementById("cloth");
  const fallbackEl = document.getElementById("fallback");
  const hintEl = document.getElementById("hint");

  function fail(msg) {
    canvas.style.display = "none";
    if (hintEl) hintEl.hidden = true;
    if (fallbackEl) {
      fallbackEl.style.display = "flex";
      fallbackEl.textContent = msg;
    }
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    fail("이 브라우저는 Canvas 2D를 지원하지 않아 천 시뮬레이션을 표시할 수 없습니다.");
    return;
  }

  // --- 상수 ---
  const DT = 1 / 60; // 고정 타임스텝
  const FRICTION = 0.99;
  const GRAVITY = 1400; // px/s^2
  const ITERATIONS = 4; // 제약 이완 반복
  const TEAR = 3.6; // 원래 길이의 몇 배까지 버티는가
  const SPACING = 16; // 격자 간격(px)
  const GRAB = 26; // 점을 잡는 반경(px)
  const WIND = 520; // 바람 세기

  // --- 상태 ---
  let W = 0,
    H = 0,
    dpr = 1;
  let points = [];
  let constraints = [];
  let grabbed = null;
  let mx = 0,
    my = 0;
  let interacted = false;

  // 응력 색상 버킷 (배칭 렌더링용)
  const BUCKETS = 12;
  const bucketColor = [];
  for (let i = 0; i < BUCKETS; i++) {
    const s = i / (BUCKETS - 1);
    const r = Math.round(118 + s * 137);
    const g = Math.round(150 - s * 78);
    const b = Math.round(196 - s * 128);
    bucketColor.push("rgb(" + r + "," + g + "," + b + ")");
  }

  function buildCloth() {
    points = [];
    constraints = [];
    const cols = Math.max(10, Math.floor((W * 0.74) / SPACING));
    const rows = Math.max(7, Math.floor((H * 0.6) / SPACING));
    const startX = (W - (cols - 1) * SPACING) / 2;
    const startY = H * 0.13;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const px = startX + x * SPACING;
        const py = startY + y * SPACING;
        // 상단을 듬성듬성 고정 → 커튼처럼 드레이프
        const pinned = y === 0 && (x % 6 === 0 || x === cols - 1);
        points.push({ x: px, y: py, px: px, py: py, pinned: pinned });
      }
    }

    const idx = (x, y) => y * cols + x;
    const addC = (a, b) => {
      const pa = points[a];
      const pb = points[b];
      constraints.push({
        a: a,
        b: b,
        rest: Math.hypot(pa.x - pb.x, pa.y - pb.y),
      });
    };
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (x < cols - 1) addC(idx(x, y), idx(x + 1, y));
        if (y < rows - 1) addC(idx(x, y), idx(x, y + 1));
      }
    }
    grabbed = null;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, canvas.clientWidth);
    H = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // CSS 픽셀 좌표로 그림
    buildCloth();
  }
  window.addEventListener("resize", resize);
  resize();

  // --- 물리 ---
  function integrate(windX) {
    const ax = windX;
    const ay = GRAVITY;
    const dt2 = DT * DT;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.pinned) continue;
      const vx = (p.x - p.px) * FRICTION;
      const vy = (p.y - p.py) * FRICTION;
      p.px = p.x;
      p.py = p.y;
      p.x += vx + ax * dt2;
      p.y += vy + ay * dt2;
    }
  }

  function solve() {
    for (let it = 0; it < ITERATIONS; it++) {
      // 잡은 점은 매 반복 커서에 고정
      if (grabbed) {
        grabbed.x = mx;
        grabbed.y = my;
        grabbed.px = mx;
        grabbed.py = my;
      }
      for (let k = constraints.length - 1; k >= 0; k--) {
        const c = constraints[k];
        const pa = points[c.a];
        const pb = points[c.b];
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const d = Math.hypot(dx, dy) || 0.0001;
        if (d > c.rest * TEAR) {
          constraints.splice(k, 1); // 찢김
          continue;
        }
        const diff = (c.rest - d) / d;
        const ox = dx * 0.5 * diff;
        const oy = dy * 0.5 * diff;
        if (!pa.pinned) {
          pa.x -= ox;
          pa.y -= oy;
        }
        if (!pb.pinned) {
          pb.x += ox;
          pb.y += oy;
        }
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    // 응력별로 버킷에 모아 한 번씩 stroke (배칭)
    const buckets = [];
    for (let i = 0; i < BUCKETS; i++) buckets.push([]);
    for (let k = 0; k < constraints.length; k++) {
      const c = constraints[k];
      const pa = points[c.a];
      const pb = points[c.b];
      const d = Math.hypot(pb.x - pa.x, pb.y - pa.y);
      let stress = (d / c.rest - 1) * 1.7;
      stress = stress < 0 ? 0 : stress > 1 ? 1 : stress;
      const bi = Math.min(BUCKETS - 1, (stress * (BUCKETS - 1)) | 0);
      buckets[bi].push(pa.x, pa.y, pb.x, pb.y);
    }
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    for (let i = 0; i < BUCKETS; i++) {
      const seg = buckets[i];
      if (seg.length === 0) continue;
      ctx.strokeStyle = bucketColor[i];
      ctx.beginPath();
      for (let j = 0; j < seg.length; j += 4) {
        ctx.moveTo(seg[j], seg[j + 1]);
        ctx.lineTo(seg[j + 2], seg[j + 3]);
      }
      ctx.stroke();
    }
  }

  // --- 포인터 ---
  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function markInteracted() {
    if (!interacted) {
      interacted = true;
      if (hintEl) hintEl.classList.add("hidden");
    }
  }
  canvas.addEventListener("pointerdown", (e) => {
    const m = pointerPos(e);
    mx = m.x;
    my = m.y;
    let best = -1;
    let bd = GRAB * GRAB;
    for (let i = 0; i < points.length; i++) {
      const dx = points[i].x - m.x;
      const dy = points[i].y - m.y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    if (best >= 0) grabbed = points[best];
    markInteracted();
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    const m = pointerPos(e);
    mx = m.x;
    my = m.y;
  });
  function endDrag(e) {
    grabbed = null;
    if (e && e.pointerId !== undefined && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  canvas.addEventListener("dblclick", () => {
    buildCloth();
  });
  setTimeout(() => {
    if (!interacted && hintEl) hintEl.classList.add("hidden");
  }, 6000);

  // --- 루프 ---
  let raf = 0;
  let running = true;
  const start = performance.now();

  function frame() {
    if (!running) return;
    const t = (performance.now() - start) / 1000;
    const windX =
      (Math.sin(t * 0.6) + 0.4 * Math.sin(t * 1.7 + 1.3)) * WIND;
    integrate(windX);
    solve();
    render();
    raf = requestAnimationFrame(frame);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      running = false;
      if (raf) cancelAnimationFrame(raf);
    } else if (!running) {
      running = true;
      raf = requestAnimationFrame(frame);
    }
  });

  raf = requestAnimationFrame(frame);
})();
