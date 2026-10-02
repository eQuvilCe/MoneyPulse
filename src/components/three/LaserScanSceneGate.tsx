"use client";

import LaserScanSceneLoader from "./LaserScanSceneLoader";
import WebGLErrorBoundary from "./WebGLErrorBoundary";
import { useWebglAllowed } from "./useWebglAllowed";

/** Same gating pattern as DashboardSceneGate — layers the laser-scan scene (tinted per `palette`). */
export default function LaserScanSceneGate({ palette }: { palette?: [string, string] }) {
  const enabled = useWebglAllowed();
  if (!enabled) return null;

  return (
    <WebGLErrorBoundary fallback={null}>
      <LaserScanSceneLoader palette={palette} />
    </WebGLErrorBoundary>
  );
}
