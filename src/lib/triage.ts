import { COUNSELLOR_SLA_HOURS } from "./config";
import { conditionById } from "./conditions";

export type Flags = { worried?: boolean; married?: boolean; pregnant?: boolean };

/** Hours since a date. */
export const hoursSince = (d: Date | string, now = Date.now()) => (now - new Date(d).getTime()) / 3600_000;

/**
 * Queue priority = condition severity tier (unknown counts as high)
 *                + hours waiting + flags.
 */
export function priorityScore(args: { conditionIds: string[]; createdAt: Date | string; contacted: boolean; flags: Flags }, now = Date.now()) {
  const tiers = args.conditionIds.map((id) => conditionById(id)?.severityTier ?? "high");
  const severity = tiers.length === 0 || tiers.includes("high") ? 40 : 20;
  const waiting = args.contacted ? 0 : Math.min(hoursSince(args.createdAt, now), 96) / 2;
  const flags = (args.flags.worried ? 30 : 0) + (args.flags.pregnant ? 25 : 0) + (args.flags.married ? 5 : 0);
  return Math.round(severity + waiting + flags);
}

export type Sla = "contacted" | "onTrack" | "dueSoon" | "overdue";
export function slaStatus(createdAt: Date | string, firstContactAt: Date | string | null, now = Date.now()): Sla {
  if (firstContactAt) return "contacted";
  const left = COUNSELLOR_SLA_HOURS - hoursSince(createdAt, now);
  return left < 0 ? "overdue" : left < 24 ? "dueSoon" : "onTrack";
}
