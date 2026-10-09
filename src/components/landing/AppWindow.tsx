"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

type Row = { id: string; icon: string; title: string; cat: string; amount: number; time: string };

/** Bank SMS texts the demo "pastes", and the transaction each one turns into. */
const SCRIPT: { sms: string; row: Row; pulse: number; tipRu: string; tipEn: string }[] = [
  {
    sms: "HUMO: Oplata 85 000 UZS. KORZINKA TASHKENT. Ostatok 3 214 500",
    row: { id: "s1", icon: "🍕", title: "Korzinka", cat: "еда", amount: -85_000, time: "18:42" },
    pulse: 71,
    tipRu: "Еда: 62% бюджета, до конца месяца 12 дней",
    tipEn: "Food: 62% of budget, 12 days left",
  },
  {
    sms: "UZCARD: Popolnenie 4 200 000 UZS. ZARPLATA. Ostatok 7 414 500",
    row: { id: "s2", icon: "💰", title: "Зарплата", cat: "зарплата", amount: 4_200_000, time: "18:43" },
    pulse: 78,
    tipRu: "Отложите 840 000 сум — это ваши 20%",
    tipEn: "Set aside 840,000 so'm — that's your 20%",
  },
  {
    sms: "CLICK: Oplata 24 000 UZS. YANDEX GO. Ostatok 7 390 500",
    row: { id: "s3", icon: "🚗", title: "Yandex Go", cat: "транспорт", amount: -24_000, time: "18:44" },
    pulse: 77,
    tipRu: "Транспорт +18% к прошлой неделе, пик 18:00–21:00",
    tipEn: "Transport +18% vs last week, peak 18:00–21:00",
  },
];

const BASE: Row[] = [
  { id: "b1", icon: "📱", title: "Beeline", cat: "подписки", amount: -50_000, time: "14:10" },
  { id: "b2", icon: "💊", title: "Аптека", cat: "здоровье", amount: -37_500, time: "12:05" },
  { id: "b3", icon: "💻", title: "Фриланс", cat: "фриланс", amount: 1_500_000, time: "09:30" },
];

const TICK_MS = 55;
const HOLD = 46; // ticks a finished line stays on screen before the next SMS starts
const cycleOf = (i: number) => SCRIPT[i].sms.length + HOLD;
const TOTAL = SCRIPT.reduce((s, _, i) => s + cycleOf(i), 0);

const money = (n: number) => `${n < 0 ? "−" : "+"}${Math.abs(n).toLocaleString("ru-RU")}`;

