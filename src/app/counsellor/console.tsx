"use client";
import * as React from "react";
import { useI18n } from "@/components/providers";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDuration, useNow } from "@/components/time-left";
import { api } from "@/lib/api";
import { conditionById } from "@/lib/conditions";
import { COUNSELLOR_SLA_HOURS } from "@/lib/config";
import type { Sla, Flags } from "@/lib/triage";
import { CalendarDays, RefreshCw } from "lucide-react";

type Ref = {
  id: string;
  requester: { id: string; name: string; nameAr: string; phone: string } | null;
  sharedRisk: boolean | null;
  conditionIds: string[];
  language: string;
  preferredTime: "morning" | "afternoon" | "evening";
  together: boolean;
  flags: Flags;
  status: keyof ReturnType<typeof useI18n>["t"]["referral"]["status"];
  createdAt: string;
  firstContactAt: string | null;
  sessionAt: string | null;
  notes: { id: string; text: string; createdAt: string }[];
  priority: number;
  sla: Sla;
};

function slots() {
  const base = new Date();
  base.setMinutes(0, 0, 0);
  return [1, 2, 3].map((d) => {
    const x = new Date(base);
    x.setDate(x.getDate() + d);
    x.setHours(d === 2 ? 17 : 10);
    return x.toISOString();
  });
}

export function Console() {
  const { t, lang, nameOf } = useI18n();
  const [queue, setQueue] = React.useState<Ref[] | null>(null);
  const load = React.useCallback(async () => setQueue((await api<{ queue: Ref[] }>("/api/referrals")).queue), []);
  React.useEffect(() => { load().catch(() => {}); }, [load]);
  const now = useNow(1000);

  if (!queue) return <p>{t.common.loading}</p>;
  const when = (s: string) => new Date(s).toLocaleString(lang === "ar" ? "ar-AE" : "en-AE", { weekday: "short", hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
  const slaBadge = (r: Ref) => {
    const v = r.sla === "contacted" ? "default" : r.sla === "overdue" ? "amber" : r.sla === "dueSoon" ? "sand" : "outline";
    return <Badge variant={v}>{t.counsellor[r.sla === "contacted" ? "contacted" : r.sla]}</Badge>;
  };

  async function act(id: string, action: string, sessionAt?: string) {
    await api(`/api/referrals/${id}`, { action, sessionAt });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t.counsellor.title}</h1>
        <Button size="sm" variant="outline" onClick={load}><RefreshCw className="size-4" aria-hidden />{t.counsellor.queue}</Button>
      </div>
      <p className="text-sm text-muted-foreground">{t.counsellor.audited}</p>
      {queue.length === 0 && <Card><CardText className="mt-0">{t.counsellor.empty}</CardText></Card>}
      {queue.map((r) => {
        const hours = Math.floor((now - new Date(r.createdAt).getTime()) / 3600_000);
        const left = new Date(r.createdAt).getTime() + COUNSELLOR_SLA_HOURS * 3600_000 - now;
        const cond = r.conditionIds.map((id) => conditionById(id)).filter(Boolean);
        return (
          <Card key={r.id} className={r.flags.worried ? "border-sand-strong" : ""}>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="me-auto">{r.requester ? nameOf(r.requester) : "?"}</CardTitle>
              <Badge variant="outline">{t.counsellor.priority}: {r.priority}</Badge>
              {slaBadge(r)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground" dir="ltr">{r.requester?.phone}</p>
            {!r.firstContactAt && (
              <p className="mt-2 text-sm tabular-nums">{t.counsellor.waiting.replace("{hours}", String(hours))} · SLA {left > 0 ? formatDuration(left, lang) : `-${formatDuration(-left, lang)}`}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-1">
              {r.sharedRisk && <Badge variant="sand">{t.counsellor.resultShared}</Badge>}
              {r.flags.worried && <Badge variant="amber">{t.counsellor.worried}</Badge>}
              {r.flags.pregnant && <Badge variant="amber">{t.counsellor.pregnant}</Badge>}
              {r.flags.married && <Badge variant="outline">{t.counsellor.married}</Badge>}
              <Badge variant="outline">{r.language === "ar" ? "العربية" : "English"}</Badge>
              <Badge variant="outline">{t.referral.times[r.preferredTime]}</Badge>
              <Badge variant="outline">{r.together ? t.counsellor.together : t.counsellor.individual}</Badge>
            </div>
            <p className="mt-2 text-sm">
              <span className="font-semibold">{t.counsellor.condition}:</span>{" "}
              {cond.length ? cond.map((c) => `${lang === "ar" ? c!.name_ar : c!.name_en} (${c!.gene}) · ${t.counsellor.severity}: ${c!.severityTier}`).join("; ") : t.counsellor.conditionNotShared}
            </p>
            <p className="mt-1 text-sm"><Badge>{r.status === "CONTACTED" ? t.counsellor.contacted : t.referral.status[r.status]}</Badge>{r.sessionAt && <span className="ms-2">{t.counsellor.session.replace("{time}", when(r.sessionAt))}</span>}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status === "REQUESTED" && <Button size="sm" onClick={() => act(r.id, "contacted")}>{t.counsellor.markContacted}</Button>}
              {r.status === "SESSION_BOOKED" && <Button size="sm" variant="secondary" onClick={() => act(r.id, "done")}>{t.counsellor.markDone}</Button>}
              <Button size="sm" variant="ghost" onClick={() => act(r.id, "close")}>{t.counsellor.close}</Button>
            </div>
            {(r.status === "REQUESTED" || r.status === "CONTACTED") && (
              <div className="mt-3 rounded-xl bg-muted p-3">
                <p className="flex items-center gap-1 text-sm font-semibold"><CalendarDays className="size-4" aria-hidden />{t.counsellor.calendar} <Badge variant="demo">{t.common.demo}</Badge></p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {slots().map((s) => <Button key={s} size="sm" variant="outline" onClick={() => act(r.id, "book", s)}>{when(s)}</Button>)}
                </div>
              </div>
            )}
            <Notes r={r} onSaved={load} />
          </Card>
        );
      })}
    </div>
  );
}

function Notes({ r, onSaved }: { r: Ref; onSaved: () => void }) {
  const { t } = useI18n();
  const [text, setText] = React.useState("");
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-semibold">{t.counsellor.notes} ({r.notes.length})</summary>
      <ul className="mt-2 space-y-1 text-sm">{r.notes.map((n) => <li key={n.id} className="rounded-lg bg-muted p-2">{n.text}</li>)}</ul>
      <form className="mt-2 flex gap-2" onSubmit={async (e) => {
        e.preventDefault();
        if (!text.trim()) return;
        await api(`/api/referrals/${r.id}/notes`, { text });
        setText("");
        onSaved();
      }}>
        <label htmlFor={`n-${r.id}`} className="sr-only">{t.counsellor.addNote}</label>
        <textarea id={`n-${r.id}`} value={text} onChange={(e) => setText(e.target.value)} rows={2} className="min-w-0 flex-1 rounded-xl border border-border bg-card p-2 text-sm" />
        <Button size="sm" type="submit">{t.counsellor.addNote}</Button>
      </form>
    </details>
  );
}
