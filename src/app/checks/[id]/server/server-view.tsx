"use client";
import * as React from "react";
import { useI18n } from "@/components/providers";
import { Card, CardText, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { ShieldCheck } from "lucide-react";

type Data = {
  check: Record<string, unknown>;
  consents: Record<string, unknown>[];
  messages: { id: string; kind: string; fromUserId: string; createdAt: string; count: number; sample: string[] }[];
  geneScan: { tablesChecked: number; hits: number };
};

export function ServerView({ id }: { id: string }) {
  const { t, fmt } = useI18n();
  const [d, setD] = React.useState<Data | null>(null);
  React.useEffect(() => {
    api<Data>(`/api/checks/${id}/server`).then(setD).catch(() => {});
  }, [id]);
  if (!d) return <p>{t.common.loading}</p>;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t.transparency.title}</h1>
      <CardText>{t.transparency.intro}</CardText>
      <Card className="border-primary bg-primary-soft/50">
        <p className="flex items-center gap-2 font-semibold text-primary">
          <ShieldCheck className="size-5" aria-hidden />
          {d.geneScan.hits === 0 ? t.transparency.noGenes : `!! ${d.geneScan.hits}`}
        </p>
        <CardText>{t.transparency.noGenesHelp} ({d.geneScan.tablesChecked})</CardText>
      </Card>
      <Card>
        <CardTitle className="text-base">{t.transparency.checkRow}</CardTitle>
        <pre dir="ltr" className="mt-2 overflow-x-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(d.check, null, 2)}</pre>
        <pre dir="ltr" className="mt-2 overflow-x-auto rounded-xl bg-muted p-3 text-xs">{JSON.stringify(d.consents, null, 2)}</pre>
      </Card>
      <Card>
        <CardTitle className="text-base">{t.transparency.messages}</CardTitle>
        <ul className="mt-2 space-y-3">
          {d.messages.map((m) => (
            <li key={m.id}>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{m.kind}</Badge>
                <span className="text-xs text-muted-foreground">{fmt(t.transparency.points, { n: m.count })}</span>
              </div>
              <pre dir="ltr" className="mt-1 overflow-x-auto rounded-xl bg-muted p-2 text-xs">{m.sample.join("\n")}{"\n…"}</pre>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
