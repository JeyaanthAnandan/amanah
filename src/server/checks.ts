/**
 * Check lifecycle + consent state machine (§5.2–5.4, §8).
 *
 *   AWAITING_CONSENT ──both accept──▶ COMPUTING ──P1 posts boolean──▶ COMPLETE
 *          │                              │
 *          └────────── expiresAt ─────────┴──▶ EXPIRED
 *
 * Decline / withdraw are recorded ONLY on the Consent row. They never change
 * Check.status, so a decline is indistinguishable from no response: the check
 * stays "waiting" until expiry and then shows "could not be completed".
 */
import type { Check, PrismaClient } from "@prisma/client";
import { consentWindowMs, matchingMode, RATE_LIMIT } from "@/lib/config";
import { parseJson, toJson } from "@/lib/json";
import { isValidPointArray } from "@/lib/psi";
import { CONDITIONS } from "@/lib/conditions";
import { appendAudit, auditFor } from "./audit";
import { HttpError } from "./http-error";
import { trustedMatch, trustedReveal } from "./trusted-matcher";

export type PublicStatus = "WAITING" | "COMPLETE" | "NOT_COMPLETED";

/** What anyone other than the deciding participant may learn. Depends only on Check.status. */
export function publicStatus(c: Pick<Check, "status">): PublicStatus {
  if (c.status === "COMPLETE") return "COMPLETE";
  if (c.status === "EXPIRED" || c.status === "WITHDRAWN") return "NOT_COMPLETED";
  return "WAITING";
}

const OPEN = ["AWAITING_CONSENT", "COMPUTING"];
const isParticipant = (c: Check, uid: string) => c.p1Id === uid || c.p2Id === uid;
export const otherOf = (c: Check, uid: string) => (c.p1Id === uid ? c.p2Id : c.p1Id);

async function notify(db: PrismaClient, userIds: string[], type: string, checkId: string) {
  await db.notification.createMany({ data: userIds.map((userId) => ({ userId, type, checkId })) });
}

/** Lazily expire open checks whose window has passed. Call before reads. */
export async function expireDue(db: PrismaClient, now = new Date()) {
  const due = await db.check.findMany({
    where: { status: { in: OPEN }, expiresAt: { lt: now }, simulated: false },
  });
  for (const c of due) {
    const res = await db.check.updateMany({ where: { id: c.id, status: { in: OPEN } }, data: { status: "EXPIRED" } });
    if (res.count) await notify(db, [c.initiatorId, c.p1Id, c.p2Id].filter((v, i, a) => a.indexOf(v) === i), "checkClosed", c.id);
  }
}

export async function getCheck(db: PrismaClient, id: string) {
  await expireDue(db);
  const c = await db.check.findUnique({ where: { id } });
  if (!c || c.simulated) throw new HttpError(404, "not_found");
  return c;
}

// ------------------------------------------------------------------ create

export async function createCheck(
  db: PrismaClient,
  initiatorId: string,
  aId: string,
  bId: string,
  now = new Date(),
) {
  if (aId === bId) throw new HttpError(400, "same_person");
  const [a, b] = await Promise.all([db.user.findUnique({ where: { id: aId } }), db.user.findUnique({ where: { id: bId } })]);
  for (const u of [a, b])
    if (!u || u.simulated || !parseJson<string[]>(u.roles, []).includes("participant")) throw new HttpError(400, "not_participant");

  const since = new Date(now.getTime() - RATE_LIMIT.windowDays * 24 * 3600_000);
  const byInitiator = await db.check.count({ where: { initiatorId, createdAt: { gte: since }, simulated: false } });
  const forA = await db.check.count({ where: { OR: [{ p1Id: aId }, { p2Id: aId }], createdAt: { gte: since }, simulated: false } });
  const forB = await db.check.count({ where: { OR: [{ p1Id: bId }, { p2Id: bId }], createdAt: { gte: since }, simulated: false } });
  // One neutral error for every limit, so the limit itself reveals nothing about the other person.
  if (byInitiator >= RATE_LIMIT.maxChecks || forA >= RATE_LIMIT.maxChecks || forB >= RATE_LIMIT.maxChecks)
    throw new HttpError(429, "rate_limited");

  const check = await db.check.create({
    data: {
      initiatorId, p1Id: aId, p2Id: bId, status: "AWAITING_CONSENT", createdAt: now,
      expiresAt: new Date(now.getTime() + consentWindowMs()),
      consents: { create: [aId, bId].map((userId) => ({ userId, stage: "MATCH", decision: "PENDING" })) },
    },
  });
  await notify(db, [aId, bId], "checkRequested", check.id);
  await auditFor(db, [aId, bId], { actorId: initiatorId, action: "CHECK_CREATED", checkId: check.id });
  return check;
}

