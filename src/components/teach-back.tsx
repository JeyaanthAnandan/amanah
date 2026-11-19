"use client";
import * as React from "react";
import { useI18n } from "./providers";
import { Button } from "./ui/button";
import { usedReadAloud } from "./read-aloud";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { CheckCircle2, Info } from "lucide-react";

type QKey = "q1" | "q2" | "q3" | "qNo";
// Display order per question so the correct answer (index 0 in the dictionary) is not always first.
const ORDER: Record<QKey, number[]> = { q1: [1, 0, 2], q2: [0, 2, 1], q3: [2, 1, 0], qNo: [1, 0] };

export function TeachBack({ checkId, questions }: { checkId: string; questions: QKey[] }) {
  const { t, fmt, lang } = useI18n();
  const [i, setI] = React.useState(0);
  const [chosen, setChosen] = React.useState<number | null>(null);
  const [done, setDone] = React.useState(false);

  if (done) return <p className="flex gap-2 font-semibold text-primary"><CheckCircle2 className="size-5 shrink-0" aria-hidden />{t.teach.done}</p>;
  const key = questions[i];
  const q = t.teach[key];

  async function answer(idx: number) {
    if (chosen !== null) return;
    setChosen(idx);
    await api("/api/comprehension", {
      checkId, questionId: key, correct: idx === 0, lang, mode: usedReadAloud(checkId) ? "listen" : "read",
    }).catch(() => {});
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">{t.teach.intro}</p>
      <fieldset className="mt-3">
        <legend className="font-semibold">{q.q}</legend>
        <div className="mt-2 grid gap-2">
          {ORDER[key].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => answer(idx)}
              disabled={chosen !== null}
              className={cn(
                "min-h-11 rounded-xl border px-3 py-2 text-start",
                chosen === null && "border-border hover:bg-muted",
                chosen !== null && idx === 0 && "border-primary bg-primary-soft font-semibold",
                chosen !== null && chosen === idx && idx !== 0 && "border-sand-strong bg-amber-soft",
                chosen !== null && chosen !== idx && idx !== 0 && "border-border opacity-60",
              )}
            >
              {q.options[idx]}
            </button>
          ))}
        </div>
      </fieldset>
      {chosen !== null && (
        <div className="mt-3 space-y-3" aria-live="polite">
          <p className={cn("flex gap-2 rounded-xl p-3 text-sm", chosen === 0 ? "bg-primary-soft text-primary" : "bg-amber-soft text-amber")}>
            {chosen === 0 ? <CheckCircle2 className="size-5 shrink-0" aria-hidden /> : <Info className="size-5 shrink-0" aria-hidden />}
            {chosen === 0 ? `${t.teach.correct} ${q.explain}` : fmt(t.teach.gentle, { explain: q.explain })}
          </p>
          <Button variant="secondary" onClick={() => (i + 1 < questions.length ? (setI(i + 1), setChosen(null)) : setDone(true))}>
            {i + 1 < questions.length ? t.teach.next : t.common.continue}
          </Button>
        </div>
      )}
    </div>
  );
}
