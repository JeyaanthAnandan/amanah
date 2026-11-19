import { pageCtx } from "@/server/page";
import { NotAllowed } from "@/components/not-allowed";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/db";
import { dashboardMetrics, type Cell } from "@/server/metrics";
import { fmt } from "@/i18n";
import { Info, Scale } from "lucide-react";

function Bar({ label, cell, n }: { label: string; cell: Cell; n?: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-semibold tabular-nums" dir="ltr">{cell.display}{n !== undefined && !cell.suppressed ? ` (n=${n})` : ""}</span>
      </div>
      <div className="mt-1 h-2.5 rounded-full bg-muted" aria-hidden>
        {cell.value !== null && <div className="h-2.5 rounded-full bg-primary" style={{ width: `${cell.value}%` }} />}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const { user, t } = await pageCtx("doh_analyst");
  if (!user) return <NotAllowed />;
  const m = await dashboardMetrics(db);
  const tiles: [string, Cell][] = [
    [t.dashboard.metrics.started, m.started],
    [t.dashboard.metrics.consentRate, m.consentRate],
    [t.dashboard.metrics.medianTime, m.medianTime],
    [t.dashboard.metrics.sharedRate, m.sharedRate],
    [t.dashboard.metrics.counsellingRate, m.counsellingRate],
    [t.dashboard.metrics.medianContact, m.medianContact],
    [t.dashboard.metrics.within72, m.within72],
    [t.dashboard.metrics.sureRate, m.sureRate],
    [t.dashboard.metrics.familyShare, m.familyShare],
  ];
  const gapLine = (g: number | null) =>
    g === null ? "<10" : (
      <>
        {fmt(t.dashboard.equityGap, { gap: g })} — <span className={g > 10 ? "font-semibold text-amber" : "text-primary"}>{g > 10 ? t.dashboard.equityFlag : t.dashboard.equityOk}</span>
      </>
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold">{t.dashboard.title}</h1>
        {m.includesSimulated && <Badge variant="demo">{t.dashboard.simulatedBadge}</Badge>}
      </div>
      <CardText className="mt-0">{t.dashboard.intro}</CardText>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([label, cell]) => (
          <Card key={label} className="p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-primary" dir="ltr">{cell.display}</p>
          </Card>
        ))}
      </div>
      <Card>
        <CardTitle>{t.dashboard.teachTitle}</CardTitle>
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-semibold">{t.dashboard.byLang}</p>
            <Bar label="English" cell={m.teach.en.cell} n={m.teach.en.n} />
            <Bar label="العربية" cell={m.teach.ar.cell} n={m.teach.ar.n} />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">{t.dashboard.byMode}</p>
            <Bar label={t.dashboard.read} cell={m.teach.read.cell} n={m.teach.read.n} />
            <Bar label={t.dashboard.listen} cell={m.teach.listen.cell} n={m.teach.listen.n} />
          </div>
        </div>
      </Card>
      <Card>
        <CardTitle className="flex items-center gap-2"><Scale className="size-5 text-primary" aria-hidden />{t.dashboard.equityTitle}</CardTitle>
        <p className="mt-3 text-sm"><span className="font-semibold">{t.dashboard.byLang}:</span> {gapLine(m.equity.langGap)}</p>
        <p className="mt-2 text-sm"><span className="font-semibold">{t.dashboard.byMode}:</span> {gapLine(m.equity.modeGap)}</p>
        <div className="mt-4 space-y-3">
          {Object.entries(m.teach.cross).map(([k, v]) => (
            <Bar key={k} label={`${k.startsWith("en") ? "English" : "العربية"} · ${k.endsWith("read") ? t.dashboard.read : t.dashboard.listen}`} cell={v.cell} n={v.n} />
          ))}
        </div>
      </Card>
      <Card className="bg-primary-soft/50">
        <CardTitle className="flex items-center gap-2"><Info className="size-5 text-primary" aria-hidden />{t.dashboard.noteTitle}</CardTitle>
        <CardText className="text-foreground">{t.dashboard.note}</CardText>
      </Card>
    </div>
  );
}
