import { db } from "@/lib/db";
import { handle, requireUser } from "@/server/http";
import { familyView } from "@/server/shares";

export const GET = handle(async () => {
  const user = await requireUser("family_member");
  return { items: await familyView(db, user.id) };
});
