import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { counsellorAction } from "@/server/referrals";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("counsellor");
  const b = z.object({ action: z.enum(["contacted", "book", "done", "close"]), sessionAt: z.string().optional() }).parse(await req.json());
  await counsellorAction(db, user.id, (await params).id, b.action, b.sessionAt);
  return { ok: true };
});
