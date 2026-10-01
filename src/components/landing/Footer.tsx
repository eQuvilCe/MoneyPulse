"use client";

import { MagneticButton } from "./shared";

export default function Footer({ ru, onStart }: { ru: boolean; onStart: () => void }) {
  return (
    <>
      <section className="pb-24 text-center">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
          {ru ? "Первый расход — за 30 секунд" : "First expense in 30 seconds"}
        </h2>
        <div className="mt-8 flex justify-center">
          <MagneticButton primary onClick={onStart}>
            {ru ? "Открыть MoneyPulse" : "Open MoneyPulse"}
          </MagneticButton>
        </div>
      </section>
      <footer className="relative z-10 border-t border-white/[0.04] py-8 text-center text-[11px] text-slate-600">
        © {new Date().getFullYear()} MoneyPulse · Uzbekistan
      </footer>
    </>
  );
}
