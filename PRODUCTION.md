# Production checklist (before invite)

## Must-do (data safety)

1. **Postgres — done.** Auth (`src/lib/server-auth.ts`) and all finance data (`src/lib/db.ts`)
   are backed by Prisma/Postgres (Neon recommended), not JSON files. Set `DATABASE_URL`
   (pooled connection string) locally and in Vercel's env vars — the app throws a clear
   error if it's missing. One-time migration of any old `data/*.json` test data:
   `node scripts/migrate-json-to-prisma.mjs` (idempotent, preserves original user IDs so
   existing JWTs/sessions keep working).
   - Schema changes so far used `prisma db push` (fine for a fresh DB). Once there's real
     production data, switch to `prisma migrate dev`/`migrate deploy` so schema changes
     don't risk dropping data.
   - Demo accounts (`plan: "demo"`) now persist as real rows instead of vanishing —
     consider a periodic cleanup job if Neon free-tier storage becomes a concern.

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
