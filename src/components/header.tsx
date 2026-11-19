"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";
import { useI18n } from "./providers";
import { Badge } from "./ui/badge";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/roles";
import { ShieldCheck, Type } from "lucide-react";

type Persona = { id: string; name: string; nameAr: string; roles: Role[] };

const NAV: { href: string; key: keyof ReturnType<typeof useI18n>["t"]["nav"]; roles: Role[] | "all" }[] = [
  { href: "/start", key: "start", roles: ["family_initiator"] },
  { href: "/inbox", key: "inbox", roles: ["family_initiator", "participant", "family_member"] },
  { href: "/checks", key: "checks", roles: ["family_initiator", "participant"] },
  { href: "/wallet", key: "wallet", roles: ["participant"] },
  { href: "/family", key: "family", roles: ["family_member"] },
  { href: "/privacy", key: "privacy", roles: ["participant"] },
  { href: "/counsellor", key: "counsellor", roles: ["counsellor"] },
  { href: "/dashboard", key: "dashboard", roles: ["doh_analyst"] },
  { href: "/learn", key: "learn", roles: "all" },
  { href: "/demo", key: "demo", roles: "all" },
];

export function Header({ personas }: { personas: Persona[] }) {
  const { t, lang, user, nameOf } = useI18n();
  const router = useRouter();
  const path = usePathname();
  const [font, setFont] = React.useState<"md" | "lg" | "xl">("md");

  React.useEffect(() => {
    try {
      const f = localStorage.getItem("amanah:font");
      if (f === "lg" || f === "xl") setFont(f);
    } catch {}
  }, []);
  React.useEffect(() => {
    document.documentElement.dataset.font = font;
    try { localStorage.setItem("amanah:font", font); } catch {}
  }, [font]);

  async function switchTo(id: string) {
    await api("/api/session", { personaId: id });
    router.push("/");
    router.refresh();
  }
  async function toggleLang() {
    await api("/api/lang", { lang: lang === "ar" ? "en" : "ar" });
    router.refresh();
  }

  const items = NAV.filter((n) => n.roles === "all" || (user && n.roles.some((r) => user.roles.includes(r))));

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-2">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-primary">
          <ShieldCheck className="size-6" aria-hidden /> {t.common.appName}
        </Link>
        <Badge variant="demo" title={t.auth.mockUaePass}>{t.common.demoMode}</Badge>
        <div className="ms-auto flex items-center gap-1">
          <button
            onClick={() => setFont(font === "md" ? "lg" : font === "lg" ? "xl" : "md")}
            className="flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm hover:bg-muted"
            aria-label={`${t.common.fontSize}: ${font}`}
          >
            <Type className="size-4" aria-hidden />
            <span className="text-xs">{font === "md" ? "A" : font === "lg" ? "A+" : "A++"}</span>
          </button>
          <button onClick={toggleLang} className="min-h-10 rounded-lg px-2 text-sm font-semibold hover:bg-muted" lang={lang === "ar" ? "en" : "ar"}>
            {t.common.switchLang}
          </button>
        </div>
        <div className="flex w-full items-center gap-2">
          <label htmlFor="persona" className="shrink-0 text-xs text-muted-foreground">{t.auth.mockUaePass}</label>
          <select
            id="persona"
            value={user?.id ?? ""}
            onChange={(e) => switchTo(e.target.value)}
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-card px-2 text-sm"
          >
            <option value="" disabled>{t.auth.choosePersona}</option>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {nameOf(p)} — {p.roles.map((r) => t.roles[r]).join(", ")}
              </option>
            ))}
          </select>
        </div>
      </div>
      <nav aria-label="Main" className="mx-auto max-w-3xl overflow-x-auto px-2">
        <ul className="flex gap-1 pb-2">
          {items.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                className={cn(
                  "block whitespace-nowrap rounded-lg px-3 py-2 text-sm",
                  path.startsWith(n.href) ? "bg-primary-soft font-semibold text-primary" : "hover:bg-muted",
                )}
              >
                {t.nav[n.key]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
