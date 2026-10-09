"use client";

import Link from "next/link";
import { Reveal, Mark, Words, Magnetic } from "./ui";
import { Beam } from "./HeroArt";

const FOOTER_BEAMS = [
  { x: 14, w: 420, o: 0.5, d: 16, delay: 0, c: "255,99,99" },
  { x: 41, w: 70, o: 0.9, d: 11, delay: 0, c: "255,177,153" },
  { x: 38, w: 480, o: 0.5, d: 19, delay: 0, c: "255,77,87" },
  { x: 63, w: 24, o: 0.85, d: 9, delay: 0, c: "255,217,204" },
  { x: 60, w: 460, o: 0.4, d: 21, delay: 0, c: "99,161,255" },
];

export default function Footer({
  ru,
  onStart,
  onDemo,
  onLang,
}: {
  ru: boolean;
  onStart: () => void;
  onDemo: () => void;
  onLang: (l: "ru" | "en") => void;
}) {
  return (
    <>
      <section className="relative overflow-hidden">
        {/* a quiet echo of the hero artwork */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0" style={{ background: "radial-gradient(58% 70% at 50% 100%, rgba(4,63,150,0.6) 0%, rgba(6,18,37,0.25) 60%, transparent 85%)" }} />
          <div className="absolute bottom-[-360px] left-1/2 h-[760px] w-[1400px] -translate-x-1/2 -rotate-[34deg]">
            {FOOTER_BEAMS.map((b, i) => (
              <Beam key={i} b={b} />
            ))}
          </div>
          <div className="absolute inset-0" style={{ background: "radial-gradient(40% 46% at 50% 44%, rgba(4,5,6,0.8) 0%, rgba(4,5,6,0.4) 60%, transparent 100%)" }} />
          <div className="absolute inset-x-0 top-0 h-32" style={{ background: "linear-gradient(180deg, var(--rc-bg), transparent)" }} />
        </div>
        <div className="rc-wrap relative py-24 text-center lg:py-32">
          <Reveal>
            <h2 className="rc-h-lg mx-auto max-w-3xl"><Words text={ru ? "Первый расход — за 30 секунд" : "Your first expense in 30 seconds"} /></h2>
            <p className="rc-body mx-auto mt-5 max-w-md text-[18px]">
              {ru ? "Зарегистрируйтесь или загляните в демо — без карты и без обязательств." : "Sign up or peek at the demo — no card and no commitment."}
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-2">
              <Magnetic><button type="button" onClick={onStart} className="rc-btn rc-btn-fill">{ru ? "Открыть MoneyPulse" : "Open MoneyPulse"}</button></Magnetic>
              <Magnetic><button type="button" onClick={onDemo} className="rc-btn rc-btn-dark">{ru ? "Смотреть демо" : "View demo"}</button></Magnetic>
            </div>
            <p className="rc-mono mt-5 text-[color:var(--rc-smoke)]">
              Uzcard <span className="mx-1.5 opacity-50">|</span> Humo <span className="mx-1.5 opacity-50">|</span> Click <span className="mx-1.5 opacity-50">|</span> Payme
            </p>
          </Reveal>
        </div>
      </section>

      <footer className="border-t border-[color:var(--rc-border)]">
        <div className="rc-wrap flex flex-col gap-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Mark />
            <span className="text-[13px] font-medium">MoneyPulse</span>
            <span className="rc-mono text-[color:var(--rc-smoke)]">© {new Date().getFullYear()} · Uzbekistan</span>
          </div>
          <nav aria-label={ru ? "Нижняя навигация" : "Footer"} className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px]">
            <a href="#features" className="rc-link">{ru ? "Возможности" : "Features"}</a>
            <a href="#pricing" className="rc-link">{ru ? "Цены" : "Pricing"}</a>
            <Link href="/privacy" className="rc-link">{ru ? "Приватность" : "Privacy"}</Link>
            <Link href="/terms" className="rc-link">{ru ? "Условия" : "Terms"}</Link>
            <span className="flex items-center gap-1 rounded-lg border border-[color:var(--rc-border)] p-0.5">
              {(["ru", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => onLang(l)}
                  aria-pressed={(l === "ru") === ru}
                  className={`rc-mono rounded-md px-2 py-1 uppercase transition-colors ${(l === "ru") === ru ? "bg-white/10 text-white" : "text-[color:var(--rc-smoke)] hover:text-white"}`}
                >
                  {l}
                </button>
              ))}
            </span>
          </nav>
        </div>
      </footer>
    </>
  );
}
