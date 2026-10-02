"use client";

import FloatingOrbsSceneLoader from "./FloatingOrbsSceneLoader";
import WebGLErrorBoundary from "./WebGLErrorBoundary";
import { useWebglAllowed } from "./useWebglAllowed";

/** Same gating pattern as DashboardSceneGate — layers the floating-orbs scene (tinted per `palette`). */
export default function FloatingOrbsSceneGate({ palette }: { palette?: [string, string] }) {
  const enabled = useWebglAllowed();
  if (!enabled) return null;

  return (
    <WebGLErrorBoundary fallback={null}>
      <FloatingOrbsSceneLoader palette={palette} />
    </WebGLErrorBoundary>
  );
}