// ------------------------------------------------------------------ consent

type PsiAccept = { X?: string[]; Y?: string[]; Z?: string[] };

export async function decideMatch(
  db: PrismaClient,
  userId: string,
  checkId: string,
  decision: "ACCEPTED" | "DECLINED",
  psi: PsiAccept = {},
) {
  const c = await getCheck(db, checkId);
  if (!isParticipant(c, userId)) throw new HttpError(403, "forbidden");
  if (c.status !== "AWAITING_CONSENT") throw new HttpError(409, "closed");
  const consent = await db.consent.findUnique({ where: { checkId_userId_stage: { checkId, userId, stage: "MATCH" } } });
  if (!consent || consent.decision !== "PENDING") throw new HttpError(409, "already_decided");

  if (decision === "ACCEPTED" && matchingMode() === "psi") {
    const x = await db.psiMessage.findUnique({ where: { checkId_kind: { checkId, kind: "X" } } });
    if (!x) {
      if (!isValidPointArray(psi.X)) throw new HttpError(400, "x_required");
      try {
        await db.psiMessage.create({ data: { checkId, fromUserId: userId, kind: "X", payload: toJson(psi.X) } });
      } catch {
        throw new HttpError(409, "x_exists"); // the other person accepted at the same moment: retry as P2
      }
    } else {
      if (x.fromUserId === userId) throw new HttpError(409, "already_decided");
      if (!isValidPointArray(psi.Y) || !isValidPointArray(psi.Z)) throw new HttpError(400, "yz_required");
      await db.psiMessage.createMany({
        data: [
          { checkId, fromUserId: userId, kind: "Y", payload: toJson(psi.Y) },
          { checkId, fromUserId: userId, kind: "Z", payload: toJson(psi.Z) },
        ],
      });
    }
  }

  await db.consent.update({ where: { id: consent.id }, data: { decision, decidedAt: new Date() } });
  // Audit is visible only to the person who decided.
  await appendAudit(db, { actorId: userId, subjectUserId: userId, action: "CONSENT_RECORDED", checkId });

  if (decision === "ACCEPTED") await advanceIfBothAccepted(db, checkId);
  return { ok: true };
}

async function bothAccepted(db: PrismaClient, checkId: string, stage: "MATCH" | "REVEAL") {
  const cs = await db.consent.findMany({ where: { checkId, stage } });
  return cs.length === 2 && cs.every((x) => x.decision === "ACCEPTED");
}

async function advanceIfBothAccepted(db: PrismaClient, checkId: string) {
  if (!(await bothAccepted(db, checkId, "MATCH"))) return;
  const c = await db.check.findUniqueOrThrow({ where: { id: checkId } });
  if (matchingMode() === "trusted") {
    await completeCheck(db, c, await trustedMatch(db, c.p1Id, c.p2Id));
  } else {
    await db.check.updateMany({ where: { id: checkId, status: "AWAITING_CONSENT" }, data: { status: "COMPUTING" } });
  }
}

async function completeCheck(db: PrismaClient, c: Check, sharedRisk: boolean) {
  const res = await db.check.updateMany({
    where: { id: c.id, status: { in: OPEN } },
    data: { status: "COMPLETE", sharedRisk, completedAt: new Date() },
  });
  if (!res.count) return;
  await notify(db, [c.p1Id, c.p2Id], "resultReady", c.id);
  if (c.initiatorId !== c.p1Id && c.initiatorId !== c.p2Id) await notify(db, [c.initiatorId], "checkClosed", c.id);
  await auditFor(db, [c.p1Id, c.p2Id], { actorId: "matching-service", action: "RESULT_COMPUTED", checkId: c.id });
}

