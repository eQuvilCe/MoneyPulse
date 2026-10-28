# MoneyPulse — AI Finance OS

## Быстрый старт

```bash
npm install
cp .env.example .env   # заполни DATABASE_URL (Postgres) и JWT_SECRET
npm run db:push        # создать таблицы по prisma/schema.prisma
npm run dev
```

http://localhost:3000 → **Смотреть демо** или регистрация (пустой аккаунт).

### Скрипты

| Команда | Что делает |
|--|--|
| `npm run dev` | dev-сервер Next.js |
| `npm run build` | `prisma generate` + production-сборка |
| `npm run start` | запуск собранного приложения |
| `npm run lint` | ESLint |
| `npm run db:push` | синхронизировать схему Prisma с базой |
| `npm run db:studio` | Prisma Studio для просмотра данных |

---

## PWA (мобилка без React Native)

Уже подключено:

- `public/manifest.json` + иконки
- `public/sw.js` service worker
- `PWARegister` — баннер «Установить»
- `apple-web-app` meta

**На телефоне:** открой сайт по HTTPS (Vercel) → «На экран Домой» / Install app.

**Capacitor (опционально, .apk / .ipa):**

```bash
npm run build && npx cap add android && npx cap sync
```

---

## Production checklist

1. **Деплой** — Vercel / Render  
2. **Postgres** — Neon или Supabase → `DATABASE_URL` (pooled-строка с `pgbouncer=true`)  
   ```bash
   npm run db:push
   ```
3. **JWT_SECRET** — длинная случайная строка  
4. **AI_API_KEY** — для чата и OCR vision  
5. **PWA** — уже в репо; проверь HTTPS  
6. **Telegram**  
   - BotFather → токен → `TELEGRAM_BOT_TOKEN`  
   - Webhook: `…/setWebhook?url=https://DOMAIN/api/telegram`  
   - Menu Button WebApp: `https://DOMAIN/tg`  
7. **Ежедневный nudge** — Vercel Cron из `vercel.json` дёргает `/api/cron/daily` (15:00 UTC = 20:00 Ташкент), нужен `CRON_SECRET`  
8. **Upstash Redis** — distributed rate limit (опционально)  
9. **Clerk / Auth.js** — Google/Apple one-tap (upgrade с текущего JWT)

---

## Фичи

| | |
|--|--|
| JWT auth + scrypt | ✅ |
| Demo / empty register | ✅ |
| Smart dashboard + AI analysis | ✅ |
| OCR `/scan` | ✅ (нужен vision key) |
| PWA install | ✅ |
| Telegram webhook + `/tg` WebApp | ✅ skeleton |
| Bank connect UI | roadmap `/banks` |
| Prisma schema | ✅ Postgres |

См. `.env.example`.

---

## Горячие клавиши

| Клавиша | Где | Действие |
|--|--|--|
| `N` | Доходы, Расходы | открыть форму новой операции |
| `/` | Расходы | фокус на поиск |
| `Esc` | формы, поиск, мобильное меню | закрыть / очистить |
| `Enter` / `Esc` | редактирование операции | сохранить / отменить |
| `←` / `→` | Календарь | предыдущий / следующий месяц |
