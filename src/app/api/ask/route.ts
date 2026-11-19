import { z } from "zod";
import { db } from "@/lib/db";
import { toJson, parseJson } from "@/lib/json";
import { handle, requireUser } from "@/server/http";
import { answerQuestion, llmEnabled } from "@/server/ask";
import type { Flags } from "@/lib/triage";

export const POST = handle(async (req: Request) => {
  const user = await requireUser("participant");
  const b = z.object({
    question: z.string().min(1).max(500),
    lang: z.enum(["en", "ar"]),
    checkId: z.string().optional(),
    conditionIds: z.array(z.string()).max(10).default([]),
  }).parse(await req.json());
  const out = await answerQuestion(b.question, b.lang, b.conditionIds);
  // Distress also raises the referral priority flag, if a referral exists.
  if (out.distress && b.checkId) {
    const ref = await db.referral.findFirst({ where: { checkId: b.checkId, requestedById: user.id, status: { not: "CLOSED" } } });
    if (ref) await db.referral.update({ where: { id: ref.id }, data: { flags: toJson({ ...parseJson<Flags>(ref.flags, {}), worried: true }) } });
  }
  return { ...out, mode: llmEnabled() ? "llm" : "scripted" };
});
