"use client";
import * as React from "react";
import { useI18n } from "./providers";
import { Button } from "./ui/button";
import { Label, Select } from "./ui/field";
import { formatDuration, useNow } from "./time-left";
import { api } from "@/lib/api";
import { signalRefresh } from "@/lib/use-poll";
import type { ParticipantView } from "@/server/views";
import { CheckCircle2, Clock } from "lucide-react";

export function ReferralStatus({ r }: { r: NonNullable<ParticipantView["referral"]> }) {
  const { t, lang } = useI18n();
  const now = useNow(30_000);
  const due = new Date(r.createdAt).getTime() + 72 * 3600_000;
  return (
    <div className="rounded-xl bg-primary-soft p-3">
      <p className="flex gap-2 font-semibold text-primary"><CheckCircle2 className="size-5 shrink-0" aria-hidden />{t.referral.status[r.status as keyof typeof t.referral.status] ?? r.status}</p>
      {!r.firstContactAt && (
        <p className="mt-1 flex items-center gap-1 text-sm"><Clock className="size-4" aria-hidden />{t.referral.sla} ({formatDuration(due - now, lang)})</p>
      )}
      {r.sessionAt && <p className="mt-1 text-sm">{new Date(r.sessionAt).toLocaleString(lang === "ar" ? "ar-AE" : "en-AE")}</p>}
    </div>
  );
}

export function ReferralForm({ v, worried }: { v: ParticipantView; worried: boolean }) {
  const { t, fmt, lang, nameOf } = useI18n();
  const [form, setForm] = React.useState({
    language: lang, preferredTime: "evening", together: true, married: false, pregnant: false,
    consentToShareResult: true, consentToShareCondition: v.conditionIds.length > 0,
  });
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, val: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: val }));
  const revealed = v.conditionIds.length > 0;
  React.useEffect(() => {
    // The condition may be revealed after this form first renders; offer sharing it then.
    if (revealed) setForm((f) => ({ ...f, consentToShareCondition: true }));
  }, [revealed]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.consentToShareResult) return setErr(t.referral.mustShare);
    setBusy(true);
    try {
      await api("/api/referrals", { checkId: v.id, worried, ...form });
      signalRefresh();
    } catch {
      setErr(t.common.error);
    } finally {
      setBusy(false);
    }
  }

  const check = (k: "married" | "pregnant" | "consentToShareResult" | "consentToShareCondition", label: string, disabled = false) => (
    <label className="flex min-h-11 items-start gap-3 rounded-xl border border-border p-3">
      <input type="checkbox" className="mt-1 size-5 accent-[var(--primary)]" checked={form[k]} disabled={disabled} onChange={(e) => set(k, e.target.checked)} />
      <span>{label}</span>
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-3">
      <p>{t.referral.intro}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="rl">{t.referral.language}</Label>
          <Select id="rl" value={form.language} onChange={(e) => set("language", e.target.value as "en" | "ar")}>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="rt">{t.referral.time}</Label>
          <Select id="rt" value={form.preferredTime} onChange={(e) => set("preferredTime", e.target.value)}>
            {(["morning", "afternoon", "evening"] as const).map((k) => <option key={k} value={k}>{t.referral.times[k]}</option>)}
          </Select>
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-semibold">{t.referral.together}</legend>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          {[true, false].map((val) => (
            <label key={String(val)} className="flex min-h-11 items-center gap-3 rounded-xl border border-border p-3">
              <input type="radio" name="together" className="size-5 accent-[var(--primary)]" checked={form.together === val} onChange={() => set("together", val)} />
              {val ? fmt(t.referral.togetherYes, { other: nameOf(v.other) }) : t.referral.togetherNo}
            </label>
          ))}
        </div>
      </fieldset>
      {check("married", t.referral.married)}
      {check("pregnant", t.referral.pregnant)}
      {check("consentToShareResult", t.referral.shareResult)}
      {check("consentToShareCondition", t.referral.shareCondition, v.conditionIds.length === 0)}
      {err && <p role="alert" className="text-sm text-amber">{err}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{t.referral.submit}</Button>
    </form>
  );
}
