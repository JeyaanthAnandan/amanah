"use client";
import Link from "next/link";
import { useI18n } from "@/components/providers";
import { Card, CardText } from "@/components/ui/card";
import { usePoll } from "@/lib/use-poll";
import type { CheckView } from "@/server/views";
import { ChevronRight } from "lucide-react";


export function CheckList() {
  const { t, fmt, nameOf } = useI18n();
  const { data } = usePoll<{ checks: CheckView[] }>("/api/checks");
  if (!data) return <p>{t.common.loading}</p>;
  if (!data.checks.length) return <Card><CardText className="mt-0">{t.checks.empty}</CardText></Card>;
  return (
    <ul className="space-y-3">
      {data.checks.map((c) => (
        <li key={c.id}>
          <Link href={`/checks/${c.id}`} className="block">
            <Card className="flex items-center gap-3 p-4 hover:bg-muted">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {c.kind === "requester"
                    ? fmt(t.checks.between, { p1: nameOf(c.p1), p2: nameOf(c.p2) })
                    : `${t.common.with} ${nameOf(c.other)}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {c.kind === "participant" ? fmt(t.checks.requestedBy, { name: nameOf(c.requester) }) : new Date(c.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="text-sm font-semibold">
                {c.status === "WAITING" ? t.checks.waiting : c.status === "COMPLETE" ? (c.kind === "participant" ? t.checks.viewResult : "✓") : t.checks.notCompleted}
              </span>
              <ChevronRight className="size-5 shrink-0 rtl:rotate-180" aria-hidden />
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
