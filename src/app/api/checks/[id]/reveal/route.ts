import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { decideReveal } from "@/server/checks";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("participant");
  const { decision } = z.object({ decision: z.enum(["ACCEPTED", "DECLINED"]) }).parse(await req.json());
  return decideReveal(db, user.id, (await params).id, decision);
});
