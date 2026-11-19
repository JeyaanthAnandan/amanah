import { z } from "zod";
import { db } from "@/lib/db";
import { toJson } from "@/lib/json";
import { handle, requireUser } from "@/server/http";

export const POST = handle(async (req: Request) => {
  const user = await requireUser("participant");
  const b = z.object({ checkId: z.string().optional(), lang: z.enum(["en", "ar"]), answers: z.array(z.boolean()).length(4) }).parse(await req.json());
  const informed = b.answers.every(Boolean);
  await db.sureResponse.create({ data: { checkId: b.checkId, userId: user.id, lang: b.lang, answers: toJson(b.answers), informed } });
  return { informed };
});
