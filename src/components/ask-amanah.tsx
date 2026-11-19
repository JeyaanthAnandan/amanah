"use client";
import * as React from "react";
import { useI18n } from "./providers";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/field";
import { api } from "@/lib/api";
import { MessageCircleQuestion } from "lucide-react";

type Ans = { category: string; answer: string; distress: boolean; source: string; mode: string };

export function AskAmanah({ checkId, conditionIds, onEscalate }: { checkId?: string; conditionIds: string[]; onEscalate?: () => void }) {
  const { t, lang, user } = useI18n();
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<{ q: string; a: Ans }[]>([]);
  const [busy, setBusy] = React.useState(false);
  if (!user?.roles.includes("participant")) return null;

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    try {
      const a = await api<Ans>("/api/ask", { question: q, lang, checkId, conditionIds });
      setItems((xs) => [...xs, { q, a }]);
      setQ("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t.ask.disclaimer}</p>
      {items.map((it, i) => (
        <div key={i} className="space-y-2">
          <p className="ms-auto w-fit max-w-[85%] rounded-2xl bg-primary-soft px-3 py-2 text-sm">{it.q}</p>
          <div className="max-w-[90%] rounded-2xl border border-border bg-background px-3 py-2 text-sm">
            <p className="whitespace-pre-line leading-relaxed">{it.a.answer}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{it.a.source === "llm" ? t.ask.mode.llm : t.ask.mode.scripted}</Badge>
              {it.a.category === "ESCALATE" && onEscalate && (
                <Button size="sm" onClick={onEscalate}>{t.result.talk}</Button>
              )}
            </div>
          </div>
        </div>
      ))}
      <form onSubmit={ask} className="flex gap-2">
        <label htmlFor="ask" className="sr-only">{t.ask.title}</label>
        <Input id="ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.ask.placeholder} maxLength={500} className="mt-0" />
        <Button type="submit" disabled={busy}><MessageCircleQuestion className="size-4" aria-hidden />{t.ask.send}</Button>
      </form>
    </div>
  );
}
