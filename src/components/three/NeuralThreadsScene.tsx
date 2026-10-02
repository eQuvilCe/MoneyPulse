"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useFrameloop } from "./useWebglAllowed";

const DEFAULT_PALETTE: [string, string] = ["#7dd3fc", "#38bdf8"];
const NODE_COUNT = 56;
const LINK_DISTANCE = 4.2;

type Node = { position: [number, number, number]; phase: number };

/** Sparse drifting points with thin connecting lines between near neighbors — reads as "AI thinking". */
function Threads({ palette }: { palette: [string, string] }) {
  const points = useRef<THREE.Points>(null);
  const lines = useRef<THREE.LineSegments>(null);

  const [nodes] = useState<Node[]>(() =>
    Array.from({ length: NODE_COUNT }, () => ({
      position: [
        (Math.random() - 0.5) * 22,
        (Math.random() - 0.5) * 13,
        (Math.random() - 0.5) * 10 - 6,
      ],
      phase: Math.random() * Math.PI * 2,
    }))
  );

  const positions = useMemo(() => {
    const arr = new Float32Array(NODE_COUNT * 3);
    nodes.forEach((n, i) => {
      arr[i * 3] = n.position[0];
      arr[i * 3 + 1] = n.position[1];
      arr[i * 3 + 2] = n.position[2];
    });
    return arr;
  }, [nodes]);

  // Max possible segments if every node links every other within range — sized once, trimmed per frame via drawRange.
  const [linkPositions] = useState(() => new Float32Array(NODE_COUNT * NODE_COUNT * 3));

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pointsGeo = points.current?.geometry;
    const pointsArr = pointsGeo?.attributes.position.array as Float32Array | undefined;
    if (pointsGeo && pointsArr) {
      for (let i = 0; i < NODE_COUNT; i++) {
        const n = nodes[i];
        pointsArr[i * 3] = n.position[0] + Math.cos(t * 0.15 + n.phase) * 0.4;
        pointsArr[i * 3 + 1] = n.position[1] + Math.sin(t * 0.18 + n.phase) * 0.4;
      }
      pointsGeo.attributes.position.needsUpdate = true;
    }

    const lineGeo = lines.current?.geometry;
    const linkPositionsLive = lineGeo?.attributes.position.array as Float32Array | undefined;
    if (lineGeo && pointsArr && linkPositionsLive) {
      let segCount = 0;
      for (let i = 0; i < NODE_COUNT && segCount < NODE_COUNT * 6; i++) {
        for (let j = i + 1; j < NODE_COUNT && segCount < NODE_COUNT * 6; j++) {
          const dx = pointsArr[i * 3] - pointsArr[j * 3];
          const dy = pointsArr[i * 3 + 1] - pointsArr[j * 3 + 1];
          const dz = pointsArr[i * 3 + 2] - pointsArr[j * 3 + 2];
          if (dx * dx + dy * dy + dz * dz < LINK_DISTANCE * LINK_DISTANCE) {
            linkPositionsLive[segCount * 6] = pointsArr[i * 3];
            linkPositionsLive[segCount * 6 + 1] = pointsArr[i * 3 + 1];
            linkPositionsLive[segCount * 6 + 2] = pointsArr[i * 3 + 2];
            linkPositionsLive[segCount * 6 + 3] = pointsArr[j * 3];
            linkPositionsLive[segCount * 6 + 4] = pointsArr[j * 3 + 1];
            linkPositionsLive[segCount * 6 + 5] = pointsArr[j * 3 + 2];
            segCount++;
          }
        }
      }
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.setDrawRange(0, segCount * 2);
    }
  });

  return (
    <>
      <points ref={points}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial size={0.06} color={palette[0]} transparent opacity={0.55} sizeAttenuation depthWrite={false} />
      </points>
      <lineSegments ref={lines}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linkPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={palette[1]} transparent opacity={0.18} depthWrite={false} />
      </lineSegments>
    </>
  );
}

/** Fixed, full-viewport ambient WebGL backdrop — a sparse "neural network" drift for /ai. */
export default function NeuralThreadsScene({ palette = DEFAULT_PALETTE }: { palette?: [string, string] }) {
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
        <Threads palette={palette} />
      </Canvas>
    </div>
  );
}
