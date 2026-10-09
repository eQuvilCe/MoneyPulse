"use client";

import { useEffect, useState, useRef } from "react";
import { flushSync } from "react-dom";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, animate, useMotionValue } from "framer-motion";
import { addTransaction, getBudgetStatus, loadDataAsync } from "@/lib/storage";
import { CATEGORY_ICONS, FinanceData, dateKey, formatMoney } from "@/lib/types";
import { answerAIChat, getDoctorGreeting, getHealthScore } from "@/lib/ai";
import { parseQuickEntry } from "@/lib/telegramParse";
import { useApp } from "@/components/AppProvider";
import { onCelebrate, onDataChange } from "@/lib/events";

/** Where the user parked the buddy: which edge, and how far from the bottom (px). */
type Pos = { side: "left" | "right"; bottom: number };
const POS_KEY = "mp-buddy-pos";
const EDGE = 16;
const SIZE = 64;

/** Keeps the buddy on screen and, on phones, above the bottom tab bar it used to cover. */
function clampBottom(bottom: number) {
  const min = window.innerWidth < 1024 ? 92 : EDGE;
  const max = Math.max(min, window.innerHeight - SIZE - 72);
  return Math.round(Math.min(max, Math.max(min, bottom)));
}

type Nudge = { text: string; query?: string };

/**
 * What is actually worth saying right now, most urgent first — computed from the user's
 * data and the page they are on, no AI request involved. Empty when nothing stands out.
 */
function smartNudges(data: FinanceData, path: string, ru: boolean): Nudge[] {
  const out: Nudge[] = [];
  const cur = data.settings.currency;
  const today = dateKey();
  const budgets = getBudgetStatus(data);

  for (const b of budgets.filter((x) => x.over).slice(0, 2)) {
    out.push({
      text: ru ? `Бюджет «${b.category}» превышен на ${formatMoney(b.spent - b.limit, cur)}` : `"${b.category}" budget is over by ${formatMoney(b.spent - b.limit, cur)}`,
      query: "Бюджеты",
    });
  }
  for (const b of budgets.filter((x) => !x.over && x.percent >= 80).slice(0, 2)) {
    out.push({
      text: ru ? `«${b.category}»: уже ${b.percent}% бюджета, осталось ${formatMoney(b.remaining, cur)}` : `"${b.category}": ${b.percent}% of budget used, ${formatMoney(b.remaining, cur)} left`,
      query: "Бюджеты",
    });
  }

  const hasToday = data.transactions.some((t) => t.date === today);
  if (!hasToday && new Date().getHours() >= 18) {
    out.push({ text: ru ? "Сегодня ещё нет записей. Напишите мне, например: кофе 25 000" : "Nothing logged today yet. Tell me, e.g.: coffee 25 000" });
  }

  const day = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return dateKey(d);
  };
  const spent = (from: string, to?: string) =>
    data.transactions.reduce((s, t) => (t.type === "expense" && t.date >= from && (!to || t.date <= to) ? s + t.amount : s), 0);
  const thisWeek = spent(day(6));
  const lastWeek = spent(day(13), day(7));
  if (lastWeek > 0 && thisWeek > lastWeek * 1.25) {
    out.push({
      text: ru ? `Расходы за неделю выросли на ${Math.round((thisWeek / lastWeek - 1) * 100)}%` : `Spending is up ${Math.round((thisWeek / lastWeek - 1) * 100)}% this week`,
      query: "Топ расходов",
    });
  } else if (lastWeek > 0 && thisWeek < lastWeek * 0.8) {
    out.push({ text: ru ? `Расходы за неделю ниже на ${Math.round((1 - thisWeek / lastWeek) * 100)}% — так держать` : `Spending is down ${Math.round((1 - thisWeek / lastWeek) * 100)}% this week — nice` });
  }

  const nearGoal = data.goals.find((g) => g.targetAmount > 0 && g.currentAmount < g.targetAmount && g.currentAmount / g.targetAmount >= 0.8);
  if (nearGoal) {
    out.push({
      text: ru ? `До цели «${nearGoal.title}» осталось ${formatMoney(nearGoal.targetAmount - nearGoal.currentAmount, cur)}` : `${formatMoney(nearGoal.targetAmount - nearGoal.currentAmount, cur)} to go for "${nearGoal.title}"`,
      query: "Цели",
    });
  }

  // a hint for the page that is open, when there is nothing more urgent about it
  const page: Record<string, Nudge> = ru
    ? {
        "/budgets": { text: budgets.length ? "Нажмите — расскажу, где бюджеты под угрозой" : "Бюджетов пока нет. Начните с категории, где тратите больше всего", query: "Бюджеты" },
        "/goals": { text: data.goals.length ? "Нажмите — посчитаю, когда закроются цели" : "Поставьте первую цель — буду следить за прогрессом", query: "Цели" },
        "/forecast": { text: "Нажмите — объясню прогноз простыми словами", query: "Прогноз месяца" },
        "/analytics": { text: "Нажмите — покажу, на что уходит больше всего", query: "Топ расходов" },
        "/expenses": { text: "Можно не заполнять форму: напишите мне «такси 24 000»" },
        "/income": { text: "Доход можно записать одной строкой: «+5 млн зарплата»" },
        "/family": { text: "Общие бюджеты и чат — всё в этой вкладке" },
        "/": { text: "Нажмите — дам короткий отчёт по месяцу", query: "Полный отчёт" },
      }
    : {
        "/budgets": { text: budgets.length ? "Tap — I'll show which budgets are at risk" : "No budgets yet. Start with your biggest category", query: "Бюджеты" },
        "/goals": { text: data.goals.length ? "Tap — I'll estimate when your goals close" : "Set a first goal and I'll track it", query: "Цели" },
        "/forecast": { text: "Tap — I'll explain the forecast in plain words", query: "Прогноз месяца" },
        "/analytics": { text: "Tap — I'll show where most money goes", query: "Топ расходов" },
        "/expenses": { text: "Skip the form: just tell me “taxi 24 000”" },
        "/income": { text: "Log income in one line: “+5 mln salary”" },
        "/family": { text: "Shared budgets and chat live in this tab" },
        "/": { text: "Tap — I'll give a short report on the month", query: "Полный отчёт" },
      };
  if (page[path]) out.push(page[path]);
  return out;
}

