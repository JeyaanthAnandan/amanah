import { z } from "zod";
import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/server/http";

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("counsellor");
  const { text } = z.object({ text: z.string().min(1).max(2000) }).parse(await req.json());
  const id = (await params).id;
  const r = await db.referral.findUnique({ where: { id } });
  if (!r) throw new HttpError(404, "not_found");
  await db.counsellorNote.create({ data: { referralId: id, counsellorId: user.id, text } });
  return { ok: true };
});
