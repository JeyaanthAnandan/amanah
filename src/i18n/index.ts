import { en, type Dict } from "./en";
import { ar } from "./ar";

export type Lang = "en" | "ar";
export const LANGS: Lang[] = ["en", "ar"];
export type { Dict };

export function getDict(lang: Lang): Dict {
  return lang === "ar" ? ar : en;
}

export const isLang = (v: unknown): v is Lang => v === "en" || v === "ar";

/** Replace {placeholders} in a dictionary string. */
export function fmt(s: string, vars: Record<string, string | number> = {}): string {
  return s.replace(/\{(\w+)\}/g, (_, k: string) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export const dirOf = (lang: Lang) => (lang === "ar" ? "rtl" : "ltr");
