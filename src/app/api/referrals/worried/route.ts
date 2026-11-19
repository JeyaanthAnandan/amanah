import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { flagWorried } from "@/server/referrals";

export const POST = handle(async (req: Request) => {
  const user = await requireUser("participant");
  const { checkId } = z.object({ checkId: z.string() }).parse(await req.json());
  return flagWorried(db, user.id, checkId);
});
