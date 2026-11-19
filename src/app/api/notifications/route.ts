import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { expireDue } from "@/server/checks";

export const GET = handle(async () => {
  const user = await requireUser();
  await expireDue(db);
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 });
  return { items, unread: items.filter((n) => !n.readAt).length };
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser();
  const { ids } = z.object({ ids: z.array(z.string()).max(100) }).parse(await req.json());
  await db.notification.updateMany({ where: { userId: user.id, id: { in: ids } }, data: { readAt: new Date() } });
  return { ok: true };
});
