"use client";

import { useEffect, useRef } from "react";

type Piece = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  shape: "rect" | "circle";
};

const PALETTE = ["#3cf2b0", "#38bdf8", "#8b5cf6", "#f59e0b", "#fb7185", "#2dd4bf"];
const DURATION_MS = 1800;

/** Fires a short-lived confetti burst whenever `fire` changes to a new (truthy) value. Mount once, bump `fire` (e.g. Date.now()) to trigger. */
export default function Confetti({ fire }: { fire: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFireRef = useRef(0);

  useEffect(() => {
    if (!fire || fire === lastFireRef.current) return;
    lastFireRef.current = fire;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.opacity = "1";

    if (reduced) {
      // Brief static flash instead of an animated burst.
      const pieces: Piece[] = Array.from({ length: 24 }, () => ({
        x: w / 2 + (Math.random() - 0.5) * 120,
        y: h * 0.3 + (Math.random() - 0.5) * 60,
        vx: 0,
        vy: 0,
        rot: Math.random() * Math.PI,
        vr: 0,
        size: 5 + Math.random() * 4,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        shape: Math.random() > 0.5 ? "rect" : "circle",
      }));
      ctx.clearRect(0, 0, w, h);
      for (const p of pieces) drawPiece(ctx, p);
      const t = setTimeout(() => {
        ctx.clearRect(0, 0, w, h);
      }, 500);
      return () => clearTimeout(t);
    }

    const count = 90;
    const pieces: Piece[] = Array.from({ length: count }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 160,
      y: h * 0.28 + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 7,
      vy: -(4 + Math.random() * 5),
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.3,
      size: 5 + Math.random() * 5,
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }));

    let raf = 0;
    const gravity = 0.18;
    const t0 = performance.now();

    const tick = (now: number) => {
      const elapsed = now - t0;
      const lifeT = Math.min(1, elapsed / DURATION_MS);
      ctx.clearRect(0, 0, w, h);
      for (const p of pieces) {
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.globalAlpha = 1 - lifeT;
        drawPiece(ctx, p);
      }
      ctx.globalAlpha = 1;
      if (elapsed < DURATION_MS) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [fire]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[90]"
      style={{ opacity: 0 }}
      aria-hidden
    />
  );
}

function drawPiece(ctx: CanvasRenderingContext2D, p: Piece) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.rot);
  ctx.fillStyle = p.color;
  if (p.shape === "rect") {
    ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
