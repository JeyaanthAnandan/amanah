import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { actOnShare } from "@/server/shares";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("participant");
  const { action } = z.object({ action: z.enum(["approve", "decline", "revoke"]) }).parse(await req.json());
  await actOnShare(db, user.id, (await params).id, action);
  return { ok: true };
});
