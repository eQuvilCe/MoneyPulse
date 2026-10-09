"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "mp-hide-amounts";
const EVENT = "mp-hide-amounts-change";

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

function read() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** "Hide amounts" privacy switch — shared by every widget on the page, remembered per device. */
export function useHideAmounts() {
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  const toggle = useCallback(() => {
    try {
      localStorage.setItem(KEY, read() ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { hidden, toggle };
}

export const HIDDEN_AMOUNT = "• • • •";
