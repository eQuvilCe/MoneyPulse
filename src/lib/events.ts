"use client";

const EVENT = "money-pulse-data";

export function emitDataChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onDataChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}

const SESSION_EXPIRED_EVENT = "money-pulse-session-expired";

export function emitSessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export function onSessionExpired(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(SESSION_EXPIRED_EVENT, handler);
  return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
}

const CELEBRATE_EVENT = "money-pulse-celebrate";

/** Fired alongside a Confetti burst (health milestone, goal completed) so other UI (the AI buddy) can react too. */
export function emitCelebrate() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CELEBRATE_EVENT));
}

export function onCelebrate(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(CELEBRATE_EVENT, handler);
  return () => window.removeEventListener(CELEBRATE_EVENT, handler);
}
