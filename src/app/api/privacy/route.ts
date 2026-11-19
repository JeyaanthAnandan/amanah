import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { expireDue } from "@/server/checks";
import { shareState } from "@/server/shares";

export const GET = handle(async () => {
  const user = await requireUser("participant");
  await expireDue(db);
  const events = await db.auditEvent.findMany({ where: { subjectUserId: user.id }, orderBy: { seq: "desc" }, take: 100 });
  const users = await db.user.findMany({ where: { id: { in: [...new Set(events.map((e) => e.actorId))] } } });
  const checks = await db.check.findMany({ where: { simulated: false, OR: [{ p1Id: user.id }, { p2Id: user.id }] } });
  const shares = await db.share.findMany({ where: { checkId: { in: checks.map((c) => c.id) } }, orderBy: { createdAt: "desc" } });
  const recips = await db.user.findMany({ where: { id: { in: shares.map((s) => s.recipientId) } } });
  const myConsents = await db.consent.findMany({ where: { userId: user.id, stage: "MATCH", checkId: { in: checks.map((c) => c.id) } } });
  const nm = (id: string, list: { id: string; name: string; nameAr: string }[]) => {
    const u = list.find((x) => x.id === id);
    return u ? { name: u.name, nameAr: u.nameAr } : { name: id, nameAr: id };
  };
  return {
    events: events.map((e) => ({
      id: e.id, seq: e.seq, action: e.action, at: e.at.toISOString(), detail: e.detail,
      actor: e.actorId === user.id ? "self" : nm(e.actorId, users),
    })),
    shares: shares.map((s) => ({ id: s.id, level: s.level, state: shareState(s), recipient: nm(s.recipientId, recips), checkId: s.checkId })),
    pending: checks
      .filter((c) => ["AWAITING_CONSENT", "COMPUTING"].includes(c.status))
      .map((c) => ({ id: c.id, myConsent: myConsents.find((x) => x.checkId === c.id)?.decision ?? "PENDING", expiresAt: c.expiresAt.toISOString() }))
      .filter((c) => ["PENDING", "ACCEPTED"].includes(c.myConsent)),
  };
});
