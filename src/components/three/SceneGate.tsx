"use client";

import HeroSceneLoader from "./HeroSceneLoader";
import WebGLErrorBoundary from "./WebGLErrorBoundary";
import { useWebglAllowed } from "./useWebglAllowed";

/**
 * Decides whether to layer the real WebGL hero scene on top of the page's existing
 * Aurora/ParticleField background (which already covers this area). On reduced-motion,
 * low-end devices, or a WebGL failure, this renders nothing extra — the global CSS
 * background underneath is already a complete, working background on its own.
 */
export default function SceneGate() {
  const enabled = useWebglAllowed();
  if (!enabled) return null;

  return (
    <WebGLErrorBoundary fallback={null}>
      <HeroSceneLoader />
    </WebGLErrorBoundary>
  );
}
