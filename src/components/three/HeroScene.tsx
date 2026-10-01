"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, type RootState } from "@react-three/fiber";
import * as THREE from "three";

const PALETTE = ["#3cf2b0", "#38bdf8", "#8b5cf6"];
const PARTICLE_COUNT = 700;

/** Undulating wireframe floor — the "ledger" surface transactions flow across. */
function LedgerFloor() {
  const mesh = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        wireframe: true,
        uniforms: {
          uTime: { value: 0 },
          uColorA: { value: new THREE.Color(PALETTE[1]) },
          uColorB: { value: new THREE.Color(PALETTE[2]) },
          uFogColor: { value: new THREE.Color("#05070d") },
          uFogNear: { value: 6 },
          uFogFar: { value: 16 },
        },
        vertexShader: `
          uniform float uTime;
          varying float vHeight;
          varying float vDist;
          void main() {
            vec3 pos = position;
            float wave = sin(pos.x * 0.35 + uTime * 0.6) * 0.5 + cos(pos.y * 0.3 - uTime * 0.4) * 0.4;
            pos.z += wave;
            vHeight = wave;
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            vDist = -mvPosition.z;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColorA;
          uniform vec3 uColorB;
          uniform vec3 uFogColor;
          uniform float uFogNear;
          uniform float uFogFar;
          varying float vHeight;
          varying float vDist;
          void main() {
            float t = clamp(vHeight * 0.5 + 0.5, 0.0, 1.0);
            vec3 color = mix(uColorA, uColorB, t);
            float fogFactor = clamp((vDist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
            color = mix(color, uFogColor, fogFactor);
            float alpha = mix(0.22, 0.0, fogFactor);
            gl_FragColor = vec4(color, alpha);
          }
        `,
      }),
    []
  );

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh ref={mesh} position={[0, -1.4, -4]} rotation={[-Math.PI / 2.6, 0, 0]} material={material}>
      <planeGeometry args={[64, 20, 96, 36]} />
    </mesh>
  );
}

/** Sparse glowing points drifting upward — transactions accumulating into balance. */
function TransactionStream() {
  const points = useRef<THREE.Points>(null);
  const { positions, speeds, colors } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const speeds = new Float32Array(PARTICLE_COUNT);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const color = new THREE.Color();
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 42;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8 - 2;
      speeds[i] = 0.25 + Math.random() * 0.5;
      color.set(PALETTE[i % PALETTE.length]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return { positions, speeds, colors };
  }, []);

  useFrame((_, delta) => {
    const geo = points.current?.geometry;
    if (!geo) return;
    const arr = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      arr[i * 3 + 1] += speeds[i] * delta;
      if (arr[i * 3 + 1] > 6) arr[i * 3 + 1] = -6;
    }
    geo.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** Mouse-parallax + scroll-fade applied to the whole scene group. */
function SceneRig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);

  useFrame((state: RootState) => {
    if (!group.current) return;
    const targetX = state.pointer.y * 0.12;
    const targetY = state.pointer.x * 0.18;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.04;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.04;

    const scrollFade = typeof window !== "undefined" ? 1 - Math.min(1, window.scrollY / 700) : 1;
    group.current.scale.setScalar(0.92 + scrollFade * 0.08);
    group.current.position.y = (1 - scrollFade) * -1.2;
    group.current.traverse((obj) => {
      const mat = (obj as THREE.Points | THREE.Mesh).material as THREE.Material | undefined;
      if (mat && "opacity" in mat) (mat as THREE.Material & { opacity: number }).opacity = scrollFade;
    });
  });

  return <group ref={group}>{children}</group>;
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.4, 6], fov: 52 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
    >
      <fog attach="fog" args={["#05070d", 6, 15]} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={0.8} color={PALETTE[0]} />
      <SceneRig>
        <LedgerFloor />
        <TransactionStream />
      </SceneRig>
    </Canvas>
  );
}
