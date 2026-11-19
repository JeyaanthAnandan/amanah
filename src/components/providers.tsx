"use client";
import * as React from "react";
import { getDict, fmt, type Lang, type Dict } from "@/i18n";
import type { Role } from "@/lib/roles";

export type ClientUser = { id: string; name: string; nameAr: string; roles: Role[] } | null;

type Ctx = { lang: Lang; t: Dict; fmt: typeof fmt; user: ClientUser; nameOf: (u: { name: string; nameAr: string }) => string };
const I18nCtx = React.createContext<Ctx | null>(null);

export function Providers({ lang, user, children }: { lang: Lang; user: ClientUser; children: React.ReactNode }) {
  const value = React.useMemo<Ctx>(
    () => ({ lang, t: getDict(lang), fmt, user, nameOf: (u) => (lang === "ar" ? u.nameAr : u.name) }),
    [lang, user],
  );
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const v = React.useContext(I18nCtx);
  if (!v) throw new Error("useI18n outside Providers");
  return v;
}
