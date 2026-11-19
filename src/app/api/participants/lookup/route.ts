import { db } from "@/lib/db";
import { parseJson } from "@/lib/json";
import { handle, HttpError, requireUser } from "@/server/http";

export const GET = handle(async (req: Request) => {
  await requireUser("family_initiator", "participant");
  const phone = (new URL(req.url).searchParams.get("phone") ?? "").replace(/\D/g, "");
  const u = await db.user.findFirst({ where: { phone, simulated: false } });
  if (!u || !parseJson<string[]>(u.roles, []).includes("participant")) throw new HttpError(404, "not_found");
  return { id: u.id, name: u.name, nameAr: u.nameAr };
});
