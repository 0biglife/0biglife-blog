"use client";

import { useMemo } from "react";
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

const ACCENT = "#c9ff4d";
const CYAN = "#63b3ff";
const BG = "#01030a";
const FLOOR_Y = -1.35;

useGLTF.preload("/models/lab-model.glb");

// GLB 는 저마다 단위가 다르다(mm 로 만든 것도, m 로 만든 것도 있다). 바운딩 박스로
// 재서 화면에 맞게 정규화한다 — 이게 없으면 모델을 바꿀 때마다 카메라를 다시 잡아야 한다.
function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  // useGLTF 캐시를 공유하면 다른 라우트/재마운트에 상태가 샌다 — 복제해서 쓴다.
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const fitScale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    return 2.7 / (Math.max(size.x, size.y, size.z) || 1);
  }, [cloned]);

  return <primitive object={cloned} scale={fitScale} />;
}

// 내려받을 파일이 없는 기본 도형. 모델 로딩이 실패해도 화면이 비지 않는다.
function Gem() {
  return (
    <mesh>
      <icosahedronGeometry args={[1.35, 1]} />
      <meshStandardMaterial
        flatShading
        color="#e9ffb4"
        metalness={0.55}
        roughness={0.3}
        emissive={ACCENT}
        emissiveIntensity={0.05}
      />
    </mesh>
  );
}

export default function LabCanvas({
  modelUrl,
  autoRotate,
}: {
  modelUrl: string;
  autoRotate: boolean;
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

      {/* 스튜디오 조명. Lightformer 로 직접 만들어 외부 HDR 을 받지 않는다(자립형 페이지) */}
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

      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.6}>
        <Center position={[0, 0.15, 0]}>
          {modelUrl ? <GltfModel url={modelUrl} /> : <Gem />}
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
