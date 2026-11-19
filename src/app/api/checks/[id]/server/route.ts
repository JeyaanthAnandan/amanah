import { db } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { handle, HttpError, requireUser } from "@/server/http";
import { getCheck } from "@/server/checks";
import { appendAudit } from "@/server/audit";
import { scanForGenes } from "@/server/gene-scan";

const trunc = (h: string) => `${h.slice(0, 10)}…${h.slice(-6)}`;

/** "What our server sees": the raw stored rows for a check the viewer takes part in. */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("participant");
  const c = await getCheck(db, (await params).id);
  if (c.p1Id !== user.id && c.p2Id !== user.id) throw new HttpError(403, "forbidden");
  const messages = await db.psiMessage.findMany({ where: { checkId: c.id }, orderBy: { createdAt: "asc" } });
  // Only the viewer's own consent rows — never the other person's decision.
  const consents = await db.consent.findMany({ where: { checkId: c.id, userId: user.id } });
  await appendAudit(db, { actorId: user.id, subjectUserId: user.id, action: "TRANSPARENCY_VIEWED", checkId: c.id });
  const scan = await scanForGenes(db);
  return {
    check: c,
    consents,
    messages: messages.map((m) => {
      const pts = parseJson<string[]>(m.payload, []);
      return { id: m.id, kind: m.kind, fromUserId: m.fromUserId, createdAt: m.createdAt, count: pts.length, sample: pts.slice(0, 6).map(trunc) };
    }),
    geneScan: { tablesChecked: scan.tables, hits: scan.hits.length },
  };
});
