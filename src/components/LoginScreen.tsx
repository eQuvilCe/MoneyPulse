"use client";

import { useApp } from "@/components/AppProvider";
import HeroArt from "@/components/landing/HeroArt";
import { CursorLight, Mark } from "@/components/landing/ui";
import BrandPanel from "@/components/auth/BrandPanel";
import LoginForm from "@/components/auth/LoginForm";

/** Sign-in screen — same Raycast-style system as the landing page (.rc), same beam artwork. */
export default function LoginScreen() {
  const { lang, setLang, setShowAuth } = useApp();
  const ru = lang !== "en";

  return (
    <div className="rc relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-24">
      <HeroArt />
      <div className="rc-ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <CursorLight />

      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="rc-nav mx-auto flex h-[52px] max-w-[1080px] items-center justify-between gap-3 pl-2 pr-2">
          <button type="button" onClick={() => setShowAuth(false)} className="rc-btn rc-btn-dark rc-btn-sm group">
            <span aria-hidden="true" className="inline-block transition-transform group-hover:-translate-x-0.5">←</span>
            {ru ? "На главную" : "Home"}
          </button>
          <span className="flex items-center gap-2.5 lg:hidden">
            <Mark />
            <span className="text-[14px] font-medium">MoneyPulse</span>
          </span>
          <span className="flex items-center gap-1 rounded-lg border border-[color:var(--rc-border)] p-0.5">
            {(["ru", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`rc-mono rounded-md px-2 py-1 uppercase transition-colors ${lang === l ? "bg-white/10 text-white" : "text-[color:var(--rc-smoke)] hover:text-white"}`}
              >
                {l}
              </button>
            ))}
          </span>
        </div>
      </header>

      <main className="grid w-full max-w-[1040px] items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <BrandPanel ru={ru} />
        <LoginForm />
      </main>
    </div>
  );
}
