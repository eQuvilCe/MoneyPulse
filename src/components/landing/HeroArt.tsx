"use client";

import { useEffect, useRef } from "react";

/**
 * Hero backdrop: a blue radial wash with diagonal coral light-beams cutting across it.
 * Each beam is a soft radial-gradient ellipse (no blur filter, blend mode or mask), so
 * the browser paints it once and afterwards only moves it — see the notes in globals.css.
 * The beam group leans a few pixels toward the pointer and lags behind the scroll.
 */
export const BEAMS: { x: number; w: number; o: number; d: number; delay: number; c: string }[] = [
  { x: 4, w: 420, o: 0.5, d: 9, delay: 0.1, c: "255,99,99" },
  { x: 16, w: 110, o: 0.75, d: 7, delay: 0.25, c: "255,138,112" },
  { x: 18, w: 560, o: 0.45, d: 10, delay: 0.0, c: "255,77,87" },
  { x: 37, w: 26, o: 0.95, d: 6, delay: 0.4, c: "255,217,204" },
  { x: 37, w: 440, o: 0.6, d: 8, delay: 0.15, c: "255,99,99" },
  { x: 52, w: 80, o: 0.9, d: 6, delay: 0.35, c: "255,177,153" },
  { x: 52, w: 500, o: 0.55, d: 9, delay: 0.3, c: "255,90,90" },
  { x: 69, w: 22, o: 0.9, d: 5, delay: 0.5, c: "255,217,204" },
  { x: 66, w: 600, o: 0.42, d: 12, delay: 0.2, c: "99,161,255" },
  { x: 85, w: 140, o: 0.6, d: 7, delay: 0.45, c: "255,125,92" },
];

/** Sparks that climb the beams — fixed values (no Math.random) so server and client render the same markup. */
const SPARKS = Array.from({ length: 22 }, (_, i) => ({
  x: 6 + ((i * 37) % 88),
  d: 3.2 + ((i * 7) % 9) * 0.45,
  delay: -((i * 13) % 50) / 10,
  o: 0.45 + ((i * 5) % 6) / 10,
}));

export function Beam({ b }: { b: (typeof BEAMS)[number] }) {
  return (
    <span
      className="rc-beam"
      style={
        {
          left: `${b.x}%`,
          width: b.w,
          background: `radial-gradient(closest-side, rgba(${b.c},1) 0%, rgba(${b.c},0.55) 38%, rgba(${b.c},0) 100%)`,
          "--o": b.o,
          "--d": `${b.d}s`,
          "--delay": `${b.delay}s`,
        } as React.CSSProperties
      }
    />
  );
}

export default function HeroArt() {
  const beams = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = beams.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    let sy = 0;
    const step = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.setProperty("--rc-px", `${x.toFixed(1)}px`);
      el.style.setProperty("--rc-py", `${(y - sy * 0.12).toFixed(1)}px`);
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.2 ? requestAnimationFrame(step) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      tx = (e.clientX / window.innerWidth - 0.5) * 40;
      ty = (e.clientY / window.innerHeight - 0.5) * 24;
      kick();
    };
    const onScroll = () => {
      // nothing to move once the artwork has left the screen
      if (window.scrollY > 1100) return;
      sy = window.scrollY;
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div className="rc-art" aria-hidden="true">
      <div className="rc-art-wash" />
      <div ref={beams} className="rc-art-beams">
        {BEAMS.map((b, i) => (
          <Beam key={i} b={b} />
        ))}
        <span className="rc-sweep" />
        {SPARKS.map((sp, i) => (
          <span
            key={`s${i}`}
            className="rc-spark"
            style={{ left: `${sp.x}%`, "--sd": `${sp.d}s`, "--sdl": `${sp.delay}s`, "--so": sp.o } as React.CSSProperties}
          />
        ))}
      </div>
      <div className="rc-art-vignette" />
      <div className="rc-art-scrim" />
      <div className="rc-art-grain" />
      <div className="rc-art-fade" />
    </div>
  );
}
