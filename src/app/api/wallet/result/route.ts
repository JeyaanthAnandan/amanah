import { z } from "zod";
import { db } from "@/lib/db";
import { handle } from "@/server/http";
import { postResult } from "@/server/checks";
import { requireWallet } from "@/server/wallet-auth";

export const POST = handle(async (req: Request) => {
  const userId = requireWallet(req);
  const { checkId, sharedRisk } = z.object({ checkId: z.string(), sharedRisk: z.boolean() }).parse(await req.json());
  return postResult(db, userId, checkId, sharedRisk);
});
