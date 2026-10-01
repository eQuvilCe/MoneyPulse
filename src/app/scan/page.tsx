"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { PageShell, FadeItem } from "@/components/motion/PageShell";
import { addTransaction } from "@/lib/storage";
import { useToast } from "@/components/Toast";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";

export default function ScanPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const router = useRouter();
  const { lang } = useApp();
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState("еда");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const onFile = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setBusy(true);
      setNote("");
      try {
        const res = await fetch("/api/ocr", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast(json.error || "OCR error", "err");
        } else {
          if (json.amount) setAmount(String(json.amount));
          if (json.description) setDesc(json.description);
          if (json.category) setCategory(json.category);
          if (json.date) setDate(json.date);
          if (json.note) setNote(json.note);
          toast(
            json.source === "vision"
              ? lang === "ru"
                ? "Чек распознан AI ✦"
                : "Receipt read by AI ✦"
              : lang === "ru"
                ? "Заполни сумму вручную"
                : "Fill amount manually"
          );
        }
      } catch {
        toast(lang === "ru" ? "Ошибка сети" : "Network error", "err");
      }
      setBusy(false);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      toast(lang === "ru" ? "Укажи сумму" : "Enter amount", "err");
      return;
    }
    await addTransaction({
      type: "expense",
      amount: num,
      category,
      description: desc || (lang === "ru" ? "Чек" : "Receipt"),
      date,
    });
    toast(lang === "ru" ? "Расход из чека сохранён" : "Receipt expense saved");
    router.push("/expenses");
  };

  return (
    <PageShell>
      <FadeItem>
        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400/80">MoneyPulse</p>
        <h1 className="mt-1 text-3xl font-bold">
          {lang === "ru" ? "Сканер чеков" : "Receipt scanner"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {lang === "ru" ? "Фото → AI Vision → транзакция за секунды" : "Photo → AI Vision → transaction in seconds"}
        </p>
      </FadeItem>

      <FadeItem>
        <div className="mp-card relative overflow-hidden rounded-3xl p-1">
          <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-emerald-500/30 bg-black/20 px-4 py-12 transition hover:border-emerald-400/50 hover:bg-emerald-500/5">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="receipt" className="max-h-48 rounded-xl object-contain shadow-lg" />
            ) : (
              <>
                <motion.span
                  className="text-5xl"
                  animate={{ y: [0, -8, 0], rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  📷
                </motion.span>
                <p className="mt-4 text-sm font-semibold text-white">
                  {busy
                    ? lang === "ru"
                      ? "AI читает чек…"
                      : "AI reading…"
                    : lang === "ru"
                      ? "Нажми или перетащи фото чека"
                      : "Tap or drop receipt photo"}
                </p>
                <p className="mt-1 text-xs text-slate-500">JPG · PNG · HEIC</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </label>
        </div>
      </FadeItem>

      {(preview || amount) && (
        <FadeItem className="mp-card space-y-3 rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {lang === "ru" ? "Результат" : "Result"}
          </h2>
          {note && <p className="text-xs text-amber-200/90">{note}</p>}
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={lang === "ru" ? "Сумма" : "Amount"}
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/40"
          />
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={lang === "ru" ? "Описание / магазин" : "Description / store"}
            className="w-full rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/40"
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder={lang === "ru" ? "Категория" : "Category"}
              className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/40"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-white/10 bg-slate-900/70 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/40"
            />
          </div>
          <button
            type="button"
            onClick={() => void save()}
            className="mp-btn-primary w-full rounded-xl py-3 text-sm font-bold"
          >
            {lang === "ru" ? "Сохранить расход" : "Save expense"}
          </button>
        </FadeItem>
      )}

      <FadeItem className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs text-slate-500">
        {lang === "ru"
          ? "Нужен AI_API_KEY (vision) в .env для авто-распознавания. Без ключа — заполни поля вручную после фото."
          : "Set AI_API_KEY (vision) in .env for auto-OCR. Without key — fill fields manually after photo."}
      </FadeItem>
    </PageShell>
  );
}
