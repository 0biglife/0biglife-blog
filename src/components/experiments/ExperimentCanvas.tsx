"use client";

import { useEffect, useRef } from "react";

export type Variant =
  | "bev"
  | "pointcloud"
  | "trajectory"
  | "tracking"
  | "fusion"
  | "lanegraph";

const PAL = {
  accent: "#c9ff4d",
  cyan: "#63b3ff",
  teal: "#5ce0c0",
  amber: "#ffb95e",
  pink: "#ff6fa5",
  grid: "rgba(130,150,170,0.10)",
  dim: "rgba(190,210,230,0.5)",
};

// height ramp: teal -> cyan -> lime
function ramp(t: number): string {
  t = Math.max(0, Math.min(1, t));
  if (t < 0.5) {
    const k = t / 0.5;
    return `rgb(${Math.round(30 + 70 * k)},${Math.round(180 + 40 * k)},${Math.round(190 - 20 * k)})`;
  }
  const k = (t - 0.5) / 0.5;
  return `rgb(${Math.round(100 + 101 * k)},${Math.round(220 + 35 * k)},${Math.round(170 - 80 * k)})`;
}

/**
 * A small, self-contained 2D-canvas visualization for an experiment card.
 * Cheap (throttled to ~30fps, capped DPR) and paused while off-screen.
 */
