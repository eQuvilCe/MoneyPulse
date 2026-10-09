"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/components/AppProvider";
import { useToast } from "@/components/Toast";
import type { FamilyMessagePublic } from "@/lib/db";

const MESSAGE_MAX = 500; // mirrors FAMILY_MESSAGE_MAX in lib/validation (server-only module)
const POLL_MS = 5000;
/** Every Nth poll reloads the whole page of messages, so deletions by others show up too. */
const FULL_RELOAD_EVERY = 6;

async function call<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: init?.body ? { "Content-Type": "application/json" } : undefined,
      ...init,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, data: null, error: json.error };
    return { ok: true, data: json };
  } catch {
    return { ok: false, data: null };
  }
}

function dayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function FamilyChat({ isOwner }: { isOwner: boolean }) {
  const { tr, lang, user } = useApp();
  const toast = useToast();
  const locale = lang === "en" ? "en-US" : "ru-RU";
  const [messages, setMessages] = useState<FamilyMessagePublic[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unseen, setUnseen] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const latest = useRef<string | undefined>(undefined);
  const polls = useRef(0);
  const stickToBottom = useRef(true);

  const scrollToBottom = useCallback((smooth = true) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setUnseen(false);
  }, []);

  /** Merge by id, keep chronological order. `replace` swaps the whole list (full reload). */
  const apply = useCallback((incoming: FamilyMessagePublic[], replace: boolean) => {
    setMessages((prev) => {
      const base = replace ? [] : prev || [];
      const known = new Set(base.map((m) => m.id));
      const fresh = incoming.filter((m) => !known.has(m.id));
      if (!replace && fresh.length === 0) return prev || [];
      const next = [...base, ...fresh].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const hadNew = !!prev && next.length > 0 && next[next.length - 1].id !== prev[prev.length - 1]?.id;
      latest.current = next[next.length - 1]?.createdAt;
      if (hadNew && !stickToBottom.current) setUnseen(true);
      return next;
    });
  }, []);

  const load = useCallback(
    async (full: boolean) => {
      const after = !full && latest.current ? `?after=${encodeURIComponent(latest.current)}` : "";
      const res = await call<{ messages: FamilyMessagePublic[] }>(`/api/family/chat${after}`);
      if (res.ok && res.data) apply(res.data.messages, !after);
    },
    [apply]
  );

  useEffect(() => {
    void load(true);
    const id = setInterval(() => {
      if (document.hidden) return;
      polls.current += 1;
      void load(polls.current % FULL_RELOAD_EVERY === 0);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Follow the conversation only while the reader is already at the bottom.
  useEffect(() => {
    if (messages && stickToBottom.current) scrollToBottom(messages.length > 1);
  }, [messages, scrollToBottom]);

  const send = async (value: string) => {
    const body = value.trim().slice(0, MESSAGE_MAX);
    if (!body || sending) return;
    setSending(true);
    const res = await call<{ message: FamilyMessagePublic }>("/api/family/chat", {
      method: "POST",
      body: JSON.stringify({ text: body }),
    });
    setSending(false);
    if (!res.ok || !res.data) return toast(res.error || tr("familyChatSendError"), "err");
    stickToBottom.current = true;
    setText("");
    apply([res.data.message], false);
  };

  const remove = async (id: string) => {
    const res = await call("/api/family/chat", { method: "DELETE", body: JSON.stringify({ id }) });
    if (!res.ok) return toast(res.error || "Error", "err");
    setMessages((prev) => (prev || []).filter((m) => m.id !== id));
  };

  const dayLabel = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (dayKey(iso) === dayKey(now.toISOString())) return tr("familyChatToday");
    if (dayKey(iso) === dayKey(yesterday.toISOString())) return tr("familyChatYesterday");
    return d.toLocaleDateString(locale, { day: "numeric", month: "long" });
  };

  const quick =
    lang === "en"
      ? ["🛒 I'll get the groceries", "💸 Who's paying?", "✅ Paid", "📉 We're over budget", "👍"]
      : ["🛒 Я куплю продукты", "💸 Кто оплатит?", "✅ Оплачено", "📉 Мы вышли за бюджет", "👍"];

  return (
    <div className="mp-card flex min-w-0 flex-col rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold">💬 {tr("familyChatTitle")}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{tr("familyChatHint")}</p>
        </div>
        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      <div className="relative mt-3">
        <div
          ref={listRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
            if (stickToBottom.current) setUnseen(false);
          }}
          className="h-80 space-y-2 overflow-y-auto overscroll-contain rounded-xl bg-black/20 p-3 ring-1 ring-white/[0.06]"
          aria-live="polite"
        >
          {messages === null ? (
            <div className="space-y-2">
              <div className="h-9 w-2/3 animate-pulse rounded-2xl bg-white/[0.05]" />
              <div className="ml-auto h-9 w-1/2 animate-pulse rounded-2xl bg-white/[0.05]" />
              <div className="h-9 w-3/5 animate-pulse rounded-2xl bg-white/[0.05]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="text-3xl">👋</span>
              <p className="text-sm text-slate-500">{tr("familyChatEmpty")}</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                const mine = m.userId === user?.id;
                const prev = messages[i - 1];
                const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
                const sameAuthor = !newDay && prev?.userId === m.userId;
                return (
                  <motion.div
                    key={m.id}
                    layout="position"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2 }}
                  >
                    {newDay && (
                      <p className="my-2 text-center text-[10px] font-medium uppercase tracking-wider text-slate-600">
                        {dayLabel(m.createdAt)}
                      </p>
                    )}
                    <div className={`group flex items-end gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                      {!mine && (
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${sameAuthor ? "invisible" : ""}`}
                          style={{ background: "rgba(var(--page-accent-rgb), 0.18)", color: "var(--page-accent)" }}
                        >
                          {(m.authorName || "?").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div
                        className={`min-w-0 max-w-[80%] rounded-2xl px-3 py-2 ${
                          mine ? "rounded-br-md text-white" : "rounded-bl-md bg-white/[0.06] text-slate-100"
                        }`}
                        style={mine ? { background: "linear-gradient(135deg, var(--page-accent), var(--page-accent-2))" } : undefined}
                      >
                        {!mine && !sameAuthor && (
                          <p className="mb-0.5 truncate text-[11px] font-semibold" style={{ color: "var(--page-accent)" }}>
                            {m.authorName}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap text-sm leading-snug [overflow-wrap:anywhere]">{m.text}</p>
                        <p className={`mt-0.5 text-right text-[10px] tabular-nums ${mine ? "text-white/70" : "text-slate-500"}`}>
                          {new Date(m.createdAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      {(mine || isOwner) && (
                        <button
                          type="button"
                          onClick={() => void remove(m.id)}
                          aria-label={tr("familyChatDelete")}
                          title={tr("familyChatDelete")}
                          className="shrink-0 rounded-lg p-1 text-xs text-slate-600 opacity-0 transition hover:text-rose-400 focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
        {unseen && (
          <button
            type="button"
            onClick={() => {
              stickToBottom.current = true;
              scrollToBottom();
            }}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg ring-1 ring-white/15"
          >
            {tr("familyChatNew")}
          </button>
        )}
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {quick.map((q) => (
          <button
            key={q}
            type="button"
            disabled={sending}
            onClick={() => void send(q)}
            className="shrink-0 whitespace-nowrap rounded-full bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 disabled:opacity-40"
          >
            {q}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(text);
        }}
        className="mt-2 flex min-w-0 items-end gap-2"
      >
        <div className="relative min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MESSAGE_MAX))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send(text);
              }
            }}
            rows={Math.min(4, Math.max(1, text.split("\n").length))}
            maxLength={MESSAGE_MAX}
            placeholder={tr("familyChatPlaceholder")}
            aria-label={tr("familyChatPlaceholder")}
            className="block w-full min-w-0 resize-none rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/40"
          />
          {text.length > MESSAGE_MAX - 100 && (
            <span className={`pointer-events-none absolute bottom-1 right-2 text-[10px] tabular-nums ${text.length >= MESSAGE_MAX ? "text-amber-400" : "text-slate-600"}`}>
              {text.length}/{MESSAGE_MAX}
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={sending || !text.trim()}
          className="shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, var(--page-accent), var(--page-accent-2))" }}
        >
          {sending ? "…" : tr("familyChatSend")}
        </button>
      </form>
    </div>
  );
}
