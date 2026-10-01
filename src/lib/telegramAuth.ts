import { createHmac, timingSafeEqual } from "crypto";

export type TelegramInitDataUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
};

type VerifyResult =
  | { ok: true; user: TelegramInitDataUser; authDate: number }
  | { ok: false; error: string };

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // reject replays of a captured initData older than this

/**
 * Validates Telegram WebApp `initData` per Telegram's documented algorithm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 *   secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
 *   hash       = HEX(HMAC_SHA256(key=secret_key, data=data_check_string))
 *
 * where data_check_string is every field except `hash`, sorted alphabetically by
 * key, joined as "key=value" lines separated by "\n".
 */
export function verifyTelegramInitData(initData: string, botToken: string): VerifyResult {
  if (!initData || !botToken) return { ok: false, error: "missing initData or bot token" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "no hash in initData" };
  params.delete("hash");

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const a = Buffer.from(computedHash, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "invalid hash" };
  }

  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
    return { ok: false, error: "initData expired" };
  }

  const userRaw = params.get("user");
  if (!userRaw) return { ok: false, error: "no user in initData" };
  try {
    const user = JSON.parse(userRaw) as TelegramInitDataUser;
    if (!user.id) return { ok: false, error: "no user id" };
    return { ok: true, user, authDate };
  } catch {
    return { ok: false, error: "malformed user field" };
  }
}
