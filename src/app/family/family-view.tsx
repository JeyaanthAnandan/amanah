"use client";
import * as React from "react";
import { useI18n } from "@/components/providers";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConditionCard } from "@/components/condition-card";
import { api } from "@/lib/api";

type Item = { id: string; level: "COMPLETED" | "RESULT" | "RESULT_CONDITION"; p1: { name: string; nameAr: string }; p2: { name: string; nameAr: string }; sharedRisk: boolean | null; conditionIds: string[]; expiresAt: string };

/** Read-only. Fetched once per visit (each view is audited for both participants). */
export function FamilyView() {
  const { t, fmt, nameOf, lang } = useI18n();
  const [items, setItems] = React.useState<Item[] | null>(null);
  React.useEffect(() => { api<{ items: Item[] }>("/api/family").then((r) => setItems(r.items)).catch(() => setItems([])); }, []);
  if (!items) return <p>{t.common.loading}</p>;
  if (!items.length) return <Card><CardText className="mt-0">{t.family.empty}</CardText></Card>;
  return (
    <ul className="space-y-3">
      {items.map((s) => {
        const vars = { p1: nameOf(s.p1), p2: nameOf(s.p2), other: nameOf(s.p2) };
        return (
          <li key={s.id}>
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="me-auto">{fmt(t.checks.between, vars)}</CardTitle>
                <Badge variant="sand">{t.family.level[s.level]}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{fmt(t.family.readOnly, { names: `${vars.p1}, ${vars.p2}` })} · {fmt(t.family.expires, { date: new Date(s.expiresAt).toLocaleDateString(lang === "ar" ? "ar-AE" : "en-AE") })}</p>
              {s.level === "COMPLETED" && <CardText>{fmt(t.family.completedOnly, vars)}</CardText>}
              {s.level !== "COMPLETED" && (
                <div className="mt-3">
                  <p className="font-semibold">{s.sharedRisk ? t.result.riskTitle : t.result.noRiskTitle}</p>
                  <CardText>{s.sharedRisk ? t.explain.meansBody : t.home.points[1]}</CardText>
                </div>
              )}
              {s.conditionIds.map((c) => <div key={c} className="mt-3"><ConditionCard id={c} /></div>)}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
