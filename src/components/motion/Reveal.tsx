"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export function WordReveal({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          className="mr-[0.28em] inline-block"
          initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: 0.12 + i * 0.06, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

/**
 * Letter-by-letter entrance for page H1s — finer-grained than WordReveal's per-word
 * stagger. Per-char delay auto-shrinks for longer strings (capped at 0.032s/char) so a
 * long title still finishes revealing in roughly a second, not several.
 */
export function LetterReveal({ text, className = "" }: { text: string; className?: string }) {
  const words = text.split(" ");
  const totalChars = Math.max(1, text.replace(/\s/g, "").length);
  const step = Math.min(0.032, 1 / totalChars);
  // Precompute each word's starting global-char-index (pure, no mutation inside the render map below).
  const offsets = words.reduce<number[]>((acc, w, idx) => {
    acc.push(idx === 0 ? 0 : acc[idx - 1] + words[idx - 1].length);
    return acc;
  }, []);
  return (
    <span className={className}>
      {words.map((word, wi) => (
        <span key={wi} className="mr-[0.28em] inline-block whitespace-nowrap">
          {word.split("").map((ch, ci) => (
            <motion.span
              key={ci}
              className="inline-block"
              initial={{ opacity: 0, y: 14, rotate: -6, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, rotate: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.08 + (offsets[wi] + ci) * step, duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            >
              {ch}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) el.classList.add("is-inview");
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className="text-center">
      <p className="mp-label mb-3">{eyebrow}</p>
      <h2 ref={ref} className="mp-section-title text-2xl font-semibold sm:text-3xl md:text-4xl">
        {title}
      </h2>
    </div>
  );
}

export function MagneticButton({
  children,
  className = "",
  onClick,
  primary,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  primary?: boolean;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 280, damping: 22 });
  const sy = useSpring(y, { stiffness: 280, damping: 22 });

  return (
    <motion.button
      ref={ref}
      type="button"
      onClick={onClick}
      style={{ x: sx, y: sy }}
      className={`${primary ? "mp-btn-primary" : "mp-btn-ghost"} px-7 py-3.5 text-sm ${className}`}
      onMouseMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.18);
        y.set((e.clientY - r.top - r.height / 2) * 0.18);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      whileTap={{ scale: 0.98 }}
    >
      {children}
    </motion.button>
  );
}
