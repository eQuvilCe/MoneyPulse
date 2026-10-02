"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame, type RootState } from "@react-three/fiber";
import * as THREE from "three";
import { useFrameloop } from "./useWebglAllowed";

const PALETTE = ["#3cf2b0", "#38bdf8", "#8b5cf6"];
const PARTICLE_COUNT = 160;

/** Slowly breathing wireframe "pulse" core — echoes the app's Pulse branding, sits deep in the background. */
function PulseCore() {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const scale = 1 + Math.sin(t * 0.6) * 0.06;
    g.scale.setScalar(scale);
    g.rotation.y = t * 0.08;
    g.rotation.x = t * 0.04;
  });
  return (
    <group ref={group} position={[6, -1.5, -9]}>
      <mesh>
        <icosahedronGeometry args={[3, 1]} />
        <meshBasicMaterial color={PALETTE[1]} wireframe transparent opacity={0.1} />
      </mesh>
      <mesh scale={0.7}>
        <icosahedronGeometry args={[3, 1]} />
        <meshBasicMaterial color={PALETTE[2]} wireframe transparent opacity={0.08} />
      </mesh>
    </group>
  );
}

/** Sparse, slow-drifting bokeh-like particles — calmer than the landing hero's stream, built for a dense data UI. */
function AmbientDust() {
  const points = useRef<THREE.Points>(null);
  const [{ positions, phases }] = useState(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const phases = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 36;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 14 - 6;
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
      arr[i * 3 + 1] += Math.sin(t * 0.2 + phases[i]) * 0.0015;
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

function SceneRig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state: RootState) => {
    if (!group.current) return;
    const targetX = state.pointer.y * 0.04;
    const targetY = state.pointer.x * 0.06;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.03;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.03;
  });
  return <group ref={group}>{children}</group>;
}

/** Fixed, full-viewport ambient WebGL backdrop for the authenticated app — subtle, never competes with content. */
export default function DashboardScene() {
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
        <SceneRig>
          <PulseCore />
          <AmbientDust />
        </SceneRig>
      </Canvas>
    </div>
  );
}
