import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/server/http";
import { getCheck } from "@/server/checks";
import { appendAudit } from "@/server/audit";

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("participant");
  const c = await getCheck(db, (await params).id);
  if (c.p1Id !== user.id && c.p2Id !== user.id) throw new HttpError(403, "forbidden");
  await appendAudit(db, { actorId: user.id, subjectUserId: user.id, action: "RESULT_VIEWED", checkId: c.id });
  return { ok: true };
});
