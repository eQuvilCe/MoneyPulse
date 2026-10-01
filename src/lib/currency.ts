"use client";

import { formatMoney } from "./types";

/** Safe display helper — always pass settings.currency when available */
export function money(amount: number, currency?: string): string {
  return formatMoney(amount, currency || "₽");
}
