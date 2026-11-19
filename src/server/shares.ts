import type { PrismaClient, Share } from "@prisma/client";
import { SHARE_DEFAULT_DAYS } from "@/lib/config";
import { parseJson } from "@/lib/json";
import { auditFor } from "./audit";
import { getCheck, otherOf } from "./checks";
import { HttpError } from "./http-error";

export type ShareLevel = "COMPLETED" | "RESULT" | "RESULT_CONDITION";
export const needsBoth = (l: string) => l !== "COMPLETED";

export function shareState(s: Share, now = Date.now()): "PENDING" | "ACTIVE" | "REVOKED" | "EXPIRED" {
  if (s.revokedAt) return "REVOKED";
  if (s.expiresAt.getTime() < now) return "EXPIRED";
  return s.approvedById ? "ACTIVE" : "PENDING";
}

export async function proposeShare(db: PrismaClient, userId: string, checkId: string, recipientId: string, level: ShareLevel) {
  const c = await getCheck(db, checkId);
  if (c.p1Id !== userId && c.p2Id !== userId) throw new HttpError(403, "forbidden");
  if (c.status !== "COMPLETE") throw new HttpError(409, "not_complete");
  if (level === "RESULT_CONDITION" && !c.revealedConditionIds) throw new HttpError(409, "not_revealed");
  const rec = await db.user.findUnique({ where: { id: recipientId } });
  if (!rec || !parseJson<string[]>(rec.roles, []).includes("family_member")) throw new HttpError(400, "bad_recipient");
  const s = await db.share.create({
    data: {
      checkId, proposedById: userId, recipientId, level,
      approvedById: needsBoth(level) ? null : userId,
      expiresAt: new Date(Date.now() + SHARE_DEFAULT_DAYS * 24 * 3600_000),
    },
  });
  await auditFor(db, [c.p1Id, c.p2Id], { actorId: userId, action: "SHARE_PROPOSED", checkId, detail: level });
  if (needsBoth(level)) await db.notification.create({ data: { userId: otherOf(c, userId), type: "shareProposed", checkId } });
  else await db.notification.create({ data: { userId: recipientId, type: "shareReceived", checkId } });
  return s;
}

export async function actOnShare(db: PrismaClient, userId: string, id: string, action: "approve" | "decline" | "revoke") {
  const s = await db.share.findUnique({ where: { id }, include: { check: true } });
  if (!s || s.simulated) throw new HttpError(404, "not_found");
  const c = s.check;
  if (c.p1Id !== userId && c.p2Id !== userId) throw new HttpError(403, "forbidden");
  const state = shareState(s);
  if (action === "approve") {
    if (state !== "PENDING" || s.proposedById === userId) throw new HttpError(409, "cannot_approve");
    await db.share.update({ where: { id }, data: { approvedById: userId } });
    await auditFor(db, [c.p1Id, c.p2Id], { actorId: userId, action: "SHARE_APPROVED", checkId: c.id, detail: s.level });
    await db.notification.create({ data: { userId: s.recipientId, type: "shareReceived", checkId: c.id } });
  } else {
    if (state === "REVOKED" || state === "EXPIRED") throw new HttpError(409, "closed");
    await db.share.update({ where: { id }, data: { revokedAt: new Date() } });
    await auditFor(db, [c.p1Id, c.p2Id], { actorId: userId, action: "SHARE_REVOKED", checkId: c.id, detail: s.level });
  }
}

export async function sharesForCheck(db: PrismaClient, userId: string, checkId: string) {
  const c = await getCheck(db, checkId);
  if (c.p1Id !== userId && c.p2Id !== userId) throw new HttpError(403, "forbidden");
  const shares = await db.share.findMany({ where: { checkId }, orderBy: { createdAt: "desc" } });
  const users = await db.user.findMany({ where: { id: { in: shares.map((s) => s.recipientId) } } });
  return shares.map((s) => {
    const r = users.find((u) => u.id === s.recipientId);
    return {
      id: s.id, level: s.level, state: shareState(s), mine: s.proposedById === userId,
      recipient: { name: r?.name ?? "?", nameAr: r?.nameAr ?? "?" }, expiresAt: s.expiresAt.toISOString(),
    };
  });
}

/** Read-only family view, limited to the shared level. */
export async function familyView(db: PrismaClient, userId: string) {
  const shares = (await db.share.findMany({ where: { recipientId: userId, simulated: false }, include: { check: true } })).filter(
    (s) => shareState(s) === "ACTIVE",
  );
  const ids = shares.flatMap((s) => [s.check.p1Id, s.check.p2Id]);
  const users = await db.user.findMany({ where: { id: { in: ids } } });
  const nm = (id: string) => {
    const u = users.find((x) => x.id === id);
    return { name: u?.name ?? "?", nameAr: u?.nameAr ?? "?" };
  };
  const out = shares.map((s) => ({
    id: s.id,
    level: s.level,
    p1: nm(s.check.p1Id),
    p2: nm(s.check.p2Id),
    sharedRisk: s.level === "COMPLETED" ? null : s.check.sharedRisk,
    conditionIds: s.level === "RESULT_CONDITION" ? parseJson<string[]>(s.check.revealedConditionIds, []) : [],
    expiresAt: s.expiresAt.toISOString(),
  }));
  for (const s of shares)
    await auditFor(db, [s.check.p1Id, s.check.p2Id], { actorId: userId, action: "FAMILY_VIEWED", checkId: s.checkId, detail: s.level });
  return out;
}

