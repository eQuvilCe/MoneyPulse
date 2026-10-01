"use client";

import DataTerrainSceneLoader from "./DataTerrainSceneLoader";
import WebGLErrorBoundary from "./WebGLErrorBoundary";
import { useWebglAllowed } from "./useWebglAllowed";

/**
 * Layers the real WebGL "data terrain" scene on top of BackgroundStage's existing CSS
 * layer (which is already a complete background on its own). Renders nothing extra on
 * reduced-motion, low-end devices, or a WebGL failure — same gating as DashboardSceneGate.
 */
export default function DataTerrainSceneGate() {
  const enabled = useWebglAllowed();
  if (!enabled) return null;

  return (
    <WebGLErrorBoundary fallback={null}>
      <DataTerrainSceneLoader />
    </WebGLErrorBoundary>
  );
}
