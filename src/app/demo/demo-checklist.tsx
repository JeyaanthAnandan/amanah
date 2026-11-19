"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { clearAllWallets } from "@/lib/wallet";
import { RotateCcw } from "lucide-react";

export function DemoChecklist() {
  const { t } = useI18n();
  const router = useRouter();
  const [done, setDone] = React.useState<boolean[]>([]);
  const [msg, setMsg] = React.useState<string | null>(null);
  React.useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem("amanah:demo-steps") ?? "[]")); } catch {}
  }, []);
  const toggle = (i: number) => {
    const next = [...done];
    next[i] = !next[i];
    setDone(next);
    try { localStorage.setItem("amanah:demo-steps", JSON.stringify(next)); } catch {}
  };

  async function reset() {
    await api("/api/demo/reset", {});
    clearAllWallets();
    try {
      sessionStorage.clear();
      localStorage.removeItem("amanah:demo-steps");
    } catch {}
    setDone([]);
    setMsg(t.demoPage.resetDone);
    router.refresh();
  }

  return (
    <>
      <Card>
        <ol className="space-y-2">
          {t.demoPage.steps.map((s, i) => (
            <li key={i}>
              <label className="flex min-h-11 items-start gap-3">
                <input type="checkbox" className="mt-1 size-5 accent-[var(--primary)]" checked={!!done[i]} onChange={() => toggle(i)} />
                <span className={done[i] ? "text-muted-foreground line-through" : ""}><span className="font-semibold">{i + 1}.</span> {s}</span>
              </label>
            </li>
          ))}
        </ol>
      </Card>
      <Button variant="outline" onClick={reset}><RotateCcw className="size-4" aria-hidden />{t.demoPage.reset}</Button>
      {msg && <p aria-live="polite" className="text-sm text-primary">{msg}</p>}
    </>
  );
}
