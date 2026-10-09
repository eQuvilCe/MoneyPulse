"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Scroll-reveal: rises into place once, the first time it enters the viewport.
 * Opacity + transform only — animating filter:blur here is what made scrolling stutter.
 */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Heading whose words rise one after another. Screen readers get the plain sentence. */
export function Words({ text, className = "" }: { text: string; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <span className={className}>{text}</span>;
  const words = text.split(" ");
  return (
    <motion.span
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ staggerChildren: 0.06 }}
    >
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            variants={{ hidden: { y: "105%" }, shown: { y: 0 } }}
            transition={{ duration: 0.75, ease: EASE }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  center = false,
}: {
  eyebrow: string;
  title: string;
  sub?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <Reveal>
        <p className="rc-eyebrow">{eyebrow}</p>
      </Reveal>
      <h2 className="rc-h-lg mt-5">
        <Words text={title} />
      </h2>
      {sub && (
        <Reveal delay={0.15}>
          <p className={`rc-body mt-5 ${center ? "mx-auto" : ""} max-w-xl text-[18px]`}>{sub}</p>
        </Reveal>
      )}
    </div>
  );
}

/** Coral diamond — the brand mark, and one of the few places the accent appears. */
export function Mark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="4.2" y="4.2" width="11.6" height="11.6" rx="2.6" transform="rotate(45 10 10)" fill="#ff6363" />
      <path d="M5.6 10.6h2.2l1.2-2.6 1.9 4.4 1.2-1.8h2.3" fill="none" stroke="#1a0606" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

let tilted: HTMLElement | null = null;

/** Clears the lean of the card the pointer just left. */
export function untilt() {
  if (!tilted) return;
  tilted.style.setProperty("--rx", "0deg");
  tilted.style.setProperty("--ry", "0deg");
  tilted = null;
}

/**
 * One pointermove listener for a whole grid: feeds the cursor light (--mx/--my) and the
 * lean (--rx/--ry) to the .rc-spot card under the pointer. No React state involved.
 */
export function spotlight(e: React.PointerEvent<HTMLElement>) {
  const card = (e.target as HTMLElement).closest<HTMLElement>(".rc-spot");
  if (card !== tilted) untilt();
  if (!card) return;
  const r = card.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  card.style.setProperty("--mx", `${x}px`);
  card.style.setProperty("--my", `${y}px`);
  if (e.pointerType !== "touch") {
    card.style.setProperty("--ry", `${((x / r.width - 0.5) * 7).toFixed(2)}deg`);
    card.style.setProperty("--rx", `${((0.5 - y / r.height) * 7).toFixed(2)}deg`);
    tilted = card;
  }
}

/**
 * Replays a demo for as long as it is on screen: the render prop gets a counter that
 * goes up every `every` ms — use it as a React key so the enter animations run again.
 */
export function Loop({ every, children, className = "" }: { every: number; children: (cycle: number) => ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { margin: "0px 0px -12% 0px" });
  const reduced = useReducedMotion();
  const [cycle, setCycle] = useState(0);
  useEffect(() => {
    if (!visible || reduced) return;
    const id = setInterval(() => {
      if (!document.hidden) setCycle((c) => c + 1);
    }, every);
    return () => clearInterval(id);
  }, [visible, reduced, every]);
  return (
    <div ref={ref} className={className}>
      {children(cycle)}
    </div>
  );
}

/** Button wrapper that is pulled a few pixels toward the pointer. */
export function Magnetic({ children }: { children: ReactNode }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.4 });
  const reduced = useReducedMotion();
  if (reduced) return <>{children}</>;
  return (
    <motion.span
      className="inline-flex"
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (e.pointerType === "touch") return;
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.28);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.4);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.span>
  );
}

/** The light that follows the cursor over the whole page. Moves by transform only. */
export function CursorLight() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce), (hover: none)").matches) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let x = 0;
    let y = 0;
    const step = () => {
      x += (tx - x) * 0.14;
      y += (ty - y) * 0.14;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(step) : 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      if (el.style.opacity !== "1") {
        x = e.clientX;
        y = e.clientY;
        el.style.opacity = "1";
      }
      tx = e.clientX;
      ty = e.clientY;
      if (!raf) raf = requestAnimationFrame(step);
    };
    const onLeave = () => (el.style.opacity = "0");
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);
  return <div ref={ref} className="rc-cursor" aria-hidden="true" />;
}

export { EASE };
