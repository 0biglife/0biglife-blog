"use client";

import { memo, useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { SceneQuality } from "./sceneTypes";

export type SceneStats = { fps: number; points: number; frame: number; tracks: number };

type Props = {
  quality: SceneQuality;
  /** absolute overlay the renderer fills with floating object labels */
  labelLayerRef?: RefObject<HTMLDivElement | null>;
  onStats?: (s: SceneStats) => void;
};

const BG = 0x01030a;
const BOX = "#f0a63a"; // orange bounding boxes
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** classic jet colormap (blue→cyan→green→yellow→red), t in [0,1] */
function jet(t: number, out: Float32Array, i: number) {
  const r = clamp(1.5 - Math.abs(4 * t - 3), 0, 1);
  const g = clamp(1.5 - Math.abs(4 * t - 2), 0, 1);
  const b = clamp(1.5 - Math.abs(4 * t - 1), 0, 1);
  out[i] = r * 0.95 + 0.02;
  out[i + 1] = g * 0.95 + 0.02;
  out[i + 2] = b * 0.95 + 0.06;
}

const MAX_RANGE = 58;
const LABELS = 9;

function PerceptionCanvas({ quality, labelLayerRef, onStats }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch {
      return;
    }
    const initW = mount.clientWidth || 1;
    const initH = mount.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(initW, initH);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);

    const camera = new THREE.PerspectiveCamera(48, initW / initH, 0.2, 400);
    camera.position.set(18, 14, 26);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T): T => {
      disposables.push(o);
      return o;
    };

    /* ---- objects (parked cars) — class, confidence, box ---------------- */
    interface Obj {
      x: number;
      z: number;
      w: number;
      l: number;
      h: number;
      yaw: number;
      cls: string;
      conf: number;
    }
    const objs: Obj[] = [];
    for (let row = 0; row < 3; row++) {
      const bx = -8 - row * 4.2;
      for (let k = 0; k < 5; k++) {
        objs.push({ x: bx + (Math.random() - 0.5) * 0.4, z: -12 + k * 6.5 + (Math.random() - 0.5) * 0.6, w: 1.9, l: 4.5, h: 1.5, yaw: (Math.random() - 0.5) * 0.05, cls: "car", conf: 0.9 + Math.random() * 0.09 });
      }
    }
    const scatter: Omit<Obj, "conf">[] = [
      { x: 9, z: -6, w: 1.9, l: 4.6, h: 1.5, yaw: 0.02, cls: "car" },
      { x: 12.5, z: 8, w: 2.4, l: 8.5, h: 3.1, yaw: -0.03, cls: "truck" },
      { x: 6.5, z: 20, w: 1.9, l: 4.5, h: 1.5, yaw: 0.0, cls: "car" },
      { x: -4, z: 26, w: 1.9, l: 4.5, h: 1.5, yaw: 0.4, cls: "car" },
    ];
    for (const s of scatter) objs.push({ ...s, conf: 0.85 + Math.random() * 0.13 });

    // merged box edges + heading ticks
    const boxPts: THREE.Vector3[] = [];
    for (const o of objs) {
      const hw = o.w / 2;
      const hl = o.l / 2;
      const c = Math.cos(o.yaw);
      const s = Math.sin(o.yaw);
      const P = (sx: number, sz: number, y: number) => {
        const lx = sx * hw;
        const lz = sz * hl;
        return new THREE.Vector3(o.x + lx * c - lz * s, y, o.z + lx * s + lz * c);
      };
      const b = [P(-1, -1, 0), P(1, -1, 0), P(1, 1, 0), P(-1, 1, 0)];
      const tp = [P(-1, -1, o.h), P(1, -1, o.h), P(1, 1, o.h), P(-1, 1, o.h)];
      for (let i = 0; i < 4; i++) {
        boxPts.push(b[i], b[(i + 1) % 4], tp[i], tp[(i + 1) % 4], b[i], tp[i]);
      }
      // heading tick — center to front face
      boxPts.push(P(0, 0, o.h * 0.5), P(0, 1.4, o.h * 0.5));
    }
    const boxGeo = track(new THREE.BufferGeometry().setFromPoints(boxPts));
    const boxMat = track(new THREE.LineBasicMaterial({ color: new THREE.Color(BOX), transparent: true, opacity: 0.92 }));
    scene.add(new THREE.LineSegments(boxGeo, boxMat));

    /* ---- range reference rings (like RViz) ----------------------------- */
    const ringMat = track(new THREE.LineBasicMaterial({ color: 0x2b4a63, transparent: true, opacity: 0.22 }));
    for (const r of [10, 20, 30, 40, 50]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 100; i++) {
        const a = (i / 100) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0.02, Math.sin(a) * r));
      }
      scene.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(pts)), ringMat));
    }

    /* ---- axes gizmo at the origin -------------------------------------- */
    const axLen = 2.4;
    const axPts = [
      new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(axLen, 0.05, 0),
      new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, axLen, 0),
      new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0, 0.05, axLen),
    ];
    const axCol = [1, 0.25, 0.25, 1, 0.25, 0.25, 0.35, 1, 0.4, 0.35, 1, 0.4, 0.4, 0.6, 1, 0.4, 0.6, 1];
    const axGeo = track(new THREE.BufferGeometry());
    axGeo.setAttribute("position", new THREE.Float32BufferAttribute(axPts.flatMap((p) => [p.x, p.y, p.z]), 3));
    axGeo.setAttribute("color", new THREE.Float32BufferAttribute(axCol, 3));
    scene.add(new THREE.LineSegments(axGeo, track(new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 }))));

    /* ---- the lidar point cloud (static, ego-local) --------------------- */
    const MAXP = quality.lidarPoints;
    const pos = new Float32Array(MAXP * 3);
    const col = new Float32Array(MAXP * 3);
    const pha = new Float32Array(MAXP);
    let p = 0;
    const push = (x: number, y: number, z: number) => {
      if (p >= MAXP) return;
      pos[p * 3] = x;
      pos[p * 3 + 1] = y;
      pos[p * 3 + 2] = z;
      const rng = Math.sqrt(x * x + z * z);
      const t = clamp((rng * 0.9 + y * 1.15) / MAX_RANGE, 0, 1);
      jet(t, col, p * 3);
      pha[p] = Math.random() * 6.283;
      p++;
    };
    const shadowDir = -Math.PI / 2;
    const inShadow = (x: number, z: number) => {
      const a = Math.atan2(x, z);
      const d = Math.abs(((a - shadowDir + Math.PI) % (2 * Math.PI)) - Math.PI);
      const rng = Math.hypot(x, z);
      return d < 0.28 && rng > 3 && rng < 16;
    };
    const groundBudget = Math.floor(MAXP * 0.6);
    {
      let r = 2.4;
      let step = 0.42;
      while (r < MAX_RANGE && p < groundBudget) {
        const n = clamp(Math.round((2 * Math.PI * r) / 0.28), 40, 1000);
        for (let k = 0; k < n && p < groundBudget; k++) {
          const a = (k / n) * Math.PI * 2 + (Math.random() - 0.5) * 0.01;
          const rr = r + (Math.random() - 0.5) * 0.12;
          const x = Math.sin(a) * rr;
          const z = Math.cos(a) * rr;
          if (inShadow(x, z)) continue;
          push(x, (Math.random() - 0.5) * 0.06, z);
        }
        r += step;
        step *= 1.045;
      }
    }
    const structBudget = Math.floor(MAXP * 0.82);
    {
      const walls = [
        { x0: -34, z0: 26, x1: 30, z1: 34, h: 12 },
        { x0: -40, z0: -22, x1: -40, z1: 30, h: 9 },
        { x0: 40, z0: -18, x1: 42, z1: 34, h: 10 },
        { x0: -24, z0: -30, x1: 22, z1: -30, h: 7 },
      ];
      for (const w of walls) {
        const len = Math.hypot(w.x1 - w.x0, w.z1 - w.z0);
        const nCols = Math.floor(len / 0.5);
        for (let i = 0; i <= nCols && p < structBudget; i++) {
          const f = i / Math.max(1, nCols);
          const bx = w.x0 + (w.x1 - w.x0) * f + (Math.random() - 0.5) * 1.2;
          const bz = w.z0 + (w.z1 - w.z0) * f + (Math.random() - 0.5) * 1.2;
          const rows = 10 + Math.floor(Math.random() * 8);
          for (let j = 0; j < rows && p < structBudget; j++) push(bx, 0.2 + (j / rows) * w.h * (0.6 + Math.random() * 0.5), bz);
        }
      }
      for (let i = 0; i < 60 && p < structBudget; i++) {
        const a = Math.random() * Math.PI * 2;
        const rr = 18 + Math.random() * 30;
        const bx = Math.sin(a) * rr;
        const bz = Math.cos(a) * rr;
        const clump = 20 + Math.floor(Math.random() * 40);
        const th = 2 + Math.random() * 5;
        for (let j = 0; j < clump && p < structBudget; j++) push(bx + (Math.random() - 0.5) * 1.6, Math.random() * th, bz + (Math.random() - 0.5) * 1.6);
      }
    }
    for (const o of objs) {
      if (p >= MAXP) break;
      const rng = Math.hypot(o.x, o.z);
      const density = clamp(1 - rng / MAX_RANGE, 0.25, 1);
      const c = Math.cos(o.yaw);
      const s = Math.sin(o.yaw);
      const nx = o.x >= 0 ? -1 : 1;
      const nz = o.z >= 0 ? -1 : 1;
      for (let y = 0.05; y < o.h && p < MAXP; y += 0.16) {
        const across = Math.max(3, Math.floor((o.w / 0.14) * density));
        for (let k = 0; k <= across && p < MAXP; k++) {
          const lx = (-0.5 + k / across) * o.w;
          const lz = nz * (o.l / 2);
          push(o.x + lx * c - lz * s + (Math.random() - 0.5) * 0.04, y, o.z + lx * s + lz * c + (Math.random() - 0.5) * 0.04);
        }
        const along = Math.max(4, Math.floor((o.l / 0.16) * density));
        for (let k = 0; k <= along && p < MAXP; k++) {
          const lx = nx * (o.w / 2);
          const lz = (-0.5 + k / along) * o.l;
          push(o.x + lx * c - lz * s + (Math.random() - 0.5) * 0.04, y, o.z + lx * s + lz * c + (Math.random() - 0.5) * 0.04);
        }
      }
    }
    const pointCount = p;
    const lidarGeo = track(new THREE.BufferGeometry());
    lidarGeo.setAttribute("position", new THREE.BufferAttribute(pos.subarray(0, pointCount * 3), 3));
    lidarGeo.setAttribute("aColor", new THREE.BufferAttribute(col.subarray(0, pointCount * 3), 3));
    lidarGeo.setAttribute("aPhase", new THREE.BufferAttribute(pha.subarray(0, pointCount), 1));
    lidarGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), MAX_RANGE * 1.6);
    const lidarMat = track(
      new THREE.ShaderMaterial({
        uniforms: { uSweep: { value: 0 }, uTime: { value: 0 }, uSize: { value: 1.75 }, uDpr: { value: dpr } },
        depthTest: true,
        depthWrite: true,
        vertexShader: `
          attribute vec3 aColor; attribute float aPhase;
          uniform float uSweep; uniform float uTime; uniform float uSize; uniform float uDpr;
          varying vec3 vColor;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mv;
            float ang = atan(position.x, position.z);
            float behind = mod(uSweep - ang, 6.2831853) / 6.2831853;
            float beam = smoothstep(0.45, 0.0, min(behind, 1.0 - behind) * 6.2831853);
            float trail = pow(1.0 - behind, 2.5);
            float tw = 0.05 * sin(uTime * 2.5 + aPhase);
            float b = 0.6 + 0.55 * beam + 0.24 * trail + tw;
            vColor = aColor * b;
            float rng = length(mv.xyz);
            gl_PointSize = uSize * uDpr * (1.0 + 0.35 * beam) * (165.0 / max(4.0, rng));
          }`,
        fragmentShader: `
          varying vec3 vColor;
          void main(){
            vec2 c = gl_PointCoord - 0.5;
            if (dot(c, c) > 0.25) discard;
            gl_FragColor = vec4(vColor, 1.0);
          }`,
      })
    );
    const lidar = new THREE.Points(lidarGeo, lidarMat);
    lidar.frustumCulled = false;
    scene.add(lidar);

    /* ---- ego vehicle (white) ------------------------------------------- */
    const ego = new THREE.Group();
    scene.add(ego);
    const bodyMat = track(new THREE.MeshStandardMaterial({ color: 0xeef3f8, roughness: 0.45, metalness: 0.15 }));
    const glassMat = track(new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.3, metalness: 0.3 }));
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(1.9, 0.7, 4.4)), bodyMat);
    body.position.y = 0.62;
    ego.add(body);
    const cabin = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 0.6, 2.1)), glassMat);
    cabin.position.set(0, 1.15, -0.15);
    ego.add(cabin);
    const wheelGeo = track(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12));
    const wheelMat = track(new THREE.MeshStandardMaterial({ color: 0x05070a, roughness: 0.7 }));
    for (const [wx, wz] of [[-0.92, 1.4], [0.92, 1.4], [-0.92, -1.4], [0.92, -1.4]] as const) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.34, wz);
      ego.add(w);
    }
    scene.add(new THREE.AmbientLight(0x8899bb, 0.9));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
    keyLight.position.set(6, 14, 8);
    scene.add(keyLight);

    /* ---- controls ------------------------------------------------------- */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 10;
    controls.maxDistance = 70;
    controls.minPolarAngle = 0.05;
    controls.maxPolarAngle = 1.42;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.4;
    controls.target.set(0, 1, 2);
    if (coarse) {
      controls.enableRotate = false;
      controls.enableZoom = false;
      renderer.domElement.style.touchAction = "pan-y";
    }

    /* ---- floating object labels (DOM) ---------------------------------- */
    const labelLayer = labelLayerRef?.current ?? null;
    const labelEls: HTMLDivElement[] = [];
    if (labelLayer) {
      for (let i = 0; i < LABELS; i++) {
        const el = document.createElement("div");
        el.style.cssText =
          "position:absolute;left:0;top:0;transform:translate(-9999px,-9999px);" +
          "font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:600;letter-spacing:0.02em;" +
          "white-space:nowrap;pointer-events:none;opacity:0;padding:1px 5px;border-radius:3px;" +
          "background:rgba(4,7,12,0.72);border:1px solid rgba(240,166,58,0.5);color:#f0a63a;" +
          "transition:opacity 0.15s ease;will-change:transform;";
        labelLayer.appendChild(el);
        labelEls.push(el);
      }
    }
    const proj = new THREE.Vector3();
    const nearList: { o: Obj; d: number }[] = [];

    /* ---- run loop ------------------------------------------------------- */
    let raf = 0;
    let running = true;
    let last = -1;
    let sweep = 0;
    let frameId = 0;
    let fpsAcc = 0;
    let fpsFrames = 0;
    let statAcc = 0;
    const frame = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (last < 0) last = now;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      frameId++;
      if (!reduceMotion) sweep = (sweep + dt * 2.6) % (Math.PI * 2);
      lidarMat.uniforms.uSweep.value = sweep;
      lidarMat.uniforms.uTime.value = (now / 1000) % 10000;
      controls.update();
      renderer.render(scene, camera);

      // object labels — nearest N
      if (labelEls.length) {
        const W = mount.clientWidth;
        const H = mount.clientHeight;
        nearList.length = 0;
        for (const o of objs) nearList.push({ o, d: Math.hypot(o.x, o.z) });
        nearList.sort((a, b) => a.d - b.d);
        for (let i = 0; i < labelEls.length; i++) {
          const el = labelEls[i];
          const item = nearList[i];
          if (!item) {
            el.style.opacity = "0";
            continue;
          }
          proj.set(item.o.x, item.o.h + 0.5, item.o.z).project(camera);
          if (proj.z > 1) {
            el.style.opacity = "0";
            continue;
          }
          const sx = (proj.x * 0.5 + 0.5) * W;
          const sy = (-proj.y * 0.5 + 0.5) * H;
          el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -100%)`;
          el.textContent = `${item.o.cls} · ${item.d.toFixed(1)}m · ${item.o.conf.toFixed(2)}`;
          el.style.opacity = "0.92";
        }
      }

      // stats ~3Hz
      fpsAcc += dt;
      fpsFrames++;
      statAcc += dt;
      if (statAcc > 0.33) {
        const fps = fpsFrames / fpsAcc;
        fpsAcc = 0;
        fpsFrames = 0;
        statAcc = 0;
        onStatsRef.current?.({ fps: Math.round(fps), points: pointCount, frame: frameId, tracks: objs.length });
      }
    };
    raf = requestAnimationFrame(frame);

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    const setRunning = (n: boolean) => {
      if (n === running) return;
      running = n;
      if (n) {
        last = -1;
        raf = requestAnimationFrame(frame);
      } else cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(([e]) => setRunning(e.isIntersecting && e.intersectionRatio > 0.02), { threshold: [0, 0.02, 0.2] });
    io.observe(mount);
    const onVis = () => setRunning(!document.hidden);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      controls.dispose();
      for (const el of labelEls) el.remove();
      for (const d of disposables) d.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [quality, labelLayerRef]);

  return <div ref={mountRef} aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />;
}

export default memo(PerceptionCanvas);