/** "кофе 25 000" is an entry; "сколько за 7 дней?" is a question that merely contains a number. */
function asQuickEntry(text: string) {
  if (/[?？]/.test(text)) return null;
  if (/^\s*(сколько|как|какой|какая|какие|что|почему|когда|где|покажи|дай|расскажи|прогноз|отчёт|отчет|баланс|бюджет|цели|топ|мой|how|what|why|when|show|give|tell)/i.test(text)) return null;
  const entry = parseQuickEntry(text);
  if (!entry) return null;
  // a bare small number ("7", "30") is far more likely part of a question than a purchase
  if (entry.amount < 100 && !/^\s*\+/.test(text)) return null;
  return entry;
}

type Mood = "happy" | "calm" | "worried";

const MOOD_GRADIENT: Record<Mood, string> = {
  happy: "from-emerald-400 via-teal-400 to-cyan-500",
  calm: "from-amber-400 via-orange-400 to-amber-500",
  worried: "from-rose-400 via-rose-500 to-red-500",
};

const MOOD_GLOW: Record<Mood, string> = {
  happy: "shadow-emerald-500/40",
  calm: "shadow-amber-500/40",
  worried: "shadow-rose-500/40",
};

const MOOD_BOUNCE: Record<Mood, { y: number[]; duration: number }> = {
  happy: { y: [0, -6, 0], duration: 2.2 },
  calm: { y: [0, -4, 0], duration: 3 },
  worried: { y: [0, -2, 0], duration: 4.2 },
};

const MOOD_BLINK_DELAY: Record<Mood, number> = { happy: 1.4, calm: 2, worried: 3.2 };

// label = i18n key shown on the chip; query = the Russian phrase actually sent to the
// chat (the rule-based fallback in src/lib/ai.ts matches on Russian keywords regardless of UI language).
const QUICK: { label: "quickFullReport" | "quickToday" | "quickMonthForecast" | "quickBalance" | "quickBudgets" | "quickTopExpenses" | "quickGoals" | "quickAdvice" | "quickRecentTx" | "quickMyPulse"; query: string }[] = [
  { label: "quickFullReport", query: "Полный отчёт" },
  { label: "quickToday", query: "Сколько сегодня?" },
  { label: "quickMonthForecast", query: "Прогноз месяца" },
  { label: "quickBalance", query: "Баланс" },
  { label: "quickBudgets", query: "Бюджеты" },
  { label: "quickTopExpenses", query: "Топ расходов" },
  { label: "quickGoals", query: "Цели" },
  { label: "quickAdvice", query: "Дай совет" },
  { label: "quickRecentTx", query: "Последние операции" },
  { label: "quickMyPulse", query: "Мой пульс" },
];

