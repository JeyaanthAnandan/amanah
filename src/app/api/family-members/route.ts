import { db } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { handle, requireUser } from "@/server/http";

export const GET = handle(async () => {
  await requireUser("participant");
  const users = await db.user.findMany({ where: { simulated: false } });
  return {
    members: users.filter((u) => parseJson<string[]>(u.roles, []).includes("family_member")).map((u) => ({ id: u.id, name: u.name, nameAr: u.nameAr })),
  };
});
