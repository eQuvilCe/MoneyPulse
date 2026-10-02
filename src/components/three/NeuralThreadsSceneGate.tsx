"use client";

import NeuralThreadsSceneLoader from "./NeuralThreadsSceneLoader";
import WebGLErrorBoundary from "./WebGLErrorBoundary";
import { useWebglAllowed } from "./useWebglAllowed";

/** Same gating pattern as DashboardSceneGate — layers the neural-threads scene (tinted per `palette`). */
export default function NeuralThreadsSceneGate({ palette }: { palette?: [string, string] }) {
  const enabled = useWebglAllowed();
  if (!enabled) return null;

  return (
    <WebGLErrorBoundary fallback={null}>
      <NeuralThreadsSceneLoader palette={palette} />
    </WebGLErrorBoundary>
  );
}
