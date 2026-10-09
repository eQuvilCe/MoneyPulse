"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Reveal, SectionHead, spotlight, untilt } from "./ui";

function WaitlistForm({ ru }: { ru: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "pricing" }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "done") {
    return (
      <p className="flex min-h-[40px] items-center gap-2 text-[14px] text-white" role="status">
        <Check size={16} className="text-[color:var(--rc-green)]" />
        {ru ? "Готово — напишем, когда Pro откроется" : "You're on the list — we'll write when Pro opens"}
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <div className="flex gap-2">
        <label htmlFor="waitlist-email" className="sr-only">Email</label>
        <input
          id="waitlist-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={ru ? "ваш email" : "your email"}
          className="rc-well min-h-[40px] w-full min-w-0 px-3 text-[14px] text-white outline-none placeholder:text-[color:var(--rc-smoke)] focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4)]"
        />
        <button type="submit" disabled={status === "sending"} className="rc-btn rc-btn-fill shrink-0 disabled:opacity-60">
          {status === "sending" ? "…" : ru ? "В лист ожидания" : "Join waitlist"}
        </button>
      </div>
      <p className="mt-2 min-h-[18px] text-[12px] text-[color:var(--rc-coral)]" role="alert">
        {status === "error" ? (ru ? "Не получилось — попробуйте ещё раз" : "That didn't work — please try again") : ""}
      </p>
    </form>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3 text-[15px] text-[color:var(--rc-ash)]">
          <Check size={16} className="mt-[3px] shrink-0 text-[color:var(--rc-mist)]" />
          {t}
        </li>
      ))}
    </ul>
  );
}

export default function Pricing({ ru, onStart }: { ru: boolean; onStart: () => void }) {
  return (
    <section id="pricing" className="rc-section">
      <div className="rc-wrap">
        <SectionHead
          center
          eyebrow={ru ? "Тарифы" : "Pricing"}
          title={ru ? "Основа бесплатна" : "The core is free"}
          sub={ru ? "Учёт, бюджеты, цели, SMS-импорт и Telegram-бот — без оплаты." : "Tracking, budgets, goals, SMS import and the Telegram bot — no payment."}
        />
        <div className="mx-auto mt-14 grid max-w-[880px] grid-cols-1 gap-4 md:grid-cols-2" onPointerMove={spotlight} onPointerLeave={untilt}>
          <Reveal>
            <div className="rc-card rc-spot rc-tilt flex h-full flex-col p-6 sm:p-8">
              <p className="rc-eyebrow">Free</p>
              <p className="mt-5 text-[56px] font-normal leading-none tabular-nums">0<span className="ml-2 text-[16px] text-[color:var(--rc-smoke)]">{ru ? "сум / всегда" : "so'm / forever"}</span></p>
              <List
                items={
                  ru
                    ? ["До 200 операций", "Бюджеты и цели", "SMS-парсер и Telegram-бот", "Семья до 7 человек и чат", "10 AI-запросов в месяц"]
                    : ["Up to 200 transactions", "Budgets & goals", "SMS parser and Telegram bot", "Family of up to 7, with chat", "10 AI requests a month"]
                }
              />
              <button type="button" onClick={onStart} className="rc-btn rc-btn-fill mt-8 w-full">
                {ru ? "Начать бесплатно" : "Start free"}
              </button>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rc-card rc-spot rc-tilt flex h-full flex-col p-6 sm:p-8" style={{ background: "linear-gradient(180deg, var(--rc-ember) 0%, var(--rc-card) 62%)" }}>
              <div className="flex items-center gap-2">
                <p className="rc-eyebrow">Pro</p>
                <span className="rc-badge rc-badge-ai">AI</span>
              </div>
              <p className="mt-5 text-[56px] font-normal leading-none">{ru ? "Скоро" : "Soon"}</p>
              <List
                items={
                  ru
                    ? ["Операции без лимита", "Безлимитный AI и сканер чеков", "Импорт выписки из CSV", "Экспорт в Excel и PDF"]
                    : ["Unlimited transactions", "Unlimited AI and receipt scanning", "CSV statement import", "Excel and PDF export"]
                }
              />
              <div className="mt-auto pt-8">
                <WaitlistForm ru={ru} />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
