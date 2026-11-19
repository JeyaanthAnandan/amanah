"use client";
import * as React from "react";
import { useI18n } from "./providers";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { randomBytes } from "@noble/hashes/utils";

type Kind = "affected" | "carrier" | "none";
const CHILDREN: Kind[] = ["affected", "carrier", "carrier", "none"];

function ChildIcon({ kind, highlight }: { kind: Kind; highlight?: boolean }) {
  // No red. Affected = warm sand/amber, carrier = half-filled teal, not a carrier = light teal.
  const fill = kind === "affected" ? "#b8925a" : kind === "carrier" ? "url(#half)" : "#99d5cc";
  return (
    <svg viewBox="0 0 40 60" className={cn("h-16 w-11 transition-transform", highlight && "animate-pop scale-110")} aria-hidden>
      <defs>
        <linearGradient id="half" x1="0" x2="1" y1="0" y2="0">
          <stop offset="50%" stopColor="#0f766e" />
          <stop offset="50%" stopColor="#99d5cc" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="12" r="10" fill={fill} stroke={highlight ? "#1f2d2c" : "none"} strokeWidth="2" />
      <path d="M5 58 V36 a15 15 0 0 1 30 0 V58 Z" fill={fill} stroke={highlight ? "#1f2d2c" : "none"} strokeWidth="2" />
    </svg>
  );
}

export function IconArray() {
  const { t, fmt } = useI18n();
  const [pregnancy, setPregnancy] = React.useState(0);
  const [pick, setPick] = React.useState<number | null>(null);
  const [history, setHistory] = React.useState<Kind[]>([]);

  function next() {
    const i = randomBytes(1)[0] % 4; // each of the 4 outcomes equally likely, every time
    setPick(i);
    setPregnancy((p) => p + 1);
    setHistory((h) => [...h, CHILDREN[i]].slice(-8));
  }

  const legend: [Kind, string][] = [["affected", t.explain.affected], ["carrier", t.explain.carrier], ["none", t.explain.notCarrier]];

  return (
    <div>
      <p>{t.explain.iconIntro}</p>
      <div className="mt-3 flex justify-center gap-3 rounded-xl bg-muted p-4" role="img" aria-label={legend.map((l) => l[1]).join(". ")}>
        {CHILDREN.map((k, i) => <ChildIcon key={`${pregnancy}-${i}`} kind={k} highlight={pick === i} />)}
      </div>
      <ul className="mt-3 space-y-1 text-sm">
        {legend.map(([k, label]) => (
          <li key={k} className="flex items-center gap-2">
            <svg viewBox="0 0 10 10" className="size-3.5 shrink-0" aria-hidden>
              <rect width="10" height="10" rx="2" fill={k === "affected" ? "#b8925a" : k === "carrier" ? "#0f766e" : "#99d5cc"} />
            </svg>
            {label}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={next}>{t.explain.nextPregnancy}</Button>
        {pregnancy > 0 && <span className="text-sm font-semibold" aria-live="polite">{fmt(t.explain.pregnancy, { n: pregnancy })}</span>}
      </div>
      {pregnancy > 0 && (
        <div className="mt-3 flex flex-wrap gap-1" aria-hidden>
          {history.map((k, i) => (
            <span key={i} className="inline-block size-4 rounded-full" style={{ background: k === "affected" ? "#b8925a" : k === "carrier" ? "#0f766e" : "#99d5cc" }} />
          ))}
        </div>
      )}
      <p className="mt-3 rounded-xl bg-primary-soft p-3 text-sm font-semibold text-primary">{t.explain.caption}</p>
      {pregnancy > 0 && <p className="mt-2 text-sm text-muted-foreground">{t.explain.thisChild}</p>}
    </div>
  );
}
