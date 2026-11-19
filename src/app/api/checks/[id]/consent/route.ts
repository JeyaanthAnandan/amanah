import { z } from "zod";
import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { decideMatch } from "@/server/checks";

const Body = z.object({
  decision: z.enum(["ACCEPTED", "DECLINED"]),
  psi: z.object({ X: z.array(z.string()).optional(), Y: z.array(z.string()).optional(), Z: z.array(z.string()).optional() }).optional(),
});

export const POST = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("participant");
  const body = Body.parse(await req.json());
  return decideMatch(db, user.id, (await params).id, body.decision, body.psi);
});
