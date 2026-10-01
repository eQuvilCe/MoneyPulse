# Production checklist (before invite)

## Must-do (data safety)

1. **Postgres** — set `DATABASE_URL` to Neon/Supabase. Prisma schema is `postgresql`.
   JSON files in `data/` are wiped on Vercel/Render deploys.
   Next step: wire `readStore`/`writeStore` and auth to Prisma (schema already models User, Transaction, etc.).

2. **JWT_SECRET** — required in production (min 16 chars). App throws if missing on Vercel.

3. **Rate limits** — login 10/min, register 5/min (in-memory). For multi-instance: Upstash Redis.

4. **Demo dates** — goal deadlines are relative (`monthsAhead`). Default currency **сум (UZS)**.

## Landing

Rebuilt with: clear headline, SMS/Uzcard hero pitch, features, how-it-works, Free/Pro, security, FAQ.

## Week plan

| Week | Focus |
|------|--------|
| 1 | Prisma store migration, Upstash, Google auth (Auth.js/Clerk) |
| 2 | uz language, SMS parser polish |
| 3 | Telegram bot "coffee 15000" |
| 4 | Reminders + Click/Payme Pro |

## Local

```bash
cp .env.example .env
# JWT_SECRET=...  DATABASE_URL=postgresql://...
npm install
npx prisma db push
npm run dev
```
