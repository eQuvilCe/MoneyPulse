"use client";

import FloatingOrbsSceneLoader from "./FloatingOrbsSceneLoader";
import WebGLErrorBoundary from "./WebGLErrorBoundary";
import { useWebglAllowed } from "./useWebglAllowed";

/** Same gating pattern as DashboardSceneGate — layers the floating-orbs scene for /goals. */
export default function FloatingOrbsSceneGate() {
  const enabled = useWebglAllowed();
  if (!enabled) return null;

  return (
    <WebGLErrorBoundary fallback={null}>
      <FloatingOrbsSceneLoader />
    </WebGLErrorBoundary>
  );
}
