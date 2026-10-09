"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, Cookie, ShieldCheck, Plus } from "lucide-react";
import { Reveal, SectionHead, EASE, spotlight, untilt } from "./ui";

export default function Faq({ ru }: { ru: boolean }) {
  const [open, setOpen] = useState<number | null>(0);

  const trust = ru
    ? [
        { icon: <KeyRound size={20} />, t: "Пароли под scrypt", d: "В базе лежит только хеш — сам пароль не хранится и не восстанавливается." },
        { icon: <Cookie size={20} />, t: "Сессия httpOnly", d: "Вход держится на JWT в httpOnly-cookie: скрипты страницы его не видят." },
        { icon: <ShieldCheck size={20} />, t: "Данные не продаём", d: "SMS вы вставляете сами. Доступа к вашему банку у приложения нет." },
      ]
    : [
        { icon: <KeyRound size={20} />, t: "Passwords under scrypt", d: "Only a hash is stored — the password itself is never kept or recoverable." },
        { icon: <Cookie size={20} />, t: "httpOnly session", d: "Sign-in lives in a JWT inside an httpOnly cookie that page scripts can't read." },
        { icon: <ShieldCheck size={20} />, t: "We don't sell data", d: "You paste SMS yourself. The app has no access to your bank." },
      ];

  const items = ru
    ? [
        { q: "MoneyPulse — это банк?", a: "Нет. Это учёт и AI-советы поверх данных, которые вы вносите сами. Деньги остаются в вашем банке, приложение не может ими распоряжаться." },
        { q: "Как работает импорт из SMS?", a: "Скопируйте SMS от Uzcard, Humo, Click или Payme, откройте раздел «Банки», вставьте текст и подтвердите. Сумма, магазин и категория подставятся сами." },
        { q: "Сколько это стоит?", a: "Основа бесплатна: до 200 операций, бюджеты, цели, семья с чатом, Telegram-бот и 10 AI-запросов в месяц. Pro без лимитов, с импортом CSV и экспортом появится позже." },
        { q: "Можно вести бюджет вместе с семьёй?", a: "Да. Создайте семью и поделитесь кодом приглашения — до 7 человек видят общие бюджеты, цели и ленту трат и переписываются в семейном чате." },
        { q: "Можно ли удалить аккаунт и данные?", a: "Да, в настройках. Аккаунт удаляется вместе со всеми операциями, бюджетами и целями." },
      ]
    : [
        { q: "Is MoneyPulse a bank?", a: "No. It is tracking and AI advice on top of data you enter yourself. Your money stays in your bank and the app can't move it." },
        { q: "How does SMS import work?", a: "Copy an SMS from Uzcard, Humo, Click or Payme, open Banks, paste it and confirm. Amount, merchant and category are filled in for you." },
        { q: "What does it cost?", a: "The core is free: up to 200 transactions, budgets, goals, family with chat, the Telegram bot and 10 AI requests a month. Pro without limits, with CSV import and export, comes later." },
        { q: "Can I budget together with my family?", a: "Yes. Create a family and share the invite code — up to 7 people see shared budgets, goals and the spending feed, and talk in the family chat." },
        { q: "Can I delete my account and data?", a: "Yes, in Settings. The account is removed together with all transactions, budgets and goals." },
      ];

  return (
    <section id="faq" className="rc-section">
      <div className="rc-wrap">
        <SectionHead eyebrow={ru ? "Безопасность" : "Security"} title={ru ? "Ваши деньги — ваши данные" : "Your money, your data"} />
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3" onPointerMove={spotlight} onPointerLeave={untilt}>
          {trust.map((c, i) => (
            <Reveal key={c.t} delay={i * 0.08}>
              <div className="rc-card rc-spot rc-tilt h-full p-6">
                <span className="rc-icon">{c.icon}</span>
                <h3 className="rc-sub mt-5">{c.t}</h3>
                <p className="rc-body mt-2 text-[15px]">{c.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-20 grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <p className="rc-eyebrow">FAQ</p>
            <h2 className="rc-h mt-5">{ru ? "Частые вопросы" : "Common questions"}</h2>
            <p className="rc-body mt-4 text-[15px]">
              {ru ? "Подробности — в документах: " : "Details are in the documents: "}
              <Link href="/privacy" className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">{ru ? "приватность" : "privacy"}</Link>
              {ru ? " и " : " and "}
              <Link href="/terms" className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">{ru ? "условия" : "terms"}</Link>.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <ul className="border-t border-[color:var(--rc-border)]">
              {items.map((it, i) => {
                const isOpen = open === i;
                return (
                  <li key={it.q} className="border-b border-[color:var(--rc-border)]">
                    <h3>
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`faq-${i}`}
                        onClick={() => setOpen(isOpen ? null : i)}
                        className="flex w-full items-center justify-between gap-4 py-5 text-left text-[16px] font-medium text-white"
                      >
                        {it.q}
                        <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.25, ease: EASE }} className="shrink-0 text-[color:var(--rc-ash)]">
                          <Plus size={18} />
                        </motion.span>
                      </button>
                    </h3>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={`faq-${i}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <p className="rc-body max-w-[60ch] pb-5 text-[15px]">{it.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
