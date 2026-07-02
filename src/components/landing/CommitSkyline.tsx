"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { ContributionData, ContributionDay } from "@/lib/contributions";

export type HoverInfo = {
  date: string;
  count: number;
  /** screen px within the container */
  x: number;
  y: number;
} | null;

type Props = {
  data: ContributionData;
  onHover?: (info: HoverInfo) => void;
  /** fired once the intro animation finishes (used to sync the count-up) */
  onReady?: () => void;
};

/* ----------------------------------------------------------------------------
 * Visual tuning constants
 * ------------------------------------------------------------------------- */
const CELL = 1; // pillar footprint
const PITCH = 1.22; // cell-to-cell spacing (gap = PITCH - CELL)
const DORMANT_H = 0.06; // height of a 0-contribution tile (the "grass" floor)
const BASE_H = 0.22; // floor for any active day
const MAX_H = 6.2; // height of the busiest day
const BG = 0x05070a;
const INTRO_MS = 2300;
const GROUP_YAW = -0.52; // rotate the long ridge so it recedes diagonally

// Phosphor-green ramp (dark → hot). Interpolated in linear space.
const RAMP: { stop: number; color: THREE.Color }[] = [
  { stop: 0.0, color: new THREE.Color("#0c3a24") },
  { stop: 0.45, color: new THREE.Color("#1f9d57") },
  { stop: 0.75, color: new THREE.Color("#56e06a") },
  { stop: 1.0, color: new THREE.Color("#c8ff5e") },
];
const DORMANT_COLOR = new THREE.Color("#0a1812");

