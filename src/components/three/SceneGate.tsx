"use client";

import { useEffect, useState } from "react";
import HeroSceneLoader from "./HeroSceneLoader";
import WebGLErrorBoundary from "./WebGLErrorBoundary";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Decides whether to layer the real WebGL hero scene on top of the page's existing
 * Aurora/ParticleField background (which already covers this area). On reduced-motion,
 * low-end devices, or a WebGL failure, this renders nothing extra — the global CSS
 * background underneath is already a complete, working background on its own.
 */
export default function SceneGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowEnd =
      (nav.hardwareConcurrency ?? 8) < 4 || (nav.deviceMemory ?? 8) < 4 || window.innerWidth < 768;

    setEnabled(!reducedMotion && !lowEnd && supportsWebGL());
  }, []);

  if (!enabled) return null;

  return (
    <WebGLErrorBoundary fallback={null}>
      <HeroSceneLoader />
    </WebGLErrorBoundary>
  );
}