export async function withdraw(db: PrismaClient, userId: string, checkId: string) {
  const c = await getCheck(db, checkId);
  if (!isParticipant(c, userId)) throw new HttpError(403, "forbidden");
  if (!OPEN.includes(c.status)) throw new HttpError(409, "closed");
  const consent = await db.consent.findUnique({ where: { checkId_userId_stage: { checkId, userId, stage: "MATCH" } } });
  if (!consent || !["PENDING", "ACCEPTED"].includes(consent.decision)) throw new HttpError(409, "already_decided");
  await db.consent.update({ where: { id: consent.id }, data: { decision: "WITHDRAWN", decidedAt: new Date() } });
  await appendAudit(db, { actorId: userId, subjectUserId: userId, action: "CHECK_WITHDRAWN", checkId });
  return { ok: true };
}

/** P1's wallet posts only the boolean. */
export async function postResult(db: PrismaClient, userId: string, checkId: string, sharedRisk: boolean) {
  const c = await getCheck(db, checkId);
  if (c.status !== "COMPUTING") throw new HttpError(409, "not_computing");
  const x = await db.psiMessage.findUnique({ where: { checkId_kind: { checkId, kind: "X" } } });
  if (!x || x.fromUserId !== userId) throw new HttpError(403, "forbidden");
  if (!(await bothAccepted(db, checkId, "MATCH"))) throw new HttpError(409, "consent_missing");
  await completeCheck(db, c, sharedRisk);
  return { ok: true };
}

// ------------------------------------------------------------------ Stage 2

export type RevealState = "NONE" | "WAITING_OTHER" | "DECLINED" | "COMPUTING" | "REVEALED";

export async function revealState(db: PrismaClient, c: Check, userId: string): Promise<RevealState> {
  if (c.revealedConditionIds) return "REVEALED";
  const cs = await db.consent.findMany({ where: { checkId: c.id, stage: "REVEAL" } });
  if (cs.some((x) => x.decision === "DECLINED")) return "DECLINED";
  const mine = cs.find((x) => x.userId === userId);
  if (cs.length === 2 && cs.every((x) => x.decision === "ACCEPTED")) return "COMPUTING";
  return mine?.decision === "ACCEPTED" ? "WAITING_OTHER" : "NONE";
}

export async function decideReveal(db: PrismaClient, userId: string, checkId: string, decision: "ACCEPTED" | "DECLINED") {
  const c = await getCheck(db, checkId);
  if (!isParticipant(c, userId)) throw new HttpError(403, "forbidden");
  if (c.status !== "COMPLETE" || !c.sharedRisk) throw new HttpError(409, "not_applicable");
  if ((await revealState(db, c, userId)) !== "NONE") throw new HttpError(409, "already_decided");
  await db.consent.upsert({
    where: { checkId_userId_stage: { checkId, userId, stage: "REVEAL" } },
    create: { checkId, userId, stage: "REVEAL", decision, decidedAt: new Date() },
    update: { decision, decidedAt: new Date() },
  });
  await appendAudit(db, { actorId: userId, subjectUserId: userId, action: "CONSENT_RECORDED", checkId, detail: "reveal" });
  const other = otherOf(c, userId);
  const otherConsent = await db.consent.findUnique({ where: { checkId_userId_stage: { checkId, userId: other, stage: "REVEAL" } } });
  if (decision === "ACCEPTED" && !otherConsent) await notify(db, [other], "revealRequested", checkId);
  if (decision === "ACCEPTED" && matchingMode() === "trusted" && (await bothAccepted(db, checkId, "REVEAL"))) {
    await finishReveal(db, c, await trustedReveal(db, c.p1Id, c.p2Id));
  }
  return { ok: true };
}

