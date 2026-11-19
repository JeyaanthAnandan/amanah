import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";

export const POST = handle(async (req: Request) => {
  const user = await requireUser("participant");
  const b = z.object({
    checkId: z.string().optional(),
    questionId: z.enum(["q1", "q2", "q3", "qNo"]),
    correct: z.boolean(),
    lang: z.enum(["en", "ar"]),
    mode: z.enum(["read", "listen"]),
  }).parse(await req.json());
  await db.comprehensionResponse.create({ data: { ...b, userId: user.id } });
  return { ok: true };
});
