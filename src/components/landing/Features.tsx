"use client";

import { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { MessageSquareText, Activity, ScanLine, TrendingUp, Target, Users, Smartphone } from "lucide-react";
import { Reveal, SectionHead, EASE, Loop, spotlight, untilt } from "./ui";

function Card({
  icon,
  title,
  text,
  children,
  className = "",
  delay = 0,
  every = 6000,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  /** how often the demo inside replays, ms */
  every?: number;
}) {
  return (
    <Reveal delay={delay} className={className}>
      <article className="rc-card rc-spot rc-tilt flex h-full min-w-0 flex-col overflow-hidden p-6">
        <div className="flex items-start gap-4">
          <span className="rc-icon">{icon}</span>
          <div className="min-w-0">
            <h3 className="rc-sub">{title}</h3>
            <p className="rc-body mt-2 text-[15px]">{text}</p>
          </div>
        </div>
        {/* the demo replays every few seconds while the card is on screen */}
        <Loop every={every} className="mt-6 flex min-w-0 flex-1 flex-col justify-end">
          {(cycle) => <div key={cycle}>{children}</div>}
        </Loop>
      </article>
    </Reveal>
  );
}

/** Enter animation for a demo element; it replays whenever <Loop> remounts the demo. */
function useInView() {
  const reduced = useReducedMotion();
  return (delay: number, from: Record<string, number | string>, to: Record<string, number | string>) =>
    reduced
      ? {}
      : {
          initial: from,
          animate: to,
          transition: { duration: 0.7, delay, ease: EASE },
        };
}

export default function Features({ ru }: { ru: boolean }) {
  const inView = useInView();
  const fade = (d: number) => inView(d, { opacity: 0, y: 10 }, { opacity: 1, y: 0 });

  return (
    <section id="features" className="rc-section">
      <div className="rc-wrap">
        <SectionHead
          eyebrow={ru ? "Возможности" : "Features"}
          title={ru ? "Учёт, который ведёт себя сам" : "Tracking that runs itself"}
          sub={
            ru
              ? "Меньше ручного ввода, больше ясности: приложение само разбирает SMS и чеки и показывает, что с этим делать."
              : "Less typing, more clarity: the app parses your SMS and receipts and tells you what to do about them."
          }
        />

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-6" onPointerMove={spotlight} onPointerLeave={untilt}>
          {/* SMS → expense */}
          <Card
            className="md:col-span-4"
            every={5200}
            icon={<MessageSquareText size={20} />}
            title={ru ? "SMS → расход" : "SMS → expense"}
            text={ru ? "Скопируйте SMS Uzcard, Humo, Click или Payme. Сумма, магазин и категория распознаются сами." : "Copy an Uzcard, Humo, Click or Payme SMS. Amount, merchant and category are recognised for you."}
          >
            <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <motion.div {...fade(0.1)} className="rc-well min-w-0 p-4" style={{ borderRadius: 12 }}>
                <p className="rc-mono text-[color:var(--rc-smoke)]">HUMO · 18:42</p>
                <p className="mt-2 text-[14px] leading-snug text-white [overflow-wrap:anywhere]">Oplata 85 000 UZS. KORZINKA TASHKENT. Ostatok 3 214 500</p>
              </motion.div>
              <motion.span {...fade(0.3)} className="rc-kbd mx-auto rotate-90 sm:rotate-0" aria-hidden="true">→</motion.span>
              <div className="min-w-0 space-y-2">
                {[
                  [ru ? "Сумма" : "Amount", "−85 000 " + (ru ? "сум" : "so'm")],
                  [ru ? "Магазин" : "Merchant", "Korzinka"],
                  [ru ? "Категория" : "Category", "🍕 " + (ru ? "еда" : "food")],
                ].map(([k, v], i) => (
                  <motion.div key={k} {...fade(0.45 + i * 0.12)} className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--rc-border)] px-3 py-2">
                    <span className="text-[13px] text-[color:var(--rc-smoke)]">{k}</span>
                    <span className="truncate text-[14px] font-medium tabular-nums">{v}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </Card>

          {/* AI Pulse */}
          <Card
            className="md:col-span-2"
            delay={0.08}
            every={7000}
            icon={<Activity size={20} />}
            title="AI Pulse"
            text={ru ? "Оценка финансов от 0 до 100 и один понятный совет на сегодня." : "A 0–100 score for your finances and one clear tip for today."}
          >
            <div className="flex items-end gap-1.5" aria-hidden="true">
              {[38, 52, 47, 61, 58, 70, 66, 74, 72, 81].map((h, i) => (
                <motion.span key={i} {...inView(0.05 * i, { opacity: 0, y: 12 }, { opacity: 1, y: 0 })} className="flex flex-1 items-end" style={{ height: 84 }}>
                  <span
                    className={`rc-bar block w-full rounded-sm ${i === 9 ? "bg-[color:var(--rc-coral)]" : "bg-white/20"}`}
                    style={{ height: h, "--bd": `${-i * 0.23}s` } as React.CSSProperties}
                  />
                </motion.span>
              ))}
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <span className="text-[32px] font-medium leading-none tabular-nums">81</span>
              <span className="rc-mono text-[color:var(--rc-green)]">{ru ? "+9 за неделю" : "+9 this week"}</span>
            </div>
          </Card>

          {/* Receipt scan */}
          <Card
            className="md:col-span-2"
            delay={0.04}
            every={9000}
            icon={<ScanLine size={20} />}
            title={ru ? "Сканер чеков" : "Receipt scan"}
            text={ru ? "Сфотографируйте чек — сумма и категория заполнятся за секунды." : "Snap a receipt — amount and category are filled in within seconds."}
          >
            <div className="rc-well relative mx-auto w-full max-w-[220px] overflow-hidden px-4 py-4" style={{ borderRadius: 10 }} aria-hidden="true">
              <p className="rc-mono text-center text-[color:var(--rc-ash)]">MAKRO · #4471</p>
              <div className="mt-3 space-y-1.5">
                {[["Non", "6 000"], ["Sut 1L", "14 500"], ["Guruch 2kg", "38 000"]].map(([n, p]) => (
                  <div key={n} className="rc-mono flex justify-between text-[color:var(--rc-smoke)]"><span>{n}</span><span>{p}</span></div>
                ))}
              </div>
              <div className="rc-mono mt-3 flex justify-between border-t border-dashed border-white/15 pt-2 text-white"><span>{ru ? "ИТОГО" : "TOTAL"}</span><span>58 500</span></div>
              <span className="rc-scanline" />
            </div>
          </Card>

          {/* Forecast */}
          <Card
            className="md:col-span-2"
            delay={0.08}
            every={4600}
            icon={<TrendingUp size={20} />}
            title={ru ? "Прогноз" : "Forecast"}
            text={ru ? "Где вы окажетесь к концу месяца, если ничего не менять." : "Where you'll land by month-end if nothing changes."}
          >
            <svg viewBox="0 0 300 96" className="w-full overflow-visible" aria-hidden="true">
              <line x1="0" y1="95" x2="300" y2="95" stroke="rgba(255,255,255,0.08)" />
              <motion.path
                d="M0 22 C30 26 44 40 70 42 C96 44 110 58 138 60 C156 61 168 66 180 68"
                fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round"
                {...inView(0.1, { pathLength: 0 }, { pathLength: 1 })}
              />
              <motion.path
                d="M180 68 C210 74 240 80 300 86"
                fill="none" stroke="#ff6363" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 6"
                {...inView(0.75, { opacity: 0 }, { opacity: 1 })}
              />
              <circle cx="180" cy="68" r="4" fill="#fff" />
              <text x="180" y="52" textAnchor="middle" fill="#9c9c9d" fontSize="11" fontFamily="var(--font-mono)">{ru ? "сегодня" : "today"}</text>
              <text x="298" y="74" textAnchor="end" fill="#ff6363" fontSize="11" fontFamily="var(--font-mono)">{ru ? "30-е: 412 тыс" : "30th: 412K"}</text>
            </svg>
          </Card>

          {/* Budgets & goals */}
          <Card
            className="md:col-span-2"
            delay={0.12}
            every={5600}
            icon={<Target size={20} />}
            title={ru ? "Бюджеты и цели" : "Budgets & goals"}
            text={ru ? "Лимиты по категориям и копилки с прогрессом. Предупредим до перерасхода." : "Category limits and savings goals with progress. A warning before you overspend."}
          >
            <div className="space-y-3">
              {[
                [ru ? "🍕 Еда" : "🍕 Food", 62, false],
                [ru ? "🚗 Транспорт" : "🚗 Transport", 91, true],
                [ru ? "🎯 На отпуск" : "🎯 Vacation", 45, false],
              ].map(([name, pct, warn], i) => (
                <div key={String(name)}>
                  <div className="mb-1.5 flex justify-between text-[13px]">
                    <span className="text-[color:var(--rc-ash)]">{name}</span>
                    <span className={`tabular-nums ${warn ? "text-[color:var(--rc-coral)]" : "text-[color:var(--rc-smoke)]"}`}>{pct}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                    <motion.div
                      {...inView(0.15 + i * 0.12, { width: "0%" }, { width: `${pct}%` })}
                      className={`h-full rounded-full ${warn ? "bg-[color:var(--rc-coral)]" : "bg-white"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Family */}
          <Card
            className="md:col-span-3"
            every={6400}
            icon={<Users size={20} />}
            title={ru ? "Семья и чат" : "Family & chat"}
            text={ru ? "До 7 человек по коду приглашения: общие бюджеты, цели, лента трат и чат." : "Up to 7 people by invite code: shared budgets, goals, a spending feed and a chat."}
          >
            <div className="space-y-2" aria-hidden="true">
              <motion.div {...fade(0.1)} className="flex items-end gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold">М</span>
                <p className="rounded-2xl rounded-bl-md bg-white/[0.06] px-3 py-2 text-[14px]">{ru ? "Купила продукты на 250 000" : "Got groceries for 250,000"}</p>
              </motion.div>
              <motion.div {...fade(0.35)} className="flex justify-end">
                <p className="rounded-2xl rounded-br-md bg-[color:var(--rc-mist)] px-3 py-2 text-[14px] text-[#18191a]">{ru ? "Отлично, я оплачу интернет" : "Great, I'll pay the internet"}</p>
              </motion.div>
              <motion.div {...fade(0.9)} className="flex items-end gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold">Т</span>
                <p className="relative rounded-2xl rounded-bl-md bg-white/[0.06] px-3 py-2 text-[14px]">
                  <motion.span className="rc-dots absolute inset-0 flex items-center justify-center" {...inView(2.2, { opacity: 1 }, { opacity: 0 })}><i /><i /><i /></motion.span>
                  <motion.span className="inline-block" {...inView(2.3, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1 })}>👍</motion.span>
                </p>
              </motion.div>
            </div>
          </Card>

          {/* Everywhere */}
          <Card
            className="md:col-span-3"
            delay={0.08}
            every={8000}
            icon={<Smartphone size={20} />}
            title={ru ? "Всегда под рукой" : "Always at hand"}
            text={ru ? "Ставится на главный экран как приложение, а Telegram-бот принимает траты одной строкой и присылает уведомления." : "Installs to your home screen like an app, and the Telegram bot takes expenses in one line and sends notifications."}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["PWA", ru ? "на экран" : "home screen"],
                ["Telegram", ru ? "бот и уведомления" : "bot & alerts"],
                ["CSV", ru ? "импорт в Pro" : "import in Pro"],
                ["RU · EN", ru ? "два языка" : "two languages"],
              ].map(([k, v], i) => (
                <motion.div key={k} {...fade(0.1 + i * 0.08)} className="min-w-0 rounded-lg border border-[color:var(--rc-border)] px-3 py-3">
                  <p className="truncate text-[14px] font-medium">{k}</p>
                  <p className="mt-1 truncate text-[12px] text-[color:var(--rc-smoke)]">{v}</p>
                </motion.div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
