"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Grid,
  Float,
  Center,
  Environment,
  Lightformer,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import type { WebGLRenderer } from "three";
import type { EnvMode, MaterialMode } from "./studioConfig";

const ACCENT = "#c9ff4d";
const CYAN = "#63b3ff";
const BG = "#01030a";
const FLOOR_Y = -1.35;

useGLTF.preload("/models/lab-model.glb");

// ── material finishes ──────────────────────────────────────────────
// Applied non-destructively: the loaded materials are cloned once into a
// pristine "base", plus one reusable "override" we mutate per finish, plus one
// shared glass material. Nothing ever mutates the useGLTF-cached originals, so
// swapping models/finishes can't leak state between them.
function tweak(mat: THREE.MeshStandardMaterial, mode: MaterialMode) {
  mat.wireframe = mode === "wire";
  mat.transparent = false;
  mat.opacity = 1;
  if (mode === "matte") {
    mat.metalness = 0;
    mat.roughness = 0.95;
  } else if (mode === "metal") {
    mat.metalness = 1;
    mat.roughness = 0.18;
  } else if (mode === "holo") {
    mat.color = new THREE.Color("#0a160e");
    mat.emissive = new THREE.Color(ACCENT);
    mat.emissiveIntensity = 0.85;
    mat.metalness = 0.5;
    mat.roughness = 0.25;
  }
  // "original" / "wire" keep the base look (wire just flips wireframe).
}

function makeGlass() {
  return new THREE.MeshPhysicalMaterial({
    transmission: 1,
    thickness: 1.2,
    roughness: 0.06,
    ior: 1.45,
    metalness: 0,
    transparent: true,
    color: new THREE.Color("#daffe0"),
    envMapIntensity: 1.6,
  });
}

function GltfModel({ url, material }: { url: string; material: MaterialMode }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // pristine base + reusable override, cloned per model load
  const { base, override, glass } = useMemo(() => {
    const b = new Map<THREE.Mesh, THREE.Material[]>();
    const o = new Map<THREE.Mesh, THREE.Material[]>();
    cloned.traverse((n) => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      const arr = Array.isArray(m.material) ? m.material : [m.material];
      b.set(m, arr.map((x) => x.clone()));
      o.set(m, arr.map((x) => x.clone()));
    });
    return { base: b, override: o, glass: makeGlass() };
  }, [cloned]);

  const fitScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return 2.7 / maxDim;
  }, [cloned]);

  useEffect(() => {
    cloned.traverse((n) => {
      const mesh = n as THREE.Mesh;
      if (!mesh.isMesh) return;
      const baseArr = base.get(mesh);
      const ovArr = override.get(mesh);
      if (!baseArr || !ovArr) return;
      const single = !Array.isArray(mesh.material) && baseArr.length === 1;
      const pick = (i: number): THREE.Material => {
        if (material === "glass") return glass;
        if (material === "original") return baseArr[i];
        const ov = ovArr[i] as THREE.MeshStandardMaterial;
        ov.copy(baseArr[i] as THREE.MeshStandardMaterial);
        tweak(ov, material);
        return ov;
      };
      mesh.material = single ? pick(0) : baseArr.map((_, i) => pick(i));
    });
  }, [cloned, base, override, glass, material]);

  return <primitive object={cloned} scale={fitScale} />;
}

function Gem({ material }: { material: MaterialMode }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    m.color = new THREE.Color("#e9ffb4");
    m.metalness = 0.55;
    m.roughness = 0.3;
    m.emissive = new THREE.Color(ACCENT);
    m.emissiveIntensity = 0.05;
    if (material !== "glass") tweak(m, material);
  }, [material]);
  if (material === "glass") {
    return (
      <mesh>
        <icosahedronGeometry args={[1.35, 1]} />
        <primitive object={makeGlass()} attach="material" />
      </mesh>
    );
  }
  return (
    <mesh>
      <icosahedronGeometry args={[1.35, 1]} />
      <meshStandardMaterial ref={ref} flatShading />
    </mesh>
  );
}

// ── environment presets ────────────────────────────────────────────
function Lighting({ env }: { env: EnvMode }) {
  if (env === "night") {
    return (
      <>
        <ambientLight intensity={0.22} />
        <directionalLight position={[5, 8, 6]} intensity={1.1} color="#9db6ff" />
        <directionalLight position={[-6, 3, -5]} intensity={0.7} color={CYAN} />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={1.1} position={[0, 5, -4]} scale={[10, 6, 1]} color="#3a4a7a" />
          <Lightformer form="rect" intensity={0.8} position={[-6, 2, 2]} scale={[6, 8, 1]} color={CYAN} />
          <Lightformer form="ring" intensity={0.6} position={[0, -3, 5]} scale={5} color={ACCENT} />
        </Environment>
      </>
    );
  }
  if (env === "lime") {
    return (
      <>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 6]} intensity={2.2} color="#eaffc0" />
        <directionalLight position={[2, 1, -4]} intensity={1.6} color={ACCENT} />
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={2.6} position={[0, 5, -4]} scale={[12, 7, 1]} color={ACCENT} />
          <Lightformer form="rect" intensity={1.6} position={[6, 1, 3]} scale={[7, 8, 1]} color="#eaffc0" />
          <Lightformer form="rect" intensity={1.0} position={[-6, 2, 2]} scale={[6, 8, 1]} color="#ffffff" />
          <Lightformer form="ring" intensity={1.2} position={[0, -3, 5]} scale={5} color={ACCENT} />
        </Environment>
      </>
    );
  }
  // studio
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 6]} intensity={3} />
      <directionalLight position={[-6, 4, -5]} intensity={1.4} color={CYAN} />
      <directionalLight position={[2, 1, -4]} intensity={0.8} color={ACCENT} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 5, -4]} scale={[12, 7, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.3} position={[-6, 2, 2]} scale={[6, 8, 1]} color={CYAN} />
        <Lightformer form="rect" intensity={1.6} position={[6, 1, 3]} scale={[6, 8, 1]} color={ACCENT} />
        <Lightformer form="ring" intensity={1} position={[0, -3, 5]} scale={5} color="#ffffff" />
      </Environment>
    </>
  );
}

export default function LabCanvas({
  modelUrl,
  material,
  env,
  autoRotate,
  onReady,
}: {
  modelUrl: string;
  material: MaterialMode;
  env: EnvMode;
  autoRotate: boolean;
  onReady?: (gl: WebGLRenderer) => void;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [3.4, 1.9, 4.4], fov: 42 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      onCreated={({ gl }) => onReady?.(gl)}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 11, 26]} />

      <Lighting env={env} />

      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
        <Center position={[0, 0.15, 0]}>
          {modelUrl ? <GltfModel url={modelUrl} material={material} /> : <Gem material={material} />}
        </Center>
      </Float>

      <ContactShadows position={[0, FLOOR_Y, 0]} opacity={0.5} scale={16} blur={2.6} far={5} color="#000000" />

      <Grid
        position={[0, FLOOR_Y, 0]}
        args={[24, 24]}
        cellSize={0.6}
        cellThickness={0.6}
        cellColor="#123219"
        sectionSize={3}
        sectionThickness={1}
        sectionColor={ACCENT}
        fadeDistance={26}
        fadeStrength={1.2}
        infiniteGrid
      />

      <OrbitControls
        makeDefault
        autoRotate={autoRotate}
        autoRotateSpeed={0.9}
        enablePan={false}
        minDistance={2.4}
        maxDistance={9}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  );
}
