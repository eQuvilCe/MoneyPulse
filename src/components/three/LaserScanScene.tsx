"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useFrameloop } from "./useWebglAllowed";

const DEFAULT_PALETTE: [string, string] = ["#7dd3fc", "#38bdf8"];
const DUST_COUNT = 100;

/** A thin glowing plane sweeping up and down — echoes a receipt/document scan line. */
function ScanPlane({ color }: { color: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    m.position.y = Math.sin(t * 0.45) * 5.5;
  });
  return (
    <mesh ref={mesh} position={[0, 0, -8]}>
      <planeGeometry args={[18, 0.12]} />
      <meshBasicMaterial color={color} transparent opacity={0.55} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

/** Faint dust catching the scan light, same drifting-points pattern used elsewhere. */
function ScanDust({ color }: { color: string }) {
  const points = useRef<THREE.Points>(null);
  const [{ positions, phases }] = useState(() => {
    const positions = new Float32Array(DUST_COUNT * 3);
    const phases = new Float32Array(DUST_COUNT);
    for (let i = 0; i < DUST_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 6;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions, phases };
  });

  useFrame((state) => {
    const geo = points.current?.geometry;
    if (!geo) return;
    const arr = geo.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < DUST_COUNT; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.3 + phases[i]) * 0.0012;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color={color} transparent opacity={0.4} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Fixed, full-viewport ambient WebGL backdrop — sweeping scan line tinted via `palette`. */
export default function LaserScanScene({ palette = DEFAULT_PALETTE }: { palette?: [string, string] }) {
  const frameloop = useFrameloop();
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden lg:left-[240px]" aria-hidden>
      <Canvas
        frameloop={frameloop}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      >
        <fog attach="fog" args={["#05070d", 10, 26]} />
        <ScanPlane color={palette[1]} />
        <ScanDust color={palette[0]} />
      </Canvas>
    </div>
  );
}
