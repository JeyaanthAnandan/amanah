import type { PrismaClient } from "@prisma/client";
import { parseJson, toJson } from "@/lib/json";
import { priorityScore, slaStatus, type Flags } from "@/lib/triage";
import { appendAudit } from "./audit";
import { getCheck } from "./checks";
import { HttpError } from "./http-error";

export type ReferralInput = {
  checkId: string;
  language: "en" | "ar";
  preferredTime: "morning" | "afternoon" | "evening";
  together: boolean;
  married: boolean;
  pregnant: boolean;
  worried: boolean;
  consentToShareResult: boolean;
  consentToShareCondition: boolean;
};

export async function createReferral(db: PrismaClient, userId: string, r: ReferralInput) {
  const c = await getCheck(db, r.checkId);
  if (c.p1Id !== userId && c.p2Id !== userId) throw new HttpError(403, "forbidden");
  if (c.status !== "COMPLETE") throw new HttpError(409, "not_complete");
  if (!r.consentToShareResult) throw new HttpError(400, "consent_required");
  const existing = await db.referral.findFirst({ where: { checkId: c.id, requestedById: userId, status: { not: "CLOSED" } } });
  if (existing) throw new HttpError(409, "exists");
  const flags: Flags = { worried: r.worried, married: r.married, pregnant: r.pregnant };
  const ref = await db.referral.create({
    data: {
      checkId: c.id, requestedById: userId, language: r.language, preferredTime: r.preferredTime, together: r.together,
      flags: toJson(flags), consentToShareCondition: r.consentToShareCondition, status: "REQUESTED",
    },
  });
  await appendAudit(db, { actorId: userId, subjectUserId: userId, action: "REFERRAL_CREATED", checkId: c.id });
  return ref;
}

export async function flagWorried(db: PrismaClient, userId: string, checkId: string) {
  const ref = await db.referral.findFirst({ where: { checkId, requestedById: userId, status: { not: "CLOSED" } } });
  if (!ref) return { updated: false };
  const flags = { ...parseJson<Flags>(ref.flags, {}), worried: true };
  await db.referral.update({ where: { id: ref.id }, data: { flags: toJson(flags) } });
  return { updated: true };
}

/** What the counsellor may see: only what the participant consented to share. */
export async function counsellorQueue(db: PrismaClient, now = Date.now()) {
  const refs = await db.referral.findMany({ where: { simulated: false, status: { not: "CLOSED" } }, include: { check: true, notes: { orderBy: { createdAt: "asc" } } } });
  const users = await db.user.findMany({ where: { id: { in: refs.map((r) => r.requestedById) } } });
  return refs
    .map((r) => {
      const u = users.find((x) => x.id === r.requestedById);
      const flags = parseJson<Flags>(r.flags, {});
      const revealed = parseJson<string[]>(r.check.revealedConditionIds, []);
      const conditionIds = r.consentToShareCondition ? revealed : [];
      return {
        id: r.id,
        requester: u ? { id: u.id, name: u.name, nameAr: u.nameAr, phone: u.phone } : null,
        sharedRisk: r.check.sharedRisk,
        conditionIds,
        language: r.language,
        preferredTime: r.preferredTime,
        together: r.together,
        flags,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        firstContactAt: r.firstContactAt?.toISOString() ?? null,
        sessionAt: r.sessionAt?.toISOString() ?? null,
        notes: r.notes.map((n) => ({ id: n.id, text: n.text, createdAt: n.createdAt.toISOString() })),
        priority: priorityScore({ conditionIds, createdAt: r.createdAt, contacted: !!r.firstContactAt, flags }, now),
        sla: slaStatus(r.createdAt, r.firstContactAt, now),
      };
    })
    .sort((a, b) => b.priority - a.priority);
}

export async function counsellorAction(
  db: PrismaClient,
  counsellorId: string,
  id: string,
  action: "contacted" | "book" | "done" | "close",
  sessionAt?: string,
) {
  const r = await db.referral.findUnique({ where: { id } });
  if (!r || r.simulated) throw new HttpError(404, "not_found");
  const now = new Date();
  const data =
    action === "contacted" ? { status: "CONTACTED", firstContactAt: r.firstContactAt ?? now }
    : action === "book" ? { status: "SESSION_BOOKED", firstContactAt: r.firstContactAt ?? now, sessionAt: sessionAt ? new Date(sessionAt) : new Date(now.getTime() + 48 * 3600_000) }
    : action === "done" ? { status: "SESSION_DONE" }
    : { status: "CLOSED" };
  await db.referral.update({ where: { id }, data });
  await db.notification.create({ data: { userId: r.requestedById, type: "referralUpdate", checkId: r.checkId } });
  await appendAudit(db, { actorId: counsellorId, subjectUserId: r.requestedById, action: "COUNSELLOR_UPDATED", checkId: r.checkId, detail: action });
}
