"use client";

import { useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  ContactShadows,
  Grid,
  Float,
  Center,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";

const ACCENT = "#c9ff4d";
const BG = "#01030a";
const FLOOR_Y = -1.35;

// ── Tripo에서 뽑은 .glb 를 미리 캐싱하려면 아래 주석을 풀고 경로를 넣으세요. ──
// useGLTF.preload("/models/your-model.glb");

/**
 * 모델이 아직 없을 때 보여줄 절차적(procedural) 플레이스홀더.
 * facet 아이코사헤드론 — "생성된 3D 에셋" 느낌 + 사이트 라임 액센트.
 */
function PlaceholderModel({ wireframe }: { wireframe: boolean }) {
  return (
    <mesh>
      <icosahedronGeometry args={[1.2, 1]} />
      <meshStandardMaterial
        color="#e9ffb4"
        metalness={0.55}
        roughness={0.3}
        flatShading
        wireframe={wireframe}
        emissive={ACCENT}
        emissiveIntensity={wireframe ? 0.35 : 0.05}
      />
    </mesh>
  );
}

/**
 * 실제 GLB 로더. Tripo 결과물(.glb)을 public/models/ 에 넣고 url만 주면 끝.
 * wireframe 토글은 로드된 메시들의 머티리얼을 순회하며 적용.
 */
function GltfModel({ url, wireframe }: { url: string; wireframe: boolean }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as
        | THREE.MeshStandardMaterial
        | THREE.MeshStandardMaterial[];
      if (Array.isArray(mat)) mat.forEach((m) => (m.wireframe = wireframe));
      else mat.wireframe = wireframe;
    });
  }, [cloned, wireframe]);

  return <primitive object={cloned} />;
}

export default function LabCanvas({
  modelUrl,
  autoRotate,
  wireframe,
}: {
  modelUrl: string;
  autoRotate: boolean;
  wireframe: boolean;
}) {
  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [3.4, 1.9, 4.4], fov: 42 }}
      gl={{ antialias: true }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={[BG]} />
      <fog attach="fog" args={[BG, 11, 26]} />

      {/* 3-point lighting (directional only — 예측 가능하고 안정적) */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 6]} intensity={3} />
      <directionalLight position={[-6, 4, -5]} intensity={1.4} color="#63b3ff" />
      <directionalLight position={[2, 1, -4]} intensity={0.8} color={ACCENT} />

      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
        <Center position={[0, 0.15, 0]}>
          {modelUrl ? (
            <GltfModel url={modelUrl} wireframe={wireframe} />
          ) : (
            <PlaceholderModel wireframe={wireframe} />
          )}
        </Center>
      </Float>

      <ContactShadows
        position={[0, FLOOR_Y, 0]}
        opacity={0.5}
        scale={16}
        blur={2.6}
        far={5}
        color="#000000"
      />

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
