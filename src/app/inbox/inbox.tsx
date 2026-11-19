"use client";
import Link from "next/link";
import * as React from "react";
import { useI18n } from "@/components/providers";
import { Card, CardText } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePoll } from "@/lib/use-poll";
import { api } from "@/lib/api";
import { Bell, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type N = { id: string; type: string; checkId: string | null; createdAt: string; readAt: string | null };

export function Inbox() {
  const { t, lang } = useI18n();
  const { data } = usePoll<{ items: N[] }>("/api/notifications");
  const unread = React.useMemo(() => data?.items.filter((n) => !n.readAt).map((n) => n.id) ?? [], [data]);
  React.useEffect(() => {
    if (unread.length) {
      const id = setTimeout(() => api("/api/notifications", { ids: unread }).catch(() => {}), 4000);
      return () => clearTimeout(id);
    }
  }, [unread]);

  if (!data) return <p>{t.common.loading}</p>;
  if (!data.items.length) return <Card><CardText className="mt-0">{t.inbox.empty}</CardText></Card>;

  const label = (type: string) => (t.inbox as Record<string, string>)[type] ?? type;
  const href = (n: N) =>
    !n.checkId ? "#" : n.type === "shareReceived" ? "/family" : n.type === "shareProposed" || n.type === "revealRequested" || n.type === "resultReady" ? `/checks/${n.checkId}/result` : `/checks/${n.checkId}`;

  return (
    <ul className="space-y-3">
      {data.items.map((n) => (
        <li key={n.id} className="space-y-2">
          <Link href={href(n)} className="block">
            <Card className={cn("flex items-center gap-3 p-4 hover:bg-muted", !n.readAt && "border-primary")}>
              <Bell className="size-5 shrink-0 text-primary" aria-hidden />
              <div className="flex-1">
                <p className="font-semibold">{label(n.type)}</p>
                <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString(lang === "ar" ? "ar-AE" : "en-AE")}</p>
              </div>
              {!n.readAt && <span className="size-2.5 rounded-full bg-primary" aria-label="unread" />}
            </Card>
          </Link>
          {n.type === "checkRequested" && (
            <div className="ms-6 rounded-2xl border border-dashed border-sand-strong bg-amber-soft/60 p-3 text-sm">
              <div className="mb-1 flex items-center gap-2">
                <MessageSquare className="size-4" aria-hidden />
                <span className="font-semibold">{t.inbox.smsPreview}</span>
                <Badge variant="demo">{t.common.demoNothingSent}</Badge>
              </div>
              <p>{t.inbox.smsBody}</p>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
