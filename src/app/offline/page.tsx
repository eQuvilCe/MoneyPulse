export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#05070d] px-6 text-center text-white">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/25">
        <span className="text-2xl text-cyan-300">◈</span>
      </div>
      <h1 className="font-display text-xl font-semibold">Нет соединения</h1>
      <p className="max-w-xs text-sm text-slate-400">
        MoneyPulse не может связаться с сервером. Проверь интернет и попробуй снова — ранее открытые
        страницы останутся доступны из кэша.
      </p>
    </div>
  );
}
