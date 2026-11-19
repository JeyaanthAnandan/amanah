"use client";
import * as React from "react";
import { useI18n } from "./providers";
import { Button } from "./ui/button";
import { api } from "@/lib/api";

/** SURE decisional-conflict screen (O'Connor & Légaré). Optional. */
export function SureTest({ checkId }: { checkId: string }) {
  const { t, lang } = useI18n();
  const [answers, setAnswers] = React.useState<(boolean | null)[]>([null, null, null, null]);
  const [result, setResult] = React.useState<boolean | null>(null);
  if (result !== null) return <p className="rounded-xl bg-primary-soft p-3 text-primary">{result ? t.sure.informed : t.sure.notInformed}</p>;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.sure.intro}</p>
      {t.sure.items.map((q, i) => (
        <fieldset key={i} className="rounded-xl border border-border p-3">
          <legend className="sr-only">{q}</legend>
          <p>{q}</p>
          <div className="mt-2 flex gap-2">
            {[true, false].map((val) => (
              <Button key={String(val)} type="button" size="sm" variant={answers[i] === val ? "default" : "outline"} aria-pressed={answers[i] === val}
                onClick={() => setAnswers((a) => a.map((x, j) => (j === i ? val : x)))}>
                {val ? t.common.yes : t.common.no}
              </Button>
            ))}
          </div>
        </fieldset>
      ))}
      <Button disabled={answers.some((a) => a === null)} onClick={async () => {
        const r = await api<{ informed: boolean }>("/api/sure", { checkId, lang, answers });
        setResult(r.informed);
      }}>{t.common.submit}</Button>
      <p className="text-xs text-muted-foreground">{t.sure.attribution}</p>
    </div>
  );
}
