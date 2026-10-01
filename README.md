# MoneyPulse — AI Finance OS

## Быстрый старт

```bash
npm install
npm run dev
```

http://localhost:3000 → **Смотреть демо** или регистрация (пустой аккаунт).

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
2. **Postgres** — Neon или Supabase → `DATABASE_URL`  
   ```bash
   # schema.prisma provider = "postgresql"
   npx prisma db push
   ```
3. **JWT_SECRET** — длинная случайная строка  
4. **AI_API_KEY** — для чата и OCR vision  
5. **PWA** — уже в репо; проверь HTTPS  
6. **Telegram**  
   - BotFather → токен → `TELEGRAM_BOT_TOKEN`  
   - Webhook: `…/setWebhook?url=https://DOMAIN/api/telegram`  
   - Menu Button WebApp: `https://DOMAIN/tg`  
7. **Ежедневный nudge** — cron (Vercel Cron / GitHub Action) в 20:00 → Telegram `sendMessage`  
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
| Prisma schema | ✅ SQLite/Postgres |

См. `.env.example`.
