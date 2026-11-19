"use client";
import * as React from "react";

export const REFRESH_EVENT = "amanah:refresh";
export const signalRefresh = () => window.dispatchEvent(new Event(REFRESH_EVENT));

/** Polls a JSON endpoint every `ms` (3 s by default) and on refresh events. */
export function usePoll<T>(url: string | null, ms = 3000) {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const load = React.useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) setError(json.error ?? "error");
      else {
        setData(json as T);
        setError(null);
      }
    } catch {
      setError("network");
    }
  }, [url]);
  React.useEffect(() => {
    load();
    const t = setInterval(load, ms);
    window.addEventListener(REFRESH_EVENT, load);
    return () => {
      clearInterval(t);
      window.removeEventListener(REFRESH_EVENT, load);
    };
  }, [load, ms]);
  return { data, error, reload: load };
}
