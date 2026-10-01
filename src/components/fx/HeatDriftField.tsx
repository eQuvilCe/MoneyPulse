"use client";

import { useEffect, useRef } from "react";

type Cell = { x: number; y: number; size: number; phase: number };

/**
 * Canvas2D warm-tinted drifting "heat cells" — a cheaper cousin of ParticleField's
 * pattern, suggesting a loose heatmap grid instead of particles+lines. Used behind
 * /calendar instead of a full WebGL scene (same device/reduced-motion gating as
 * ParticleField; skipped entirely on phones for battery/readability).
 */
export default function HeatDriftField({ colorRgb = "45,212,191" }: { colorRgb?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const mobile = window.innerWidth < 768;
    if (mobile) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let cells: Cell[] = [];
    let raf = 0;
    let visible = true;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const init = () => {
      const cols = 6;
      const rows = 4;
      cells = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          cells.push({
            x: (w / cols) * (c + 0.5),
            y: (h / rows) * (r + 0.5),
            size: Math.min(w / cols, h / rows) * 0.55,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    const draw = () => {
      if (!visible) {
        raf = requestAnimationFrame(draw);
        return;
      }
      ctx.clearRect(0, 0, w, h);
      const t = performance.now() / 1000;
      for (const cell of cells) {
        const pulse = 0.5 + 0.5 * Math.sin(t * 0.18 + cell.phase);
        const r = cell.size * (0.7 + pulse * 0.3);
        const grad = ctx.createRadialGradient(cell.x, cell.y, 0, cell.x, cell.y, r);
        grad.addColorStop(0, `rgba(${colorRgb},${0.1 * pulse})`);
        grad.addColorStop(1, `rgba(${colorRgb},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cell.x, cell.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };

    const onVis = () => {
      visible = document.visibilityState === "visible";
    };
    const onResize = () => {
      resize();
      init();
    };

    resize();
    init();
    draw();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [colorRgb]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0 opacity-70" aria-hidden />;
}
