"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Convention, Mat3, Vec3 } from "./conventions";
import { axisRole } from "./conventions";

// X/Y/Z keep the rviz-familiar red/green/blue mapping, tuned to the site palette
// so the tool still reads as part of this site rather than a screenshot of rviz.
const AXIS_COLORS = ["#ff6b6b", "#c9ff4d", "#63b3ff"] as const;
const CAR = "#8ba3b8";
const GROUND = "#12202e";
const MONO = "'JetBrains Mono', monospace";

/**
 * The whole point of this view: both stages draw the *same physical car* and the
 * *same physical arrows*. Only the labels move. If X lands on a different arrow
 * on the right than on the left, that is the bug you came here to find.
 */

function Arrow({ dir, color, label, sub }: { dir: Vec3; color: string; label: string; sub: string }) {
  const len = 1.25;
  const quat = useMemo(() => {
    const to = new THREE.Vector3(dir[0], dir[1], dir[2]).normalize();
    // cylinder/cone geometry is built along +Y
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), to);
  }, [dir]);

  return (
    <group quaternion={quat}>
      <mesh position={[0, len / 2, 0]}>
        <cylinderGeometry args={[0.016, 0.016, len, 10]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0, len, 0]}>
        <coneGeometry args={[0.058, 0.17, 14]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <Html position={[0, len + 0.3, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <div style={{ fontFamily: MONO, textAlign: "center", whiteSpace: "nowrap", userSelect: "none" }}>
          <div style={{ color, fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>{label}</div>
          <div style={{ color: "rgba(226,236,243,0.42)", fontSize: 9, letterSpacing: "0.08em" }}>{sub}</div>
        </div>
      </Html>
    </group>
  );
}

/** A car-ish glyph oriented by the input rotation, expressed in FLU. */
function Vehicle({ Rflu }: { Rflu: Mat3 }) {
  const quat = useMemo(() => {
    const m = new THREE.Matrix4().set(
      Rflu[0][0], Rflu[0][1], Rflu[0][2], 0,
      Rflu[1][0], Rflu[1][1], Rflu[1][2], 0,
      Rflu[2][0], Rflu[2][1], Rflu[2][2], 0,
      0, 0, 0, 1
    );
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [Rflu]);

  return (
    <group quaternion={quat}>
      {/* body — long axis is the car's own +x (its front) */}
      <mesh position={[0, 0, 0.16]}>
        <boxGeometry args={[0.86, 0.4, 0.24]} />
        <meshStandardMaterial color={CAR} metalness={0.35} roughness={0.5} />
      </mesh>
      <mesh position={[-0.04, 0, 0.34]}>
        <boxGeometry args={[0.44, 0.34, 0.16]} />
        <meshStandardMaterial color="#5f7d96" metalness={0.2} roughness={0.6} />
      </mesh>
      {/* nose: an unmistakable pointer so "which way is it facing" is never a guess */}
      <mesh position={[0.62, 0, 0.16]} rotation={[0, Math.PI / 2, 0]}>
        <coneGeometry args={[0.13, 0.3, 18]} />
        <meshStandardMaterial color="#c9ff4d" emissive="#c9ff4d" emissiveIntensity={0.45} />
      </mesh>
    </group>
  );
}

/** Each stage sits on its own tinted disc, keyed to the legend outside the canvas. */
function Ground({ tint }: { tint: string }) {
  return (
    <>
      <gridHelper args={[3.2, 8, GROUND, GROUND]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh position={[0, 0, -0.004]}>
        <circleGeometry args={[1.7, 48]} />
        <meshBasicMaterial color={tint} transparent opacity={0.14} />
      </mesh>
      <mesh position={[0, 0, -0.006]}>
        <ringGeometry args={[1.68, 1.72, 64]} />
        <meshBasicMaterial color={tint} transparent opacity={0.5} />
      </mesh>
    </>
  );
}

function Stage({
  convention,
  Rflu,
  offsetY,
  tint,
}: {
  convention: Convention;
  Rflu: Mat3;
  offsetY: number;
  tint: string;
}) {
  const a = convention.axes;
  return (
    <group position={[0, offsetY, 0]}>
      <Ground tint={tint} />
      <Vehicle Rflu={Rflu} />
      <Arrow dir={a.x} color={AXIS_COLORS[0]} label="X" sub={axisRole(convention, 0)} />
      <Arrow dir={a.y} color={AXIS_COLORS[1]} label="Y" sub={axisRole(convention, 1)} />
      <Arrow dir={a.z} color={AXIS_COLORS[2]} label="Z" sub={axisRole(convention, 2)} />
    </group>
  );
}

export const STAGE_TINTS = { source: "#5ce0c0", target: "#c9ff4d" } as const;

export default function FrameCanvas({
  from,
  to,
  Rflu,
}: {
  from: Convention;
  to: Convention;
  Rflu: Mat3;
}) {
  return (
    <Canvas
      dpr={[1, 1.8]}
      camera={{ position: [5.2, -6.2, 4.2], fov: 40, up: [0, 0, 1], near: 0.1, far: 60 }}
      gl={{ antialias: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, -4, 6]} intensity={1.1} />
      <directionalLight position={[-4, 3, 2]} intensity={0.35} color="#63b3ff" />

      <Stage convention={from} Rflu={Rflu} offsetY={2.2} tint={STAGE_TINTS.source} />
      <Stage convention={to} Rflu={Rflu} offsetY={-2.2} tint={STAGE_TINTS.target} />

      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={5}
        maxDistance={16}
        target={[0, 0, 0.3]}
      />
    </Canvas>
  );
}
