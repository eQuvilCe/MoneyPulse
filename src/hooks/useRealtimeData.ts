"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { loadDataAsync, loadData } from "@/lib/storage";
import { onDataChange } from "@/lib/events";
import { FinanceData } from "@/lib/types";

/** Load once + refresh only when user mutates data (no polling loop). */
export function useRealtimeData(_intervalMs = 0) {
  const [data, setData] = useState<FinanceData | null>(null);
  const [live, setLive] = useState(true);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const d = await loadDataAsync();
      setData(d);
      setLive(true);
    } catch {
      setLive(false);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    // Instant paint from local cache, then refresh from API
    try {
      const cached = loadData();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- instant paint from the local cache, then refresh from the API
      if (cached) setData(cached);
    } catch {}
    refresh();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = onDataChange(() => {
      // debounce burst of events
      clearTimeout(timer);
      timer = setTimeout(() => refresh(), 50);
    });
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [refresh]);

  return { data, refresh, live, setData };
}
