import type { PrismaClient } from "@prisma/client";
import { SMALL_CELL } from "@/lib/config";

/** A dashboard cell. Counts under SMALL_CELL are suppressed and shown as "<10". */
export type Cell = { value: number | null; suppressed: boolean; display: string };

export const countCell = (n: number): Cell =>
  n < SMALL_CELL ? { value: null, suppressed: true, display: `<${SMALL_CELL}` } : { value: n, suppressed: false, display: String(n) };

export function rateCell(num: number, den: number): Cell {
  if (num < SMALL_CELL || den < SMALL_CELL)
    return { value: null, suppressed: true, display: `<${SMALL_CELL}` };
  const v = Math.round((num / den) * 1000) / 10;
  return { value: v, suppressed: false, display: `${v}%` };
}

export function medianCell(values: number[], unit = "h"): Cell {
  if (values.length < SMALL_CELL) return { value: null, suppressed: true, display: `<${SMALL_CELL}` };
  const s = [...values].sort((a, b) => a - b);
  const m = s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  const v = Math.round(m * 10) / 10;
  return { value: v, suppressed: false, display: `${v}${unit}` };
}

const H = 3600_000;

export async function dashboardMetrics(db: PrismaClient, now = Date.now()) {
  const checks = await db.check.findMany({ select: { id: true, status: true, sharedRisk: true, createdAt: true, completedAt: true, simulated: true } });
  const complete = checks.filter((c) => c.status === "COMPLETE");
  const closedNotComplete = checks.filter((c) => c.status === "EXPIRED" || c.status === "WITHDRAWN");
  const shared = complete.filter((c) => c.sharedRisk);
  const sharedIds = new Set(shared.map((c) => c.id));

  const referrals = await db.referral.findMany({ select: { checkId: true, createdAt: true, firstContactAt: true } });
  const refChecks = new Set(referrals.filter((r) => sharedIds.has(r.checkId)).map((r) => r.checkId));
  const contactHours = referrals.filter((r) => r.firstContactAt).map((r) => (r.firstContactAt!.getTime() - r.createdAt.getTime()) / H);
  // Denominator: referrals that were contacted, or are already past the 72 h window.
  const slaDue = referrals.filter((r) => r.firstContactAt || now - r.createdAt.getTime() > 72 * H);
  const within = referrals.filter((r) => r.firstContactAt && r.firstContactAt.getTime() - r.createdAt.getTime() <= 72 * H);

  const comps = await db.comprehensionResponse.findMany({ select: { lang: true, mode: true, correct: true } });
  const score = (f: (c: (typeof comps)[number]) => boolean) => {
    const xs = comps.filter(f);
    return xs.length < SMALL_CELL
      ? { n: xs.length, cell: { value: null, suppressed: true, display: `<${SMALL_CELL}` } as Cell }
      : { n: xs.length, cell: rateCell(xs.filter((x) => x.correct).length, xs.length) };
  };
  const teach = {
    en: score((c) => c.lang === "en"),
    ar: score((c) => c.lang === "ar"),
    read: score((c) => c.mode === "read"),
    listen: score((c) => c.mode === "listen"),
    cross: {
      "en-read": score((c) => c.lang === "en" && c.mode === "read"),
      "en-listen": score((c) => c.lang === "en" && c.mode === "listen"),
      "ar-read": score((c) => c.lang === "ar" && c.mode === "read"),
      "ar-listen": score((c) => c.lang === "ar" && c.mode === "listen"),
    },
  };
  const gap = (a: Cell, b: Cell) => (a.value === null || b.value === null ? null : Math.round(Math.abs(a.value - b.value) * 10) / 10);

  const sures = await db.sureResponse.findMany({ select: { informed: true } });
  const shares = await db.share.findMany({ where: { approvedById: { not: null } }, select: { checkId: true } });
  const sharedChecks = new Set(shares.map((s) => s.checkId));

  return {
    includesSimulated: checks.some((c) => c.simulated),
    started: countCell(checks.length),
    consentRate: rateCell(complete.length, complete.length + closedNotComplete.length),
    medianTime: medianCell(complete.filter((c) => c.completedAt).map((c) => (c.completedAt!.getTime() - c.createdAt.getTime()) / H)),
    sharedRate: rateCell(shared.length, complete.length),
    counsellingRate: rateCell(refChecks.size, shared.length),
    medianContact: medianCell(contactHours),
    within72: rateCell(within.length, slaDue.length),
    sureRate: rateCell(sures.filter((s) => s.informed).length, sures.length),
    familyShare: rateCell(complete.filter((c) => sharedChecks.has(c.id)).length, complete.length),
    teach,
    equity: { langGap: gap(teach.en.cell, teach.ar.cell), modeGap: gap(teach.read.cell, teach.listen.cell) },
  };
}
