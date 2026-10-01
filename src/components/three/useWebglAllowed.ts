"use client";

import { useEffect, useState } from "react";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/** True once we've confirmed: no reduced-motion preference, not a low-end/mobile device, and WebGL is supported. */
export function useWebglAllowed(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const lowEnd =
      (nav.hardwareConcurrency ?? 8) < 4 || (nav.deviceMemory ?? 8) < 4 || window.innerWidth < 768;

    setEnabled(!reducedMotion && !lowEnd && supportsWebGL());
  }, []);

  return enabled;
}
