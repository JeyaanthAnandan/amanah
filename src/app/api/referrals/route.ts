import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { counsellorQueue, createReferral } from "@/server/referrals";
import { auditFor } from "@/server/audit";

const Body = z.object({
  checkId: z.string(),
  language: z.enum(["en", "ar"]),
  preferredTime: z.enum(["morning", "afternoon", "evening"]),
  together: z.boolean(),
  married: z.boolean(),
  pregnant: z.boolean(),
  worried: z.boolean(),
  consentToShareResult: z.boolean(),
  consentToShareCondition: z.boolean(),
});

export const POST = handle(async (req: Request) => {
  const user = await requireUser("participant");
  const r = await createReferral(db, user.id, Body.parse(await req.json()));
  return { id: r.id };
});

export const GET = handle(async () => {
  const user = await requireUser("counsellor");
  const queue = await counsellorQueue(db);
  // Every counsellor view is written to the audit log (one event per referral subject).
  const subjects = [...new Set(queue.map((q) => q.requester?.id).filter((x): x is string => !!x))];
  await auditFor(db, subjects, { actorId: user.id, action: "COUNSELLOR_VIEWED" });
  return { queue };
});
