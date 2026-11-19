import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { withdraw } from "@/server/checks";

export const POST = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser("participant");
  return withdraw(db, user.id, (await params).id);
});
