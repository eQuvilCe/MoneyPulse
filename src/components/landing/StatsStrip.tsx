"use client";

import { useEffect, useRef, useState } from "react";

function StatCounter({
  value,
  label,
  suffix = "",
  prefix = "",
  active,
}: {
  value: number;
  label: string;
  suffix?: string;
  prefix?: string;
  active: boolean;
}) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 900);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, value]);
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center">
      <p className="font-display text-2xl font-semibold tabular-nums tracking-tight text-white">
        {prefix}
        {n}
        {suffix}
      </p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

export default function StatsStrip({ ru }: { ru: boolean }) {
  const items = ru
    ? [
        { label: "до расхода", value: 10, suffix: "с" },
        { label: "Pulse score", value: 100, suffix: "", prefix: "0–" },
        { label: "языка", value: 2, suffix: "" },
        { label: "AI", value: 24, suffix: "/7" },
      ]
    : [
        { label: "to add expense", value: 10, suffix: "s" },
        { label: "Pulse score", value: 100, suffix: "", prefix: "0–" },
        { label: "languages", value: 2, suffix: "" },
        { label: "AI", value: 24, suffix: "/7" },
      ];
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
      {items.map((it) => (
        <StatCounter key={it.label} {...it} active={on} />
      ))}
    </div>
  );
}
