import { db } from "@/lib/db";
import { handle, HttpError, requireUser } from "@/server/http";
import { getCheck } from "@/server/checks";
import { checkView } from "@/server/views";

export const GET = handle(async (_req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const c = await getCheck(db, (await params).id);
  const view = await checkView(db, c, user.id);
  if (!view) throw new HttpError(404, "not_found");
  return view;
});