export default function ExperimentCanvas({
  variant,
  height,
}: {
  variant: Variant;
  height?: number | string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 1;
    let H = 1;
    const resize = () => {
      const r = cv.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    const reduce =
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const R = (a = 1) => Math.random() * a;
    // deterministic-ish per-variant state
    const S: {
      pts?: { a: number; r: number; z: number }[];
      boxes?: { x: number; y: number; vx: number; c: string; id: number; trail: number[][] }[];
      cells?: { gx: number; gy: number; ph: number }[];
      nodes?: { x: number; y: number }[];
      edges?: [number, number][];
    } = {};
    if (variant === "pointcloud")
      S.pts = Array.from({ length: 150 }, () => ({ a: R(Math.PI * 2), r: 0.12 + R(0.42), z: R(1) }));
    if (variant === "tracking")
      S.boxes = [PAL.cyan, PAL.amber, PAL.teal, PAL.pink].map((c, i) => ({
        x: R(1),
        y: 0.28 + R(0.5),
        vx: 0.05 + R(0.06),
        c,
        id: 11 + i,
        trail: [],
      }));
    if (variant === "bev")
      S.cells = Array.from({ length: 11 }, () => ({ gx: Math.floor(R(9)), gy: Math.floor(R(6)), ph: R(1) }));
    if (variant === "lanegraph") {
      S.nodes = [
        [0.12, 0.5], [0.34, 0.32], [0.34, 0.68], [0.58, 0.24],
        [0.58, 0.5], [0.58, 0.76], [0.82, 0.4], [0.82, 0.62], [0.95, 0.5],
      ].map(([x, y]) => ({ x, y }));
      S.edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8]];
    }

    let raf = 0;
    let running = true;
    let t0 = -1;
    let lastDraw = 0;

    const draw = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(draw);
      if (now - lastDraw < 33) return;
      lastDraw = now;
      if (t0 < 0) t0 = now;
      const t = reduce ? 0.5 : (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);

      if (variant === "bev") {
        const cols = 9;
        const rows = 6;
        const cw = W / cols;
        const ch = H / rows;
        ctx.strokeStyle = PAL.grid;
        ctx.lineWidth = 1;
        for (let i = 1; i < cols; i++) {
          ctx.beginPath();
          ctx.moveTo(i * cw, 0);
          ctx.lineTo(i * cw, H);
          ctx.stroke();
        }
        for (let j = 1; j < rows; j++) {
          ctx.beginPath();
          ctx.moveTo(0, j * ch);
          ctx.lineTo(W, j * ch);
          ctx.stroke();
        }
        const scanCol = Math.floor((t * 2.2) % cols);
        ctx.fillStyle = "rgba(201,255,77,0.06)";
        ctx.fillRect(scanCol * cw, 0, cw, H);
        S.cells!.forEach((c, idx) => {
          const p = Math.sin((c.ph + t * 0.6 + idx * 0.13) * Math.PI * 2) * 0.5 + 0.5;
          const occ = c.gx === scanCol ? 0.7 : 0.14 + p * 0.4;
          ctx.fillStyle = `rgba(201,255,77,${occ})`;
          ctx.fillRect(c.gx * cw + 1.5, c.gy * ch + 1.5, cw - 3, ch - 3);
        });
        // ego marker
        ctx.fillStyle = PAL.cyan;
        const ex = 4 * cw + cw / 2;
        const ey = 5 * ch + ch / 2;
        ctx.beginPath();
        ctx.moveTo(ex, ey - 6);
        ctx.lineTo(ex - 5, ey + 5);
        ctx.lineTo(ex + 5, ey + 5);
        ctx.closePath();
        ctx.fill();
      } else if (variant === "pointcloud") {
        const cx = W / 2;
        const cy = H / 2 + 6;
        const rot = t * 0.5;
        const sweep = (t * 1.4) % (Math.PI * 2);
        const sc = Math.min(W, H * 2.4);
        for (const pt of S.pts!) {
          const a = pt.a + rot;
          const x = cx + Math.cos(a) * pt.r * sc;
          const y = cy + Math.sin(a) * pt.r * sc * 0.34 - pt.z * 26;
          const d = Math.abs(((a - sweep + Math.PI) % (Math.PI * 2)) - Math.PI);
          const beam = Math.max(0, 1 - d / 0.7);
          ctx.globalAlpha = 0.45 + beam * 0.55;
          ctx.fillStyle = ramp(pt.z);
          const s = 1.4 + beam * 1.4;
          ctx.fillRect(x, y, s, s);
        }
        ctx.globalAlpha = 1;
      } else if (variant === "trajectory") {
        const obs = [
          { x: 0.42, y: 0.42 },
          { x: 0.66, y: 0.66 },
        ];
        // planned path (weaves around obstacles)
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = PAL.accent;
        ctx.setLineDash([7, 7]);
        ctx.lineDashOffset = -t * 26;
        ctx.beginPath();
        const N = 40;
        const pathY = (u: number) => {
          let px = 0.12 + u * 0.78;
          let py = 0.82 - u * 0.64;
          for (const o of obs) {
            const dx = px - o.x;
            const dy = py - o.y;
            const d2 = dx * dx + dy * dy;
            const push = 0.03 / (d2 + 0.01);
            px += dx * push;
            py += dy * push;
          }
          return [px * W, py * H] as const;
        };
        for (let i = 0; i <= N; i++) {
          const [x, y] = pathY(i / N);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        // obstacles
        for (const o of obs) {
          ctx.strokeStyle = PAL.pink;
          ctx.fillStyle = "rgba(255,111,165,0.12)";
          ctx.beginPath();
          ctx.arc(o.x * W, o.y * H, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        // vehicle dot
        const [vx, vy] = pathY((t * 0.25) % 1);
        ctx.fillStyle = PAL.cyan;
        ctx.beginPath();
        ctx.arc(vx, vy, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (variant === "tracking") {
        ctx.font = "9px 'JetBrains Mono', monospace";
        for (const b of S.boxes!) {
          b.x += b.vx * 0.012;
          if (b.x > 1.1) {
            b.x = -0.1;
            b.y = 0.28 + R(0.5);
          }
          const x = b.x * W;
          const y = b.y * H;
          b.trail.push([x, y]);
          if (b.trail.length > 10) b.trail.shift();
          b.trail.forEach((p, i) => {
            ctx.globalAlpha = (i / b.trail.length) * 0.4;
            ctx.fillStyle = b.c;
            ctx.fillRect(p[0] - 1, p[1] - 1, 2, 2);
          });
          ctx.globalAlpha = 1;
          const bw = 26;
          const bh = 16;
          ctx.strokeStyle = b.c;
          ctx.lineWidth = 1.4;
          ctx.strokeRect(x - bw / 2, y - bh / 2, bw, bh);
          // uncertainty ellipse
          ctx.globalAlpha = 0.35;
          ctx.beginPath();
          ctx.ellipse(x, y, bw * 0.75, bh * 0.9, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
          ctx.fillStyle = b.c;
          ctx.fillText(`#${b.id}`, x - bw / 2, y - bh / 2 - 4);
        }
      } else if (variant === "fusion") {
        const ex = W / 2;
        const ey = H - 10;
        const cones = [
          { half: 0.28, len: H * 1.1, c: "99,179,255", a: 0.1 }, // camera
          { half: 0.95, len: H * 0.85, c: "92,224,192", a: 0.07 }, // lidar
          { half: 0.5, len: H * 1.0, c: "255,185,94", a: 0.08 }, // radar
        ];
        for (const cn of cones) {
          ctx.fillStyle = `rgba(${cn.c},${cn.a})`;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - Math.sin(cn.half) * cn.len, ey - Math.cos(cn.half) * cn.len);
          ctx.lineTo(ex + Math.sin(cn.half) * cn.len, ey - Math.cos(cn.half) * cn.len);
          ctx.closePath();
          ctx.fill();
        }
        // sweep line
        const sw = -0.9 + ((t * 0.5) % 1) * 1.8;
        ctx.strokeStyle = "rgba(201,255,77,0.5)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex + Math.sin(sw) * H, ey - Math.cos(sw) * H);
        ctx.stroke();
        // fused detections
        for (let i = 0; i < 5; i++) {
          const a = -0.6 + i * 0.3;
          const dd = 0.4 + ((i * 0.13 + t * 0.1) % 0.5);
          const x = ex + Math.sin(a) * H * dd;
          const y = ey - Math.cos(a) * H * dd;
          ctx.fillStyle = PAL.accent;
          ctx.fillRect(x - 2, y - 2, 4, 4);
        }
        // ego
        ctx.fillStyle = PAL.cyan;
        ctx.fillRect(ex - 4, ey - 3, 8, 6);
      } else if (variant === "lanegraph") {
        const N = S.nodes!;
        const px = (n: { x: number; y: number }) => n.x * W;
        const py = (n: { x: number; y: number }) => n.y * H;
        ctx.strokeStyle = "rgba(99,179,255,0.28)";
        ctx.lineWidth = 1.4;
        for (const [a, b] of S.edges!) {
          ctx.beginPath();
          ctx.moveTo(px(N[a]), py(N[a]));
          ctx.lineTo(px(N[b]), py(N[b]));
          ctx.stroke();
        }
        // pulse traveling a route
        const route = [0, 1, 4, 6, 8];
        const prog = (t * 0.35) % (route.length - 1);
        const seg = Math.floor(prog);
        const f = prog - seg;
        const a = N[route[seg]];
        const b = N[route[seg + 1]];
        const gx = px(a) + (px(b) - px(a)) * f;
        const gy = py(a) + (py(b) - py(a)) * f;
        ctx.strokeStyle = PAL.accent;
        ctx.lineWidth = 2;
        for (let i = 0; i < route.length - 1; i++) {
          ctx.beginPath();
          ctx.moveTo(px(N[route[i]]), py(N[route[i]]));
          ctx.lineTo(px(N[route[i + 1]]), py(N[route[i + 1]]));
          ctx.globalAlpha = i <= seg ? 0.5 : 0.15;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        for (const n of N) {
          ctx.fillStyle = PAL.dim;
          ctx.beginPath();
          ctx.arc(px(n), py(n), 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = PAL.accent;
        ctx.beginPath();
        ctx.arc(gx, gy, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(draw);

    const io = new IntersectionObserver(
      ([e]) => {
        const vis = e.isIntersecting;
        if (vis && !running) {
          running = true;
          t0 = -1;
          raf = requestAnimationFrame(draw);
        } else if (!vis && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.02 }
    );
    io.observe(cv);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [variant]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ width: "100%", height: height ?? 168, display: "block" }}
    />
  );
}