export default function AIBuddy() {
  const { tr, lang } = useApp();
  const ru = lang !== "en";
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<FinanceData | null>(null);
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [bounce, setBounce] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // ——— dragging: the buddy can be parked on either edge, at any height ———
  const [pos, setPos] = useState<Pos | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(POS_KEY) || "null") as Pos | null;
      if (saved && (saved.side === "left" || saved.side === "right") && Number.isFinite(saved.bottom)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the saved spot lives in localStorage, readable only after mount
        setPos({ side: saved.side, bottom: clampBottom(saved.bottom) });
      }
    } catch {
      /* ignore a corrupted value */
    }
    // rotating the phone or resizing the window must not leave the buddy off screen
    const onResize = () => setPos((p) => (p ? { ...p, bottom: clampBottom(p.bottom) } : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onDragEnd = () => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const side: Pos["side"] = r.left + r.width / 2 < window.innerWidth / 2 ? "left" : "right";
    const bottom = clampBottom(window.innerHeight - r.bottom);
    const next = { side, bottom };
    // Move the element's real position to the snapped spot, then let the transform
    // glide from where the finger let go to zero — it "flies" to the nearest edge.
    const newLeft = side === "left" ? EDGE : window.innerWidth - EDGE - r.width;
    const newTop = window.innerHeight - bottom - r.height;
    flushSync(() => setPos(next));
    x.set(r.left - newLeft);
    y.set(r.top - newTop);
    animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
    animate(y, 0, { type: "spring", stiffness: 420, damping: 32 });
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(next));
    } catch {
      /* private mode */
    }
    // the click that ends a drag must not open the chat
    window.setTimeout(() => (dragged.current = false), 60);
  };

  const health = data ? getHealthScore(data) : 0;
  const mood: Mood = !data ? "calm" : health >= 70 ? "happy" : health >= 40 ? "calm" : "worried";
  const moodRef = useRef<Mood>(mood);
  const trRef = useRef(tr);
  // latest inputs for the nudge timer, which is set up once
  const live = useRef({ data, pathname, ru, open });
  const nudgeIndex = useRef(0);
  useEffect(() => {
    moodRef.current = mood;
    trRef.current = tr;
    live.current = { data, pathname, ru, open };
  }, [mood, tr, data, pathname, ru, open]);

  const showNudge = (n: Nudge | string, ms = 5200) => {
    setNudge(typeof n === "string" ? { text: n } : n);
    setBounce(true);
    window.setTimeout(() => setNudge(null), ms);
  };

  useEffect(() => {
    loadDataAsync().then((d) => {
      setData(d);
      setMessages([{ role: "assistant", text: getDoctorGreeting(d) }]);
    });
    // Speak up with something specific (a budget about to burst, a quiet day, a hint for
    // this page), cycling through what is relevant; fall back to a mood line otherwise.
    const speak = () => {
      const { data: d, pathname: path, ru: isRu, open: chatOpen } = live.current;
      if (chatOpen || document.hidden) return;
      const smart = d ? smartNudges(d, path, isRu) : [];
      if (smart.length) {
        showNudge(smart[nudgeIndex.current++ % smart.length]);
        return;
      }
      const m = moodRef.current;
      const k = trRef.current;
      const lines =
        m === "happy"
          ? [k("buddyNudgeHappy1"), k("buddyNudgeHappy2")]
          : m === "worried"
            ? [k("buddyNudgeWorried1"), k("buddyNudgeWorried2")]
            : [k("buddyNudgeCalm1"), k("buddyNudgeCalm2")];
      showNudge(lines[Math.floor(Math.random() * lines.length)]);
    };
    const first = window.setTimeout(speak, 5000);
    const t = setInterval(speak, 26000);
    // stay current: a new entry may have tipped a budget over
    const offData = onDataChange(() => void loadDataAsync().then(setData));
    const offCelebrate = onCelebrate(() => {
      setCelebrating(true);
      showNudge(trRef.current("buddyCelebrate"), 3000);
      window.setTimeout(() => setCelebrating(false), 1400);
    });
    const onTutorial = () => {
      setOpen(true);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: trRef.current("buddyTutorial"),
        },
      ]);
    };
    window.addEventListener("mp-open-ai-tutorial", onTutorial);
    return () => {
      clearTimeout(first);
      clearInterval(t);
      offData();
      offCelebrate();
      window.removeEventListener("mp-open-ai-tutorial", onTutorial);
    };
  }, []);

  useEffect(() => {
    if (bounce) {
      const t = setTimeout(() => setBounce(false), 800);
      return () => clearTimeout(t);
    }
  }, [bounce]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing, open]);

  const send = async (text: string) => {
    if (!text.trim() || !data) return;
    const history = messages;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setTyping(true);

    // "кофе 25 000" → log it right here, no form and no AI request spent
    const entry = asQuickEntry(text);
    if (entry) {
      try {
        const before = data.transactions.length;
        await addTransaction({ ...entry, date: dateKey() });
        const fresh = await loadDataAsync();
        setData(fresh);
        if (fresh.transactions.length <= before) {
          // the server refused it (plan limit, validation) — the reason is shown as a toast
          setMessages((m) => [...m, { role: "assistant", text: ru ? "Не получилось записать — причина в уведомлении выше." : "Couldn't log that — see the notice above." }]);
        } else {
          const cur = fresh.settings.currency;
          const b = getBudgetStatus(fresh).find((x) => x.category === entry.category);
          const line = `✅ ${entry.type === "income" ? "+" : "−"}${formatMoney(entry.amount, cur)} · ${CATEGORY_ICONS[entry.category] || "📦"} ${entry.category}`;
          const budgetLine =
            entry.type === "expense" && b
              ? ru
                ? `\nБюджет «${b.category}»: ${b.percent}%${b.over ? ` — превышен на ${formatMoney(b.spent - b.limit, cur)}` : `, осталось ${formatMoney(b.remaining, cur)}`}`
                : `\n"${b.category}" budget: ${b.percent}%${b.over ? ` — over by ${formatMoney(b.spent - b.limit, cur)}` : `, ${formatMoney(b.remaining, cur)} left`}`
              : "";
          setMessages((m) => [...m, { role: "assistant", text: `${line}\n${entry.description}${budgetLine}` }]);
        }
      } catch {
        setMessages((m) => [...m, { role: "assistant", text: ru ? "Не получилось записать, попробуйте ещё раз." : "Couldn't log that, please try again." }]);
      }
      setTyping(false);
      return;
    }

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      if (res.ok) {
        const json = await res.json();
        setMessages((m) => [...m, { role: "assistant", text: json.reply }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", text: answerAIChat(text, data) }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: answerAIChat(text, data) }]);
    }
    setTyping(false);
  };

  const bounceAnim = MOOD_BOUNCE[mood];

  return (
    <>
      {/* Floating 3D buddy — "Пульси": face/color/energy follow your financial health */}
      {/* Drag it anywhere; on release it snaps to the nearest edge and remembers the spot.
          Default spot on phones sits above the bottom tab bar instead of on top of it. */}
      <motion.div
        ref={wrapRef}
        drag
        dragMomentum={false}
        dragElastic={0.12}
        onDragStart={() => {
          dragged.current = true;
          setNudge(null);
        }}
        onDragEnd={onDragEnd}
        whileDrag={{ scale: 1.08, cursor: "grabbing" }}
        style={{
          x,
          y,
          touchAction: "none",
          ...(pos ? { bottom: pos.bottom, [pos.side]: EDGE } : null),
        }}
        className={`fixed z-50 ${pos ? "" : "bottom-[calc(92px+env(safe-area-inset-bottom))] right-4 lg:bottom-8 lg:right-8"}`}
      >
        <AnimatePresence>
          {nudge && (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              onClick={() => {
                const q = nudge.query;
                setNudge(null);
                setOpen(true);
                if (q) void send(q);
              }}
              className={`absolute -top-3 w-max max-w-[min(240px,calc(100vw-48px))] -translate-y-full rounded-2xl border border-white/10 bg-[#0e1420] px-3 py-2 text-left text-xs font-medium text-slate-200 shadow-xl ${
                pos?.side === "left" ? "left-0 rounded-bl-sm" : "right-0 rounded-br-sm"
              }`}
            >
              {nudge.text}
            </motion.button>
          )}
        </AnimatePresence>
        <motion.button
          aria-label={ru ? "Открыть помощника Пульси (можно перетаскивать)" : "Open the Pulse assistant (draggable)"}
          onClick={() => {
            if (!dragged.current) setOpen(true);
          }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl perspective-1000"
          style={{ perspective: 800 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          animate={
            celebrating
              ? { y: [0, -16, 0, -8, 0], rotate: [0, -10, 10, -6, 0], scale: [1, 1.12, 1] }
              : bounce
                ? { y: [0, -10, 0], rotate: [0, -6, 6, 0] }
                : { y: bounceAnim.y }
          }
          transition={
            celebrating
              ? { duration: 0.9 }
              : bounce
                ? { duration: 0.6 }
                : { y: { duration: bounceAnim.duration, repeat: Infinity, ease: "easeInOut" } }
          }
        >
          <motion.div
            className={`relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${MOOD_GRADIENT[mood]} shadow-2xl ${MOOD_GLOW[mood]}`}
            style={{ transformStyle: "preserve-3d" }}
            animate={{
              rotateY: [0, 8, 0, -8, 0],
              rotateX: [0, 4, 0, -4, 0],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* face */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="flex gap-1.5">
                <motion.span
                  className="h-2 w-2 rounded-full bg-slate-900"
                  animate={{ scaleY: [1, 0.2, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, repeatDelay: MOOD_BLINK_DELAY[mood] }}
                />
                <motion.span
                  className="h-2 w-2 rounded-full bg-slate-900"
                  animate={{ scaleY: [1, 0.2, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, repeatDelay: MOOD_BLINK_DELAY[mood], delay: 0.05 }}
                />
              </div>
              {mood === "happy" ? (
                <div
                  className="mt-1.5 h-2.5 w-3.5 rounded-full border-2 border-transparent"
                  style={{ borderBottomColor: "#0f172a" }}
                />
              ) : mood === "worried" ? (
                <div
                  className="mt-2 h-2 w-3 rounded-full border-2 border-transparent"
                  style={{ borderTopColor: "#0f172a" }}
                />
              ) : (
                <motion.div
                  className="mt-1 h-1 w-3 rounded-full bg-slate-900/80"
                  animate={{ width: ["12px", "8px", "12px"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>
            {/* glow ring */}
            <motion.span
              className="absolute inset-0 rounded-2xl ring-2 ring-white/30"
              animate={{ opacity: [0.4, 0.8, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[10px] font-bold text-emerald-400 ring-2 ring-emerald-400/50">
              AI
            </span>
          </motion.div>
        </motion.button>
      </motion.div>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.92, rotateX: 8 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              exit={{ opacity: 0, y: 30, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              style={{ transformPerspective: 1000 }}
              className="fixed bottom-[calc(96px+env(safe-area-inset-bottom))] right-4 z-[70] flex h-[min(520px,calc(100dvh-140px))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0f1a]/95 shadow-2xl shadow-black/50 backdrop-blur-xl lg:right-8"
            >
              {/* header */}
              <div className="flex items-center gap-3 border-b border-white/5 bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-500/30">
                  <div className="flex flex-col items-center scale-75">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                    </div>
                    <div className="mt-0.5 h-0.5 w-2 rounded-full bg-slate-900/80" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{tr("pulse")}</p>
                  <p className="text-[11px] text-emerald-400/80">
                    {tr("buddyAssistantLabel", { n: health })}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* messages */}
              <div className="flex-1 space-y-2.5 overflow-y-auto p-3">
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[88%] whitespace-pre-line rounded-2xl px-3 py-2 text-[13px] leading-relaxed ${
                        m.role === "user"
                          ? "bg-emerald-500/25 text-emerald-50"
                          : "bg-white/[0.06] text-slate-200"
                      }`}
                    >
                      {m.text}
                    </div>
                  </motion.div>
                ))}
                {typing && (
                  <div className="flex justify-start">
                    <motion.div
                      className="rounded-2xl bg-white/[0.06] px-3 py-2 text-xs text-slate-500"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      {tr("buddyThinking")}
                    </motion.div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* quick */}
              <div className="flex flex-wrap gap-1 border-t border-white/5 px-3 pt-2">
                {QUICK.map((q) => (
                  <button
                    key={q.label}
                    onClick={() => send(q.query)}
                    className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400 ring-1 ring-white/[0.06] hover:bg-white/[0.08] hover:text-white"
                  >
                    {tr(q.label)}
                  </button>
                ))}
              </div>

              {/* input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex gap-2 p-3"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={ru ? "Вопрос или трата: кофе 25 000" : "Ask, or log: coffee 25 000"}
                  aria-label={tr("buddyInputPlaceholder")}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-emerald-500/40"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-3.5 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  →
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
