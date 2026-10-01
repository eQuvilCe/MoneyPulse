"use client";

import { useState } from "react";
import TiltCard from "@/components/motion/TiltCard";
import { SectionTitle, MagneticButton } from "./shared";

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
      <p className="mt-6 rounded-xl bg-emerald-500/10 px-4 py-2.5 text-center text-sm font-medium text-emerald-300 ring-1 ring-emerald-500/20">
        {ru ? "Готово — напишем, когда Pro откроется ✓" : "You're on the list ✓"}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={ru ? "твой email" : "your email"}
        className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2.5 text-sm outline-none focus:border-cyan-400/40"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="mp-btn-primary shrink-0 px-5 py-2.5 text-sm disabled:opacity-60"
      >
        {ru ? "В лист" : "Join"}
      </button>
      {status === "error" && (
        <p className="absolute mt-12 text-xs text-rose-400">{ru ? "Ошибка — попробуй снова" : "Something went wrong"}</p>
      )}
    </form>
  );
}

export default function Pricing({ ru, onStart }: { ru: boolean; onStart: () => void }) {
  return (
    <section id="pricing" className="border-t border-white/[0.05] py-20">
      <div className="mx-auto max-w-4xl px-6">
        <SectionTitle eyebrow={ru ? "Тарифы" : "Pricing"} title={ru ? "Цены" : "Simple pricing"} />
        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          <TiltCard className="mp-card p-6">
            <p className="mp-label">Free</p>
            <p className="mt-2 font-display text-3xl font-semibold">0</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-400">
              <li>• {ru ? "Операции без лимита" : "Unlimited transactions"}</li>
              <li>• {ru ? "Бюджеты и цели" : "Budgets & goals"}</li>
              <li>• {ru ? "SMS-парсер" : "SMS parser"}</li>
              <li>• {ru ? "10 AI / мес" : "10 AI / month"}</li>
            </ul>
            <MagneticButton onClick={onStart} className="mt-6 w-full">
              {ru ? "Начать" : "Start"}
            </MagneticButton>
          </TiltCard>
          <TiltCard className="mp-card border-cyan-400/25 p-6 shadow-[0_0_40px_rgba(56,189,248,0.08)]">
            <p className="mp-label text-cyan-400">Pro</p>
            <p className="mt-2 font-display text-3xl font-semibold">{ru ? "скоро" : "soon"}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-400">
              <li>• {ru ? "Безлимитный AI + OCR" : "Unlimited AI + OCR"}</li>
              <li>• {ru ? "Несколько счетов" : "Multi-account"}</li>
              <li>• {ru ? "Общие бюджеты" : "Shared budgets"}</li>
              <li>• {ru ? "Экспорт Excel/PDF" : "Excel/PDF export"}</li>
            </ul>
            <WaitlistForm ru={ru} />
          </TiltCard>
        </div>
      </div>
    </section>
  );
}
