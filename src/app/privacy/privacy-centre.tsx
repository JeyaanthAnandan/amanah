"use client";
import Link from "next/link";
import * as React from "react";
import { useI18n } from "@/components/providers";
import { Card, CardTitle, CardText } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WalletLoader } from "@/components/wallet-loader";
import { usePoll } from "@/lib/use-poll";
import { api } from "@/lib/api";
import { CheckCircle2, ShieldAlert } from "lucide-react";

type Data = {
  events: { id: string; seq: number; action: string; at: string; detail: string | null; actor: "self" | { name: string; nameAr: string } }[];
  shares: { id: string; level: "COMPLETED" | "RESULT" | "RESULT_CONDITION"; state: string; recipient: { name: string; nameAr: string }; checkId: string }[];
  pending: { id: string; myConsent: string; expiresAt: string }[];
};

export function PrivacyCentre() {
  const { t, fmt, nameOf, lang } = useI18n();
  const { data, reload } = usePoll<Data>("/api/privacy", 10000);
  const [verify, setVerify] = React.useState<{ ok: boolean; checked: number; brokenAt?: number } | null>(null);
  if (!data) return <p>{t.common.loading}</p>;
  const when = (s: string) => new Date(s).toLocaleString(lang === "ar" ? "ar-AE" : "en-AE");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.privacy.title}</h1>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>{t.privacy.whoSeen}</CardTitle>
          <Button size="sm" variant="secondary" onClick={async () => setVerify(await api("/api/audit", {}))}>{t.privacy.verify}</Button>
        </div>
        {verify && (
          <p className={`mt-2 flex gap-2 rounded-xl p-3 text-sm ${verify.ok ? "bg-primary-soft text-primary" : "bg-amber-soft text-amber"}`} aria-live="polite">
            {verify.ok ? <CheckCircle2 className="size-5" aria-hidden /> : <ShieldAlert className="size-5" aria-hidden />}
            {verify.ok ? fmt(t.privacy.intact, { n: verify.checked }) : fmt(t.privacy.broken, { n: verify.brokenAt ?? "?" })}
          </p>
        )}
        {data.events.length === 0 ? <CardText>{t.privacy.noEvents}</CardText> : (
          <ol className="mt-3 divide-y divide-border">
            {data.events.map((e) => (
              <li key={e.id} className="py-2 text-sm">
                <p className="font-semibold">{t.privacy.actions[e.action] ?? e.action}</p>
                <p className="text-xs text-muted-foreground">
                  {e.actor === "self" ? (lang === "ar" ? "أنت" : "You") : nameOf(e.actor)} · {when(e.at)} · #{e.seq}
                </p>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <CardTitle>{t.privacy.shares}</CardTitle>
        {data.shares.length === 0 ? <CardText>{t.family.empty}</CardText> : (
          <ul className="mt-3 space-y-2">
            {data.shares.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{nameOf(s.recipient)}</span>
                <Badge variant="sand">{t.family.level[s.level]}</Badge>
                <Badge variant="outline">{s.state}</Badge>
                {(s.state === "ACTIVE" || s.state === "PENDING") && (
                  <Button size="sm" variant="outline" onClick={async () => { await api(`/api/shares/${s.id}`, { action: "revoke" }); reload(); }}>{t.family.revoke}</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <CardTitle>{t.privacy.pendingChecks}</CardTitle>
        {data.pending.length === 0 ? <CardText>{t.checks.empty}</CardText> : (
          <ul className="mt-3 space-y-2">
            {data.pending.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                <Link href={`/checks/${c.id}`} className="font-semibold text-primary underline">{t.checks.open}</Link>
                <Button size="sm" variant="outline" onClick={async () => {
                  if (!window.confirm(t.consent.withdrawConfirm)) return;
                  await api(`/api/checks/${c.id}/withdraw`, {});
                  reload();
                }}>{t.consent.withdraw}</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <h2 className="text-lg font-bold">{t.privacy.walletSection}</h2>
      <WalletLoader />
    </div>
  );
}
