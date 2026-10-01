"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

/** Three "R,G,B" triplets (no rgba()/spaces required) tinting the three drifting blobs + dots. */
export type DepthPalette = [string, string, string];

const DEFAULT_PALETTE: DepthPalette = ["60,242,176", "56,189,248", "139,92,246"];

/** CSS 3D depth field — mouse parallax, no WebGL */
export default function DepthScene({ palette = DEFAULT_PALETTE }: { palette?: DepthPalette }) {
  const [c1, c2, c3] = palette;
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 40, damping: 22 });
  const sy = useSpring(my, { stiffness: 40, damping: 22 });

  const x1 = useTransform(sx, [-0.5, 0.5], [-22, 22]);
  const y1 = useTransform(sy, [-0.5, 0.5], [-14, 14]);
  const x2 = useTransform(sx, [-0.5, 0.5], [18, -18]);
  const y2 = useTransform(sy, [-0.5, 0.5], [12, -12]);
  const x3 = useTransform(sx, [-0.5, 0.5], [-10, 10]);
  const y3 = useTransform(sy, [-0.5, 0.5], [8, -8]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX / window.innerWidth - 0.5);
      my.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden lg:left-[240px]" aria-hidden>
      <motion.div
        className="absolute -left-[5%] top-[8%] h-[45%] w-[40%] rounded-full"
        style={{
          x: x1,
          y: y1,
          background: `radial-gradient(circle, rgba(${c1},0.2) 0%, transparent 68%)`,
          filter: "blur(48px)",
        }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[5%] top-[18%] h-[50%] w-[42%] rounded-full"
        style={{
          x: x2,
          y: y2,
          background: `radial-gradient(circle, rgba(${c2},0.18) 0%, transparent 65%)`,
          filter: "blur(56px)",
        }}
        animate={{ scale: [1.06, 0.94, 1.06] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[8%] left-[28%] h-[38%] w-[36%] rounded-full"
        style={{
          x: x3,
          y: y3,
          background: `radial-gradient(circle, rgba(${c3},0.14) 0%, transparent 70%)`,
          filter: "blur(60px)",
        }}
        animate={{ opacity: [0.45, 0.9, 0.45] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            left: `${10 + i * 14}%`,
            top: `${18 + (i % 4) * 16}%`,
            background: i % 2 === 0 ? `rgba(${c2},0.7)` : `rgba(${c1},0.65)`,
            boxShadow: `0 0 14px rgba(${c2},0.55)`,
          }}
          animate={{ y: [0, -20 - i * 3, 0], opacity: [0.25, 1, 0.25], scale: [1, 1.4, 1] }}
          transition={{ duration: 3.8 + i * 0.55, repeat: Infinity, ease: "easeInOut", delay: i * 0.25 }}
        />
      ))}
      {/* subtle grid floor perspective */}
      <div
        className="absolute inset-x-0 bottom-0 h-[40%] opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(148,163,184,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          transform: "perspective(600px) rotateX(58deg)",
          transformOrigin: "center bottom",
          maskImage: "linear-gradient(to top, black, transparent)",
          WebkitMaskImage: "linear-gradient(to top, black, transparent)",
        }}
      />
    </div>
  );
}