function rampColor(t: number, out: THREE.Color): THREE.Color {
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < RAMP.length; i++) {
    if (x <= RAMP[i].stop) {
      const a = RAMP[i - 1];
      const b = RAMP[i];
      const k = (x - a.stop) / (b.stop - a.stop || 1);
      return out.copy(a.color).lerp(b.color, k);
    }
  }
  return out.copy(RAMP[RAMP.length - 1].color);
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function CommitSkyline({ data, onHover, onReady }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  // keep latest callbacks without re-running the heavy effect
  const onHoverRef = useRef(onHover);
  const onReadyRef = useRef(onReady);
  onHoverRef.current = onHover;
  onReadyRef.current = onReady;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const cols = data.weeks.length;
    const rows = 7;
    const count = data.weeks.reduce((n, w) => n + w.length, 0);
    const maxCount = Math.max(1, data.maxCount);
    const logMax = Math.log1p(maxCount);

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
      onReadyRef.current?.();
      return;
    }
    const initW = mount.clientWidth || 1;
    const initH = mount.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.85));
    renderer.setSize(initW, initH);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.display = "block";

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.FogExp2(BG, 0.0125);

    const camera = new THREE.PerspectiveCamera(46, initW / initH, 0.1, 400);

    /* ---- grid group (rotated so the ridge recedes diagonally) ---------- */
    const group = new THREE.Group();
    group.rotation.y = GROUP_YAW;
    scene.add(group);

    const totalW = cols * PITCH;
    const totalD = rows * PITCH;

    // ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(totalW * 3, totalD * 6),
      new THREE.MeshStandardMaterial({
        color: 0x04060a,
        roughness: 0.92,
        metalness: 0.0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    group.add(ground);

    // pillars — one InstancedMesh, base sitting on the ground (y=0)
    const geo = new THREE.BoxGeometry(CELL, 1, CELL);
    geo.translate(0, 0.5, 0); // pivot at base so scale.y grows upward

    const material = new THREE.MeshStandardMaterial({
      roughness: 0.42,
      metalness: 0.08,
    });
    // self-illumination for hot cells so bloom catches them (graceful if the
    // GLSL injection ever fails — the scene still renders, just flatter).
    material.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
         #ifdef USE_INSTANCING_COLOR
           totalEmissiveRadiance += vColor.rgb * vColor.rgb * 1.45;
         #endif`
      );
    };

    const mesh = new THREE.InstancedMesh(geo, material, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    group.add(mesh);

    // per-instance precomputed data. Instances are laid out by iterating the
    // nested weeks (not a 7-packed flat array) so partial first/last weeks
    // never shift the date↔pillar mapping; the row comes from the weekday.
    const targetH = new Float32Array(count);
    const baseX = new Float32Array(count);
    const baseZ = new Float32Array(count);
    const colOf = new Int16Array(count); // owning week index (for intro stagger)
    const dayRef: ContributionDay[] = []; // instance id -> day (for hover)
    const baseColors: THREE.Color[] = [];
    const tmpColor = new THREE.Color();
    const dummy = new THREE.Object3D();

    let idx = 0;
    for (let wi = 0; wi < cols; wi++) {
      const week = data.weeks[wi];
      for (let di = 0; di < week.length; di++) {
        const day = week[di];
        const c = day.c;
        const t = c > 0 ? Math.log1p(c) / logMax : 0;
        targetH[idx] = c > 0 ? BASE_H + t * MAX_H : DORMANT_H;
        baseX[idx] = wi * PITCH - totalW / 2 + PITCH / 2;
        baseZ[idx] = day.w * PITCH - totalD / 2 + PITCH / 2;
        colOf[idx] = wi;
        dayRef[idx] = day;
        const col = c > 0 ? rampColor(t, new THREE.Color()) : DORMANT_COLOR.clone();
        baseColors.push(col);
        mesh.setColorAt(idx, col);
        idx++;
      }
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

    const writeMatrices = (revealOf: (wi: number) => number) => {
      for (let i = 0; i < count; i++) {
        const reveal = revealOf(colOf[i]);
        const h = Math.max(0.0001, targetH[i] * reveal);
        dummy.position.set(baseX[i], 0, baseZ[i]);
        dummy.scale.set(1, h, 1);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    };
    writeMatrices(() => (reduceMotion ? 1 : 0));

    /* ---- lighting ----------------------------------------------------- */
    scene.add(new THREE.AmbientLight(0x2a3b4a, 0.55));
    const key = new THREE.DirectionalLight(0xbfffe0, 0.9);
    key.position.set(14, 30, 18);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x2348ff, 0.45);
    rim.position.set(-22, 10, -20);
    scene.add(rim);

    /* ---- camera framing ----------------------------------------------- */
    const target = new THREE.Vector3(0, 2.8, 0);
    const camRadius = Math.max(30, totalW * 0.5);
    const camBaseY = 12.5;
    const baseAzimuth = -0.16;
    const parallax = { x: 0, y: 0 };
    const parallaxTarget = { x: 0, y: 0 };

    const placeCamera = (time: number) => {
      const drift = reduceMotion ? 0 : Math.sin(time * 0.00013) * 0.16;
      const az = baseAzimuth + drift + parallax.x * 0.22;
      const y = camBaseY + parallax.y * 4.5;
      camera.position.set(
        Math.sin(az) * camRadius,
        y,
        Math.cos(az) * camRadius
      );
      camera.lookAt(target);
    };
    placeCamera(0);

    /* ---- post-processing (bloom) -------------------------------------- */
    const composer = new EffectComposer(renderer);
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    composer.setSize(initW, initH);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(initW, initH),
      0.72, // strength
      0.62, // radius
      0.58 // threshold
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    /* ---- hover raycasting --------------------------------------------- */
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerActive = false;
    let needsPick = false;
    let hoveredId = -1;
    const topWorld = new THREE.Vector3();

    const setHovered = (id: number) => {
      if (id === hoveredId) return;
      if (hoveredId >= 0 && hoveredId < baseColors.length) {
        mesh.setColorAt(hoveredId, baseColors[hoveredId]);
      }
      hoveredId = id;
      if (id >= 0) {
        mesh.setColorAt(id, tmpColor.set("#eafff0"));
      }
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      pointer.x = (px / rect.width) * 2 - 1;
      pointer.y = -(py / rect.height) * 2 + 1;
      parallaxTarget.x = pointer.x;
      parallaxTarget.y = pointer.y;
      pointerActive = true;
      needsPick = true;
    };
    const onPointerLeave = () => {
      pointerActive = false;
      parallaxTarget.x = 0;
      parallaxTarget.y = 0;
      setHovered(-1);
      onHoverRef.current?.(null);
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerleave", onPointerLeave);

    const pick = () => {
      needsPick = false;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObject(mesh, false)[0];
      if (hit && hit.instanceId != null) {
        const id = hit.instanceId;
        setHovered(id);
        // project the pillar's top to screen for the tooltip
        topWorld
          .set(baseX[id], targetH[id], baseZ[id])
          .applyEuler(group.rotation)
          .project(camera);
        const rect = renderer.domElement.getBoundingClientRect();
        const sx = (topWorld.x * 0.5 + 0.5) * rect.width;
        const sy = (-topWorld.y * 0.5 + 0.5) * rect.height;
        onHoverRef.current?.({ date: dayRef[id].d, count: dayRef[id].c, x: sx, y: sy });
      } else {
        setHovered(-1);
        onHoverRef.current?.(null);
      }
    };

    /* ---- run loop ----------------------------------------------------- */
    let raf = 0;
    let running = true;
    let startT = -1;
    let introDone = reduceMotion;
    if (reduceMotion) onReadyRef.current?.();

    const frame = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (startT < 0) startT = now;
      const elapsed = now - startT;

      // intro: columns rise left→right as "time" flows
      if (!introDone) {
        const p = Math.min(1, elapsed / INTRO_MS);
        writeMatrices((wi) => {
          const delay = (wi / cols) * 0.55;
          const local = Math.min(1, Math.max(0, (p - delay) / (1 - 0.55)));
          return easeOutCubic(local);
        });
        if (p >= 1) {
          introDone = true;
          onReadyRef.current?.();
        }
      }

      // smooth parallax
      parallax.x += (parallaxTarget.x - parallax.x) * 0.05;
      parallax.y += (parallaxTarget.y - parallax.y) * 0.05;
      placeCamera(now);

      if (pointerActive && needsPick) pick();

      composer.render();
    };
    raf = requestAnimationFrame(frame);

    /* ---- resize ------------------------------------------------------- */
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
      bloom.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    /* ---- pause when offscreen / tab hidden ---------------------------- */
    const setRunning = (next: boolean) => {
      if (next === running) return;
      running = next;
      if (next) {
        startT = -1; // don't fast-forward the intro after a pause
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => setRunning(entry.isIntersecting && entry.intersectionRatio > 0.05),
      { threshold: [0, 0.05, 0.2] }
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
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerleave", onPointerLeave);
      geo.dispose();
      material.dispose();
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      bloom.dispose();
      composer.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [data]);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
