import { z } from "zod";
import { db } from "@/lib/db";
import { handle } from "@/server/http";
import { postYOrdered } from "@/server/checks";
import { requireWallet } from "@/server/wallet-auth";

export const POST = handle(async (req: Request) => {
  const userId = requireWallet(req);
  const { checkId, payload } = z.object({ checkId: z.string(), payload: z.array(z.string()) }).parse(await req.json());
  return postYOrdered(db, userId, checkId, payload);
});
