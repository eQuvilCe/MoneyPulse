#!/usr/bin/env node
/**
 * One-time Telegram bot setup for MoneyPulse.
 *
 *   node scripts/telegram-setup.mjs <BOT_TOKEN> <SITE_URL> [WEBHOOK_SECRET]
 *   node scripts/telegram-setup.mjs 123456:ABC... https://money-pulse-livid.vercel.app
 *
 * Registers the webhook (with a secret Telegram echoes back in a header), the command
 * list, the "Open app" menu button and the logo, then prints the environment variables the site
 * needs. Run it again with the same secret whenever the domain changes.
 */
import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";

const [token, siteArg, secretArg] = process.argv.slice(2);
if (!token || !siteArg) {
  console.error("Usage: node scripts/telegram-setup.mjs <BOT_TOKEN> <SITE_URL> [WEBHOOK_SECRET]");
  process.exit(1);
}
const site = siteArg.replace(/\/$/, "");
if (!/^https:\/\//.test(site)) {
  console.error("SITE_URL must start with https:// — Telegram only delivers webhooks over HTTPS.");
  process.exit(1);
}
const secret = secretArg || randomBytes(24).toString("hex");

async function call(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
}

const me = await call("getMe");
console.log(`Bot: @${me.username} (${me.first_name})`);

await call("setWebhook", {
  url: `${site}/api/telegram`,
  secret_token: secret,
  allowed_updates: ["message", "edited_message", "callback_query"],
  drop_pending_updates: true,
});
console.log(`Webhook → ${site}/api/telegram`);

await call("setMyCommands", {
  commands: [
    { command: "menu", description: "Все разделы приложения" },
    { command: "balance", description: "Баланс и итог месяца" },
    { command: "today", description: "Операции за сегодня" },
    { command: "week", description: "Расходы за 7 дней" },
    { command: "budgets", description: "Бюджеты и остаток" },
    { command: "undo", description: "Отменить последнюю запись" },
    { command: "notify", description: "Вкл/выкл уведомления" },
    { command: "help", description: "Как пользоваться" },
  ],
});
await call("setMyDescription", { description: "MoneyPulse: записывайте траты одной строкой — «кофе 25 000» — и получайте уведомления о бюджетах." });
await call("setMyShortDescription", { short_description: "Учёт расходов и уведомления MoneyPulse" });
await call("setChatMenuButton", { menu_button: { type: "web_app", text: "MoneyPulse", web_app: { url: `${site}/tg` } } });
console.log("Commands, description and menu button set.");

// Avatar: the app icon. Older Bot API servers don't have setMyProfilePhoto — then it's a manual step.
try {
  const form = new FormData();
  form.append("photo", JSON.stringify({ type: "static", photo: "attach://avatar" }));
  form.append("avatar", new Blob([await readFile(new URL("../public/icons/bot-avatar.jpg", import.meta.url))], { type: "image/jpeg" }), "avatar.jpg");
  const res = await (await fetch(`https://api.telegram.org/bot${token}/setMyProfilePhoto`, { method: "POST", body: form })).json();
  if (!res.ok) throw new Error(res.description);
  console.log("Logo set as the bot's profile photo.");
} catch (e) {
  console.log(`Logo not set automatically (${e.message}). In @BotFather: /setuserpic → pick the bot → send public/icons/bot-avatar.jpg`);
}

const info = await call("getWebhookInfo");
console.log(`Webhook check: ${info.url}${info.last_error_message ? ` — last error: ${info.last_error_message}` : " — ok"}`);

console.log(`
Add these to the site's environment (Vercel → Settings → Environment Variables), then redeploy:

TELEGRAM_BOT_TOKEN=${token}
TELEGRAM_WEBHOOK_SECRET=${secret}
TELEGRAM_BOT_USERNAME=${me.username}
CRON_SECRET=${randomBytes(24).toString("hex")}
`);
