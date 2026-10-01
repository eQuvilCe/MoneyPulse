"use client";

import { SectionTitle } from "./shared";

export default function Faq({ ru }: { ru: boolean }) {
  const items = ru
    ? [
        { q: "Это банк?", a: "Нет. Учёт и AI поверх ваших данных. Деньги в вашем банке." },
        { q: "Как SMS?", a: "Копируете SMS Uzcard/Humo → Банки → подтвердить." },
        { q: "Сколько стоит?", a: "База бесплатна. Pro (AI, OCR, экспорт) — скоро." },
      ]
    : [
        { q: "Is this a bank?", a: "No. Tracking + AI on your data. Money stays in your bank." },
        { q: "How SMS?", a: "Copy Uzcard/Humo SMS → Banks → confirm." },
        { q: "Pricing?", a: "Core is free. Pro (AI, OCR, export) coming soon." },
      ];
  return (
    <section className="py-20">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <SectionTitle
          eyebrow={ru ? "Доверие" : "Trust"}
          title={ru ? "Безопасность и приватность" : "Security & privacy"}
        />
        <p className="mt-8 text-base leading-relaxed text-slate-400">
          {ru
            ? "Пароли — scrypt-хеш. Сессия — httpOnly JWT. Мы не продаём данные. SMS вы вставляете сами."
            : "Passwords as scrypt hashes. Session is httpOnly JWT. We never sell data. You paste SMS yourself."}
        </p>
        <div className="mt-4 flex justify-center gap-4 text-xs text-slate-500">
          <a href="/privacy" className="hover:text-cyan-400">
            Privacy
          </a>
          <a href="/terms" className="hover:text-cyan-400">
            Terms
          </a>
        </div>
      </div>
      <div className="mx-auto mt-16 max-w-2xl space-y-3 px-6">
        {items.map((item) => (
          <details
            key={item.q}
            className="rounded-xl border border-white/[0.06] bg-[#0a0e17]/80 px-4 py-3 text-left"
          >
            <summary className="cursor-pointer text-sm font-medium">{item.q}</summary>
            <p className="mt-2 text-sm text-slate-400">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
