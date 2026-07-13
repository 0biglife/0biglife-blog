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

// Designed range ramp — deep blue → cyan → brand lime, luminance-increasing.
// Replaces a rainbow "jet" map (which reads as a matplotlib default) with a
// restrained, single-family gradient that ties to the site accent (#c9ff4d).
const RAMP: readonly [number, number, number, number][] = [
  [0.0, 0.05, 0.18, 0.4], // deep blue (near ground)
  [0.3, 0.06, 0.42, 0.78], // blue
  [0.58, 0.13, 0.72, 0.8], // cyan-teal
  [0.8, 0.42, 0.92, 0.62], // spring green
  [1.0, 0.82, 1.0, 0.3], // lime accent (far / tall)
];
/** map t in [0,1] to the brand ramp, writing rgb into out[i..i+2] */
function rampColor(t: number, out: Float32Array, i: number) {
  const x = clamp(t, 0, 1);
  let a = RAMP[0];
  let b = RAMP[RAMP.length - 1];
  for (let k = 0; k < RAMP.length - 1; k++) {
    if (x >= RAMP[k][0] && x <= RAMP[k + 1][0]) {
      a = RAMP[k];
      b = RAMP[k + 1];
      break;
    }
  }
  const f = (x - a[0]) / (b[0] - a[0] || 1);
  out[i] = a[1] + (b[1] - a[1]) * f;
  out[i + 1] = a[2] + (b[2] - a[2]) * f;
  out[i + 2] = a[3] + (b[3] - a[3]) * f;
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
      rampColor(t, col, p * 3);
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
      let step = 0.115;
      while (r < MAX_RANGE && p < groundBudget) {
        const n = clamp(Math.round((2 * Math.PI * r) / 0.082), 40, 4000);
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
        const nCols = Math.floor(len / 0.18);
        for (let i = 0; i <= nCols && p < structBudget; i++) {
          const f = i / Math.max(1, nCols);
          const bx = w.x0 + (w.x1 - w.x0) * f + (Math.random() - 0.5) * 1.2;
          const bz = w.z0 + (w.z1 - w.z0) * f + (Math.random() - 0.5) * 1.2;
          const rows = 28 + Math.floor(Math.random() * 22);
          for (let j = 0; j < rows && p < structBudget; j++) push(bx, 0.2 + (j / rows) * w.h * (0.6 + Math.random() * 0.5), bz);
        }
      }
      for (let i = 0; i < 168 && p < structBudget; i++) {
        const a = Math.random() * Math.PI * 2;
        const rr = 18 + Math.random() * 30;
        const bx = Math.sin(a) * rr;
        const bz = Math.cos(a) * rr;
        const clump = 56 + Math.floor(Math.random() * 112);
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
      for (let y = 0.05; y < o.h && p < MAXP; y += 0.057) {
        const across = Math.max(3, Math.floor((o.w / 0.05) * density));
        for (let k = 0; k <= across && p < MAXP; k++) {
          const lx = (-0.5 + k / across) * o.w;
          const lz = nz * (o.l / 2);
          push(o.x + lx * c - lz * s + (Math.random() - 0.5) * 0.04, y, o.z + lx * s + lz * c + (Math.random() - 0.5) * 0.04);
        }
        const along = Math.max(4, Math.floor((o.l / 0.057) * density));
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
        uniforms: { uSweep: { value: 0 }, uTime: { value: 0 }, uSize: { value: 0.56 }, uDpr: { value: dpr } },
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
            gl_PointSize = uSize * uDpr * (1.0 + 0.35 * beam) * (150.0 / max(5.0, rng));
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

    /* ---- ego vehicle — stylized Tesla Model 3/Y ----------------------- */
    const ego = new THREE.Group();
    scene.add(ego);

    const EGO_L = 4.7; // length (along Z after rotate)
    const EGO_W = 2.0; // width  (along X)
    const hEL = EGO_L / 2;

    // pearl-white paint + blacked-out glass canopy
    // near-diffuse white so the paint reads bright under the dim scene (no envMap);
    // a hint of metalness keeps a soft sheen without going dark.
    const paintMat = track(new THREE.MeshStandardMaterial({ color: 0xf7f9fc, roughness: 0.42, metalness: 0.1 }));
    const glassMat = track(new THREE.MeshStandardMaterial({ color: 0x0c1119, roughness: 0.12, metalness: 0.35, transparent: true, opacity: 0.92 }));

    // side profile lives in XY (x = length, y = height); extrude across width, then
    // rotate so length runs along Z and the nose faces +Z (toward the default camera).
    const extrudeAlong = (shape: THREE.Shape, width: number, bevel: number) => {
      const g = track(
        new THREE.ExtrudeGeometry(shape, {
          depth: width,
          bevelEnabled: true,
          bevelThickness: bevel,
          bevelSize: bevel,
          bevelSegments: 3,
          steps: 1,
          curveSegments: 24,
        })
      );
      g.translate(0, 0, -width / 2);
      g.rotateY(-Math.PI / 2);
      return g;
    };

    // lower body (full width, white) — sleek sedan: rounded tail → beltline → long
    // raked hood → rounded nose. Small bevel so the form stays crisp (no balloon).
    const body = new THREE.Shape();
    body.moveTo(-hEL + 0.16, 0.24);
    body.lineTo(-hEL + 0.02, 0.5);
    body.quadraticCurveTo(-hEL + 0.0, 0.78, -hEL + 0.34, 0.9); // rounded tail to beltline
    body.lineTo(1.35, 0.86); // beltline / rear deck → cowl
    body.quadraticCurveTo(2.25, 0.78, hEL - 0.05, 0.5); // long raked hood
    body.quadraticCurveTo(hEL + 0.03, 0.4, hEL - 0.18, 0.24); // rounded nose
    body.closePath();
    ego.add(new THREE.Mesh(extrudeAlong(body, EGO_W, 0.04), paintMat));

    // black lower cladding (rocker trim — a Model Y cue)
    const cladMat = track(new THREE.MeshStandardMaterial({ color: 0x121419, roughness: 0.72 }));
    const rockerGeo = track(new THREE.BoxGeometry(0.05, 0.14, 2.7));
    for (const cx of [-(EGO_W / 2 - 0.02), EGO_W / 2 - 0.02]) {
      const rk = new THREE.Mesh(rockerGeo, cladMat);
      rk.position.set(cx, 0.3, 0);
      ego.add(rk);
    }

    // dark glass greenhouse canopy (narrower → white A/C pillars): rear glass → low
    // cab-forward roof → raked windshield. A separate piece so the glass clearly reads.
    const gh = new THREE.Shape();
    gh.moveTo(-1.25, 0.85);
    gh.quadraticCurveTo(-1.5, 1.05, -0.68, 1.19); // rear glass
    gh.quadraticCurveTo(0.32, 1.29, 1.16, 1.07); // roof crown (low, cab-forward)
    gh.quadraticCurveTo(1.5, 0.97, 1.28, 0.85); // raked windshield
    gh.closePath();
    const roofMesh = new THREE.Mesh(extrudeAlong(gh, EGO_W * 0.88, 0.03), glassMat);
    roofMesh.position.y = 0.015;
    ego.add(roofMesh);

    // signature light bars — slim rear taillight + front headlight accents (emissive)
    const tailMat = track(new THREE.MeshStandardMaterial({ color: 0x2a0603, emissive: new THREE.Color(0xff2f1e), emissiveIntensity: 1.15, roughness: 0.5 }));
    const tail = new THREE.Mesh(track(new THREE.BoxGeometry(EGO_W * 0.84, 0.075, 0.05)), tailMat);
    tail.position.set(0, 0.9, -hEL + 0.16);
    ego.add(tail);
    const headMat = track(new THREE.MeshStandardMaterial({ color: 0x0a1420, emissive: new THREE.Color(0xbfe3ff), emissiveIntensity: 0.85, roughness: 0.5 }));
    const headGeo = track(new THREE.BoxGeometry(0.44, 0.06, 0.05));
    for (const hx of [-0.62, 0.62]) {
      const hl = new THREE.Mesh(headGeo, headMat);
      hl.position.set(hx, 0.66, hEL - 0.2);
      ego.add(hl);
    }

    // side mirrors (body-colored, on the A-pillar)
    const mirrorGeo = track(new THREE.BoxGeometry(0.1, 0.11, 0.17));
    for (const mx of [-(EGO_W / 2 + 0.03), EGO_W / 2 + 0.03]) {
      const m = new THREE.Mesh(mirrorGeo, paintMat);
      m.position.set(mx, 0.98, 1.02);
      m.rotation.y = Math.sign(mx) * 0.2;
      ego.add(m);
    }

    // wheels — dark tire + aero cover face (Model 3/Y turbine look)
    const tireGeo = track(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 30));
    const tireMat = track(new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.88 }));
    const aeroCv = document.createElement("canvas");
    aeroCv.width = aeroCv.height = 256;
    const ac = aeroCv.getContext("2d");
    if (ac) {
      ac.translate(128, 128);
      ac.fillStyle = "#2c3138";
      ac.beginPath();
      ac.arc(0, 0, 126, 0, 7);
      ac.fill(); // tire sidewall face
      ac.fillStyle = "#c9ced5";
      ac.beginPath();
      ac.arc(0, 0, 98, 0, 7);
      ac.fill(); // rim
      for (let s = 0; s < 5; s++) {
        ac.save();
        ac.rotate((s / 5) * Math.PI * 2);
        ac.fillStyle = "#383e46";
        ac.beginPath();
        ac.moveTo(26, 12);
        ac.quadraticCurveTo(80, 34, 70, 82);
        ac.quadraticCurveTo(42, 60, 24, 28);
        ac.closePath();
        ac.fill();
        ac.restore();
      }
      ac.fillStyle = "#e7eaef";
      ac.beginPath();
      ac.arc(0, 0, 30, 0, 7);
      ac.fill(); // hub cap
      ac.fillStyle = "#1b1e24";
      ac.beginPath();
      ac.arc(0, 0, 12, 0, 7);
      ac.fill();
    }
    const aeroMat = track(new THREE.MeshStandardMaterial({ map: track(new THREE.CanvasTexture(aeroCv)), roughness: 0.42, metalness: 0.5 }));
    const aeroGeo = track(new THREE.CircleGeometry(0.4, 32));
    for (const [wx, wz] of [[-EGO_W / 2 + 0.03, 1.5], [EGO_W / 2 - 0.03, 1.5], [-EGO_W / 2 + 0.03, -1.5], [EGO_W / 2 - 0.03, -1.5]] as const) {
      const t = new THREE.Mesh(tireGeo, tireMat);
      t.rotation.z = Math.PI / 2;
      t.position.set(wx, 0.42, wz);
      ego.add(t);
      const face = new THREE.Mesh(aeroGeo, aeroMat);
      face.position.set(wx + Math.sign(wx) * 0.152, 0.42, wz);
      face.rotation.y = Math.sign(wx) * (Math.PI / 2);
      ego.add(face);
    }

    // soft contact shadow (radial-alpha decal on the ground)
    {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 128;
      const g2 = cv.getContext("2d");
      if (g2) {
        const grd = g2.createRadialGradient(64, 64, 6, 64, 64, 62);
        grd.addColorStop(0, "rgba(0,0,0,0.5)");
        grd.addColorStop(1, "rgba(0,0,0,0)");
        g2.fillStyle = grd;
        g2.fillRect(0, 0, 128, 128);
      }
      const shMat = track(new THREE.MeshBasicMaterial({ map: track(new THREE.CanvasTexture(cv)), transparent: true, depthWrite: false }));
      const sh = new THREE.Mesh(track(new THREE.PlaneGeometry(EGO_W * 1.9, EGO_L * 1.05)), shMat);
      sh.rotation.x = -Math.PI / 2;
      sh.position.y = 0.03;
      ego.add(sh);
    }

    scene.add(new THREE.AmbientLight(0x8ea0c4, 1.0));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.25);
    keyLight.position.set(6, 14, 8);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xaec2e6, 0.6);
    fillLight.position.set(-8, 6, -7);
    scene.add(fillLight);

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
