import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { proposeShare, sharesForCheck } from "@/server/shares";

export const GET = handle(async (req: Request) => {
  const user = await requireUser("participant");
  const checkId = new URL(req.url).searchParams.get("checkId") ?? "";
  return { shares: await sharesForCheck(db, user.id, checkId) };
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser("participant");
  const b = z.object({ checkId: z.string(), recipientId: z.string(), level: z.enum(["COMPLETED", "RESULT", "RESULT_CONDITION"]) }).parse(await req.json());
  const s = await proposeShare(db, user.id, b.checkId, b.recipientId, b.level);
  return { id: s.id };
});
