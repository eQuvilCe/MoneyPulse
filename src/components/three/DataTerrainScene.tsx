"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useFrameloop } from "./useWebglAllowed";

const PALETTE = ["#60a5fa", "#3b82f6", "#8b5cf6"];
const PARTICLE_COUNT = 120;

/** Slowly undulating wireframe terrain — reads as a drifting chart/data surface. */
function TerrainGrid() {
  const geoRef = useRef<THREE.PlaneGeometry>(null);
  useFrame((state) => {
    const geo = geoRef.current;
    if (!geo) return;
    const pos = geo.attributes.position;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = Math.sin(x * 0.45 + t * 0.5) * 0.5 + Math.cos(y * 0.35 + t * 0.35) * 0.35;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  });
  return (
    <mesh rotation={[-Math.PI / 2.3, 0, 0]} position={[2, -3.5, -11]}>
      <planeGeometry ref={geoRef} args={[32, 18, 36, 20]} />
      <meshBasicMaterial color={PALETTE[1]} wireframe transparent opacity={0.16} />
    </mesh>
  );
}

/** Sparse drifting data points, same pattern as DashboardScene's AmbientDust. */
function DataMotes() {
  const points = useRef<THREE.Points>(null);
  const [{ positions, phases }] = useState(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const phases = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 34;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 6;
      phases[i] = Math.random() * Math.PI * 2;
    }
    return { positions, phases };
  });

  useFrame((state) => {
    const geo = points.current?.geometry;
    if (!geo) return;
    const arr = geo.attributes.position.array as Float32Array;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3 + 1] += Math.sin(t * 0.22 + phases[i]) * 0.0015;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color={PALETTE[0]} transparent opacity={0.35} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Fixed, full-viewport ambient WebGL backdrop for analytics/forecast. */
export default function DataTerrainScene() {
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
        <TerrainGrid />
        <DataMotes />
      </Canvas>
    </div>
  );
}
