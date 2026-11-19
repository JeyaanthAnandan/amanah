"use client";
import * as React from "react";

export function useNow(ms = 1000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function formatDuration(ms: number, lang: "en" | "ar") {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const u = lang === "ar" ? { d: "ي", h: "س", m: "د", s: "ث" } : { d: "d", h: "h", m: "m", s: "s" };
  if (d) return `${d}${u.d} ${h}${u.h}`;
  if (h) return `${h}${u.h} ${m}${u.m}`;
  return `${m}${u.m} ${sec}${u.s}`;
}
