"use client";

import LaserScanSceneLoader from "./LaserScanSceneLoader";
import WebGLErrorBoundary from "./WebGLErrorBoundary";
import { useWebglAllowed } from "./useWebglAllowed";

/** Same gating pattern as DashboardSceneGate — layers the laser-scan scene for /scan. */
export default function LaserScanSceneGate() {
  const enabled = useWebglAllowed();
  if (!enabled) return null;

  return (
    <WebGLErrorBoundary fallback={null}>
      <LaserScanSceneLoader />
    </WebGLErrorBoundary>
  );
}
