"use client";

import DashboardSceneLoader from "./DashboardSceneLoader";
import WebGLErrorBoundary from "./WebGLErrorBoundary";
import DepthScene from "@/components/fx/DepthScene";
import { useWebglAllowed } from "./useWebglAllowed";

/**
 * Ambient WebGL backdrop for the authenticated app (replaces the CSS-only DepthScene
 * when WebGL is available). Falls back to DepthScene on reduced-motion, low-end/mobile
 * devices, or a runtime WebGL failure — same gating as the landing hero's SceneGate.
 */
export default function DashboardSceneGate() {
  const enabled = useWebglAllowed();
  if (!enabled) return <DepthScene />;

  return (
    <WebGLErrorBoundary fallback={<DepthScene />}>
      <DashboardSceneLoader />
    </WebGLErrorBoundary>
  );
}
