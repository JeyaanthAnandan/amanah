import type { Check, PrismaClient } from "@prisma/client";
import { parseJson } from "@/lib/json";
import { otherOf, publicStatus, revealState, type PublicStatus, type RevealState } from "./checks";

type Named = { id: string; name: string; nameAr: string };
const named = (u: { id: string; name: string; nameAr: string } | null): Named =>
  u ? { id: u.id, name: u.name, nameAr: u.nameAr } : { id: "?", name: "?", nameAr: "?" };

export type RequesterView = {
  kind: "requester";
  id: string;
  status: PublicStatus;
  p1: Named;
  p2: Named;
  createdAt: string;
  expiresAt: string;
};

export type ParticipantView = {
  kind: "participant";
  id: string;
  status: PublicStatus;
  myConsent: string;
  requester: Named;
  other: Named;
  createdAt: string;
  expiresAt: string;
  sharedRisk: boolean | null;
  conditionIds: string[];
  revealState: RevealState | null;
  /** Only present while my decision is pending: what my wallet needs to accept. */
  psi: { X: string[] | null } | null;
  referral: { id: string; status: string; createdAt: string; firstContactAt: string | null; sessionAt: string | null } | null;
};

export type CheckView = RequesterView | ParticipantView;

/**
 * Builds the role-appropriate view of a check. The requester view is derived
 * only from Check.status, never from consent decisions.
 */
export async function checkView(db: PrismaClient, c: Check, userId: string): Promise<CheckView | null> {
  const users = await db.user.findMany({ where: { id: { in: [c.initiatorId, c.p1Id, c.p2Id] } } });
  const u = (id: string) => named(users.find((x) => x.id === id) ?? null);
  const status = publicStatus(c);
  if (c.p1Id !== userId && c.p2Id !== userId) {
    if (c.initiatorId !== userId) return null;
    return { kind: "requester", id: c.id, status, p1: u(c.p1Id), p2: u(c.p2Id), createdAt: c.createdAt.toISOString(), expiresAt: c.expiresAt.toISOString() };
  }
  const consent = await db.consent.findUnique({ where: { checkId_userId_stage: { checkId: c.id, userId, stage: "MATCH" } } });
  const myConsent = consent?.decision ?? "PENDING";
  let psi: ParticipantView["psi"] = null;
  if (myConsent === "PENDING" && c.status === "AWAITING_CONSENT") {
    const x = await db.psiMessage.findUnique({ where: { checkId_kind: { checkId: c.id, kind: "X" } } });
    psi = { X: x ? parseJson<string[]>(x.payload, []) : null };
  }
  const ref = await db.referral.findFirst({ where: { checkId: c.id, requestedById: userId }, orderBy: { createdAt: "desc" } });
  const complete = c.status === "COMPLETE";
  return {
    kind: "participant",
    id: c.id,
    status,
    myConsent,
    requester: u(c.initiatorId),
    other: u(otherOf(c, userId)),
    createdAt: c.createdAt.toISOString(),
    expiresAt: c.expiresAt.toISOString(),
    sharedRisk: complete ? c.sharedRisk : null,
    conditionIds: complete ? parseJson<string[]>(c.revealedConditionIds, []) : [],
    revealState: complete && c.sharedRisk ? await revealState(db, c, userId) : null,
    psi,
    referral: ref
      ? { id: ref.id, status: ref.status, createdAt: ref.createdAt.toISOString(), firstContactAt: ref.firstContactAt?.toISOString() ?? null, sessionAt: ref.sessionAt?.toISOString() ?? null }
      : null,
  };
}
