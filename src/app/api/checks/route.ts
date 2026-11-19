import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/server/http";
import { createCheck, expireDue } from "@/server/checks";
import { checkView } from "@/server/views";

const digits = (s: string) => s.replace(/\D/g, "");

export const POST = handle(async (req: Request) => {
  const user = await requireUser("family_initiator", "participant");
  const body = z.object({ aId: z.string(), bPhone: z.string().max(20) }).parse(await req.json());
  const b = await db.user.findFirst({ where: { phone: digits(body.bPhone), simulated: false } });
  if (!b) throw new HttpError(404, "not_found");
  // A participant who is not an initiator may only start a check that includes themself.
  if (!user.roles.includes("family_initiator") && body.aId !== user.id) throw new HttpError(403, "forbidden");
  const c = await createCheck(db, user.id, body.aId, b.id);
  return { id: c.id };
});

export const GET = handle(async () => {
  const user = await requireUser();
  await expireDue(db);
  const checks = await db.check.findMany({
    where: { simulated: false, OR: [{ initiatorId: user.id }, { p1Id: user.id }, { p2Id: user.id }] },
    orderBy: { createdAt: "desc" },
  });
  const views = await Promise.all(checks.map((c) => checkView(db, c, user.id)));
  return { checks: views.filter(Boolean) };
});
