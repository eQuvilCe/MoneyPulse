"use client";

import { useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PALETTE = ["#8b5cf6", "#d946ef"];
const ORB_COUNT = 7;

type OrbDef = { position: [number, number, number]; scale: number; phase: number; color: string };

/** Soft glowing orbs drifting with a gentle bob — matches the goals page's violet/fuchsia accent. */
function Orbs() {
  const group = useRef<THREE.Group>(null);
  const [orbs] = useState<OrbDef[]>(() =>
    Array.from({ length: ORB_COUNT }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 8 - 6,
      ],
      scale: 0.6 + Math.random() * 1.1,
      phase: Math.random() * Math.PI * 2,
      color: PALETTE[i % PALETTE.length],
    }))
  );

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.children.forEach((child, i) => {
      const def = orbs[i];
      if (!def) return;
      child.position.y = def.position[1] + Math.sin(t * 0.35 + def.phase) * 0.6;
      child.position.x = def.position[0] + Math.cos(t * 0.2 + def.phase) * 0.3;
    });
  });

  return (
    <group ref={group}>
      {orbs.map((orb, i) => (
        <group key={i} position={orb.position} scale={orb.scale}>
          <mesh>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshBasicMaterial color={orb.color} transparent opacity={0.5} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.7, 16, 16]} />
            <meshBasicMaterial color={orb.color} transparent opacity={0.12} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** Fixed, full-viewport ambient WebGL backdrop for /goals. */
export default function FloatingOrbsScene() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden lg:left-[240px]" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      >
        <fog attach="fog" args={["#05070d", 10, 26]} />
        <Orbs />
      </Canvas>
    </div>
  );
}
