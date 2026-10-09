"use client";

import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { useToast } from "@/components/Toast";

type Status = { configured: boolean; linked: boolean; notify: boolean; bot: string | null };

async function call<T>(method: string, body?: unknown): Promise<{ ok: boolean; data: T | null; error?: string }> {
  try {
    const res = await fetch("/api/telegram/link", {
      method,
      credentials: "include",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: json } : { ok: false, data: null, error: json.error };
  } catch {
    return { ok: false, data: null };
  }
}

/** Settings → Telegram: link the bot with one tap, toggle notifications, send a test, unlink. */
export default function TelegramCard() {
  const { lang } = useApp();
  const ru = lang !== "en";
  const toast = useToast();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<{ code: string; url: string } | null>(null);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  const load = useCallback(async () => {
    const res = await call<Status>("GET");
    if (res.ok && res.data) {
      setStatus(res.data);
      if (res.data.linked) setPending(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch; state is set after the await
    void load();
  }, [load]);

  // While a link code is waiting, poll until the bot confirms it.
  useEffect(() => {
    if (!pending) return;
    const id = setInterval(() => void load(), 3000);
    return () => clearInterval(id);
  }, [pending, load]);

  // The button itself is a plain link to /api/telegram/go (no popup blocker); this only
  // fetches the same code to show the manual fallback and starts polling for the link.
  const link = async () => {
    const res = await call<{ code: string; url: string }>("POST");
    if (res.ok && res.data) setPending(res.data);
  };

  const setNotify = async (notify: boolean) => {
    setStatus((s) => (s ? { ...s, notify } : s));
    const res = await call("PATCH", { notify });
    if (!res.ok) {
      toast(res.error || "Error", "err");
      void load();
    }
  };

  const test = async () => {
    if (busy) return;
    setBusy(true);
    const res = await call("PATCH", { test: true });
    setBusy(false);
    toast(res.ok ? (ru ? "Отправлено — проверьте Telegram" : "Sent — check Telegram") : res.error || "Error", res.ok ? "ok" : "err");
  };

  const unlink = async () => {
    setBusy(true);
    const res = await call("DELETE");
    setBusy(false);
    setConfirmUnlink(false);
    if (!res.ok) return toast(res.error || "Error", "err");
    toast(ru ? "Telegram отвязан" : "Telegram unlinked");
    void load();
  };

  return (
    <div className="mp-card space-y-4 rounded-2xl p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>✈️</span> Telegram
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            {ru
              ? "Пишите боту траты одной строкой — «кофе 25 000» — и получайте уведомления о бюджетах, семейном чате и итог дня."
              : "Send expenses to the bot in one line — “coffee 25 000” — and get budget, family chat and end-of-day notifications."}
          </p>
        </div>
        {status?.linked && (
          <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            {ru ? "Привязан" : "Linked"}
          </span>
        )}
      </div>

      {status === null ? (
        <div className="h-10 animate-pulse rounded-xl bg-white/[0.04]" />
      ) : !status.configured ? (
        <p className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-slate-400">
          {ru ? "Бот ещё не подключён на сервере." : "The bot isn't connected on the server yet."}
        </p>
      ) : !status.linked ? (
        <div className="space-y-3">
          <a
            href="/api/telegram/go"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void link()}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
          >
            <Send size={16} aria-hidden />
            {ru ? "Привязать Telegram" : "Link Telegram"}
          </a>
          {pending && (
            <div className="rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-slate-300">
              <p>
                {ru ? "Откройте бота и нажмите «Запустить». Если он не открылся сам — " : "Open the bot and press Start. If it didn't open — "}
                <a href={pending.url} target="_blank" rel="noopener noreferrer" className="text-sky-300 underline underline-offset-2">
                  {ru ? "открыть вручную" : "open manually"}
                </a>
                .
              </p>
              <p className="mt-2 text-xs text-slate-500">
                {ru ? "Или отправьте боту: " : "Or send the bot: "}
                <code className="select-all rounded bg-black/40 px-1.5 py-0.5 font-mono text-slate-200">/start {pending.code}</code>
                {ru ? " · код действует 10 минут" : " · the code is valid for 10 minutes"}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-4 py-3">
            <span className="text-sm">{ru ? "Уведомления в Telegram" : "Telegram notifications"}</span>
            <input
              type="checkbox"
              checked={status.notify}
              onChange={(e) => void setNotify(e.target.checked)}
              className="h-5 w-5 accent-emerald-500"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {status.bot && (
              <a
                href="/api/telegram/go"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
              >
                {ru ? "Открыть бота" : "Open bot"}
              </a>
            )}
            <button
              type="button"
              onClick={() => void test()}
              disabled={busy || !status.notify}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 ring-white/10 transition hover:bg-white/5 disabled:opacity-40"
            >
              {ru ? "Тестовое уведомление" : "Send a test"}
            </button>
            <button
              type="button"
              onClick={() => (confirmUnlink ? void unlink() : setConfirmUnlink(true))}
              disabled={busy}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ring-1 transition ${
                confirmUnlink ? "bg-rose-500/20 text-rose-300 ring-rose-500/30" : "text-slate-400 ring-white/10 hover:text-rose-400"
              }`}
            >
              {confirmUnlink ? (ru ? "Точно отвязать?" : "Really unlink?") : ru ? "Отвязать" : "Unlink"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
