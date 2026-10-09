"use client";

import { useEffect, useRef, useState } from "react";
import { Reveal } from "./ui";

function Counter({ value, active }: { value: number; active: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1100);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, value]);
  return <>{active ? n : value}</>;
}

export default function StatsStrip({ ru }: { ru: boolean }) {
  const items = [
    { prefix: "", value: 10, suffix: ru ? " с" : " s", label: ru ? "чтобы записать расход" : "to log an expense" },
    { prefix: "0–", value: 100, suffix: "", label: ru ? "оценка Pulse" : "Pulse score" },
    { prefix: "", value: 7, suffix: "", label: ru ? "человек в одной семье" : "people in one family" },
    { prefix: "", value: 4, suffix: "", label: ru ? "способа ввода: SMS, чек, Telegram, вручную" : "ways in: SMS, receipt, Telegram, manual" },
  ];
  const ref = useRef<HTMLDListElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setOn(true), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section className="rc-wrap">
      <Reveal>
        <dl ref={ref} className="grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-[color:var(--rc-border)] bg-[color:var(--rc-border)] lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.label} className="flex min-w-0 flex-col gap-2 bg-[color:var(--rc-card)] p-6" style={{ boxShadow: "var(--rc-edge)" }}>
              <dd className="order-1 text-[32px] font-medium leading-none tabular-nums">
                {it.prefix}
                <Counter value={it.value} active={on} />
                {it.suffix}
              </dd>
              <dt className="order-2 text-[14px] leading-snug text-[color:var(--rc-ash)]">{it.label}</dt>
            </div>
          ))}
        </dl>
      </Reveal>
    </section>
  );
}
