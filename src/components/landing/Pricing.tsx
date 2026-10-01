"use client";

import TiltCard from "@/components/motion/TiltCard";
import { SectionTitle } from "./shared";

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
            <button type="button" onClick={onStart} className="mp-btn-ghost mt-6 w-full py-2.5 text-sm">
              {ru ? "Начать" : "Start"}
            </button>
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
            <button type="button" onClick={onStart} className="mp-btn-primary mt-6 w-full py-2.5 text-sm">
              {ru ? "В лист ожидания" : "Join waitlist"}
            </button>
          </TiltCard>
        </div>
      </div>
    </section>
  );
}
