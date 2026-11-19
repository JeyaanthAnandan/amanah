import type { PrismaClient } from "@prisma/client";
import { toJson } from "@/lib/json";
import { CONDITIONS } from "@/lib/conditions";
import { makeLabRecord } from "./lab-issuer";
import { appendAudit } from "./audit";

export const SIM_USER = "sim";

export const PERSONAS = [
  { id: "mariam", name: "Mariam", nameAr: "مريم", roles: ["family_initiator", "family_member"], phone: "0500000001", relatedTo: "ahmed", genes: null },
  { id: "saeed", name: "Saeed", nameAr: "سعيد", roles: ["family_initiator"], phone: "0500000002", relatedTo: "noura", genes: null },
  { id: "hessa", name: "Hessa", nameAr: "حصة", roles: ["family_member"], phone: "0500000003", relatedTo: "fatima", genes: null },
  { id: "ahmed", name: "Ahmed", nameAr: "أحمد", roles: ["participant"], phone: "0500000004", relatedTo: null, genes: ["HBB"] },
  { id: "fatima", name: "Fatima", nameAr: "فاطمة", roles: ["participant"], phone: "0500000005", relatedTo: null, genes: ["HBB", "GJB2"] },
  { id: "khalid", name: "Khalid", nameAr: "خالد", roles: ["participant"], phone: "0500000006", relatedTo: null, genes: ["CYP21A2"] },
  { id: "noura", name: "Noura", nameAr: "نورة", roles: ["participant"], phone: "0500000007", relatedTo: null, genes: ["GJB2"] },
  { id: "layla", name: "Dr Layla", nameAr: "د. ليلى", roles: ["counsellor"], phone: "0500000008", relatedTo: null, genes: null },
  { id: "omar", name: "Omar", nameAr: "عمر", roles: ["doh_analyst"], phone: "0500000009", relatedTo: null, genes: null },
] as const;

/** Deterministic PRNG so the simulated dashboard is stable between resets. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HOUR = 3600_000;

export async function wipe(db: PrismaClient) {
  await db.$transaction([
    db.counsellorNote.deleteMany(),
    db.referral.deleteMany(),
    db.share.deleteMany(),
    db.psiMessage.deleteMany(),
    db.consent.deleteMany(),
    db.check.deleteMany(),
    db.notification.deleteMany(),
    db.comprehensionResponse.deleteMany(),
    db.sureResponse.deleteMany(),
    db.auditEvent.deleteMany(),
    db.labRecord.deleteMany(),
    db.user.deleteMany(),
  ]);
}

export async function seed(db: PrismaClient, opts: { simulatedChecks?: number } = {}) {
  await wipe(db);
  for (const p of PERSONAS) {
    await db.user.create({
      data: { id: p.id, name: p.name, nameAr: p.nameAr, roles: toJson(p.roles), phone: p.phone, relatedTo: p.relatedTo },
    });
    if (p.genes) await db.labRecord.create({ data: makeLabRecord(p.id, [...p.genes]) });
  }
  await db.user.create({
    data: { id: SIM_USER, name: "Simulated participant", nameAr: "مشارك محاكى", roles: toJson([]), phone: "0000000000", simulated: true },
  });
  await simulate(db, opts.simulatedChecks ?? 400);
  await appendAudit(db, { actorId: "system", action: "DEMO_RESET" });
}

/** 400 simulated background checks for the dashboard. Generated directly (not via PSI). */
async function simulate(db: PrismaClient, n: number) {
  const rnd = mulberry32(20261120);
  const now = Date.now();
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const checks = [];
  const referrals = [];
  const comps = [];
  const sures = [];
  const shares = [];
  // Correct-answer probabilities by language × mode: produces a visible equity gap.
  const pCorrect: Record<string, number> = { "en-read": 0.9, "en-listen": 0.86, "ar-read": 0.83, "ar-listen": 0.68 };

  for (let i = 0; i < n; i++) {
    const id = `sim-${String(i).padStart(4, "0")}`;
    const createdAt = new Date(now - (2 + rnd() * 118) * 24 * HOUR);
    const r = rnd();
    const status = r < 0.82 ? "COMPLETE" : r < 0.97 ? "EXPIRED" : "AWAITING_CONSENT";
    const sharedRisk = status === "COMPLETE" ? rnd() < 0.075 : null;
    const hoursToResult = 2 + Math.exp(rnd() * 4.2); // ~3h .. ~70h, skewed
    const completedAt = status === "COMPLETE" ? new Date(createdAt.getTime() + hoursToResult * HOUR) : null;
    const revealed = sharedRisk && rnd() < 0.6 ? [pick(CONDITIONS).id] : null;
    checks.push({
      id, initiatorId: SIM_USER, p1Id: SIM_USER, p2Id: SIM_USER, status, createdAt,
      expiresAt: new Date(createdAt.getTime() + 7 * 24 * HOUR), completedAt, sharedRisk,
      revealedConditionIds: revealed ? toJson(revealed) : null, simulated: true,
    });
    if (status !== "COMPLETE" || !completedAt) continue;

    const lang = rnd() < 0.55 ? "ar" : "en";
    const mode = rnd() < 0.4 ? "listen" : "read";
    const qs = sharedRisk ? ["q1", "q2", "q3"] : rnd() < 0.5 ? ["qNo"] : [];
    for (const q of qs)
      comps.push({ checkId: id, lang, mode, questionId: q, correct: rnd() < pCorrect[`${lang}-${mode}`], simulated: true, createdAt: completedAt });

    if (rnd() < 0.18)
      shares.push({ checkId: id, proposedById: SIM_USER, approvedById: SIM_USER, recipientId: SIM_USER, level: pick(["COMPLETED", "RESULT"] as const), createdAt: completedAt, expiresAt: new Date(completedAt.getTime() + 30 * 24 * HOUR), simulated: true });

    if (sharedRisk) {
      if (rnd() < 0.78) {
        const contactH = 3 + rnd() * 100;
        const contacted = completedAt.getTime() + contactH * HOUR < now;
        referrals.push({
          checkId: id, requestedById: SIM_USER, language: lang, preferredTime: pick(["morning", "afternoon", "evening"]),
          together: rnd() < 0.6, flags: toJson({ worried: rnd() < 0.2 }), consentToShareCondition: true,
          status: contacted ? "SESSION_DONE" : "REQUESTED", createdAt: completedAt,
          firstContactAt: contacted ? new Date(completedAt.getTime() + contactH * HOUR) : null, simulated: true,
        });
      }
      if (rnd() < 0.7) {
        const answers = [0, 1, 2, 3].map(() => rnd() < 0.85);
        sures.push({ checkId: id, lang, answers: toJson(answers), informed: answers.every(Boolean), simulated: true, createdAt: completedAt });
      }
    }
  }
  await db.check.createMany({ data: checks });
  await db.referral.createMany({ data: referrals });
  await db.comprehensionResponse.createMany({ data: comps });
  await db.sureResponse.createMany({ data: sures });
  await db.share.createMany({ data: shares });
}
