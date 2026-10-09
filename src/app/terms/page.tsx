import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <Link href="/" className="text-sm text-emerald-400">
        ← MoneyPulse
      </Link>
      <h1 className="mt-6 text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated: September 2026</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-slate-300">
        <p>
          MoneyPulse — инструмент учёта личных финансов. Сервис не является банком, инвестиционным
          советником или налоговым консультантом. Решения о тратах и инвестициях вы принимаете сами.
        </p>
        <p>
          <strong className="text-white">Тарифы.</strong> Free — с ограничениями по операциям и AI.
          Pro — расширенные возможности. Оплата (когда подключена) — по подписке, отмена в любой момент.
        </p>
        <p>
          <strong className="text-white">Демо.</strong> Демо-режим использует общие демонстрационные
          данные и предназначен только для ознакомления.
        </p>
        <p>
          <strong className="text-white">Ответственность.</strong> Сервис предоставляется «как есть».
          Мы не гарантируем отсутствие ошибок в расчётах при некорректном вводе данных.
        </p>
      </div>
    </div>
  );
}
