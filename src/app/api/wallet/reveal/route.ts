import { z } from "zod";
import { db } from "@/lib/db";
import { handle } from "@/server/http";
import { postReveal } from "@/server/checks";
import { requireWallet } from "@/server/wallet-auth";

export const POST = handle(async (req: Request) => {
  const userId = requireWallet(req);
  const { checkId, conditionIds } = z.object({ checkId: z.string(), conditionIds: z.array(z.string()).max(10) }).parse(await req.json());
  return postReveal(db, userId, checkId, conditionIds);
});
