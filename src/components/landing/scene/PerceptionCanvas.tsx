"use client";

import { memo, useEffect, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SceneSim } from "./simulation";
import {
  ACCENT,
  Agent,
  AgentType,
  BG,
  CLASS_COLOR,
  DriveInput,
  LANE_W,
  RANGE_BACK,
  RANGE_FRONT,
  ROAD_HALF,
  SceneQuality,
  Telemetry,
} from "./sceneTypes";

type Props = {
  quality: SceneQuality;
  /** current interaction mode, read live from a ref inside the loop */
  modeRef: MutableRefObject<"replay" | "drive">;
  /** live drive input, mutated by the on-screen / keyboard controls */
  inputRef: MutableRefObject<DriveInput>;
  /** absolutely-positioned overlay that the renderer fills with floating labels */
  labelLayerRef: RefObject<HTMLDivElement | null>;
  onTelemetry?: (t: Telemetry) => void;
};

const LABEL_COUNT = 8;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const shortType: Record<AgentType, string> = {
  car: "car",
  truck: "truck",
  pedestrian: "ped",
  cyclist: "cyc",
};

function PerceptionCanvas({
  quality,
  modeRef,
  inputRef,
  labelLayerRef,
  onTelemetry,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onTelRef = useRef(onTelemetry);
  onTelRef.current = onTelemetry;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---- renderer (bail gracefully if WebGL is unavailable) ------------- */
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }
    const initW = mount.clientWidth || 1;
    const initH = mount.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(initW, initH);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.FogExp2(BG, 0.017);

    const camera = new THREE.PerspectiveCamera(50, initW / initH, 0.1, 300);
    camera.position.set(12, 7.5, -14);

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(o: T): T => {
      disposables.push(o);
      return o;
    };

    /* ---- lighting ----------------------------------------------------- */
    scene.add(new THREE.AmbientLight(0x35506a, 0.7));
    const key = new THREE.DirectionalLight(0xbfe6ff, 0.85);
    key.position.set(10, 26, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x1f3aff, 0.4);
    rim.position.set(-18, 8, -22);
    scene.add(rim);

    /* ---- ground + road ------------------------------------------------ */
    const groundMat = track(
      new THREE.MeshStandardMaterial({ color: 0x04060a, roughness: 0.95, metalness: 0 })
    );
    const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(240, 260)), groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    scene.add(ground);

    const roadMat = track(
      new THREE.MeshStandardMaterial({ color: 0x0b1016, roughness: 0.85, metalness: 0.05 })
    );
    const road = new THREE.Mesh(
      track(new THREE.PlaneGeometry(ROAD_HALF * 2 + 3, RANGE_FRONT + RANGE_BACK + 40)),
      roadMat
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.01, (RANGE_FRONT - RANGE_BACK) / 2);
    scene.add(road);

    // solid edge lines
    const edgeMat = track(
      new THREE.MeshBasicMaterial({ color: 0x9fb2c4, transparent: true, opacity: 0.4 })
    );
    const edgeGeo = track(new THREE.BoxGeometry(0.16, 0.02, RANGE_FRONT + RANGE_BACK + 40));
    for (const sx of [-ROAD_HALF, ROAD_HALF]) {
      const m = new THREE.Mesh(edgeGeo, edgeMat);
      m.position.set(sx, 0.01, (RANGE_FRONT - RANGE_BACK) / 2);
      scene.add(m);
    }

    // dashed lane boundary markings (scroll with roadS)
    const DASH_PITCH = 6;
    const DASH_LEN = 3;
    const dashZ0 = -RANGE_BACK - 6;
    const dashZ1 = RANGE_FRONT + 6;
    const perLine = Math.ceil((dashZ1 - dashZ0) / DASH_PITCH);
    const dashLines = [-LANE_W / 2, LANE_W / 2];
    const dashCount = dashLines.length * perLine;
    const dashMat = track(
      new THREE.MeshBasicMaterial({ color: 0xdfe8ef, transparent: true, opacity: 0.5 })
    );
    const dashGeo = track(new THREE.BoxGeometry(0.16, 0.02, DASH_LEN));
    const dashMesh = new THREE.InstancedMesh(dashGeo, dashMat, dashCount);
    dashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    dashMesh.frustumCulled = false;
    scene.add(dashMesh);
    disposables.push(dashMesh); // InstancedMesh.dispose() frees the instance buffers
    const dashBaseZ = new Float32Array(dashCount);
    const dashX = new Float32Array(dashCount);
    {
      let di = 0;
      for (const lx of dashLines) {
        for (let k = 0; k < perLine; k++) {
          dashBaseZ[di] = dashZ0 + k * DASH_PITCH;
          dashX[di] = lx;
          di++;
        }
      }
    }

    /* ---- sensor range rings (centered on ego) ------------------------- */
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);
    const ringMat = track(
      new THREE.LineBasicMaterial({ color: 0x2f6f63, transparent: true, opacity: 0.32 })
    );
    for (const r of [10, 20, 30, 40]) {
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, 0.015, Math.sin(a) * r));
      }
      const g = track(new THREE.BufferGeometry().setFromPoints(pts));
      ringGroup.add(new THREE.Line(g, ringMat));
    }
    // The rotating lidar "sweep" is rendered by the point-cloud shader itself
    // (a beam of brightness circling the cloud) — see uSweep below.

    /* ---- ego vehicle -------------------------------------------------- */
    const ego = new THREE.Group();
    scene.add(ego);
    const egoBodyMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x0c1a12,
        emissive: new THREE.Color(ACCENT),
        emissiveIntensity: 0.16,
        roughness: 0.4,
        metalness: 0.3,
      })
    );
    const egoBody = new THREE.Mesh(track(new THREE.BoxGeometry(1.9, 0.62, 4.5)), egoBodyMat);
    egoBody.position.y = 0.62;
    ego.add(egoBody);
    const egoCabin = new THREE.Mesh(track(new THREE.BoxGeometry(1.68, 0.6, 2.2)), egoBodyMat);
    egoCabin.position.set(0, 1.12, -0.2);
    ego.add(egoCabin);
    const egoEdgeMat = track(new THREE.LineBasicMaterial({ color: new THREE.Color(ACCENT) }));
    const egoOutline = new THREE.LineSegments(
      track(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.92, 1.5, 4.52))),
      egoEdgeMat
    );
    egoOutline.position.y = 0.75;
    ego.add(egoOutline);
    const wheelGeo = track(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 12));
    const wheelMat = track(new THREE.MeshStandardMaterial({ color: 0x05080a, roughness: 0.7 }));
    for (const [wx, wz] of [
      [-0.95, 1.45],
      [0.95, 1.45],
      [-0.95, -1.45],
      [0.95, -1.45],
    ] as const) {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.36, wz);
      ego.add(w);
    }
    // soft ego glow — a radial-gradient pool of light (soft-edged, not a disc)
    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = glowCanvas.height = 128;
    const gctx = glowCanvas.getContext("2d");
    if (gctx) {
      const grd = gctx.createRadialGradient(64, 64, 3, 64, 64, 64);
      grd.addColorStop(0, "rgba(200,255,94,0.34)");
      grd.addColorStop(0.35, "rgba(200,255,94,0.1)");
      grd.addColorStop(1, "rgba(200,255,94,0)");
      gctx.fillStyle = grd;
      gctx.fillRect(0, 0, 128, 128);
    }
    const glowTex = track(new THREE.CanvasTexture(glowCanvas));
    glowTex.colorSpace = THREE.SRGBColorSpace;
    const glowMat = track(
      new THREE.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const glow = new THREE.Mesh(track(new THREE.PlaneGeometry(9, 9)), glowMat);
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.03;
    ego.add(glow);

    /* ---- agent box pool ---------------------------------------------- */
    interface Slot {
      root: THREE.Group;
      box: THREE.Group;
      lineMat: THREE.LineBasicMaterial;
      fillMat: THREE.MeshBasicMaterial;
      velMat: THREE.LineBasicMaterial;
      velPos: Float32Array;
      velGeo: THREE.BufferGeometry;
    }
    const boxEdgeGeo = track(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)));
    const boxFillGeo = track(new THREE.BoxGeometry(1, 1, 1));
    const poolSize = quality.maxAgents + 4;
    const pool: Slot[] = [];
    const free: Slot[] = [];
    const byId = new Map<number, Slot>();
    for (let i = 0; i < poolSize; i++) {
      const root = new THREE.Group();
      root.visible = false;
      const box = new THREE.Group();
      const lineMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0 });
      const fillMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      box.add(new THREE.LineSegments(boxEdgeGeo, lineMat));
      box.add(new THREE.Mesh(boxFillGeo, fillMat));
      root.add(box);
      const velMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0 });
      const velPos = new Float32Array(6);
      const velGeo = new THREE.BufferGeometry();
      velGeo.setAttribute("position", new THREE.BufferAttribute(velPos, 3));
      root.add(new THREE.Line(velGeo, velMat));
      scene.add(root);
      const slot: Slot = { root, box, lineMat, fillMat, velMat, velPos, velGeo };
      pool.push(slot);
      free.push(slot);
    }

    /* ---- planned-trajectory ribbon ----------------------------------- */
    const PN = 21; // must match sim planner sample count
    const ribbonPos = new Float32Array(PN * 2 * 3);
    const ribbonUv = new Float32Array(PN * 2 * 2);
    const ribbonIdx: number[] = [];
    for (let i = 0; i < PN; i++) {
      ribbonUv[(i * 2) * 2 + 0] = 0;
      ribbonUv[(i * 2) * 2 + 1] = i / (PN - 1);
      ribbonUv[(i * 2 + 1) * 2 + 0] = 1;
      ribbonUv[(i * 2 + 1) * 2 + 1] = i / (PN - 1);
      if (i < PN - 1) {
        const a = i * 2;
        ribbonIdx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const ribbonGeo = track(new THREE.BufferGeometry());
    ribbonGeo.setAttribute("position", new THREE.BufferAttribute(ribbonPos, 3));
    ribbonGeo.setAttribute("uv", new THREE.BufferAttribute(ribbonUv, 2));
    ribbonGeo.setIndex(ribbonIdx);
    const ribbonMat = track(
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(ACCENT) } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        vertexShader: `varying float vY; void main(){ vY = uv.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `uniform float uTime; uniform vec3 uColor; varying float vY;
          void main(){
            float flow = 0.5 + 0.5*sin(vY*22.0 - uTime*5.0);
            float edge = smoothstep(1.0, 0.12, vY);
            float a = edge*(0.26 + 0.5*flow);
            gl_FragColor = vec4(uColor, a);
          }`,
      })
    );
    const ribbon = new THREE.Mesh(ribbonGeo, ribbonMat);
    ribbon.frustumCulled = false;
    scene.add(ribbon);

    /* ---- lidar point cloud ------------------------------------------- */
    const MAXP = quality.lidarPoints;
    const lidarPos = new Float32Array(MAXP * 3);
    const lidarCol = new Float32Array(MAXP * 3);
    const lidarGeo = track(new THREE.BufferGeometry());
    lidarGeo.setAttribute("position", new THREE.BufferAttribute(lidarPos, 3).setUsage(THREE.DynamicDrawUsage));
    lidarGeo.setAttribute("aColor", new THREE.BufferAttribute(lidarCol, 3).setUsage(THREE.DynamicDrawUsage));
    lidarGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);
    const lidarMat = track(
      new THREE.ShaderMaterial({
        uniforms: {
          uSweep: { value: 0 },
          uEgoX: { value: 0 },
          uSize: { value: 2.1 },
          uDpr: { value: dpr },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `
          attribute vec3 aColor; uniform float uSweep; uniform float uEgoX; uniform float uSize; uniform float uDpr;
          varying vec3 vColor;
          void main(){
            vec4 mv = modelViewMatrix * vec4(position,1.0);
            gl_Position = projectionMatrix * mv;
            float ang = atan(position.x - uEgoX, position.z);
            float d = abs(mod(ang - uSweep + 3.14159265, 6.2831853) - 3.14159265);
            float beam = smoothstep(0.6, 0.0, d);
            float trail = smoothstep(2.4, 0.0, mod(uSweep - ang + 6.2831853, 6.2831853));
            float b = 0.42 + 1.5*beam + 0.22*trail;
            float dist = length(vec2(position.x - uEgoX, position.z));
            float fade = 1.0 - smoothstep(30.0, 52.0, dist);
            vColor = aColor * b * fade;
            gl_PointSize = uSize * uDpr * (1.0 + 1.6*beam) * (62.0 / max(1.0, -mv.z));
          }`,
        fragmentShader: `
          varying vec3 vColor;
          void main(){
            vec2 c = gl_PointCoord - 0.5;
            float r = dot(c,c);
            if(r > 0.25) discard;
            float a = smoothstep(0.25, 0.0, r);
            gl_FragColor = vec4(vColor, a);
          }`,
      })
    );
    const lidar = new THREE.Points(lidarGeo, lidarMat);
    lidar.frustumCulled = false;
    scene.add(lidar);

    /* ---- controls ----------------------------------------------------- */
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 12;
    controls.maxDistance = 46;
    controls.minPolarAngle = 0.32;
    controls.maxPolarAngle = 1.46;
    controls.autoRotate = !reduceMotion;
    controls.autoRotateSpeed = 0.35;
    controls.target.set(0, 1.2, 9);

    // On touch devices OrbitControls forces `touch-action: none`, which traps
    // one-finger vertical swipes and stops visitors scrolling down to the works
    // gallery. Give the page its scroll back: drop touch rotate/zoom (the scene
    // still auto-rotates, and "take control" still drives), keep mouse orbit.
    const coarsePointer =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: coarse)").matches;
    if (coarsePointer) {
      controls.enableRotate = false;
      controls.enableZoom = false;
      renderer.domElement.style.touchAction = "pan-y";
    }

    /* ---- post-processing (subtle bloom, optional) --------------------- */
    let composer: EffectComposer | null = null;
    let bloom: UnrealBloomPass | null = null;
    if (quality.bloom) {
      composer = new EffectComposer(renderer);
      composer.setPixelRatio(Math.min(dpr, 1.5));
      composer.setSize(initW, initH);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(initW, initH), 0.55, 0.5, 0.72);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
    }

    /* ---- simulation --------------------------------------------------- */
    const sim = new SceneSim(0x51a2c3, quality.maxAgents);

    /* ---- floating labels (DOM, owned by the renderer) ----------------- */
    const labelLayer = labelLayerRef.current;
    const labelEls: HTMLDivElement[] = [];
    if (labelLayer) {
      for (let i = 0; i < LABEL_COUNT; i++) {
        const el = document.createElement("div");
        el.style.cssText =
          "position:absolute;left:0;top:0;transform:translate(-9999px,-9999px);" +
          "font-family:'JetBrains Mono',monospace;font-size:10.5px;font-weight:600;" +
          "letter-spacing:0.02em;white-space:nowrap;pointer-events:none;opacity:0;" +
          "padding:2px 6px;border-radius:5px;background:rgba(5,9,12,0.78);" +
          "border:1px solid rgba(255,255,255,0.14);transition:opacity 0.18s ease;" +
          "will-change:transform;backdrop-filter:blur(2px);";
        labelLayer.appendChild(el);
        labelEls.push(el);
      }
    }

    /* ---- reusable temporaries ---------------------------------------- */
    const dummy = new THREE.Object3D();
    const proj = new THREE.Vector3();
    const chasePos = new THREE.Vector3();
    const chaseTgt = new THREE.Vector3();
    const nearList: { a: Agent; dist: number }[] = [];
    const usedIds = new Set<number>(); // reused each frame — no per-frame alloc

    const heightColor = (y: number, out: [number, number, number]) => {
      const t = clamp(y / 3.2, 0, 1);
      if (t < 0.5) {
        const k = t / 0.5; // teal -> cyan
        out[0] = 0.05 + (0.18 - 0.05) * k;
        out[1] = 0.32 + (0.7 - 0.32) * k;
        out[2] = 0.3 + (0.85 - 0.3) * k;
      } else {
        const k = (t - 0.5) / 0.5; // cyan -> lime
        out[0] = 0.18 + (0.72 - 0.18) * k;
        out[1] = 0.7 + (0.95 - 0.7) * k;
        out[2] = 0.85 + (0.35 - 0.85) * k;
      }
    };
    const tmpC: [number, number, number] = [0, 0, 0];

    // The lidar cloud's ground scan + roadside returns are generated ONCE in
    // ego-local space. The whole Points object is translated to the ego each
    // frame, so the ground is stable (no shimmer) and free to render; only the
    // agent-surface points are rewritten per frame. uEgoX stays 0 because the
    // geometry is already ego-local.
    const BASE_COUNT = Math.min(MAXP - 400, Math.floor(MAXP * 0.72));
    {
      let i = 0;
      const nGround = Math.floor(BASE_COUNT * 0.85);
      for (; i < nGround; i++) {
        const r = Math.sqrt(Math.random()) * 48;
        const a = Math.random() * Math.PI * 2;
        lidarPos[i * 3] = Math.sin(a) * r;
        lidarPos[i * 3 + 1] = Math.random() * 0.05;
        lidarPos[i * 3 + 2] = Math.cos(a) * r;
      }
      for (; i < BASE_COUNT; i++) {
        const side = Math.random() < 0.5 ? -1 : 1;
        lidarPos[i * 3] = side * (ROAD_HALF + 1.5 + Math.random() * 4);
        lidarPos[i * 3 + 1] = Math.random() * 4.2;
        lidarPos[i * 3 + 2] = -RANGE_BACK + Math.random() * (RANGE_FRONT + RANGE_BACK);
      }
      for (let j = 0; j < BASE_COUNT; j++) {
        heightColor(lidarPos[j * 3 + 1], tmpC);
        lidarCol[j * 3] = tmpC[0];
        lidarCol[j * 3 + 1] = tmpC[1];
        lidarCol[j * 3 + 2] = tmpC[2];
      }
      lidarGeo.attributes.position.needsUpdate = true;
      (lidarGeo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    }
    lidarMat.uniforms.uEgoX.value = 0;

    // rewrite only agent-surface points; returns the live total point count
    const updateLidarAgents = (): number => {
      const egoX = sim.ego.x;
      let p = BASE_COUNT;
      for (const ag of sim.agents) {
        if (p >= MAXP) break;
        const area = ag.w * ag.l;
        const n = Math.min(46, Math.max(6, Math.floor(area * 2.2)));
        for (let i = 0; i < n && p < MAXP; i++) {
          const y = Math.random() * ag.h;
          lidarPos[p * 3] = ag.x - egoX + (Math.random() - 0.5) * ag.w;
          lidarPos[p * 3 + 1] = y;
          lidarPos[p * 3 + 2] = ag.z + (Math.random() - 0.5) * ag.l;
          heightColor(y, tmpC);
          lidarCol[p * 3] = tmpC[0];
          lidarCol[p * 3 + 1] = tmpC[1];
          lidarCol[p * 3 + 2] = tmpC[2];
          p++;
        }
      }
      return p;
    };

    /* ---- run loop ----------------------------------------------------- */
    let raf = 0;
    let running = true;
    let last = -1;
    let sweepAng = 0;
    let telAcc = 0;
    let lidarFrame = 0;
    let lidarCountLive = 0;

    const frame = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (last < 0) last = now;
      let dt = (now - last) / 1000;
      last = now;
      dt = Math.min(dt, 0.05);
      const drive = modeRef.current === "drive";
      const simDt = reduceMotion ? dt * 0.28 : dt;
      sim.step(simDt, drive ? inputRef.current : null);
      const f = sim.frameId;
      const egoX = sim.ego.x;

      // ego transform
      ego.position.set(egoX, 0, 0);
      ego.rotation.y = sim.ego.heading;
      ringGroup.position.x = egoX;

      // lane dashes scroll
      const off = sim.roadS % DASH_PITCH;
      for (let i = 0; i < dashCount; i++) {
        let z = dashBaseZ[i] - off;
        if (z < dashZ0) z += perLine * DASH_PITCH;
        dummy.position.set(dashX[i], 0.01, z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        dashMesh.setMatrixAt(i, dummy.matrix);
      }
      dashMesh.instanceMatrix.needsUpdate = true;

      // lidar sweep angle (drives the beam of brightness in the point shader)
      if (!reduceMotion) sweepAng = (sweepAng + dt * 5.0) % (Math.PI * 2);
      lidarMat.uniforms.uSweep.value = sweepAng;
      lidar.position.x = egoX; // cloud is ego-local; slide it to the ego
      ribbonMat.uniforms.uTime.value = sim.time;

      // agents -> pool
      usedIds.clear();
      for (const a of sim.agents) {
        let slot = byId.get(a.id);
        if (!slot) {
          slot = free.pop();
          if (!slot) continue;
          byId.set(a.id, slot);
        }
        usedIds.add(a.id);
        slot.root.visible = true;
        slot.root.position.set(a.x, 0, a.z);
        slot.box.rotation.y = a.heading;
        slot.box.position.y = a.h / 2;
        slot.box.scale.set(a.w, a.h, a.l);
        const col = CLASS_COLOR[a.type];
        slot.lineMat.color.set(col);
        slot.fillMat.color.set(col);
        slot.velMat.color.set(col);
        const edgeFade =
          a.z > RANGE_FRONT - 12
            ? clamp((RANGE_FRONT - a.z) / 12, 0, 1)
            : a.z < -RANGE_BACK + 8
            ? clamp((a.z + RANGE_BACK) / 8, 0, 1)
            : 1;
        const fade = clamp(a.trackAge / 8, 0, 1) * edgeFade;
        slot.lineMat.opacity = 0.92 * fade;
        slot.fillMat.opacity = 0.08 * fade;
        slot.velMat.opacity = 0.55 * fade;
        // velocity vector (absolute motion), root-local unrotated frame
        const k = 0.55;
        slot.velPos[0] = 0;
        slot.velPos[1] = a.h * 0.5;
        slot.velPos[2] = 0;
        slot.velPos[3] = a.vx * k;
        slot.velPos[4] = a.h * 0.5;
        slot.velPos[5] = Math.max(0, a.vzAbs) * k;
        slot.velGeo.attributes.position.needsUpdate = true;
      }
      for (const [id, slot] of byId) {
        if (!usedIds.has(id)) {
          byId.delete(id);
          slot.root.visible = false;
          free.push(slot);
        }
      }

      // trajectory ribbon geometry
      const path = sim.ego.plannedPath;
      const HW = 0.32;
      for (let i = 0; i < PN; i++) {
        const cur = path[Math.min(i, path.length - 1)];
        const nxt = path[Math.min(i + 1, path.length - 1)];
        let dx = nxt.x - cur.x;
        let dz = nxt.z - cur.z;
        const len = Math.hypot(dx, dz) || 1;
        dx /= len;
        dz /= len;
        const px = -dz;
        const pz = dx; // perpendicular
        const li = i * 2 * 3;
        ribbonPos[li] = cur.x + px * HW;
        ribbonPos[li + 1] = 0.07;
        ribbonPos[li + 2] = cur.z + pz * HW;
        ribbonPos[li + 3] = cur.x - px * HW;
        ribbonPos[li + 4] = 0.07;
        ribbonPos[li + 5] = cur.z - pz * HW;
      }
      ribbonGeo.attributes.position.needsUpdate = true;

      // lidar — only the agent-surface slice is rewritten (throttled by stride),
      // and only that slice is re-uploaded to the GPU (the ground base is static)
      if (lidarFrame % quality.lidarStride === 0) {
        lidarCountLive = updateLidarAgents();
        lidarGeo.setDrawRange(0, lidarCountLive);
        const agentFloats = (lidarCountLive - BASE_COUNT) * 3;
        if (agentFloats > 0) {
          const posAttr = lidarGeo.attributes.position as THREE.BufferAttribute;
          const colAttr = lidarGeo.attributes.aColor as THREE.BufferAttribute;
          posAttr.addUpdateRange(BASE_COUNT * 3, agentFloats);
          posAttr.needsUpdate = true;
          colAttr.addUpdateRange(BASE_COUNT * 3, agentFloats);
          colAttr.needsUpdate = true;
        }
      }
      lidarFrame++;

      // camera
      if (drive) {
        controls.autoRotate = false;
        controls.enabled = false;
        const steer = inputRef.current.steer;
        chasePos.set(egoX * 0.7 - steer * 1.6, 3.5, -10.5);
        chaseTgt.set(egoX + steer * 3, 1.3, 22);
        camera.position.lerp(chasePos, 1 - Math.pow(0.02, dt));
        controls.target.lerp(chaseTgt, 1 - Math.pow(0.02, dt));
        camera.lookAt(controls.target);
      } else {
        if (!controls.enabled) {
          controls.enabled = true;
          controls.autoRotate = !reduceMotion;
        }
        // ease the orbit target back to the default look-ahead after driving
        const tk = 1 - Math.pow(0.06, dt);
        controls.target.x += (0 - controls.target.x) * tk;
        controls.target.z += (9 - controls.target.z) * tk;
        controls.target.y = 1.2;
        controls.update();
      }

      // labels — nearest N agents
      if (labelEls.length) {
        const W = mount.clientWidth;
        const H = mount.clientHeight;
        nearList.length = 0;
        for (const a of sim.agents) {
          if (a.z < -6) continue;
          nearList.push({ a, dist: Math.hypot(a.x - egoX, a.z) });
        }
        nearList.sort((u, v) => u.dist - v.dist);
        for (let i = 0; i < labelEls.length; i++) {
          const el = labelEls[i];
          const item = nearList[i];
          if (!item || item.dist > 62) {
            el.style.opacity = "0";
            continue;
          }
          const a = item.a;
          proj.set(a.x, a.h + 0.7, a.z).project(camera);
          if (proj.z > 1) {
            el.style.opacity = "0";
            continue;
          }
          const sx = (proj.x * 0.5 + 0.5) * W;
          const sy = (-proj.y * 0.5 + 0.5) * H;
          el.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -100%)`;
          el.style.color = CLASS_COLOR[a.type];
          el.textContent = `${shortType[a.type]}#${a.id} · ${Math.round(item.dist)}m`;
          el.style.opacity = "0.92";
        }
      }

      // telemetry (throttled ~8Hz)
      telAcc += dt;
      if (telAcc > 0.12 && onTelRef.current) {
        telAcc = 0;
        onTelRef.current({
          frameId: f,
          speedKmh: Math.round(sim.ego.speed * 3.6),
          trackCount: sim.agents.length,
          sensorHz: 10,
          lidarPoints: lidarCountLive,
          nearestDist: sim.nearestDist(),
          mode: drive ? "drive" : "replay",
        });
      }

      if (composer) composer.render();
      else renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(frame);

    /* ---- resize ------------------------------------------------------- */
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
      bloom?.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    /* ---- pause offscreen / hidden ------------------------------------ */
    const setRunning = (next: boolean) => {
      if (next === running) return;
      running = next;
      if (next) {
        last = -1;
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    };
    const io = new IntersectionObserver(
      ([e]) => setRunning(e.isIntersecting && e.intersectionRatio > 0.04),
      { threshold: [0, 0.04, 0.2] }
    );
    io.observe(mount);
    const onVis = () => setRunning(!document.hidden);
    document.addEventListener("visibilitychange", onVis);

    /* ---- cleanup ------------------------------------------------------ */
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      controls.dispose();
      for (const el of labelEls) el.remove();
      for (const slot of pool) {
        slot.lineMat.dispose();
        slot.fillMat.dispose();
        slot.velMat.dispose();
        slot.velGeo.dispose();
      }
      for (const d of disposables) d.dispose();
      bloom?.dispose();
      composer?.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quality]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}

// props are stable refs/callbacks — never re-render from the parent's state churn
export default memo(PerceptionCanvas);