function Ring({ score }: { score: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative flex h-[88px] w-[88px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 88 88" className="absolute inset-0 -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="6" />
        <motion.circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="#59d499"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="text-center">
        <p className="text-[24px] font-medium leading-none tabular-nums">{score}</p>
        <p className="rc-mono mt-1 text-[10px] text-[color:var(--rc-smoke)]">/100</p>
      </div>
    </div>
  );
}

/**
 * The product, shown working: a bank SMS is typed into the command bar, gets parsed,
 * and lands at the top of the list while Pulse and the AI tip react. Everything is
 * derived from one tick counter, so the loop can never drift out of sync.
 */
export default function AppWindow({ ru }: { ru: boolean }) {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);

  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (reduced) return;
    // Off screen (or in a background tab) the loop is paused — no timers, no re-renders.
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "100px" });
    if (root.current) io.observe(root.current);
    const id = setInterval(() => {
      if (visible && !document.hidden) setTick((t) => t + 1);
    }, TICK_MS);
    return () => {
      clearInterval(id);
      io.disconnect();
    };
  }, [reduced]);

  // Which SMS we are on and how far into its cycle. Reduced motion: frozen on a finished line.
  let rest = reduced ? cycleOf(0) - 1 : tick % TOTAL;
  let idx = 0;
  while (rest >= cycleOf(idx)) {
    rest -= cycleOf(idx);
    idx += 1;
  }
  const cur = SCRIPT[idx];
  const typed = Math.min(cur.sms.length, rest);
  const parsed = rest > cur.sms.length + 5;
  const added = rest > cur.sms.length + 14;

  // Finished lines of this loop stay in the list, newest first.
  const done = SCRIPT.slice(0, added ? idx + 1 : idx).map((s) => s.row).reverse();
  const rows = [...done, ...BASE].slice(0, 5);
  const shown = added ? cur : idx > 0 ? SCRIPT[idx - 1] : null;
  const pulse = shown ? shown.pulse : 72;
  const balance = 3_299_500 + SCRIPT.slice(0, added ? idx + 1 : idx).reduce((s, x) => s + x.row.amount, 0);

  return (
    <div ref={root} className="rc-card-key overflow-hidden" style={{ borderRadius: 12, boxShadow: "var(--rc-key), rgba(0,0,0,0.4) 0 4px 40px 8px, rgba(0,0,0,0.6) 0 40px 80px -20px" }}>
      {/* window chrome */}
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        </div>
        <p className="rc-mono min-w-0 flex-1 truncate text-center text-[color:var(--rc-smoke)]">MoneyPulse · {ru ? "сегодня" : "today"}</p>
        <span className="flex items-center gap-1.5 text-[11px] text-[color:var(--rc-ash)]">
          <span className="rc-live-dot" /> live
        </span>
      </div>

      <div className="grid gap-px bg-white/[0.06] md:grid-cols-[1.45fr_1fr]">
        {/* command bar + list */}
        <div className="min-w-0 bg-[color:var(--rc-card)] p-4">
          <div className="rc-well flex min-h-[52px] items-center gap-3 px-4 py-3" style={{ borderRadius: 12 }}>
            <span className="rc-mono shrink-0 text-[color:var(--rc-smoke)]">SMS</span>
            <p className="min-w-0 flex-1 truncate text-[14px] text-white" aria-hidden="true">
              {cur.sms.slice(0, typed)}
              {typed < cur.sms.length && <span className="rc-caret" />}
            </p>
            <span className={`rc-kbd shrink-0 transition-opacity duration-300 ${parsed ? "opacity-100" : "opacity-30"}`}>↵</span>
          </div>

          <div className={`mt-2 flex min-h-[26px] flex-wrap items-center gap-1.5 transition-opacity duration-300 ${parsed ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
            <span className="rc-badge">{money(cur.row.amount)} {ru ? "сум" : "so'm"}</span>
            <span className="rc-badge">{cur.row.title}</span>
            <span className="rc-badge">{cur.row.icon} {cur.row.cat}</span>
            <span className="rc-mono text-[color:var(--rc-smoke)]">{ru ? "распознано" : "parsed"}</span>
          </div>

          <ul className="mt-2 space-y-1">
            {rows.map((r, i) => {
              const fresh = added && i === 0;
              return (
                <li
                  key={r.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${fresh ? "rc-row-in" : ""}`}
                  style={fresh ? { background: "rgba(255,99,99,0.12)", boxShadow: "inset 0 0 0 1px rgba(255,99,99,0.35)" } : undefined}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[15px]">{r.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium leading-tight">{r.title}</p>
                    <p className="truncate text-[12px] text-[color:var(--rc-smoke)]">{r.cat} · {r.time}</p>
                  </div>
                  <p className={`shrink-0 text-[14px] font-medium tabular-nums ${r.amount > 0 ? "text-[color:var(--rc-green)]" : "text-white"}`}>{money(r.amount)}</p>
                </li>
              );
            })}
          </ul>
        </div>

        {/* pulse + AI */}
        <div className="flex min-w-0 flex-col gap-4 bg-[color:var(--rc-card)] p-4">
          <div className="flex items-center gap-4">
            <Ring score={pulse} />
            <div className="min-w-0">
              <p className="rc-eyebrow">Pulse</p>
              <p className="mt-2 truncate text-[22px] font-medium leading-none tabular-nums">{balance.toLocaleString("ru-RU")}</p>
              <p className="mt-1.5 text-[12px] text-[color:var(--rc-smoke)]">{ru ? "баланс, сум" : "balance, so'm"}</p>
            </div>
          </div>

          <div className="rounded-xl p-3" style={{ background: "var(--rc-ember)", boxShadow: "rgba(255,255,255,0.08) 0 1px 0 0 inset" }}>
            <div className="flex items-center gap-2">
              <span className="rc-badge rc-badge-ai">AI</span>
              <span className="text-[12px] text-white/70">{ru ? "совет на сегодня" : "today's tip"}</span>
            </div>
            <p className="mt-2 min-h-[40px] text-[14px] leading-snug text-white">
              {shown ? (ru ? shown.tipRu : shown.tipEn) : ru ? "Вставьте SMS банка — расход появится сам" : "Paste a bank SMS — the expense appears by itself"}
            </p>
          </div>

          <div className="mt-auto">
            <div className="mb-2 flex justify-between text-[12px] text-[color:var(--rc-smoke)]">
              <span>{ru ? "Бюджет · еда" : "Budget · food"}</span>
              <span className="tabular-nums">{added && idx === 0 ? "62%" : idx > 0 ? "62%" : "57%"}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <motion.div
                className="h-full rounded-full bg-white"
                initial={false}
                animate={{ width: (added && idx === 0) || idx > 0 ? "62%" : "57%" }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* key hints */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/[0.06] px-4 py-2.5 text-[12px] text-[color:var(--rc-smoke)]">
        <span className="flex items-center gap-2"><span className="rc-kbd">↵</span>{ru ? "Добавить" : "Add"}</span>
        <span className="flex items-center gap-2"><span className="rc-kbd">⌘</span><span className="rc-kbd">V</span>{ru ? "Вставить SMS" : "Paste SMS"}</span>
        <span className="ml-auto hidden sm:block">Uzcard · Humo · Click · Payme</span>
      </div>

      <p className="sr-only">
        {ru
          ? "Демонстрация: SMS от банка вставляется в строку, приложение распознаёт сумму, магазин и категорию и добавляет операцию в список."
          : "Demo: a bank SMS is pasted into the bar; the app recognises the amount, merchant and category and adds the transaction to the list."}
      </p>
    </div>
  );
}