export async function finishReveal(db: PrismaClient, c: Check, conditionIds: string[]) {
  const valid = new Set(CONDITIONS.map((x) => x.id));
  const ids = [...new Set(conditionIds)].filter((x) => valid.has(x));
  if (!ids.length) throw new HttpError(400, "no_condition");
  const res = await db.check.updateMany({
    where: { id: c.id, revealedConditionIds: null },
    data: { revealedConditionIds: toJson(ids) },
  });
  if (res.count) await auditFor(db, [c.p1Id, c.p2Id], { actorId: "matching-service", action: "REVEAL_COMPLETED", checkId: c.id });
}

/** P2's wallet posts Y_ordered (X re-blinded in X's original order). */
export async function postYOrdered(db: PrismaClient, userId: string, checkId: string, payload: string[]) {
  const c = await getCheck(db, checkId);
  if ((await revealState(db, c, userId)) !== "COMPUTING") throw new HttpError(409, "not_ready");
  const y = await db.psiMessage.findUnique({ where: { checkId_kind: { checkId, kind: "Y" } } });
  if (!y || y.fromUserId !== userId) throw new HttpError(403, "forbidden");
  if (!isValidPointArray(payload)) throw new HttpError(400, "invalid_points");
  await db.psiMessage.create({ data: { checkId, fromUserId: userId, kind: "Y_ORDERED", payload: toJson(payload) } }).catch(() => {
    throw new HttpError(409, "exists");
  });
  return { ok: true };
}

/** P1's wallet posts the condition id(s) it found. */
export async function postReveal(db: PrismaClient, userId: string, checkId: string, conditionIds: string[]) {
  const c = await getCheck(db, checkId);
  if ((await revealState(db, c, userId)) !== "COMPUTING") throw new HttpError(409, "not_ready");
  const x = await db.psiMessage.findUnique({ where: { checkId_kind: { checkId, kind: "X" } } });
  if (!x || x.fromUserId !== userId) throw new HttpError(403, "forbidden");
  await finishReveal(db, c, conditionIds);
  return { ok: true };
}

// ------------------------------------------------------------------ wallet tasks

export type WalletTask =
  | { kind: "COMPUTE_RESULT"; checkId: string; Y: string[]; Z: string[] }
  | { kind: "POST_Y_ORDERED"; checkId: string; X: string[] }
  | { kind: "COMPUTE_REVEAL"; checkId: string; yOrdered: string[]; Z: string[] };

/** Work the user's wallet must do next, plus checks whose secrets can be deleted. */
export async function walletTasks(db: PrismaClient, userId: string) {
  await expireDue(db);
  const checks = await db.check.findMany({
    where: { simulated: false, OR: [{ p1Id: userId }, { p2Id: userId }] },
    include: { messages: true },
  });
  const tasks: WalletTask[] = [];
  const closed: string[] = [];
  for (const c of checks) {
    const msg = (k: string) => c.messages.find((m) => m.kind === k);
    const pts = (k: string) => parseJson<string[]>(msg(k)?.payload, []);
    const X = msg("X");
    const Y = msg("Y");
    if (c.status === "COMPUTING" && X?.fromUserId === userId && Y && msg("Z") && (await bothAccepted(db, c.id, "MATCH"))) {
      tasks.push({ kind: "COMPUTE_RESULT", checkId: c.id, Y: pts("Y"), Z: pts("Z") });
    }
    if (c.status === "COMPLETE" && c.sharedRisk && (await revealState(db, c, userId)) === "COMPUTING") {
      if (Y?.fromUserId === userId && !msg("Y_ORDERED")) tasks.push({ kind: "POST_Y_ORDERED", checkId: c.id, X: pts("X") });
      if (X?.fromUserId === userId && msg("Y_ORDERED"))
        tasks.push({ kind: "COMPUTE_REVEAL", checkId: c.id, yOrdered: pts("Y_ORDERED"), Z: pts("Z") });
    }
    const rs = c.status === "COMPLETE" && c.sharedRisk ? await revealState(db, c, userId) : null;
    if (c.status === "EXPIRED" || (c.status === "COMPLETE" && (!c.sharedRisk || rs === "REVEALED" || rs === "DECLINED")))
      closed.push(c.id);
  }
  return { tasks, closed };
}
