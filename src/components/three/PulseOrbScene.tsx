"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const COLOR_LOW = new THREE.Color("#fb7185"); // rose — needs attention
const COLOR_MID = new THREE.Color("#f59e0b"); // amber — tight/ok
const COLOR_HIGH = new THREE.Color("#34d399"); // emerald — strong

const ORB_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uHealth;
  varying float vNoise;
  varying vec3 vNormal;

  float pseudoNoise(vec3 p) {
    return sin(p.x * 1.3 + p.y * 1.7 - p.z * 2.1) * 0.5
         + sin(p.y * 2.3 - p.x * 0.9 + p.z * 1.4) * 0.5;
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    // Low health = faster, more agitated; high health = slow, calm breathing.
    float speed = mix(2.4, 0.55, uHealth);
    float amp = mix(0.22, 0.07, uHealth);
    float n = pseudoNoise(position * 2.2 + uTime * speed);
    vNoise = n;
    vec3 displaced = position + normal * n * amp;
    float breathe = 1.0 + sin(uTime * speed * 0.5) * amp * 0.5;
    displaced *= breathe;
    vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const ORB_FRAGMENT_SHADER = `
  uniform vec3 uColorLow;
  uniform vec3 uColorMid;
  uniform vec3 uColorHigh;
  uniform float uHealth;
  varying float vNoise;
  varying vec3 vNormal;

  void main() {
    vec3 base = uHealth < 0.5
      ? mix(uColorLow, uColorMid, uHealth * 2.0)
      : mix(uColorMid, uColorHigh, (uHealth - 0.5) * 2.0);
    float fres = pow(1.0 - abs(vNormal.z), 2.0);
    vec3 color = base + fres * 0.45 + vNoise * 0.05;
    gl_FragColor = vec4(color, 1.0);
  }
`;

function healthColor(health01: number): THREE.Color {
  const c = new THREE.Color();
  if (health01 < 0.5) c.copy(COLOR_LOW).lerp(COLOR_MID, health01 * 2);
  else c.copy(COLOR_MID).lerp(COLOR_HIGH, (health01 - 0.5) * 2);
  return c;
}

/** Distorted, color-shifting core — the "wow" centerpiece. Pulses faster/harder at low health, slow and calm at high health. */
function OrbCore({ health01 }: { health01: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uHealth: { value: health01 },
      uColorLow: { value: COLOR_LOW.clone() },
      uColorMid: { value: COLOR_MID.clone() },
      uColorHigh: { value: COLOR_HIGH.clone() },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value = state.clock.elapsedTime;
    material.current.uniforms.uHealth.value = health01;
  });

  return (
    <mesh>
      <icosahedronGeometry args={[1, 3]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={ORB_VERTEX_SHADER}
        fragmentShader={ORB_FRAGMENT_SHADER}
      />
    </mesh>
  );
}

/** Cheap additive-blended shell standing in for bloom around the core. */
function OrbGlow({ health01 }: { health01: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.color.copy(healthColor(health01));
    const speed = 0.55 + (1 - health01) * 1.2;
    m.scale.setScalar(1.45 + Math.sin(state.clock.elapsedTime * speed) * 0.05);
  });
  return (
    <mesh ref={mesh} scale={1.45}>
      <icosahedronGeometry args={[1, 2]} />
      <meshBasicMaterial
        transparent
        opacity={0.18}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}

function Rig({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!group.current) return;
    group.current.rotation.y = state.clock.elapsedTime * 0.12;
    group.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.15;
  });
  return <group ref={group}>{children}</group>;
}

/** Live 3D "Pulse" widget — morphs shape/speed/color with financial health. Drop-in size-matched replacement for PulseRing when WebGL is available. */
export default function PulseOrbScene({ health, size = 160 }: { health: number; size?: number }) {
  const health01 = Math.max(0, Math.min(100, health)) / 100;
  return (
    <div style={{ width: size, height: size }} aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        camera={{ position: [0, 0, 3], fov: 40 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      >
        <Rig>
          <OrbGlow health01={health01} />
          <OrbCore health01={health01} />
        </Rig>
      </Canvas>
    </div>
  );
}
